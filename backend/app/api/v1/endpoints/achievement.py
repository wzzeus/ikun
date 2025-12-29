"""
成就系统 API 端点

提供成就相关功能：
- 获取成就列表
- 获取用户成就
- 领取成就奖励
- 管理徽章展示
- 徽章兑换积分
"""
import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.achievement import AchievementDefinition, UserStats, UserAchievement, AchievementStatus
from app.models.points import PointsReason, PointsLedger
from app.services import achievement_service
from app.services.points_service import PointsService
from app.core.dependencies import get_current_user, get_optional_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# 请求/响应模型
# ============================================================================

class BadgeShowcaseRequest(BaseModel):
    """设置徽章展示请求"""
    slot: int
    achievement_key: str


class BadgeExchangeRequest(BaseModel):
    """徽章兑换积分请求"""
    achievement_key: str


# 徽章兑换积分配置（根据稀有度）
BADGE_EXCHANGE_RATES = {
    "bronze": 50,     # 青铜徽章兑换50积分
    "silver": 100,    # 白银徽章兑换100积分
    "gold": 200,      # 黄金徽章兑换200积分
    "diamond": 500,   # 钻石徽章兑换500积分
    "star": 1000,     # 星耀徽章兑换1000积分
    "king": 2000,     # 王者徽章兑换2000积分
}


# ============================================================================
# API 端点
# ============================================================================

@router.get(
    "/achievements",
    summary="获取所有成就定义",
    description="获取所有可用成就的定义信息。",
)
async def get_achievement_definitions(
    db: AsyncSession = Depends(get_db),
):
    """获取所有成就定义"""
    result = await db.execute(
        select(AchievementDefinition)
        .where(AchievementDefinition.is_active == True)
        .order_by(AchievementDefinition.sort_order)
    )
    definitions = result.scalars().all()

    return {
        "items": [
            {
                "achievement_key": d.achievement_key,
                "name": d.name,
                "description": d.description,
                "category": d.category,
                "badge_icon": d.badge_icon,
                "badge_tier": d.badge_tier,
                "points": d.points,
                "target_value": d.target_value,
            }
            for d in definitions
        ],
        "total": len(definitions),
    }


@router.get(
    "/users/me/achievements",
    summary="获取当前用户的成就",
    description="获取当前登录用户的所有成就及进度。",
)
async def get_my_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的成就"""
    achievements = await achievement_service.get_user_achievements(db, current_user.id)

    # 按分类分组
    by_category = {}
    for ach in achievements:
        cat = ach["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(ach)

    # 统计
    total = len(achievements)
    unlocked = sum(1 for a in achievements if a["status"] in ["unlocked", "claimed"])
    claimed = sum(1 for a in achievements if a["status"] == "claimed")

    return {
        "items": achievements,
        "by_category": by_category,
        "stats": {
            "total": total,
            "unlocked": unlocked,
            "claimed": claimed,
            "progress_percent": int((unlocked / total) * 100) if total > 0 else 0,
        },
    }


@router.get(
    "/users/me/stats",
    summary="获取当前用户的统计数据",
    description="获取当前登录用户的打气统计等数据。",
)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的统计数据"""
    stats = await achievement_service.get_or_create_user_stats(db, current_user.id)

    return {
        "total_cheers_given": stats.total_cheers_given,
        "total_cheers_with_message": stats.total_cheers_with_message,
        "cheer_types_used": stats.cheer_types_used or [],
        "consecutive_days": stats.consecutive_days,
        "max_consecutive_days": stats.max_consecutive_days,
        "last_cheer_date": str(stats.last_cheer_date) if stats.last_cheer_date else None,
        "total_points": stats.total_points,
        "achievements_unlocked": stats.achievements_unlocked,
    }


@router.post(
    "/users/me/achievements/{achievement_key}/claim",
    summary="领取成就奖励",
    description="领取已解锁成就的积分奖励。",
)
async def claim_achievement(
    achievement_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """领取成就奖励"""
    success, points = await achievement_service.claim_achievement(
        db, current_user.id, achievement_key
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法领取该成就，可能尚未解锁或已领取"
        )

    await db.commit()

    return {
        "success": True,
        "achievement_key": achievement_key,
        "points_awarded": points,
        "message": f"恭喜获得 {points} 积分！",
    }


@router.get(
    "/users/me/badges",
    summary="获取当前用户展示的徽章",
    description="获取当前用户在个人页展示的徽章列表。",
)
async def get_my_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户展示的徽章"""
    badges = await achievement_service.get_user_badge_showcase(db, current_user.id)

    return {
        "items": badges,
        "max_slots": 3,
    }


@router.put(
    "/users/me/badges",
    summary="设置展示徽章",
    description="将已获得的成就设置为展示徽章。",
)
async def set_my_badge(
    payload: BadgeShowcaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """设置展示徽章"""
    if payload.slot < 1 or payload.slot > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="槽位只能是 1-3"
        )

    success = await achievement_service.set_badge_showcase(
        db, current_user.id, payload.slot, payload.achievement_key
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法设置该徽章，可能尚未获得该成就"
        )

    await db.commit()

    return {
        "success": True,
        "slot": payload.slot,
        "achievement_key": payload.achievement_key,
    }


@router.delete(
    "/users/me/badges/{slot}",
    summary="移除展示徽章",
    description="移除指定槽位的展示徽章。",
)
async def remove_my_badge(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """移除展示徽章"""
    if slot < 1 or slot > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="槽位只能是 1-3"
        )

    success = await achievement_service.remove_badge_showcase(db, current_user.id, slot)

    await db.commit()

    return {
        "success": success,
        "slot": slot,
    }


@router.get(
    "/users/{user_id}/achievements",
    summary="获取指定用户的成就",
    description="获取指定用户的已解锁成就（公开信息）。",
)
async def get_user_achievements(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户的成就"""
    achievements = await achievement_service.get_user_achievements(db, user_id)

    # 只返回已解锁/已领取的成就（公开信息）
    public_achievements = [
        a for a in achievements if a["status"] in ["unlocked", "claimed"]
    ]

    return {
        "items": public_achievements,
        "total_unlocked": len(public_achievements),
    }


@router.get(
    "/users/{user_id}/badges",
    summary="获取指定用户展示的徽章",
    description="获取指定用户展示的徽章（公开信息）。",
)
async def get_user_badges(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户展示的徽章"""
    badges = await achievement_service.get_user_badge_showcase(db, user_id)

    return {
        "items": badges,
    }


@router.get(
    "/users/{user_id}/stats",
    summary="获取指定用户的公开统计",
    description="获取指定用户的公开统计数据。",
)
async def get_user_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户的公开统计"""
    result = await db.execute(
        select(UserStats).where(UserStats.user_id == user_id)
    )
    stats = result.scalar_one_or_none()

    if not stats:
        return {
            "total_cheers_given": 0,
            "total_points": 0,
            "achievements_unlocked": 0,
            "max_consecutive_days": 0,
        }

    return {
        "total_cheers_given": stats.total_cheers_given,
        "total_points": stats.total_points,
        "achievements_unlocked": stats.achievements_unlocked,
        "max_consecutive_days": stats.max_consecutive_days,
    }


# ============================================================================
# 徽章兑换积分
# ============================================================================

@router.get(
    "/users/me/badges/exchangeable",
    summary="获取可兑换的徽章列表",
    description="获取当前用户可以兑换积分的徽章列表（已解锁/已领取且未兑换过的徽章）。",
)
async def get_exchangeable_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取可兑换积分的徽章列表"""
    # 查询用户已解锁的成就
    result = await db.execute(
        select(UserAchievement, AchievementDefinition)
        .join(AchievementDefinition, UserAchievement.achievement_key == AchievementDefinition.achievement_key)
        .where(
            UserAchievement.user_id == current_user.id,
            UserAchievement.status.in_([AchievementStatus.UNLOCKED.value, AchievementStatus.CLAIMED.value])
        )
    )
    rows = result.all()

    # 查询已兑换过的徽章
    user_achievement_ids = [user_ach.id for user_ach, _ in rows]
    exchanged_ids = set()
    if user_achievement_ids:
        exchanged_result = await db.execute(
            select(PointsLedger.ref_id).where(
                PointsLedger.user_id == current_user.id,
                PointsLedger.reason == PointsReason.BADGE_EXCHANGE,
                PointsLedger.ref_type == "badge_exchange",
                PointsLedger.ref_id.in_(user_achievement_ids),
            )
        )
        exchanged_ids = {row[0] for row in exchanged_result.all()}

    badges = []
    for user_ach, definition in rows:
        # 排除已兑换过的徽章
        if user_ach.id in exchanged_ids:
            continue
        tier = definition.badge_tier or "bronze"
        exchange_points = BADGE_EXCHANGE_RATES.get(tier, 50)
        badges.append({
            "achievement_key": definition.achievement_key,
            "name": definition.name,
            "description": definition.description,
            "icon": definition.badge_icon,
            "tier": tier,
            "exchange_points": exchange_points,
            "unlocked_at": user_ach.unlocked_at.isoformat() if user_ach.unlocked_at else None,
        })

    return {
        "items": badges,
        "total": len(badges),
        "exchange_rates": BADGE_EXCHANGE_RATES,
    }


@router.post(
    "/users/me/badges/exchange",
    summary="徽章兑换积分",
    description="将已获得的徽章兑换为积分。每个徽章可多次兑换（如果多次获得）。",
)
async def exchange_badge_for_points(
    payload: BadgeExchangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """徽章兑换积分"""
    achievement_key = payload.achievement_key

    # 检查徽章定义是否存在
    result = await db.execute(
        select(AchievementDefinition).where(
            AchievementDefinition.achievement_key == achievement_key
        )
    )
    definition = result.scalar_one_or_none()

    if not definition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="徽章不存在"
        )

    # 检查用户是否拥有该徽章
    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == current_user.id,
            UserAchievement.achievement_key == achievement_key,
            UserAchievement.status.in_([AchievementStatus.UNLOCKED.value, AchievementStatus.CLAIMED.value])
        )
    )
    user_achievement = result.scalar_one_or_none()

    if not user_achievement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="你还没有获得这个徽章"
        )

    # 防重复兑换检查
    existing_exchange = await db.execute(
        select(PointsLedger.id).where(
            PointsLedger.user_id == current_user.id,
            PointsLedger.reason == PointsReason.BADGE_EXCHANGE,
            PointsLedger.ref_type == "badge_exchange",
            PointsLedger.ref_id == user_achievement.id,
        )
    )
    if existing_exchange.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该徽章已兑换过"
        )

    # 计算兑换积分
    tier = definition.badge_tier or "bronze"
    exchange_points = BADGE_EXCHANGE_RATES.get(tier, 50)

    try:
        # 发放积分
        await PointsService.add_points(
            db=db,
            user_id=current_user.id,
            amount=exchange_points,
            reason=PointsReason.BADGE_EXCHANGE,
            ref_type="badge_exchange",
            ref_id=user_achievement.id,
            description=f"徽章兑换: {definition.name}",
            auto_commit=False
        )

        await db.commit()

        # 获取更新后的余额
        balance = await PointsService.get_balance(db, current_user.id)

        return {
            "success": True,
            "achievement_key": achievement_key,
            "badge_name": definition.name,
            "points_earned": exchange_points,
            "balance": balance,
            "message": f"成功兑换「{definition.name}」徽章，获得 {exchange_points} 积分！"
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"徽章兑换失败: user_id={current_user.id}, key={achievement_key}, error={str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="兑换失败，请稍后再试"
        )
