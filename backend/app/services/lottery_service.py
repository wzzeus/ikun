"""
抽奖系统服务
"""
import random
import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert

from app.models.points import (
    LotteryConfig, LotteryPrize, LotteryDraw, ApiKeyCode, UserItem,
    PointsReason, PrizeType, ApiKeyStatus, ScratchCard, ScratchCardStatus
)
from app.services.points_service import PointsService


class LotteryService:
    """抽奖服务"""

    @staticmethod
    async def get_active_config(db: AsyncSession) -> Optional[LotteryConfig]:
        """获取当前激活的抽奖配置"""
        now = datetime.now()
        result = await db.execute(
            select(LotteryConfig)
            .where(
                and_(
                    LotteryConfig.is_active == True,
                    (LotteryConfig.starts_at.is_(None) | (LotteryConfig.starts_at <= now)),
                    (LotteryConfig.ends_at.is_(None) | (LotteryConfig.ends_at >= now))
                )
            )
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_today_draw_count(db: AsyncSession, user_id: int, config_id: int) -> int:
        """获取用户今日抽奖次数"""
        today = date.today()
        result = await db.execute(
            select(func.count(LotteryDraw.id))
            .where(
                and_(
                    LotteryDraw.user_id == user_id,
                    LotteryDraw.config_id == config_id,
                    func.date(LotteryDraw.created_at) == today
                )
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def get_prizes(db: AsyncSession, config_id: int) -> List[LotteryPrize]:
        """获取奖池配置"""
        result = await db.execute(
            select(LotteryPrize)
            .where(LotteryPrize.config_id == config_id)
        )
        return result.scalars().all()

    @staticmethod
    async def _select_prize(prizes: List[LotteryPrize]) -> LotteryPrize:
        """根据权重随机选择奖品"""
        # 过滤掉禁用的和库存为0的奖品
        available_prizes = [
            p for p in prizes
            if getattr(p, 'is_enabled', True) and (p.stock is None or p.stock > 0)
        ]

        if not available_prizes:
            # 所有奖品都没库存了，返回谢谢参与
            empty_prizes = [p for p in prizes if p.prize_type == PrizeType.EMPTY and getattr(p, 'is_enabled', True)]
            if empty_prizes:
                return empty_prizes[0]
            raise ValueError("没有可用的奖品")

        # 计算总权重
        total_weight = sum(p.weight for p in available_prizes)

        # 随机选择
        rand = random.randint(1, total_weight)
        current = 0
        for prize in available_prizes:
            current += prize.weight
            if rand <= current:
                return prize

        # 兜底返回最后一个
        return available_prizes[-1]

    @staticmethod
    async def _assign_api_key(
        db: AsyncSession,
        user_id: int,
        usage_type: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        分配一个API Key给用户

        Args:
            db: 数据库会话
            user_id: 用户ID
            usage_type: 用途类型，对应 api_key_codes.description（如"抽奖"、"扭蛋"等）
                       如果为空则从任意可用的key中分配

        Returns:
            分配成功返回包含 code 和 quota 的字典，失败返回 None
        """
        # 构建查询条件
        query = select(ApiKeyCode).where(ApiKeyCode.status == ApiKeyStatus.AVAILABLE)

        # 如果指定了用途类型，按用途筛选
        if usage_type:
            query = query.where(ApiKeyCode.description == usage_type)

        # 原子操作：找一个可用的key并分配
        result = await db.execute(
            query.limit(1).with_for_update()
        )
        api_key = result.scalar_one_or_none()

        if not api_key:
            return None

        # 更新状态
        api_key.status = ApiKeyStatus.ASSIGNED
        api_key.assigned_user_id = user_id
        api_key.assigned_at = datetime.now()

        return {
            "code": api_key.code,
            "quota": float(api_key.quota) if api_key.quota else 0,
            "description": api_key.description
        }

    @staticmethod
    async def _add_user_item(db: AsyncSession, user_id: int, item_type: str, quantity: int = 1):
        """给用户添加道具"""
        # 使用 INSERT ON DUPLICATE KEY UPDATE
        stmt = insert(UserItem).values(
            user_id=user_id,
            item_type=item_type,
            quantity=quantity
        ).on_duplicate_key_update(
            quantity=UserItem.quantity + quantity
        )
        await db.execute(stmt)

    @staticmethod
    async def draw(
        db: AsyncSession,
        user_id: int,
        request_id: str = None,
        use_ticket: bool = False,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """
        执行抽奖
        返回抽奖结果
        整个流程在一个事务内完成，保证原子性

        Args:
            use_ticket: 是否优先使用抽奖券（免费）
            is_admin: 是否是管理员（管理员不受日限限制）
        """
        from sqlalchemy.exc import IntegrityError
        from app.services.exchange_service import ExchangeService

        # 生成请求ID用于幂等
        request_id = request_id or str(uuid.uuid4())

        # 检查是否已处理过该请求
        result = await db.execute(
            select(LotteryDraw)
            .where(LotteryDraw.request_id == request_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return {
                "success": True,
                "is_duplicate": True,
                "prize_name": existing.prize_name,
                "prize_type": existing.prize_type,
                "prize_value": existing.prize_value,
                "is_rare": existing.is_rare
            }

        # 获取抽奖配置
        config = await LotteryService.get_active_config(db)
        if not config:
            raise ValueError("当前没有进行中的抽奖活动")

        try:
            # 检查是否使用抽奖券（券不受日限约束）
            used_ticket = False
            actual_cost = config.cost_points

            if use_ticket:
                # 尝试使用抽奖券
                used_ticket = await ExchangeService.use_ticket(db, user_id, "LOTTERY_TICKET")

            if used_ticket:
                # 使用了抽奖券：不受日限约束，不扣积分
                actual_cost = 0
            else:
                # 没有券或不使用券：检查日限（管理员不受限制），扣除积分
                if config.daily_limit and not is_admin:
                    today_count = await LotteryService.get_today_draw_count(db, user_id, config.id)
                    if today_count >= config.daily_limit:
                        raise ValueError(f"今日抽奖次数已达上限（{config.daily_limit}次）")

                await PointsService.deduct_points(
                    db=db,
                    user_id=user_id,
                    amount=config.cost_points,
                    reason=PointsReason.LOTTERY_SPEND,
                    description=f"抽奖消费",
                    auto_commit=False
                )

            # 获取奖池并抽奖
            prizes = await LotteryService.get_prizes(db, config.id)
            prize = await LotteryService._select_prize(prizes)

            # 处理奖品发放
            prize_value = prize.prize_value
            extra_message = None
            api_key_code = None  # 完整的 API Key 兑换码

            if prize.prize_type == PrizeType.ITEM:
                # 发放道具
                await LotteryService._add_user_item(db, user_id, prize.prize_value)
                extra_message = f"获得{prize.prize_name}x1"

            elif prize.prize_type == PrizeType.API_KEY:
                # 发放API Key，从库存分配
                # 注意：prize_value 可能是额度数字或用途描述，优先使用"抽奖"类型
                api_key_info = await LotteryService._assign_api_key(db, user_id, "抽奖")
                if api_key_info:
                    api_key_code = api_key_info["code"]  # 完整兑换码
                    prize_value = api_key_info["code"][:8] + "****"  # 部分隐藏（用于显示和记录）
                    quota_display = f"${api_key_info['quota']}" if api_key_info['quota'] else ""
                    extra_message = f"恭喜获得{quota_display}兑换码！"
                else:
                    # API Key库存不足，改为发放积分作为补偿
                    compensation = 100
                    await PointsService.add_points(
                        db=db,
                        user_id=user_id,
                        amount=compensation,
                        reason=PointsReason.LOTTERY_WIN,
                        description="API Key库存不足补偿",
                        auto_commit=False
                    )
                    prize_value = str(compensation)
                    extra_message = f"API Key已抽完，补偿{compensation}积分"

            elif prize.prize_type == PrizeType.POINTS:
                # 发放积分
                points_amount = int(prize.prize_value) if prize.prize_value else 0
                if points_amount > 0:
                    await PointsService.add_points(
                        db=db,
                        user_id=user_id,
                        amount=points_amount,
                        reason=PointsReason.LOTTERY_WIN,
                        description=f"抽奖获得{points_amount}积分",
                        auto_commit=False
                    )
                extra_message = f"获得{points_amount}积分"

            # 扣减奖品库存（使用原子 UPDATE 防止并发超卖）
            if prize.stock is not None:
                from sqlalchemy import text
                deduct_result = await db.execute(
                    text("UPDATE lottery_prizes SET stock = stock - 1 WHERE id = :prize_id AND stock > 0"),
                    {"prize_id": prize.id}
                )
                if deduct_result.rowcount == 0:
                    # 库存扣减失败（已被其他请求抢完）
                    await db.rollback()
                    raise ValueError("奖品库存不足，请重试")

            # 创建抽奖记录
            draw = LotteryDraw(
                user_id=user_id,
                config_id=config.id,
                cost_points=actual_cost,  # 使用实际消耗（使用券时为0）
                prize_id=prize.id,
                prize_type=prize.prize_type.value,
                prize_name=prize.prize_name,
                prize_value=prize_value,
                is_rare=prize.is_rare,
                request_id=request_id
            )
            db.add(draw)
            await db.flush()

            # 记录任务进度（抽奖任务）
            from app.services.task_service import TaskService
            from app.models.task import TaskType
            await TaskService.record_event(
                db=db,
                user_id=user_id,
                task_type=TaskType.LOTTERY,
                delta=1,
                event_key=f"lottery:{draw.id}",
                ref_type="lottery_draw",
                ref_id=draw.id,
                auto_claim=True,
            )

            # 统一提交事务
            await db.commit()

        except IntegrityError:
            await db.rollback()
            # 可能是 request_id 重复，重新查询
            result = await db.execute(
                select(LotteryDraw)
                .where(LotteryDraw.request_id == request_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                return {
                    "success": True,
                    "is_duplicate": True,
                    "prize_name": existing.prize_name,
                    "prize_type": existing.prize_type,
                    "prize_value": existing.prize_value,
                    "is_rare": existing.is_rare
                }
            raise

        except Exception:
            await db.rollback()
            raise

        # 获取更新后的余额
        balance = await PointsService.get_balance(db, user_id)

        return {
            "success": True,
            "is_duplicate": False,
            "prize_id": prize.id,
            "prize_name": prize.prize_name,
            "prize_type": prize.prize_type.value,
            "prize_value": prize_value,
            "is_rare": prize.is_rare,
            "message": extra_message,
            "cost_points": actual_cost,  # 实际消耗的积分（使用券时为0）
            "used_ticket": used_ticket,  # 是否使用了抽奖券
            "balance": balance,
            "api_key_code": api_key_code,  # 完整的 API Key 兑换码（仅 API_KEY 类型时有值）
        }

    @staticmethod
    async def get_lottery_info(db: AsyncSession, user_id: int = None) -> Dict[str, Any]:
        """获取抽奖活动信息"""
        config = await LotteryService.get_active_config(db)
        if not config:
            return {"active": False, "message": "当前没有进行中的抽奖活动"}

        # 获取奖池（不显示权重）
        prizes = await LotteryService.get_prizes(db, config.id)
        prize_list = [
            {
                "id": p.id,
                "name": p.prize_name,
                "type": p.prize_type.value,
                "is_rare": p.is_rare,
                "has_stock": p.stock is None or p.stock > 0
            }
            for p in prizes
        ]

        result = {
            "active": True,
            "config_id": config.id,
            "name": config.name,
            "cost_points": config.cost_points,
            "daily_limit": config.daily_limit,
            "prizes": prize_list,
            "starts_at": config.starts_at.isoformat() if config.starts_at else None,
            "ends_at": config.ends_at.isoformat() if config.ends_at else None
        }

        # 如果提供了用户ID，返回用户相关信息
        if user_id:
            from app.services.exchange_service import ExchangeService
            today_count = await LotteryService.get_today_draw_count(db, user_id, config.id)
            balance = await PointsService.get_balance(db, user_id)
            tickets = await ExchangeService.get_user_tickets(db, user_id)
            lottery_tickets = tickets.get("LOTTERY_TICKET", 0)

            # 有券可以无视日限直接抽奖，或者有足够积分且未达到日限
            can_draw = lottery_tickets > 0 or (
                balance >= config.cost_points and (config.daily_limit is None or today_count < config.daily_limit)
            )

            result.update({
                "today_count": today_count,
                "remaining_today": config.daily_limit - today_count if config.daily_limit else None,
                "balance": balance,
                "lottery_tickets": lottery_tickets,  # 抽奖券数量
                "can_draw": can_draw
            })

        return result

    @staticmethod
    async def get_draw_history(
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """获取用户抽奖历史"""
        result = await db.execute(
            select(LotteryDraw)
            .where(LotteryDraw.user_id == user_id)
            .order_by(LotteryDraw.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        draws = result.scalars().all()

        return [
            {
                "id": d.id,
                "prize_name": d.prize_name,
                "prize_type": d.prize_type,
                "prize_value": d.prize_value,
                "is_rare": d.is_rare,
                "cost_points": d.cost_points,
                "created_at": d.created_at.isoformat()
            }
            for d in draws
        ]

    @staticmethod
    async def get_recent_winners(db: AsyncSession, limit: int = 10) -> List[Dict[str, Any]]:
        """获取最近中奖记录（公开展示）"""
        from app.models.user import User

        result = await db.execute(
            select(LotteryDraw, User)
            .join(User, LotteryDraw.user_id == User.id)
            .where(LotteryDraw.is_rare == True)
            .order_by(LotteryDraw.created_at.desc())
            .limit(limit)
        )
        rows = result.fetchall()

        return [
            {
                "user_id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "prize_name": draw.prize_name,
                "created_at": draw.created_at.isoformat()
            }
            for draw, user in rows
        ]

    @staticmethod
    async def get_user_items(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
        """获取用户道具列表"""
        result = await db.execute(
            select(UserItem)
            .where(UserItem.user_id == user_id)
        )
        items = result.scalars().all()

        return [
            {
                "item_type": item.item_type,
                "quantity": item.quantity
            }
            for item in items
        ]

    @staticmethod
    async def get_user_api_keys(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
        """获取用户获得的API Key"""
        result = await db.execute(
            select(ApiKeyCode)
            .where(ApiKeyCode.assigned_user_id == user_id)
            .order_by(ApiKeyCode.assigned_at.desc())
        )
        keys = result.scalars().all()

        return [
            {
                "id": key.id,
                "code": key.code,
                "status": key.status.value,
                "assigned_at": key.assigned_at.isoformat() if key.assigned_at else None,
                "expires_at": key.expires_at.isoformat() if key.expires_at else None
            }
            for key in keys
        ]

    @staticmethod
    async def get_lucky_leaderboard(db: AsyncSession, limit: int = 50) -> List[Dict[str, Any]]:
        """获取欧皇榜 - 按稀有奖品中奖次数排行"""
        from app.models.user import User
        from sqlalchemy import desc

        # 统计每个用户获得稀有奖品的次数
        result = await db.execute(
            select(
                LotteryDraw.user_id,
                func.count(LotteryDraw.id).label("win_count"),
                func.max(LotteryDraw.created_at).label("last_win_at")
            )
            .where(LotteryDraw.is_rare == True)
            .group_by(LotteryDraw.user_id)
            .order_by(desc("win_count"), desc("last_win_at"))
            .limit(limit)
        )
        rankings = result.fetchall()

        if not rankings:
            return []

        # 获取用户详情
        user_ids = [r[0] for r in rankings]
        user_result = await db.execute(
            select(User).where(User.id.in_(user_ids))
        )
        user_map = {u.id: u for u in user_result.scalars().all()}

        # 获取每个用户最近中的奖品名称
        prize_result = await db.execute(
            select(
                LotteryDraw.user_id,
                func.group_concat(
                    func.distinct(LotteryDraw.prize_name)
                ).label("prizes")
            )
            .where(
                LotteryDraw.is_rare == True,
                LotteryDraw.user_id.in_(user_ids)
            )
            .group_by(LotteryDraw.user_id)
        )
        prize_map = {r[0]: r[1] for r in prize_result.fetchall()}

        leaderboard = []
        for rank, (user_id, win_count, last_win_at) in enumerate(rankings, 1):
            user = user_map.get(user_id)
            if user:
                leaderboard.append({
                    "rank": rank,
                    "user_id": user_id,
                    "username": user.username,
                    "display_name": user.display_name,
                    "avatar_url": user.avatar_url,
                    "win_count": win_count,
                    "last_win_at": last_win_at.isoformat() if last_win_at else None,
                    "prizes_won": prize_map.get(user_id, "").split(",") if prize_map.get(user_id) else []
                })

        return leaderboard

    # ========== 刮刮乐相关方法 ==========

    @staticmethod
    async def get_scratch_config(db: AsyncSession) -> Optional[LotteryConfig]:
        """获取刮刮乐配置（复用抽奖配置，名称包含'刮刮乐'的配置）"""
        now = datetime.now()
        result = await db.execute(
            select(LotteryConfig)
            .where(
                and_(
                    LotteryConfig.is_active == True,
                    LotteryConfig.name.like("%刮刮乐%"),
                    (LotteryConfig.starts_at.is_(None) | (LotteryConfig.starts_at <= now)),
                    (LotteryConfig.ends_at.is_(None) | (LotteryConfig.ends_at >= now))
                )
            )
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_today_scratch_count(db: AsyncSession, user_id: int, config_id: int) -> int:
        """获取用户今日刮刮乐购买次数"""
        today = date.today()
        result = await db.execute(
            select(func.count(ScratchCard.id))
            .where(
                and_(
                    ScratchCard.user_id == user_id,
                    ScratchCard.config_id == config_id,
                    func.date(ScratchCard.created_at) == today
                )
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def get_scratch_info(db: AsyncSession, user_id: int = None) -> Dict[str, Any]:
        """获取刮刮乐信息"""
        config = await LotteryService.get_scratch_config(db)
        if not config:
            return {
                "active": False,
                "cost_points": 30,
                "message": "当前没有进行中的刮刮乐活动"
            }

        result = {
            "active": True,
            "config_id": config.id,
            "name": config.name,
            "cost_points": config.cost_points,
            "daily_limit": config.daily_limit
        }

        if user_id:
            from app.services.exchange_service import ExchangeService
            today_count = await LotteryService.get_today_scratch_count(db, user_id, config.id)
            balance = await PointsService.get_balance(db, user_id)
            tickets = await ExchangeService.get_user_tickets(db, user_id)
            scratch_tickets = tickets.get("SCRATCH_TICKET", 0)

            # 有券可以无视日限直接购买，或者有足够积分且未达到日限
            can_draw = scratch_tickets > 0 or (
                balance >= config.cost_points and (config.daily_limit is None or today_count < config.daily_limit)
            )

            result.update({
                "today_count": today_count,
                "remaining_today": config.daily_limit - today_count if config.daily_limit else None,
                "balance": balance,
                "scratch_tickets": scratch_tickets,  # 刮刮乐券数量
                "can_draw": can_draw
            })

        return result

    @staticmethod
    async def buy_scratch_card(
        db: AsyncSession,
        user_id: int,
        use_ticket: bool = False,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """
        购买刮刮乐卡片
        购买时后台已确定奖品，但不返回给前端

        Args:
            use_ticket: 是否优先使用刮刮乐券（免费）
            is_admin: 是否是管理员（管理员不受日限限制）
        """
        from app.services.exchange_service import ExchangeService

        config = await LotteryService.get_scratch_config(db)
        if not config:
            raise ValueError("当前没有进行中的刮刮乐活动")

        try:
            # 检查是否使用刮刮乐券（券不受日限约束）
            used_ticket = False
            actual_cost = config.cost_points

            if use_ticket:
                used_ticket = await ExchangeService.use_ticket(db, user_id, "SCRATCH_TICKET")

            if used_ticket:
                # 使用了刮刮乐券：不受日限约束，不扣积分
                actual_cost = 0
            else:
                # 没有券或不使用券：检查日限（管理员不受限制），扣除积分
                if config.daily_limit and not is_admin:
                    today_count = await LotteryService.get_today_scratch_count(db, user_id, config.id)
                    if today_count >= config.daily_limit:
                        raise ValueError(f"今日刮刮乐次数已达上限（{config.daily_limit}次）")

                await PointsService.deduct_points(
                    db=db,
                    user_id=user_id,
                    amount=config.cost_points,
                    reason=PointsReason.LOTTERY_SPEND,
                    description="购买刮刮乐",
                    auto_commit=False
                )

            # 获取奖池并预选奖品
            prizes = await LotteryService.get_prizes(db, config.id)
            prize = await LotteryService._select_prize(prizes)

            # 创建刮刮乐卡片记录
            card = ScratchCard(
                user_id=user_id,
                config_id=config.id,
                cost_points=actual_cost,  # 使用实际消耗（使用券时为0）
                prize_id=prize.id,
                prize_type=prize.prize_type.value,
                prize_name=prize.prize_name,
                prize_value=prize.prize_value,
                is_rare=prize.is_rare,
                status=ScratchCardStatus.PURCHASED
            )
            db.add(card)
            await db.flush()  # 获取 card.id

            # 扣减奖品库存（使用原子 UPDATE 防止并发超卖）
            if prize.stock is not None:
                from sqlalchemy import text
                deduct_result = await db.execute(
                    text("UPDATE lottery_prizes SET stock = stock - 1 WHERE id = :prize_id AND stock > 0"),
                    {"prize_id": prize.id}
                )
                if deduct_result.rowcount == 0:
                    # 库存扣减失败（已被其他请求抢完）
                    await db.rollback()
                    raise ValueError("奖品库存不足，请重试")

            await db.commit()

            # 获取更新后的余额
            balance = await PointsService.get_balance(db, user_id)

            return {
                "success": True,
                "card_id": card.id,
                "cost_points": actual_cost,  # 实际消耗的积分（使用券时为0）
                "used_ticket": used_ticket,  # 是否使用了刮刮乐券
                "remaining_balance": balance
            }

        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def reveal_scratch_card(
        db: AsyncSession,
        card_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """
        刮开刮刮乐卡片，揭晓奖品
        使用行锁防止并发重复发奖
        """
        # 使用 FOR UPDATE 加行锁查询卡片
        result = await db.execute(
            select(ScratchCard)
            .where(
                and_(
                    ScratchCard.id == card_id,
                    ScratchCard.user_id == user_id
                )
            )
            .with_for_update()
        )
        card = result.scalar_one_or_none()

        if not card:
            raise ValueError("卡片不存在或不属于当前用户")

        if card.status == ScratchCardStatus.REVEALED:
            # 已刮开，直接返回结果
            return {
                "success": True,
                "prize_name": card.prize_name,
                "prize_type": card.prize_type,
                "prize_value": card.prize_value,
                "is_rare": card.is_rare,
                "message": "该卡片已刮开"
            }

        try:
            # 更新卡片状态
            card.status = ScratchCardStatus.REVEALED
            card.revealed_at = datetime.now()

            # 处理奖品发放
            extra_message = None
            prize_value = card.prize_value
            api_key_code = None  # 完整的 API Key 兑换码

            if card.prize_type == PrizeType.ITEM.value:
                await LotteryService._add_user_item(db, user_id, card.prize_value)
                extra_message = f"获得{card.prize_name}x1"

            elif card.prize_type == PrizeType.API_KEY.value:
                # 发放API Key，从库存分配（使用"刮刮乐"类型的key）
                api_key_info = await LotteryService._assign_api_key(db, user_id, "刮刮乐")
                if api_key_info:
                    api_key_code = api_key_info["code"]  # 完整兑换码
                    prize_value = api_key_info["code"][:8] + "****"
                    quota_display = f"${api_key_info['quota']}" if api_key_info['quota'] else ""
                    extra_message = f"恭喜获得{quota_display}兑换码！"
                    # 更新卡片记录实际发放的值
                    card.prize_value = prize_value
                else:
                    compensation = 100
                    await PointsService.add_points(
                        db=db,
                        user_id=user_id,
                        amount=compensation,
                        reason=PointsReason.LOTTERY_WIN,
                        description="兑换码库存不足补偿",
                        auto_commit=False
                    )
                    prize_value = str(compensation)
                    extra_message = f"兑换码已抽完，补偿{compensation}积分"
                    # 更新卡片记录实际发放的值
                    card.prize_type = PrizeType.POINTS.value
                    card.prize_name = f"补偿积分 +{compensation}"
                    card.prize_value = prize_value

            elif card.prize_type == PrizeType.POINTS.value:
                points_amount = int(card.prize_value) if card.prize_value else 0
                if points_amount > 0:
                    await PointsService.add_points(
                        db=db,
                        user_id=user_id,
                        amount=points_amount,
                        reason=PointsReason.LOTTERY_WIN,
                        description=f"刮刮乐获得{points_amount}积分",
                        auto_commit=False
                    )
                extra_message = f"获得{points_amount}积分"

            await db.commit()

            return {
                "success": True,
                "prize_name": card.prize_name,
                "prize_type": card.prize_type,
                "prize_value": prize_value,
                "is_rare": card.is_rare,
                "message": extra_message,
                "api_key_code": api_key_code,  # 完整的 API Key 兑换码（仅 API_KEY 类型时有值）
            }

        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def get_user_scratch_cards(
        db: AsyncSession,
        user_id: int,
        status: str = None
    ) -> List[Dict[str, Any]]:
        """获取用户的刮刮乐卡片"""
        query = select(ScratchCard).where(ScratchCard.user_id == user_id)

        if status:
            query = query.where(ScratchCard.status == status)

        query = query.order_by(ScratchCard.created_at.desc())
        result = await db.execute(query)
        cards = result.scalars().all()

        return [
            {
                "id": c.id,
                "cost_points": c.cost_points,
                "status": c.status.value,
                "is_revealed": c.status == ScratchCardStatus.REVEALED,
                "prize_name": c.prize_name if c.status == ScratchCardStatus.REVEALED else None,
                "prize_type": c.prize_type if c.status == ScratchCardStatus.REVEALED else None,
                "prize_value": c.prize_value if c.status == ScratchCardStatus.REVEALED else None,
                "is_rare": c.is_rare if c.status == ScratchCardStatus.REVEALED else None,
                "created_at": c.created_at.isoformat(),
                "revealed_at": c.revealed_at.isoformat() if c.revealed_at else None
            }
            for c in cards
        ]
