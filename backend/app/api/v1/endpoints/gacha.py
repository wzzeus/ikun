"""
扭蛋机 API
消耗积分随机获得积分/道具/徽章/API Key 兑换码
完全从数据库读取配置，支持后台管理
"""
import random
import json
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User
from app.models.points import PointsReason, UserItem
from app.models.gacha import GachaConfig, GachaPrize, GachaDraw, GachaPrizeType
from app.services.points_service import PointsService

router = APIRouter()


# ========== Schema ==========

class GachaConfigResponse(BaseModel):
    """扭蛋机配置信息"""
    id: int
    name: str
    cost_points: int
    daily_limit: Optional[int]
    is_active: bool


class GachaStatusResponse(BaseModel):
    """扭蛋机状态"""
    config: Optional[GachaConfigResponse]
    cost: int
    user_balance: int
    gacha_tickets: int = 0
    can_play: bool
    daily_limit: int
    today_count: int
    remaining_today: int


class GachaPrizeInfo(BaseModel):
    """奖品信息"""
    id: int
    type: str
    name: str
    is_rare: bool
    weight: float


class GachaPlayRequest(BaseModel):
    """扭蛋请求"""
    use_ticket: bool = False


class GachaPlayResponse(BaseModel):
    """扭蛋结果"""
    success: bool
    prize_type: str
    prize_name: str
    prize_value: dict
    is_rare: bool
    cost: int
    used_ticket: bool = False
    remaining_balance: int


class GachaPrizesResponse(BaseModel):
    """奖池列表"""
    prizes: List[GachaPrizeInfo]
    total_weight: float


# ========== 管理员 Schema ==========

class GachaConfigUpdate(BaseModel):
    """更新扭蛋机配置"""
    name: Optional[str] = None
    cost_points: Optional[int] = None
    daily_limit: Optional[int] = None
    is_active: Optional[bool] = None


class GachaPrizeCreate(BaseModel):
    """创建奖品"""
    prize_type: str
    prize_name: str
    prize_value: Optional[dict] = None
    weight: float = 1.0
    stock: Optional[int] = None
    is_rare: bool = False
    is_enabled: bool = True
    sort_order: int = 0


class GachaPrizeUpdate(BaseModel):
    """更新奖品"""
    prize_name: Optional[str] = None
    prize_value: Optional[dict] = None
    weight: Optional[float] = None
    stock: Optional[int] = None
    is_rare: Optional[bool] = None
    is_enabled: Optional[bool] = None
    sort_order: Optional[int] = None


# ========== 辅助函数 ==========

async def get_active_config(db: AsyncSession) -> Optional[GachaConfig]:
    """获取当前激活的扭蛋机配置"""
    result = await db.execute(
        select(GachaConfig)
        .options(selectinload(GachaConfig.prizes))
        .where(GachaConfig.is_active == True)
        .order_by(GachaConfig.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def weighted_random_choice(prizes: List[GachaPrize]) -> GachaPrize:
    """根据权重随机选择奖品"""
    enabled_prizes = [p for p in prizes if p.is_enabled and (p.stock is None or p.stock > 0)]
    if not enabled_prizes:
        raise ValueError("没有可用的奖品")

    total_weight = sum(float(p.weight) for p in enabled_prizes)
    rand = random.uniform(0, total_weight)
    current_weight = 0

    for prize in enabled_prizes:
        current_weight += float(prize.weight)
        if rand < current_weight:
            return prize

    return enabled_prizes[-1]


async def get_today_gacha_count(db: AsyncSession, user_id: int, config_id: int) -> int:
    """获取用户今日扭蛋次数"""
    today_start = datetime.combine(date.today(), datetime.min.time())
    result = await db.execute(
        select(func.count(GachaDraw.id))
        .where(
            and_(
                GachaDraw.user_id == user_id,
                GachaDraw.config_id == config_id,
                GachaDraw.used_ticket == False,  # 只统计积分消耗的次数
                GachaDraw.created_at >= today_start
            )
        )
    )
    return result.scalar() or 0


async def grant_points_reward(db: AsyncSession, user_id: int, amount: int, description: str) -> None:
    """发放积分奖励"""
    await PointsService.add_points(
        db=db, user_id=user_id, amount=amount,
        reason=PointsReason.GACHA_WIN,
        ref_type="gacha", ref_id=0,
        description=description, auto_commit=False
    )


async def grant_item_reward(db: AsyncSession, user_id: int, item_type: str, amount: int) -> None:
    """发放道具奖励"""
    # 先查询是否存在
    result = await db.execute(
        select(UserItem).where(
            UserItem.user_id == user_id,
            UserItem.item_type == item_type
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.quantity += amount
    else:
        db.add(UserItem(user_id=user_id, item_type=item_type, quantity=amount))


async def grant_badge_reward(db: AsyncSession, user_id: int, achievement_key: str) -> bool:
    """发放徽章奖励"""
    from app.models.achievement import UserAchievement, AchievementStatus

    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_key == achievement_key
        )
    )
    if result.scalar_one_or_none():
        return False

    new_achievement = UserAchievement(
        user_id=user_id, achievement_key=achievement_key,
        status=AchievementStatus.CLAIMED.value, progress_value=1,
        unlocked_at=datetime.utcnow(), claimed_at=datetime.utcnow()
    )
    db.add(new_achievement)
    return True


async def grant_api_key_reward(db: AsyncSession, user_id: int, usage_type: str) -> Optional[Dict[str, Any]]:
    """分配 API Key 兑换码"""
    from app.services.lottery_service import LotteryService
    return await LotteryService._assign_api_key(db, user_id, usage_type)


# ========== 用户接口 ==========

@router.get("/status", response_model=GachaStatusResponse)
async def get_gacha_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取扭蛋机状态"""
    from app.services.exchange_service import ExchangeService

    config = await get_active_config(db)
    if not config:
        return GachaStatusResponse(
            config=None, cost=0, user_balance=0, gacha_tickets=0,
            can_play=False, daily_limit=0, today_count=0, remaining_today=0
        )

    user_balance = await PointsService.get_balance(db, current_user.id)
    tickets = await ExchangeService.get_user_tickets(db, current_user.id)
    gacha_tickets = tickets.get("GACHA_TICKET", 0)

    today_count = await get_today_gacha_count(db, current_user.id, config.id)
    daily_limit = config.daily_limit or 999999
    remaining_today = max(0, daily_limit - today_count)

    can_play = config.is_active and (gacha_tickets > 0 or (remaining_today > 0 and user_balance >= config.cost_points))

    return GachaStatusResponse(
        config=GachaConfigResponse(
            id=config.id, name=config.name, cost_points=config.cost_points,
            daily_limit=config.daily_limit, is_active=config.is_active
        ),
        cost=config.cost_points,
        user_balance=user_balance,
        gacha_tickets=gacha_tickets,
        can_play=can_play,
        daily_limit=daily_limit,
        today_count=today_count,
        remaining_today=remaining_today
    )


@router.get("/prizes", response_model=GachaPrizesResponse)
async def get_gacha_prizes(db: AsyncSession = Depends(get_db)):
    """获取扭蛋机奖池列表"""
    config = await get_active_config(db)
    if not config:
        return GachaPrizesResponse(prizes=[], total_weight=0)

    prizes = [
        GachaPrizeInfo(
            id=p.id, type=p.prize_type.value, name=p.prize_name,
            is_rare=p.is_rare, weight=float(p.weight)
        )
        for p in config.prizes if p.is_enabled
    ]
    total_weight = sum(p.weight for p in prizes)
    return GachaPrizesResponse(prizes=prizes, total_weight=total_weight)


@router.post("/play", response_model=GachaPlayResponse)
@limiter.limit(RateLimits.LOTTERY)
async def play_gacha(
    request: Request,
    body: GachaPlayRequest = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """扭蛋机抽奖"""
    from app.services.exchange_service import ExchangeService

    user_id = current_user.id
    use_ticket = body.use_ticket if body else False

    try:
        config = await get_active_config(db)
        if not config or not config.is_active:
            raise HTTPException(status_code=400, detail="扭蛋机未开放")

        if not config.prizes:
            raise HTTPException(status_code=400, detail="奖池为空")

        used_ticket = False
        actual_cost = config.cost_points

        if use_ticket:
            used_ticket = await ExchangeService.use_ticket(db, user_id, "GACHA_TICKET")

        if used_ticket:
            actual_cost = 0
        else:
            # 管理员不受日限限制
            is_admin = current_user.role == "admin"
            if config.daily_limit and not is_admin:
                today_count = await get_today_gacha_count(db, user_id, config.id)
                if today_count >= config.daily_limit:
                    raise HTTPException(status_code=400, detail=f"今日次数已用完（{today_count}/{config.daily_limit}）")

            user_balance = await PointsService.get_balance(db, user_id)
            if user_balance < config.cost_points:
                raise HTTPException(status_code=400, detail=f"积分不足，需要 {config.cost_points} 积分")

            await PointsService.deduct_points(
                db=db, user_id=user_id, amount=config.cost_points,
                reason=PointsReason.GACHA_SPEND, ref_type="gacha", ref_id=0,
                description="扭蛋机抽奖", auto_commit=False
            )

        # 随机抽取奖品
        prize = weighted_random_choice(config.prizes)
        prize_value = prize.prize_value or {}
        if isinstance(prize_value, str):
            prize_value = json.loads(prize_value)

        result_prize_name = prize.prize_name
        result_prize_type = prize.prize_type.value
        result_prize_value = prize_value.copy()
        result_is_rare = prize.is_rare

        # 发放奖励
        if prize.prize_type == GachaPrizeType.POINTS:
            amount = prize_value.get("amount", 0)
            await grant_points_reward(db, user_id, amount, f"扭蛋机中奖: {prize.prize_name}")
        elif prize.prize_type == GachaPrizeType.ITEM:
            item_type = prize_value.get("item_type")
            amount = prize_value.get("amount", 1)
            if item_type:
                await grant_item_reward(db, user_id, item_type, amount)
        elif prize.prize_type == GachaPrizeType.BADGE:
            achievement_key = prize_value.get("achievement_key")
            if achievement_key:
                badge_granted = await grant_badge_reward(db, user_id, achievement_key)
                if not badge_granted:
                    fallback_points = prize_value.get("fallback_points", 50)
                    await grant_points_reward(db, user_id, fallback_points, f"扭蛋机中奖: {prize.prize_name}（已拥有，转换为{fallback_points}积分）")
                    result_prize_name = f"{fallback_points}积分（已有徽章）"
                    result_prize_type = "points"
                    result_prize_value = {"amount": fallback_points}
        elif prize.prize_type == GachaPrizeType.API_KEY:
            usage_type = prize_value.get("usage_type", "扭蛋机")
            api_key_info = await grant_api_key_reward(db, user_id, usage_type)
            if api_key_info:
                result_prize_value = {"code": api_key_info["code"], "quota": api_key_info["quota"]}
            else:
                # API Key库存不足，仅提示用户
                result_prize_name = "API Key（已发完）"
                result_prize_type = "empty"
                result_prize_value = {"message": "抱歉，API Key兑换码已被抽完！"}
                result_is_rare = False

        # 扣减库存（使用原子 UPDATE 防止并发超卖）
        if prize.stock is not None:
            from sqlalchemy import text
            deduct_result = await db.execute(
                text("UPDATE gacha_prizes SET stock = stock - 1 WHERE id = :prize_id AND stock > 0"),
                {"prize_id": prize.id}
            )
            if deduct_result.rowcount == 0:
                # 库存扣减失败（已被其他请求抢完）
                await db.rollback()
                raise ValueError("奖品库存不足，请重试")

        # 记录抽奖
        draw = GachaDraw(
            user_id=user_id, config_id=config.id, prize_id=prize.id,
            cost_points=actual_cost, prize_type=result_prize_type,
            prize_name=result_prize_name, prize_value=result_prize_value,
            is_rare=result_is_rare, used_ticket=used_ticket
        )
        db.add(draw)

        # 记录任务进度
        from app.services.task_service import TaskService
        from app.models.task import TaskType
        await TaskService.record_event(
            db=db, user_id=user_id, task_type=TaskType.GACHA, delta=1,
            event_key=f"gacha:{datetime.utcnow().timestamp()}",
            ref_type="gacha", ref_id=0, auto_claim=True
        )

        # 更新成就进度并检测解锁
        from app.services.achievement_service import (
            update_user_stats_on_gacha, check_and_unlock_achievements
        )
        user_stats = await update_user_stats_on_gacha(db, user_id, result_is_rare)
        await check_and_unlock_achievements(db, user_id, user_stats)

        await db.commit()

        remaining_balance = await PointsService.get_balance(db, user_id)

        return GachaPlayResponse(
            success=True, prize_type=result_prize_type, prize_name=result_prize_name,
            prize_value=result_prize_value, is_rare=result_is_rare,
            cost=actual_cost, used_ticket=used_ticket, remaining_balance=remaining_balance
        )

    except HTTPException:
        raise
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        import logging
        import traceback
        logging.error(f"扭蛋机处理失败: user_id={user_id}, error={str(e)}")
        logging.error(f"详细堆栈:\n{traceback.format_exc()}")
        print(f"扭蛋机错误: {traceback.format_exc()}")  # 打印到控制台
        raise HTTPException(status_code=500, detail=f"扭蛋机处理失败: {str(e)}")


# ========== 管理员接口 ==========

def require_admin(user: User):
    """检查管理员权限"""
    real_role = user.original_role or user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")


@router.get("/admin/config")
async def get_gacha_admin_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取扭蛋机管理配置"""
    require_admin(current_user)

    result = await db.execute(
        select(GachaConfig).options(selectinload(GachaConfig.prizes)).order_by(GachaConfig.id.desc())
    )
    configs = result.scalars().all()

    return {
        "configs": [
            {
                "id": c.id,
                "name": c.name,
                "cost_points": c.cost_points,
                "daily_limit": c.daily_limit,
                "is_active": c.is_active,
                "prizes_count": len(c.prizes),
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in configs
        ]
    }


@router.put("/admin/config/{config_id}")
async def update_gacha_config(
    config_id: int,
    data: GachaConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新扭蛋机配置"""
    require_admin(current_user)

    result = await db.execute(select(GachaConfig).where(GachaConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)

    await db.commit()
    return {"success": True, "message": "配置已更新"}


@router.get("/admin/prizes/{config_id}")
async def get_gacha_prizes_admin(
    config_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取扭蛋机奖品列表（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(GachaPrize).where(GachaPrize.config_id == config_id).order_by(GachaPrize.sort_order)
    )
    prizes = result.scalars().all()

    return {
        "prizes": [
            {
                "id": p.id,
                "prize_type": p.prize_type.value,
                "prize_name": p.prize_name,
                "prize_value": p.prize_value,
                "weight": float(p.weight),
                "stock": p.stock,
                "is_rare": p.is_rare,
                "is_enabled": p.is_enabled,
                "sort_order": p.sort_order
            }
            for p in prizes
        ]
    }


@router.post("/admin/prizes/{config_id}")
async def create_gacha_prize(
    config_id: int,
    data: GachaPrizeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建扭蛋机奖品"""
    require_admin(current_user)

    prize = GachaPrize(
        config_id=config_id,
        prize_type=GachaPrizeType(data.prize_type),
        prize_name=data.prize_name,
        prize_value=data.prize_value,
        weight=Decimal(str(data.weight)),
        stock=data.stock,
        is_rare=data.is_rare,
        is_enabled=data.is_enabled,
        sort_order=data.sort_order
    )
    db.add(prize)
    await db.commit()
    await db.refresh(prize)

    return {"success": True, "id": prize.id}


@router.put("/admin/prizes/{config_id}/{prize_id}")
async def update_gacha_prize(
    config_id: int,
    prize_id: int,
    data: GachaPrizeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新扭蛋机奖品"""
    require_admin(current_user)

    result = await db.execute(
        select(GachaPrize).where(GachaPrize.id == prize_id, GachaPrize.config_id == config_id)
    )
    prize = result.scalar_one_or_none()
    if not prize:
        raise HTTPException(status_code=404, detail="奖品不存在")

    update_data = data.dict(exclude_unset=True)
    if "weight" in update_data:
        update_data["weight"] = Decimal(str(update_data["weight"]))

    for key, value in update_data.items():
        setattr(prize, key, value)

    await db.commit()
    return {"success": True}


@router.delete("/admin/prizes/{config_id}/{prize_id}")
async def delete_gacha_prize(
    config_id: int,
    prize_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除扭蛋机奖品"""
    require_admin(current_user)

    result = await db.execute(
        select(GachaPrize).where(GachaPrize.id == prize_id, GachaPrize.config_id == config_id)
    )
    prize = result.scalar_one_or_none()
    if not prize:
        raise HTTPException(status_code=404, detail="奖品不存在")

    await db.delete(prize)
    await db.commit()
    return {"success": True}


class AdminTestDrawResponse(BaseModel):
    """管理员测试抽奖响应"""
    success: bool
    prize_name: str
    prize_type: str
    api_key_code: Optional[str] = None
    api_key_quota: Optional[float] = None
    message: str


@router.post("/admin/test-draw-apikey", response_model=AdminTestDrawResponse)
async def admin_test_draw_apikey(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    管理员测试：强制抽中 API Key 兑换码
    - 仅管理员可用
    - 不消耗积分
    - 直接分配一个可用的 API Key
    """
    require_admin(current_user)
    user_id = current_user.id

    try:
        api_key_info = await grant_api_key_reward(db, user_id, "扭蛋机")

        if api_key_info:
            await db.commit()
            return AdminTestDrawResponse(
                success=True,
                prize_name="API Key 兑换码",
                prize_type="API_KEY",
                api_key_code=api_key_info["code"],
                api_key_quota=api_key_info["quota"],
                message="测试成功！已分配 API Key 兑换码"
            )
        else:
            return AdminTestDrawResponse(
                success=False,
                prize_name="API Key（已发完）",
                prize_type="EMPTY",
                message="API Key 库存不足，无法分配"
            )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"测试失败: {str(e)}")


@router.get("/admin/stats")
async def get_gacha_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取扭蛋机统计数据"""
    require_admin(current_user)

    # 总抽奖次数
    total_draws = await db.scalar(select(func.count(GachaDraw.id)))

    # 今日抽奖次数
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_draws = await db.scalar(
        select(func.count(GachaDraw.id)).where(GachaDraw.created_at >= today_start)
    )

    # 总消耗积分
    total_cost = await db.scalar(select(func.sum(GachaDraw.cost_points))) or 0

    # 稀有奖品发放数
    rare_count = await db.scalar(
        select(func.count(GachaDraw.id)).where(GachaDraw.is_rare == True)
    )

    return {
        "total_draws": total_draws or 0,
        "today_draws": today_draws or 0,
        "total_cost_points": total_cost,
        "rare_prizes_count": rare_count or 0
    }
