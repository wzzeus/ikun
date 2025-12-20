"""
竞猜系统服务
类似KPL竞猜，按比例分配奖池
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.points import (
    PredictionMarket, PredictionOption, PredictionBet,
    MarketStatus, BetStatus, PointsReason
)
from app.services.points_service import PointsService


class PredictionService:
    """竞猜服务"""

    # ========== 市场管理（管理员） ==========

    @staticmethod
    async def create_market(
        db: AsyncSession,
        title: str,
        description: str = None,
        options: List[Dict[str, str]] = None,
        opens_at: datetime = None,
        closes_at: datetime = None,
        fee_rate: Decimal = Decimal("0.05"),
        min_bet: int = 10,
        max_bet: int = None,
        created_by: int = None
    ) -> PredictionMarket:
        """创建竞猜市场"""
        market = PredictionMarket(
            title=title,
            description=description,
            status=MarketStatus.DRAFT,
            opens_at=opens_at,
            closes_at=closes_at,
            fee_rate=fee_rate,
            min_bet=min_bet,
            max_bet=max_bet,
            created_by=created_by
        )
        db.add(market)
        await db.flush()

        # 创建选项
        if options:
            for opt in options:
                option = PredictionOption(
                    market_id=market.id,
                    label=opt.get("label"),
                    description=opt.get("description"),
                    ref_type=opt.get("ref_type"),
                    ref_id=opt.get("ref_id")
                )
                db.add(option)

        await db.commit()
        await db.refresh(market)
        return market

    @staticmethod
    async def open_market(db: AsyncSession, market_id: int) -> PredictionMarket:
        """开启竞猜（允许下注）"""
        market = await PredictionService.get_market(db, market_id)
        if not market:
            raise ValueError("竞猜不存在")
        if market.status != MarketStatus.DRAFT:
            raise ValueError(f"只能开启草稿状态的竞猜，当前状态: {market.status}")

        market.status = MarketStatus.OPEN
        if not market.opens_at:
            market.opens_at = datetime.now()

        await db.commit()
        await db.refresh(market)
        return market

    @staticmethod
    async def close_market(db: AsyncSession, market_id: int) -> PredictionMarket:
        """关闭竞猜（停止下注）"""
        market = await PredictionService.get_market(db, market_id)
        if not market:
            raise ValueError("竞猜不存在")
        if market.status != MarketStatus.OPEN:
            raise ValueError(f"只能关闭开放状态的竞猜，当前状态: {market.status}")

        market.status = MarketStatus.CLOSED
        await db.commit()
        await db.refresh(market)
        return market

    @staticmethod
    async def settle_market(
        db: AsyncSession,
        market_id: int,
        winner_option_ids: List[int]
    ) -> Dict[str, Any]:
        """
        结算竞猜
        winner_option_ids: 赢家选项ID列表（支持多选赢家）
        使用行锁和原子状态更新防止并发结算
        """
        try:
            # 使用行锁获取市场，防止并发结算
            result = await db.execute(
                select(PredictionMarket)
                .options(selectinload(PredictionMarket.options))
                .where(PredictionMarket.id == market_id)
                .with_for_update()
            )
            market = result.scalar_one_or_none()

            if not market:
                raise ValueError("竞猜不存在")
            if market.status != MarketStatus.CLOSED:
                raise ValueError(f"只能结算已关闭的竞猜，当前状态: {market.status}")

            # 先原子更新状态为 SETTLED，抢占结算权
            # 如果已经被其他请求抢先更新，这里不会匹配到任何行
            result = await db.execute(
                update(PredictionMarket)
                .where(
                    and_(
                        PredictionMarket.id == market_id,
                        PredictionMarket.status == MarketStatus.CLOSED
                    )
                )
                .values(status=MarketStatus.SETTLED, settled_at=datetime.now())
            )
            if result.rowcount == 0:
                raise ValueError("结算失败，市场状态已变更")

            # 标记赢家选项
            for option in market.options:
                option.is_winner = option.id in winner_option_ids
                option.odds = None  # 结算后赔率无意义

            # 计算奖池和分配
            total_pool = market.total_pool
            fee_rate = min(max(float(market.fee_rate), 0), 1)  # 限制在 [0, 1]
            fee = int(total_pool * fee_rate)
            payout_pool = total_pool - fee

            # 获取赢家选项的总下注
            result = await db.execute(
                select(func.sum(PredictionBet.stake_points))
                .where(
                    and_(
                        PredictionBet.market_id == market_id,
                        PredictionBet.option_id.in_(winner_option_ids),
                        PredictionBet.status == BetStatus.PLACED
                    )
                )
            )
            winner_total_stake = result.scalar() or 0

            # 统计信息
            stats = {
                "total_pool": total_pool,
                "fee": fee,
                "payout_pool": payout_pool,
                "winner_total_stake": winner_total_stake,
                "winner_count": 0,
                "loser_count": 0,
                "total_payout": 0
            }

            if winner_total_stake > 0:
                # 获取所有赢家下注（带行锁防止重复处理）
                # 按 user_id 排序，保证锁定顺序一致，避免死锁
                result = await db.execute(
                    select(PredictionBet)
                    .where(
                        and_(
                            PredictionBet.market_id == market_id,
                            PredictionBet.option_id.in_(winner_option_ids),
                            PredictionBet.status == BetStatus.PLACED
                        )
                    )
                    .order_by(PredictionBet.user_id, PredictionBet.id)
                    .with_for_update()
                )
                winner_bets = result.scalars().all()

                # 分配奖金
                for bet in winner_bets:
                    # 按比例分配: payout = payout_pool * (user_stake / winner_total_stake)
                    payout = int(payout_pool * bet.stake_points / winner_total_stake)
                    bet.payout_points = payout
                    bet.status = BetStatus.WON

                    # 发放奖金（不自动提交，最后统一提交）
                    if payout > 0:
                        await PointsService.add_points(
                            db=db,
                            user_id=bet.user_id,
                            amount=payout,
                            reason=PointsReason.BET_PAYOUT,
                            ref_type="prediction_bet",
                            ref_id=bet.id,
                            description=f"竞猜获胜: {market.title}",
                            auto_commit=False
                        )
                        stats["total_payout"] += payout

                    stats["winner_count"] += 1

            # 标记输家（带行锁防止重复处理）
            # 按 user_id 排序，保证锁定顺序一致
            result = await db.execute(
                select(PredictionBet)
                .where(
                    and_(
                        PredictionBet.market_id == market_id,
                        ~PredictionBet.option_id.in_(winner_option_ids),
                        PredictionBet.status == BetStatus.PLACED
                    )
                )
                .order_by(PredictionBet.user_id, PredictionBet.id)
                .with_for_update()
            )
            loser_bets = result.scalars().all()
            for bet in loser_bets:
                bet.status = BetStatus.LOST
                bet.payout_points = 0
                stats["loser_count"] += 1

            # 更新成就统计（为所有参与者更新）
            from app.services.achievement_service import (
                update_user_stats_on_prediction, check_and_unlock_achievements
            )
            # 收集所有参与用户
            all_user_ids = set()
            if winner_total_stake > 0:
                for bet in winner_bets:
                    all_user_ids.add(bet.user_id)
            for bet in loser_bets:
                all_user_ids.add(bet.user_id)

            # 为每个用户更新成就统计
            for user_id in all_user_ids:
                is_winner = user_id in {bet.user_id for bet in winner_bets} if winner_total_stake > 0 else False
                user_stats = await update_user_stats_on_prediction(db, user_id, is_winner)
                await check_and_unlock_achievements(db, user_id, user_stats)

            await db.commit()
            return stats

        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def cancel_market(db: AsyncSession, market_id: int) -> Dict[str, Any]:
        """
        取消竞猜，全额退款
        使用行锁和原子状态更新防止并发取消
        """
        try:
            # 使用行锁获取市场，防止并发取消
            result = await db.execute(
                select(PredictionMarket)
                .where(PredictionMarket.id == market_id)
                .with_for_update()
            )
            market = result.scalar_one_or_none()

            if not market:
                raise ValueError("竞猜不存在")
            if market.status == MarketStatus.SETTLED:
                raise ValueError("已结算的竞猜不能取消")
            if market.status == MarketStatus.CANCELED:
                raise ValueError("竞猜已经取消过了")

            # 原子更新状态为 CANCELED，抢占取消权
            old_status = market.status
            result = await db.execute(
                update(PredictionMarket)
                .where(
                    and_(
                        PredictionMarket.id == market_id,
                        PredictionMarket.status == old_status,
                        PredictionMarket.status != MarketStatus.SETTLED,
                        PredictionMarket.status != MarketStatus.CANCELED
                    )
                )
                .values(status=MarketStatus.CANCELED)
            )
            if result.rowcount == 0:
                raise ValueError("取消失败，市场状态已变更")

            # 获取所有未处理的下注（带行锁防止重复退款）
            # 按 user_id 排序，保证锁定顺序一致，避免死锁
            result = await db.execute(
                select(PredictionBet)
                .where(
                    and_(
                        PredictionBet.market_id == market_id,
                        PredictionBet.status == BetStatus.PLACED
                    )
                )
                .order_by(PredictionBet.user_id, PredictionBet.id)
                .with_for_update()
            )
            bets = result.scalars().all()

            refund_count = 0
            refund_total = 0

            for bet in bets:
                # 退款（不自动提交，最后统一提交）
                await PointsService.add_points(
                    db=db,
                    user_id=bet.user_id,
                    amount=bet.stake_points,
                    reason=PointsReason.BET_REFUND,
                    ref_type="prediction_bet",
                    ref_id=bet.id,
                    description=f"竞猜取消退款: {market.title}",
                    auto_commit=False
                )
                bet.status = BetStatus.REFUNDED
                bet.payout_points = bet.stake_points
                refund_count += 1
                refund_total += bet.stake_points

            await db.commit()

            return {
                "refund_count": refund_count,
                "refund_total": refund_total
            }

        except Exception:
            await db.rollback()
            raise

    # ========== 用户操作 ==========

    @staticmethod
    async def place_bet(
        db: AsyncSession,
        user_id: int,
        market_id: int,
        option_id: int,
        stake_points: int,
        request_id: str = None
    ) -> PredictionBet:
        """
        用户下注
        使用行锁和原子更新保证并发安全
        """
        from sqlalchemy.exc import IntegrityError

        request_id = request_id or str(uuid.uuid4())

        # 检查是否重复请求
        result = await db.execute(
            select(PredictionBet)
            .where(PredictionBet.request_id == request_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        try:
            # 获取市场（带行锁，防止并发修改 total_pool）
            result = await db.execute(
                select(PredictionMarket)
                .options(selectinload(PredictionMarket.options))
                .where(PredictionMarket.id == market_id)
                .with_for_update()
            )
            market = result.scalar_one_or_none()

            if not market:
                raise ValueError("竞猜不存在")
            if market.status != MarketStatus.OPEN:
                raise ValueError("该竞猜暂未开放下注")

            # 检查截止时间
            if market.closes_at and datetime.now() > market.closes_at:
                raise ValueError("下注已截止")

            # 验证选项（带行锁，防止并发修改 total_stake）
            result = await db.execute(
                select(PredictionOption)
                .where(PredictionOption.id == option_id)
                .with_for_update()
            )
            option = result.scalar_one_or_none()

            if not option or option.market_id != market_id:
                raise ValueError("无效的竞猜选项")

            # 验证下注金额
            if stake_points <= 0:
                raise ValueError("下注金额必须为正整数")
            if stake_points < market.min_bet:
                raise ValueError(f"最低下注 {market.min_bet} 积分")
            if market.max_bet and stake_points > market.max_bet:
                raise ValueError(f"最高下注 {market.max_bet} 积分")

            # 扣除积分（不自动提交，由本方法统一提交）
            await PointsService.deduct_points(
                db=db,
                user_id=user_id,
                amount=stake_points,
                reason=PointsReason.BET_STAKE,
                ref_type="prediction_market",
                ref_id=market_id,
                description=f"竞猜下注: {market.title}",
                auto_commit=False
            )

            # 创建下注记录
            bet = PredictionBet(
                market_id=market_id,
                option_id=option_id,
                user_id=user_id,
                stake_points=stake_points,
                status=BetStatus.PLACED,
                request_id=request_id
            )
            db.add(bet)

            # 使用 SQL 原子更新选项和市场统计（已持有行锁）
            await db.execute(
                update(PredictionOption)
                .where(PredictionOption.id == option_id)
                .values(total_stake=PredictionOption.total_stake + stake_points)
            )
            await db.execute(
                update(PredictionMarket)
                .where(PredictionMarket.id == market_id)
                .values(total_pool=PredictionMarket.total_pool + stake_points)
            )

            # 重新获取更新后的市场数据用于计算赔率
            await db.refresh(market)
            for opt in market.options:
                await db.refresh(opt)

            # 重新计算所有选项的赔率
            await PredictionService._update_odds(db, market)

            # 确保 bet 有 id
            await db.flush()

            # 记录任务进度（竞猜任务）
            from app.services.task_service import TaskService
            from app.models.task import TaskType
            await TaskService.record_event(
                db=db,
                user_id=user_id,
                task_type=TaskType.PREDICTION,
                delta=1,
                event_key=f"bet:{bet.id}",
                ref_type="prediction_bet",
                ref_id=bet.id,
                auto_claim=True,
            )

            await db.commit()
            await db.refresh(bet)
            return bet

        except IntegrityError:
            await db.rollback()
            # 可能是 request_id 重复，重新查询
            result = await db.execute(
                select(PredictionBet)
                .where(PredictionBet.request_id == request_id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                return existing
            raise

        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def _update_odds(db: AsyncSession, market: PredictionMarket):
        """更新市场所有选项的赔率"""
        total_pool = market.total_pool
        if total_pool <= 0:
            return

        for option in market.options:
            if option.total_stake > 0:
                # 赔率 = 总池 / 该选项总下注 * (1 - 抽成)
                odds = float(total_pool) / option.total_stake * (1 - float(market.fee_rate))
                option.odds = Decimal(str(round(odds, 2)))
            else:
                option.odds = None

    # ========== 查询方法 ==========

    @staticmethod
    async def get_market(db: AsyncSession, market_id: int) -> Optional[PredictionMarket]:
        """获取单个竞猜市场（含选项）"""
        result = await db.execute(
            select(PredictionMarket)
            .options(selectinload(PredictionMarket.options))
            .where(PredictionMarket.id == market_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_open_markets(db: AsyncSession) -> List[PredictionMarket]:
        """获取开放中的竞猜市场"""
        now = datetime.now()
        result = await db.execute(
            select(PredictionMarket)
            .options(selectinload(PredictionMarket.options))
            .where(
                and_(
                    PredictionMarket.status == MarketStatus.OPEN,
                    (PredictionMarket.closes_at.is_(None) | (PredictionMarket.closes_at > now))
                )
            )
            .order_by(PredictionMarket.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_markets(
        db: AsyncSession,
        status: MarketStatus = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[PredictionMarket]:
        """获取竞猜市场列表"""
        query = select(PredictionMarket).options(selectinload(PredictionMarket.options))

        if status:
            query = query.where(PredictionMarket.status == status)

        query = query.order_by(PredictionMarket.created_at.desc()).limit(limit).offset(offset)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_user_bets(
        db: AsyncSession,
        user_id: int,
        market_id: int = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """获取用户下注记录"""
        query = (
            select(PredictionBet, PredictionOption, PredictionMarket)
            .join(PredictionOption, PredictionBet.option_id == PredictionOption.id)
            .join(PredictionMarket, PredictionBet.market_id == PredictionMarket.id)
            .where(PredictionBet.user_id == user_id)
        )

        if market_id:
            query = query.where(PredictionBet.market_id == market_id)

        query = query.order_by(PredictionBet.created_at.desc()).limit(limit).offset(offset)

        result = await db.execute(query)
        rows = result.fetchall()

        return [
            {
                "id": bet.id,
                "market_id": bet.market_id,
                "market_title": market.title,
                "market_status": market.status.value,
                "option_id": bet.option_id,
                "option_label": option.label,
                "option_is_winner": option.is_winner,
                "stake_points": bet.stake_points,
                "payout_points": bet.payout_points,
                "status": bet.status.value,
                "created_at": bet.created_at.isoformat()
            }
            for bet, option, market in rows
        ]

    @staticmethod
    async def get_market_stats(db: AsyncSession, market_id: int) -> Dict[str, Any]:
        """获取市场统计信息"""
        market = await PredictionService.get_market(db, market_id)
        if not market:
            return None

        # 获取参与人数
        result = await db.execute(
            select(func.count(func.distinct(PredictionBet.user_id)))
            .where(PredictionBet.market_id == market_id)
        )
        participant_count = result.scalar() or 0

        # 获取下注次数
        result = await db.execute(
            select(func.count(PredictionBet.id))
            .where(PredictionBet.market_id == market_id)
        )
        bet_count = result.scalar() or 0

        return {
            "market_id": market_id,
            "title": market.title,
            "status": market.status.value,
            "total_pool": market.total_pool,
            "participant_count": participant_count,
            "bet_count": bet_count,
            "fee_rate": float(market.fee_rate),
            "options": [
                {
                    "id": opt.id,
                    "label": opt.label,
                    "total_stake": opt.total_stake,
                    "odds": float(opt.odds) if opt.odds else None,
                    "is_winner": opt.is_winner,
                    "percentage": round(opt.total_stake / market.total_pool * 100, 1) if market.total_pool > 0 else 0
                }
                for opt in market.options
            ]
        }

    @staticmethod
    def format_market(market: PredictionMarket) -> Dict[str, Any]:
        """格式化市场数据"""
        return {
            "id": market.id,
            "title": market.title,
            "description": market.description,
            "status": market.status.value,
            "opens_at": market.opens_at.isoformat() if market.opens_at else None,
            "closes_at": market.closes_at.isoformat() if market.closes_at else None,
            "settled_at": market.settled_at.isoformat() if market.settled_at else None,
            "fee_rate": float(market.fee_rate),
            "min_bet": market.min_bet,
            "max_bet": market.max_bet,
            "total_pool": market.total_pool,
            "created_at": market.created_at.isoformat(),
            "options": [
                {
                    "id": opt.id,
                    "label": opt.label,
                    "description": opt.description,
                    "total_stake": opt.total_stake,
                    "odds": float(opt.odds) if opt.odds else None,
                    "is_winner": opt.is_winner
                }
                for opt in market.options
            ]
        }
