"""
扭蛋机 API
消耗积分随机获得积分/道具/徽章/API Key 兑换码
（API Key 从 api_key_codes 表按用途分配）
"""
import random
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert

from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User
from app.models.points import PointsReason, UserItem
from app.services.points_service import PointsService

router = APIRouter()

# 扭蛋机配置
GACHA_COST = 50  # 每次消耗积分
GACHA_DAILY_LIMIT = 30  # 每日限制次数

# 奖池配置（总权重=100，权重即概率百分比）
GACHA_PRIZES = [
    # 积分奖励 (64.8%)
    {"type": "points", "name": "10积分", "value": {"amount": 10}, "weight": 24.8, "is_rare": False},
    {"type": "points", "name": "30积分", "value": {"amount": 30}, "weight": 20, "is_rare": False},
    {"type": "points", "name": "50积分", "value": {"amount": 50}, "weight": 12, "is_rare": False},
    {"type": "points", "name": "100积分", "value": {"amount": 100}, "weight": 5, "is_rare": True},
    {"type": "points", "name": "200积分", "value": {"amount": 200}, "weight": 2, "is_rare": True},
    {"type": "points", "name": "500积分", "value": {"amount": 500}, "weight": 1, "is_rare": True},
    # API Key 兑换码 (0.2%) - 从 api_key_codes.description="彩蛋" 分配
    {"type": "api_key", "name": "神秘兑换码", "value": {"usage_type": "彩蛋"}, "weight": 0.2, "is_rare": True},
    # 道具奖励 (19%)
    {"type": "item", "name": "爱心x1", "value": {"item_type": "cheer", "amount": 1}, "weight": 8, "is_rare": False},
    {"type": "item", "name": "咖啡x1", "value": {"item_type": "coffee", "amount": 1}, "weight": 5, "is_rare": False},
    {"type": "item", "name": "能量x1", "value": {"item_type": "energy", "amount": 1}, "weight": 3, "is_rare": False},
    {"type": "item", "name": "披萨x1", "value": {"item_type": "pizza", "amount": 1}, "weight": 2, "is_rare": True},
    {"type": "item", "name": "星星x1", "value": {"item_type": "star", "amount": 1}, "weight": 1, "is_rare": True},
    # 徽章奖励 (16%) - 六级体系，可兑换积分
    {"type": "badge", "name": "幸运铜蛋", "value": {"achievement_key": "gacha_lucky_bronze", "tier": "bronze"}, "weight": 4, "is_rare": False},
    {"type": "badge", "name": "幸运银蛋", "value": {"achievement_key": "gacha_lucky_silver", "tier": "silver"}, "weight": 2, "is_rare": False},
    {"type": "badge", "name": "幸运金蛋", "value": {"achievement_key": "gacha_lucky_gold", "tier": "gold"}, "weight": 1.5, "is_rare": True},
    {"type": "badge", "name": "幸运钻蛋", "value": {"achievement_key": "gacha_lucky_diamond", "tier": "diamond"}, "weight": 0.5, "is_rare": True},
    {"type": "badge", "name": "幸运星耀", "value": {"achievement_key": "gacha_lucky_star", "tier": "star"}, "weight": 5, "is_rare": True},
    {"type": "badge", "name": "幸运王者", "value": {"achievement_key": "gacha_lucky_king", "tier": "king"}, "weight": 3, "is_rare": True},
]


# ========== Schema ==========

class GachaStatusResponse(BaseModel):
    """扭蛋机状态"""
    cost: int
    user_balance: int
    gacha_tickets: int = 0  # 扭蛋券数量
    can_play: bool
    total_weight: int = 0
    daily_limit: int = GACHA_DAILY_LIMIT
    today_count: int = 0
    remaining_today: int = GACHA_DAILY_LIMIT


class GachaPrizeInfo(BaseModel):
    """奖品信息"""
    type: str
    name: str
    is_rare: bool


class GachaPlayRequest(BaseModel):
    """扭蛋请求"""
    use_ticket: bool = False  # 是否优先使用扭蛋券


class GachaPlayResponse(BaseModel):
    """扭蛋结果"""
    success: bool
    prize_type: str
    prize_name: str
    prize_value: dict
    is_rare: bool
    cost: int
    used_ticket: bool = False  # 是否使用了扭蛋券
    remaining_balance: int


class GachaPrizesResponse(BaseModel):
    """奖池列表"""
    prizes: List[GachaPrizeInfo]


# ========== 辅助函数 ==========

def weighted_random_choice(prizes: list) -> dict:
    """根据权重随机选择奖品（支持小数权重）"""
    total_weight = sum(p["weight"] for p in prizes)
    # 使用 uniform 支持浮点数权重
    rand = random.uniform(0, total_weight)
    current_weight = 0

    for prize in prizes:
        current_weight += prize["weight"]
        if rand < current_weight:
            return prize

    return prizes[-1]


async def grant_points_reward(
    db: AsyncSession,
    user_id: int,
    amount: int,
    description: str
) -> None:
    """发放积分奖励"""
    await PointsService.add_points(
        db=db,
        user_id=user_id,
        amount=amount,
        reason=PointsReason.GACHA_WIN,
        ref_type="gacha",
        ref_id=0,
        description=description,
        auto_commit=False
    )


async def grant_item_reward(
    db: AsyncSession,
    user_id: int,
    item_type: str,
    amount: int
) -> None:
    """发放道具奖励"""
    stmt = insert(UserItem).values(
        user_id=user_id,
        item_type=item_type,
        quantity=amount
    ).on_duplicate_key_update(
        quantity=UserItem.quantity + amount
    )
    await db.execute(stmt)


async def grant_badge_reward(
    db: AsyncSession,
    user_id: int,
    achievement_key: str
) -> bool:
    """
    发放徽章奖励
    返回 True 表示成功发放，False 表示用户已拥有该徽章
    """
    from app.models.achievement import UserAchievement, AchievementStatus

    # 检查用户是否已拥有该徽章
    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_key == achievement_key
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        # 已拥有，返回 False
        return False

    # 创建徽章记录（直接设为已领取状态）
    new_achievement = UserAchievement(
        user_id=user_id,
        achievement_key=achievement_key,
        status=AchievementStatus.CLAIMED.value,
        progress_value=1,
        unlocked_at=datetime.utcnow(),
        claimed_at=datetime.utcnow()
    )
    db.add(new_achievement)
    return True


async def get_today_gacha_count(db: AsyncSession, user_id: int) -> int:
    """获取用户今日扭蛋次数（通过积分日志统计）"""
    from app.models.points import PointsLedger
    today_start = datetime.combine(date.today(), datetime.min.time())
    result = await db.execute(
        select(func.count(PointsLedger.id))
        .where(
            and_(
                PointsLedger.user_id == user_id,
                PointsLedger.reason == PointsReason.GACHA_SPEND,
                PointsLedger.created_at >= today_start
            )
        )
    )
    return result.scalar() or 0


async def grant_api_key_reward(
    db: AsyncSession,
    user_id: int,
    usage_type: str,
) -> Optional[Dict[str, Any]]:
    """
    分配 API Key 兑换码
    从 api_key_codes 表按 description 用途分配
    """
    from app.services.lottery_service import LotteryService
    return await LotteryService._assign_api_key(db, user_id, usage_type)


# ========== API 接口 ==========

@router.get("/status", response_model=GachaStatusResponse)
async def get_gacha_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取扭蛋机状态
    返回消耗积分、用户余额等信息
    """
    from app.services.exchange_service import ExchangeService

    user_id = current_user.id
    user_balance = await PointsService.get_balance(db, user_id)
    total_weight = sum(p["weight"] for p in GACHA_PRIZES)
    tickets = await ExchangeService.get_user_tickets(db, user_id)
    gacha_tickets = tickets.get("GACHA_TICKET", 0)

    # 获取今日抽取次数（只统计积分消耗的次数，不包括使用券的次数）
    today_count = await get_today_gacha_count(db, user_id)
    remaining_today = max(0, GACHA_DAILY_LIMIT - today_count)

    # 有券可以无视日限直接玩，或者有足够积分且未达到日限
    can_play = gacha_tickets > 0 or (remaining_today > 0 and user_balance >= GACHA_COST)

    return GachaStatusResponse(
        cost=GACHA_COST,
        user_balance=user_balance,
        gacha_tickets=gacha_tickets,
        can_play=can_play,
        total_weight=total_weight,
        daily_limit=GACHA_DAILY_LIMIT,
        today_count=today_count,
        remaining_today=remaining_today
    )


@router.get("/prizes", response_model=GachaPrizesResponse)
async def get_gacha_prizes():
    """
    获取扭蛋机奖池列表
    """
    prizes = [
        GachaPrizeInfo(
            type=p["type"],
            name=p["name"],
            is_rare=p["is_rare"]
        )
        for p in GACHA_PRIZES
    ]
    return GachaPrizesResponse(prizes=prizes)


@router.post("/play", response_model=GachaPlayResponse)
@limiter.limit(RateLimits.LOTTERY)
async def play_gacha(
    request: Request,
    body: GachaPlayRequest = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    扭蛋机抽奖
    - 消耗积分随机获得积分或道具奖励
    - 奖励立即发放到账户
    - 支持使用扭蛋券免费抽奖
    """
    from app.services.exchange_service import ExchangeService

    # 提前保存 user_id，避免在异常处理中访问 ORM 对象
    user_id = current_user.id
    use_ticket = body.use_ticket if body else False

    try:
        # 检查是否使用扭蛋券（券不受日限约束）
        used_ticket = False
        actual_cost = GACHA_COST

        if use_ticket:
            used_ticket = await ExchangeService.use_ticket(db, user_id, "GACHA_TICKET")

        if used_ticket:
            # 使用券：不受日限约束，不消耗积分
            actual_cost = 0
        else:
            # 不用券：检查日限
            today_count = await get_today_gacha_count(db, user_id)
            if today_count >= GACHA_DAILY_LIMIT:
                raise HTTPException(
                    status_code=400,
                    detail=f"今日次数已用完（{today_count}/{GACHA_DAILY_LIMIT}）"
                )

            # 检查积分
            user_balance = await PointsService.get_balance(db, user_id)
            if user_balance < GACHA_COST:
                raise HTTPException(
                    status_code=400,
                    detail=f"积分不足，需要 {GACHA_COST} 积分，当前余额 {user_balance}"
                )

            # 扣除积分
            await PointsService.deduct_points(
                db=db,
                user_id=user_id,
                amount=GACHA_COST,
                reason=PointsReason.GACHA_SPEND,
                ref_type="gacha",
                ref_id=0,
                description="扭蛋机抽奖",
                auto_commit=False
            )

        # 3. 随机抽取奖品
        prize = weighted_random_choice(GACHA_PRIZES)

        # 4. 发放奖励
        if prize["type"] == "points":
            amount = prize["value"].get("amount", 0)
            await grant_points_reward(
                db, user_id, amount,
                f"扭蛋机中奖: {prize['name']}"
            )
        elif prize["type"] == "item":
            item_type = prize["value"].get("item_type")
            amount = prize["value"].get("amount", 1)
            if item_type:
                await grant_item_reward(db, user_id, item_type, amount)
        elif prize["type"] == "badge":
            # 发放徽章
            achievement_key = prize["value"].get("achievement_key")
            if achievement_key:
                badge_granted = await grant_badge_reward(db, user_id, achievement_key)
                if not badge_granted:
                    # 用户已拥有该徽章，改为发放等价积分
                    tier = prize["value"].get("tier", "bronze")
                    fallback_points = {
                        "bronze": 50, "silver": 100, "gold": 200,
                        "diamond": 500, "star": 1000, "king": 2000
                    }.get(tier, 50)
                    await grant_points_reward(
                        db, user_id, fallback_points,
                        f"扭蛋机中奖: {prize['name']}（已拥有，转换为{fallback_points}积分）"
                    )
                    # 修改奖品信息用于返回
                    prize = {
                        **prize,
                        "name": f"{fallback_points}积分（已有徽章）",
                        "type": "points",
                        "value": {"amount": fallback_points}
                    }
        elif prize["type"] == "api_key":
            # 发放 API Key 兑换码
            usage_type = prize["value"].get("usage_type") or "彩蛋"
            api_key_info = await grant_api_key_reward(db, user_id, usage_type)
            if api_key_info:
                # 成功分配兑换码
                prize = {
                    **prize,
                    "value": {
                        "code": api_key_info["code"],
                        "quota": api_key_info["quota"],
                        "description": api_key_info["description"],
                    },
                }
            else:
                # 兑换码已发完，降级为积分补偿
                fallback_points = 200
                await grant_points_reward(
                    db, user_id, fallback_points,
                    f"扭蛋机中奖: {prize['name']}（兑换码已发完，补偿{fallback_points}积分）"
                )
                prize = {
                    **prize,
                    "name": f"{fallback_points}积分（兑换码已发完）",
                    "type": "points",
                    "value": {"amount": fallback_points},
                    "is_rare": False,
                }

        # 5. 记录任务进度
        from app.services.task_service import TaskService
        from app.models.task import TaskType
        await TaskService.record_event(
            db=db,
            user_id=user_id,
            task_type=TaskType.GACHA,
            delta=1,
            event_key=f"gacha:{datetime.utcnow().timestamp()}",
            ref_type="gacha",
            ref_id=0,
            auto_claim=True,
        )

        await db.commit()

        # 6. 获取更新后的余额
        remaining_balance = await PointsService.get_balance(db, user_id)

        return GachaPlayResponse(
            success=True,
            prize_type=prize["type"],
            prize_name=prize["name"],
            prize_value=prize["value"],
            is_rare=prize["is_rare"],
            cost=actual_cost,  # 实际消耗的积分（使用券时为0）
            used_ticket=used_ticket,  # 是否使用了扭蛋券
            remaining_balance=remaining_balance
        )

    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        import logging
        logging.error(f"扭蛋机处理失败: user_id={user_id}, error={str(e)}")
        raise HTTPException(status_code=500, detail="扭蛋机处理失败，请稍后再试")
