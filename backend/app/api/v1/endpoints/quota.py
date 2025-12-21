"""
额度消耗排行榜 API 端点

提供 API 额度消耗的查询和排行榜功能：
- 获取选手的额度信息
- 获取额度消耗排行榜
- 获取调用日志
- 获取选手在线状态
"""
import asyncio
import logging
import httpx
import time
from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.models.registration import Registration, RegistrationStatus
from app.services.quota_service import quota_service, QuotaInfo

router = APIRouter()
logger = logging.getLogger(__name__)


# ========== Contest 级别在线状态缓存（避免惊群） ==========
@dataclass
class _ContestOnlineCacheEntry:
    """Contest 在线状态缓存条目"""
    data: dict[int, bool]
    created_at: float
    lock: asyncio.Lock


_contest_online_cache: dict[int, _ContestOnlineCacheEntry] = {}
_CONTEST_ONLINE_CACHE_TTL = 10  # 10秒缓存


async def _get_contest_online_status_cached(
    contest_id: int,
    db: AsyncSession
) -> dict[int, bool]:
    """
    获取 contest 的在线状态（带缓存，避免惊群）
    """
    global _contest_online_cache

    now = time.time()
    entry = _contest_online_cache.get(contest_id)

    # 缓存命中且未过期
    if entry and (now - entry.created_at) < _CONTEST_ONLINE_CACHE_TTL:
        return entry.data

    # 需要刷新：创建或复用锁
    if entry is None:
        entry = _ContestOnlineCacheEntry(
            data={},
            created_at=0,
            lock=asyncio.Lock()
        )
        _contest_online_cache[contest_id] = entry

    # 尝试获取锁，避免同时多个请求都去查询
    if entry.lock.locked():
        # 另一个协程正在刷新，等待完成后返回缓存
        async with entry.lock:
            return entry.data

    async with entry.lock:
        # 双重检查：可能在等锁期间已被其他协程刷新
        now = time.time()
        if (now - entry.created_at) < _CONTEST_ONLINE_CACHE_TTL:
            return entry.data

        # 执行实际查询
        reg_query = (
            select(Registration.id, Registration.api_key)
            .where(
                Registration.contest_id == contest_id,
                Registration.status.in_([
                    RegistrationStatus.SUBMITTED.value,
                    RegistrationStatus.APPROVED.value,
                ])
            )
        )
        reg_result = await db.execute(reg_query)
        rows = reg_result.all()

        api_keys: list[tuple[int, str]] = []
        for row in rows:
            reg_id = row[0]
            api_key = row[1] or ""
            api_keys.append((reg_id, api_key))

        status_map = await quota_service.batch_get_online_status(api_keys)

        # 更新缓存
        entry.data = status_map
        entry.created_at = time.time()

        return status_map


@router.get(
    "/contests/{contest_id}/quota-leaderboard",
    summary="获取额度消耗排行榜",
    description="获取比赛选手的 API 额度消耗排行榜（实时查询）。",
)
async def get_quota_leaderboard(
    contest_id: int,
    limit: int = Query(50, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取额度消耗排行榜"""

    # 获取所有已设置 api_key 的报名
    reg_query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.contest_id == contest_id,
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value,
            ]),
            Registration.api_key.isnot(None),
            Registration.api_key != "",
        )
    )
    reg_result = await db.execute(reg_query)
    registrations = reg_result.scalars().all()

    if not registrations:
        return {
            "items": [],
            "total": 0,
            "message": "暂无选手设置 API Key",
        }

    # 批量查询额度
    api_keys = [(r.id, r.api_key) for r in registrations]
    quota_map = await quota_service.batch_get_quota(api_keys)

    # 构建结果并排序
    items = []
    for reg in registrations:
        quota_info = quota_map.get(reg.id)

        if quota_info:
            items.append({
                "registration_id": reg.id,
                "title": reg.title,
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
                "quota": {
                    "used": round(quota_info.used, 2),
                    "today_used": round(quota_info.today_used, 2),
                    "remaining": round(quota_info.remaining, 2),
                    "total": round(quota_info.total, 2),
                    "is_unlimited": quota_info.is_unlimited,
                },
                "status": "ok",
            })
        else:
            # 查询失败的也展示，但标记状态
            items.append({
                "registration_id": reg.id,
                "title": reg.title,
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
                "quota": None,
                "status": "error",
            })

    # 按已使用额度降序排序（查询失败的排在最后）
    items.sort(
        key=lambda x: (
            x["status"] != "ok",  # ok 的排在前面
            -(x["quota"]["used"] if x["quota"] else 0),  # 按 used 降序
        )
    )

    # 添加排名
    for i, item in enumerate(items[:limit], 1):
        item["rank"] = i

    return {
        "items": items[:limit],
        "total": len(items),
        "successful_queries": len([i for i in items if i["status"] == "ok"]),
        "failed_queries": len([i for i in items if i["status"] == "error"]),
    }


@router.get(
    "/contests/{contest_id}/online-status",
    summary="获取选手在线状态",
    description="基于第三方 /api/log/token 的使用日志判断在线状态：最近 5 分钟内有调用记录则在线。",
)
async def get_contest_online_status(
    contest_id: int,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    获取比赛所有选手的在线状态

    Returns:
        {registration_id: bool} 字典，True 表示在线
    """
    # 使用 contest 级别缓存，避免惊群效应
    status_map = await _get_contest_online_status_cached(contest_id, db)

    # 设置 HTTP 缓存，与内存缓存对齐
    response.headers["Cache-Control"] = f"public, max-age={_CONTEST_ONLINE_CACHE_TTL}"

    return status_map


@router.get(
    "/registrations/{registration_id}/quota",
    summary="获取单个选手的额度信息",
    description="获取指定选手的 API 额度信息。",
)
async def get_registration_quota(
    registration_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个选手的额度信息"""

    # 获取报名信息
    reg_result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration_id)
    )
    registration = reg_result.scalar_one_or_none()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报名记录不存在"
        )

    if not registration.api_key:
        return {
            "registration_id": registration_id,
            "title": registration.title,
            "quota": None,
            "status": "no_api_key",
            "message": "该选手未设置 API Key",
        }

    # 查询额度
    quota_info = await quota_service.get_quota(registration.api_key)

    if not quota_info:
        return {
            "registration_id": registration_id,
            "title": registration.title,
            "quota": None,
            "status": "error",
            "message": "额度查询失败，请检查 API Key 是否有效",
        }

    return {
        "registration_id": registration_id,
        "title": registration.title,
        "user": {
            "id": registration.user.id,
            "username": registration.user.username,
            "display_name": registration.user.display_name,
            "avatar_url": registration.user.avatar_url,
        } if registration.user else None,
        "quota": {
            "used": round(quota_info.used, 2),
            "today_used": round(quota_info.today_used, 2),
            "remaining": round(quota_info.remaining, 2),
            "total": round(quota_info.total, 2),
            "is_unlimited": quota_info.is_unlimited,
            "username": quota_info.username,
            "group": quota_info.group,
        },
        "status": "ok",
    }


@router.get(
    "/registrations/{registration_id}/quota-logs",
    summary="获取选手的调用日志",
    description="获取选手的 API 调用日志（最近记录）。",
)
async def get_registration_quota_logs(
    registration_id: int,
    limit: int = Query(50, ge=1, le=200, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取选手的调用日志"""

    # 获取报名信息
    reg_result = await db.execute(
        select(Registration).where(Registration.id == registration_id)
    )
    registration = reg_result.scalar_one_or_none()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报名记录不存在"
        )

    if not registration.api_key:
        return {
            "registration_id": registration_id,
            "logs": [],
            "status": "no_api_key",
            "message": "该选手未设置 API Key",
        }

    # 调用日志 API
    base_url = settings.QUOTA_BASE_URLS[0] if settings.QUOTA_BASE_URLS else "https://api.ikuncode.cc"
    url = f"{base_url.rstrip('/')}/api/log/token"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 添加排序参数，获取最新的日志
            resp = await client.get(
                url,
                params={
                    "key": registration.api_key,
                    "p": 0,  # 第一页
                    "order": "desc",  # 倒序（最新的在前）
                },
                headers={"Accept": "application/json"}
            )

            if resp.status_code != 200:
                return {
                    "registration_id": registration_id,
                    "logs": [],
                    "status": "error",
                    "message": f"日志查询失败: {resp.status_code}",
                }

            data = resp.json()
            if not data.get("success"):
                return {
                    "registration_id": registration_id,
                    "logs": [],
                    "status": "error",
                    "message": "日志查询失败",
                }

            logs = data.get("data", [])
            if not isinstance(logs, list):
                logs = []

            # API 返回的数据是按时间升序排列的（最早在前）
            # 取最后的 limit 条（最新的），然后反转顺序（最新在前）
            total_logs = len(logs)
            recent_logs = logs[-limit:] if len(logs) > limit else logs
            recent_logs = list(reversed(recent_logs))  # 反转，最新的在前面

            return {
                "registration_id": registration_id,
                "logs": recent_logs,
                "total": total_logs,
                "status": "ok",
            }

    except Exception as e:
        logger.warning("获取调用日志失败: %s", e)
        return {
            "registration_id": registration_id,
            "logs": [],
            "status": "error",
            "message": f"日志查询失败: {str(e)}",
        }
