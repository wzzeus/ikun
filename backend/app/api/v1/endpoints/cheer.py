"""
打气互动相关 API 端点

提供打气和道具赠送功能：
- 给选手打气
- 获取打气统计
- 获取人气排行榜
"""
import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel
from app.core.rate_limit import limiter, RateLimits
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.registration import Registration, RegistrationStatus
from app.models.cheer import Cheer, CheerType, CheerStats
from app.models.user import User
from app.models.points import UserItem
from app.api.v1.endpoints.registration import get_current_user, get_optional_user, get_contest_or_404
from app.services import achievement_service

# 道具分数配置（给选手加的分数）
ITEM_POINTS = {
    CheerType.CHEER: 1,
    CheerType.COFFEE: 2,
    CheerType.ENERGY: 3,
    CheerType.PIZZA: 4,
    CheerType.STAR: 5,
}

# 每种道具消耗数量（统一为1）
ITEM_COST = 1

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# 请求/响应模型
# ============================================================================

class CheerCreate(BaseModel):
    """打气请求"""
    cheer_type: CheerType = CheerType.CHEER
    message: Optional[str] = None


class CheerResponse(BaseModel):
    """打气响应"""
    success: bool
    message: str
    cheer_type: str
    total_cheers: int


# ============================================================================
# API 端点
# ============================================================================

@router.post(
    "/registrations/{registration_id}/cheer",
    response_model=CheerResponse,
    summary="给选手打气",
    description="给指定选手打气或赠送道具，消耗对应数量的道具。",
)
@limiter.limit(RateLimits.CHEER)
async def cheer_registration(
    request: Request,
    registration_id: int,
    payload: CheerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """给选手打气"""
    # 验证报名存在且有效
    reg_result = await db.execute(
        select(Registration).where(
            Registration.id == registration_id,
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value,
            ])
        )
    )
    registration = reg_result.scalar_one_or_none()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="选手不存在或未参赛"
        )

    # 不能给自己打气
    if registration.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能给自己打气哦"
        )

    # 获取道具分数和消耗
    item_points = ITEM_POINTS.get(payload.cheer_type, 1)
    item_type = payload.cheer_type.value  # cheer, coffee, energy, pizza, star

    # 检查用户道具余额
    item_result = await db.execute(
        select(UserItem).where(
            UserItem.user_id == current_user.id,
            UserItem.item_type == item_type,
        )
    )
    user_item = item_result.scalar_one_or_none()

    if not user_item or user_item.quantity < ITEM_COST:
        type_names = {
            CheerType.CHEER: "打气",
            CheerType.COFFEE: "咖啡",
            CheerType.ENERGY: "能量",
            CheerType.PIZZA: "披萨",
            CheerType.STAR: "星星",
        }
        current_qty = user_item.quantity if user_item else 0
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{type_names.get(payload.cheer_type, '道具')}不足，当前{current_qty}个"
        )

    # 扣除道具（每次消耗1个）
    user_item.quantity -= ITEM_COST

    # 创建打气记录
    cheer = Cheer(
        user_id=current_user.id,
        registration_id=registration_id,
        cheer_type=payload.cheer_type,
        message=payload.message[:200] if payload.message else None,
    )
    db.add(cheer)

    # 更新统计
    stats_result = await db.execute(
        select(CheerStats).where(CheerStats.registration_id == registration_id)
    )
    stats = stats_result.scalar_one_or_none()

    if not stats:
        stats = CheerStats(registration_id=registration_id)
        db.add(stats)

    # 根据类型增加计数（每种道具的次数+1）
    if payload.cheer_type == CheerType.CHEER:
        stats.cheer_count += 1
    elif payload.cheer_type == CheerType.COFFEE:
        stats.coffee_count += 1
    elif payload.cheer_type == CheerType.ENERGY:
        stats.energy_count += 1
    elif payload.cheer_type == CheerType.PIZZA:
        stats.pizza_count += 1
    elif payload.cheer_type == CheerType.STAR:
        stats.star_count += 1

    # 总分按道具分数增加
    stats.total_count += item_points

    # 更新用户成就进度
    has_message = bool(payload.message and payload.message.strip())
    user_stats = await achievement_service.update_user_stats_on_cheer(
        db,
        current_user.id,
        payload.cheer_type.value,
        has_message,
        registration_id,
    )

    # 检查并解锁成就
    # 获取比赛开始日期用于 early_supporter 成就
    from app.models.contest import Contest
    contest_start_date = None
    if registration.contest_id:
        contest_result = await db.execute(
            select(Contest.start_date).where(Contest.id == registration.contest_id)
        )
        contest_start_date = contest_result.scalar_one_or_none()

    newly_unlocked = await achievement_service.check_and_unlock_achievements(
        db, current_user.id, user_stats, contest_start_date
    )

    # 确保 cheer 有 id
    await db.flush()

    # 记录任务进度（打气任务）
    from app.services.task_service import TaskService
    from app.models.task import TaskType
    await TaskService.record_event(
        db=db,
        user_id=current_user.id,
        task_type=TaskType.CHEER,
        delta=1,
        event_key=f"cheer:{cheer.id}",
        ref_type="cheer",
        ref_id=cheer.id,
        auto_claim=True,
    )

    await db.commit()

    response_message = "打气成功！"
    if newly_unlocked:
        response_message += f" 解锁新成就: {len(newly_unlocked)}个"

    return CheerResponse(
        success=True,
        message=response_message,
        cheer_type=payload.cheer_type.value,
        total_cheers=stats.total_count,
    )


@router.get(
    "/contests/{contest_id}/cheers/stats",
    summary="批量获取比赛选手打气统计",
    description="返回指定比赛所有已批准选手的打气统计，避免列表页 N+1 请求。优化性能。",
)
async def get_contest_cheers_stats(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    批量获取比赛选手打气统计（列表页专用，不返回 recent_messages）

    性能优化：
    - 使用一次查询获取所有 registration_ids
    - 使用 IN 查询批量获取所有 CheerStats
    - 如果用户已登录，使用一次查询获取当天所有打气记录
    - 避免 N+1 查询问题
    """
    # 验证比赛存在
    await get_contest_or_404(db, contest_id)

    # 批量获取所有已批准的选手 ID
    reg_result = await db.execute(
        select(Registration.id).where(
            Registration.contest_id == contest_id,
            Registration.status == RegistrationStatus.APPROVED.value,
        )
    )
    registration_ids = reg_result.scalars().all()

    if not registration_ids:
        return {"data": {}}

    # 批量获取所有打气统计（一次查询）
    stats_result = await db.execute(
        select(CheerStats).where(CheerStats.registration_id.in_(registration_ids))
    )
    stats_map = {s.registration_id: s for s in stats_result.scalars().all()}

    # 如果用户已登录，批量查询当天是否已打气（一次查询，按类型分组）
    user_cheered_today_map = {}
    if current_user:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())

        cheered_result = await db.execute(
            select(Cheer.registration_id, Cheer.cheer_type).where(
                Cheer.user_id == current_user.id,
                Cheer.registration_id.in_(registration_ids),
                Cheer.created_at >= today_start,
                Cheer.created_at <= today_end,
            )
        )

        # 按 registration_id 分组，记录每种类型
        for reg_id, cheer_type in cheered_result.all():
            if reg_id not in user_cheered_today_map:
                user_cheered_today_map[reg_id] = {}
            user_cheered_today_map[reg_id][cheer_type.value] = True

    # 构建返回数据
    data = {}
    for reg_id in registration_ids:
        stats = stats_map.get(reg_id)

        payload = {
            "total": stats.total_count if stats else 0,
            "cheer_types": {
                "cheer": stats.cheer_count if stats else 0,
                "coffee": stats.coffee_count if stats else 0,
                "energy": stats.energy_count if stats else 0,
                "pizza": stats.pizza_count if stats else 0,
                "star": stats.star_count if stats else 0,
            },
        }

        # 仅在用户已登录时返回 user_cheered_today（按类型）
        if current_user:
            payload["user_cheered_today"] = user_cheered_today_map.get(reg_id, {})

        data[str(reg_id)] = payload

    return {"data": data}


@router.get(
    "/registrations/{registration_id}/cheers",
    summary="获取选手的打气统计",
    description="获取指定选手收到的打气和道具统计。",
)
async def get_registration_cheers(
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取选手的打气统计"""
    # 获取统计数据
    stats_result = await db.execute(
        select(CheerStats).where(CheerStats.registration_id == registration_id)
    )
    stats = stats_result.scalar_one_or_none()

    # 检查当前用户今天是否已打气
    user_cheered_today = {}
    if current_user:
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_end = datetime.combine(date.today(), datetime.max.time())

        cheers_query = select(Cheer.cheer_type).where(
            Cheer.user_id == current_user.id,
            Cheer.registration_id == registration_id,
            Cheer.created_at >= today_start,
            Cheer.created_at <= today_end,
        )
        cheers_result = await db.execute(cheers_query)
        for (cheer_type,) in cheers_result.all():
            user_cheered_today[cheer_type.value] = True

    # 获取最近的打气留言
    recent_query = (
        select(Cheer)
        .options(selectinload(Cheer.user))
        .where(
            Cheer.registration_id == registration_id,
            Cheer.message.isnot(None),
        )
        .order_by(Cheer.created_at.desc())
        .limit(10)
    )
    recent_result = await db.execute(recent_query)
    recent_cheers = recent_result.scalars().all()

    return {
        "registration_id": registration_id,
        "stats": {
            "cheer": stats.cheer_count if stats else 0,
            "coffee": stats.coffee_count if stats else 0,
            "energy": stats.energy_count if stats else 0,
            "pizza": stats.pizza_count if stats else 0,
            "star": stats.star_count if stats else 0,
            "total": stats.total_count if stats else 0,
        },
        "user_cheered_today": user_cheered_today,
        "recent_messages": [
            {
                "id": c.id,
                "cheer_type": c.cheer_type.value,
                "message": c.message,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "user": {
                    "id": c.user.id,
                    "username": c.user.username,
                    "display_name": c.user.display_name,
                    "avatar_url": c.user.avatar_url,
                } if c.user else None,
            }
            for c in recent_cheers
        ],
    }


@router.get(
    "/contests/{contest_id}/cheer-leaderboard",
    summary="获取人气排行榜",
    description="获取指定比赛的打气人气排行榜。",
)
async def get_cheer_leaderboard(
    contest_id: int,
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取人气排行榜"""
    # 获取比赛的所有报名ID
    reg_query = select(Registration.id).where(
        Registration.contest_id == contest_id,
        Registration.status.in_([
            RegistrationStatus.SUBMITTED.value,
            RegistrationStatus.APPROVED.value,
        ])
    )
    reg_result = await db.execute(reg_query)
    registration_ids = [r for r in reg_result.scalars().all()]

    if not registration_ids:
        return {"items": [], "total": 0}

    # 获取排行榜
    stats_query = (
        select(CheerStats)
        .where(CheerStats.registration_id.in_(registration_ids))
        .order_by(CheerStats.total_count.desc())
        .limit(limit)
    )
    stats_result = await db.execute(stats_query)
    stats_list = stats_result.scalars().all()

    # 获取报名详情
    if stats_list:
        detail_query = (
            select(Registration)
            .options(selectinload(Registration.user))
            .where(Registration.id.in_([s.registration_id for s in stats_list]))
        )
        detail_result = await db.execute(detail_query)
        reg_map = {r.id: r for r in detail_result.scalars().all()}
    else:
        reg_map = {}

    items = []
    for rank, stats in enumerate(stats_list, 1):
        reg = reg_map.get(stats.registration_id)
        if reg:
            items.append({
                "rank": rank,
                "registration_id": stats.registration_id,
                "title": reg.title,
                "stats": {
                    "cheer": stats.cheer_count,
                    "coffee": stats.coffee_count,
                    "energy": stats.energy_count,
                    "pizza": stats.pizza_count,
                    "star": stats.star_count,
                    "total": stats.total_count,
                },
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
            })

    return {
        "items": items,
        "total": len(items),
    }


@router.get(
    "/contests/{contest_id}/cheers/today",
    summary="获取今日打气动态",
    description="获取今日的打气动态列表。",
)
async def get_today_cheers(
    contest_id: int,
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取今日打气动态"""
    # 获取比赛的所有报名ID
    reg_query = select(Registration.id).where(
        Registration.contest_id == contest_id,
        Registration.status.in_([
            RegistrationStatus.SUBMITTED.value,
            RegistrationStatus.APPROVED.value,
        ])
    )
    reg_result = await db.execute(reg_query)
    registration_ids = [r for r in reg_result.scalars().all()]

    if not registration_ids:
        return {"items": [], "total": 0}

    # 获取今日打气记录
    today_start = datetime.combine(date.today(), datetime.min.time())

    cheers_query = (
        select(Cheer)
        .options(
            selectinload(Cheer.user),
            selectinload(Cheer.registration).selectinload(Registration.user)
        )
        .where(
            Cheer.registration_id.in_(registration_ids),
            Cheer.created_at >= today_start,
        )
        .order_by(Cheer.created_at.desc())
        .limit(limit)
    )
    cheers_result = await db.execute(cheers_query)
    cheers = cheers_result.scalars().all()

    items = []
    for cheer in cheers:
        items.append({
            "id": cheer.id,
            "cheer_type": cheer.cheer_type.value,
            "message": cheer.message,
            "created_at": cheer.created_at.isoformat() if cheer.created_at else None,
            "from_user": {
                "id": cheer.user.id,
                "username": cheer.user.username,
                "display_name": cheer.user.display_name,
                "avatar_url": cheer.user.avatar_url,
            } if cheer.user else None,
            "to_registration": {
                "id": cheer.registration.id,
                "title": cheer.registration.title,
                "user": {
                    "id": cheer.registration.user.id,
                    "username": cheer.registration.user.username,
                    "display_name": cheer.registration.user.display_name,
                } if cheer.registration and cheer.registration.user else None,
            } if cheer.registration else None,
        })

    return {
        "items": items,
        "total": len(items),
        "date": str(date.today()),
    }
