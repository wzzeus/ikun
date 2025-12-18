"""
老虎机服务
包含：配置管理、抽奖逻辑、概率计算
管理员可通过调整符号权重来控制整体胜率
"""
import random
import uuid
from typing import Dict, Any, List, Optional
from decimal import Decimal

from datetime import datetime, date
from sqlalchemy import select, delete, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.slot_machine import SlotMachineConfig, SlotMachineSymbol, SlotMachineDraw, SlotWinType
from app.models.points import PointsReason
from app.services.points_service import PointsService


class SlotMachineService:
    """老虎机服务"""

    @staticmethod
    async def get_active_config(db: AsyncSession) -> Optional[SlotMachineConfig]:
        """获取当前生效的配置"""
        result = await db.execute(
            select(SlotMachineConfig)
            .where(SlotMachineConfig.is_active == True)
            .order_by(SlotMachineConfig.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_enabled_symbols(
        db: AsyncSession,
        config_id: int,
        include_disabled: bool = False
    ) -> List[SlotMachineSymbol]:
        """获取符号列表"""
        query = select(SlotMachineSymbol).where(SlotMachineSymbol.config_id == config_id)
        if not include_disabled:
            query = query.where(
                and_(
                    SlotMachineSymbol.is_enabled == True,
                    SlotMachineSymbol.weight > 0
                )
            )
        query = query.order_by(SlotMachineSymbol.sort_order.asc(), SlotMachineSymbol.id.asc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_today_count(db: AsyncSession, user_id: int, config_id: int) -> int:
        """获取用户今日抽奖次数"""
        today_start = datetime.combine(date.today(), datetime.min.time())
        result = await db.execute(
            select(func.count(SlotMachineDraw.id))
            .where(
                and_(
                    SlotMachineDraw.user_id == user_id,
                    SlotMachineDraw.config_id == config_id,
                    SlotMachineDraw.created_at >= today_start
                )
            )
        )
        return result.scalar() or 0

    @staticmethod
    def weighted_random_pick(symbols: List[SlotMachineSymbol]) -> SlotMachineSymbol:
        """按权重随机选择一个符号"""
        total_weight = sum(max(0, s.weight) for s in symbols)
        if total_weight <= 0:
            raise ValueError("老虎机符号权重配置无效")

        r = random.randint(1, total_weight)
        cumulative = 0
        for symbol in symbols:
            w = max(0, symbol.weight)
            cumulative += w
            if r <= cumulative:
                return symbol
        return symbols[-1]

    @staticmethod
    def calculate_payout(
        config: SlotMachineConfig,
        reels: List[SlotMachineSymbol]
    ) -> tuple[SlotWinType, float, int, bool]:
        """
        计算中奖结果
        返回：(中奖类型, 倍率, 奖励积分, 是否大奖)
        """
        cost = int(config.cost_points)
        keys = [r.symbol_key for r in reels]

        # 三个相同
        if keys[0] == keys[1] == keys[2]:
            multiplier = int(reels[0].multiplier)
            payout = cost * multiplier
            is_jackpot = (reels[0].symbol_key == config.jackpot_symbol_key) or bool(reels[0].is_jackpot)
            return SlotWinType.THREE, float(multiplier), int(payout), is_jackpot

        # 两个相同
        if keys[0] == keys[1] or keys[1] == keys[2] or keys[0] == keys[2]:
            mult = float(config.two_kind_multiplier)
            payout = int(cost * mult)
            return SlotWinType.TWO, mult, payout, False

        # 未中奖
        return SlotWinType.NONE, 0.0, 0, False

    @staticmethod
    async def get_public_config(db: AsyncSession, user_id: int = None) -> Dict[str, Any]:
        """获取公开配置（用户端）"""
        config = await SlotMachineService.get_active_config(db)
        if not config:
            return {"active": False, "config": None, "symbols": []}

        symbols = await SlotMachineService.get_enabled_symbols(db, config.id, include_disabled=False)

        # 获取用户今日次数和余额
        today_count = 0
        balance = 0
        if user_id:
            today_count = await SlotMachineService.get_today_count(db, user_id, config.id)
            balance = await PointsService.get_balance(db, user_id)

        daily_limit = config.daily_limit
        remaining = daily_limit - today_count if daily_limit else None
        can_play = balance >= config.cost_points and (daily_limit is None or remaining > 0)

        return {
            "active": True,
            "config": {
                "id": config.id,
                "name": config.name,
                "is_active": config.is_active,
                "cost_points": config.cost_points,
                "reels": config.reels,
                "two_kind_multiplier": float(config.two_kind_multiplier),
                "jackpot_symbol_key": config.jackpot_symbol_key,
                "daily_limit": daily_limit,
            },
            "symbols": [
                {
                    "symbol_key": s.symbol_key,
                    "emoji": s.emoji,
                    "name": s.name,
                    "multiplier": s.multiplier,
                    "weight": s.weight,
                    "sort_order": s.sort_order,
                    "is_enabled": s.is_enabled,
                    "is_jackpot": s.is_jackpot,
                }
                for s in symbols
            ],
            "today_count": today_count,
            "remaining_today": remaining,
            "balance": balance,
            "can_play": can_play,
        }

    @staticmethod
    async def spin(
        db: AsyncSession,
        user_id: int,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        执行老虎机抽奖
        - 后端生成随机结果（按权重）
        - 扣除积分
        - 发放奖励
        - 记录抽奖日志
        """
        config = await SlotMachineService.get_active_config(db)
        if not config:
            raise ValueError("老虎机未启用")

        # 检查日限
        if config.daily_limit:
            today_count = await SlotMachineService.get_today_count(db, user_id, config.id)
            if today_count >= config.daily_limit:
                raise ValueError(f"今日次数已用完（{today_count}/{config.daily_limit}）")

        symbols = await SlotMachineService.get_enabled_symbols(db, config.id, include_disabled=False)
        if not symbols:
            raise ValueError("老虎机符号池为空")

        cost = int(config.cost_points)
        reels_count = int(config.reels or 3)

        # 扣除积分（使用行锁防并发）
        try:
            await PointsService.deduct_points(
                db=db,
                user_id=user_id,
                amount=cost,
                reason=PointsReason.LOTTERY_SPEND,
                description="老虎机消费",
                auto_commit=False,
            )
        except ValueError as e:
            raise ValueError(str(e))

        # 按权重随机生成每个滚轴的结果
        reels = [SlotMachineService.weighted_random_pick(symbols) for _ in range(reels_count)]

        # 计算中奖
        win_type, multiplier, payout, is_jackpot = SlotMachineService.calculate_payout(config, reels)

        # 大奖尝试额外发放 API Key（从 api_key_codes.description="彩蛋" 分配）
        api_key_code = None
        api_key_quota = None
        if is_jackpot:
            from app.services.lottery_service import LotteryService
            api_key_info = await LotteryService._assign_api_key(db, user_id, "彩蛋")
            if api_key_info:
                api_key_code = api_key_info["code"]
                api_key_quota = api_key_info["quota"]

        # 发放奖励
        if payout > 0:
            await PointsService.add_points(
                db=db,
                user_id=user_id,
                amount=payout,
                reason=PointsReason.LOTTERY_WIN,
                description=f"老虎机{'大奖' if is_jackpot else '中奖'}",
                auto_commit=False,
            )

        # 记录抽奖日志
        draw = SlotMachineDraw(
            user_id=user_id,
            config_id=config.id,
            cost_points=cost,
            reel_1=reels[0].symbol_key if len(reels) > 0 else "",
            reel_2=reels[1].symbol_key if len(reels) > 1 else "",
            reel_3=reels[2].symbol_key if len(reels) > 2 else "",
            win_type=win_type,
            multiplier=Decimal(str(multiplier)),
            payout_points=payout,
            is_jackpot=is_jackpot,
            request_id=request_id or str(uuid.uuid4()),
        )
        db.add(draw)

        await db.commit()

        # 获取最新余额
        balance = await PointsService.get_balance(db, user_id)

        return {
            "success": True,
            "cost_points": cost,
            "reels": [r.symbol_key for r in reels],
            "win_type": win_type.value,
            "multiplier": multiplier,
            "payout_points": payout,
            "balance": balance,
            "is_jackpot": is_jackpot,
            "api_key_code": api_key_code,
            "api_key_quota": api_key_quota,
        }

    # ==================== 管理员方法 ====================

    @staticmethod
    async def get_admin_config(db: AsyncSession) -> Dict[str, Any]:
        """获取管理员配置视图（包含统计指标）"""
        config = await SlotMachineService.get_active_config(db)
        if not config:
            raise ValueError("老虎机配置不存在，请先执行数据库迁移")

        symbols = await SlotMachineService.get_enabled_symbols(db, config.id, include_disabled=True)

        # 计算统计指标
        enabled_symbols = [s for s in symbols if s.is_enabled and s.weight > 0]
        total_weight = sum(s.weight for s in enabled_symbols)

        # 计算理论返奖率（简化版）
        # 三连概率 = (weight/total)^3，期望返奖 = sum(三连概率 * multiplier)
        theoretical_rtp = 0.0
        if total_weight > 0:
            for s in enabled_symbols:
                prob = (s.weight / total_weight) ** 3
                theoretical_rtp += prob * s.multiplier
            # 加上两连的贡献（简化计算）
            theoretical_rtp += 0.1 * float(config.two_kind_multiplier)  # 两连约10%概率

        return {
            "config": {
                "id": config.id,
                "name": config.name,
                "is_active": config.is_active,
                "cost_points": config.cost_points,
                "reels": config.reels,
                "two_kind_multiplier": float(config.two_kind_multiplier),
                "jackpot_symbol_key": config.jackpot_symbol_key,
            },
            "symbols": [
                {
                    "id": s.id,
                    "symbol_key": s.symbol_key,
                    "emoji": s.emoji,
                    "name": s.name,
                    "multiplier": s.multiplier,
                    "weight": s.weight,
                    "sort_order": s.sort_order,
                    "is_enabled": s.is_enabled,
                    "is_jackpot": s.is_jackpot,
                }
                for s in symbols
            ],
            "metrics": {
                "total_weight": total_weight,
                "symbols_count": len(symbols),
                "enabled_count": len(enabled_symbols),
                "theoretical_rtp": round(theoretical_rtp * 100, 2),  # 百分比
            },
        }

    @staticmethod
    async def update_config(db: AsyncSession, updates: Dict[str, Any]) -> None:
        """更新配置"""
        config = await SlotMachineService.get_active_config(db)
        if not config:
            raise ValueError("老虎机配置不存在")

        allowed_fields = {"name", "is_active", "cost_points", "reels", "two_kind_multiplier", "jackpot_symbol_key"}
        for key, value in updates.items():
            if key in allowed_fields and hasattr(config, key):
                setattr(config, key, value)

        await db.commit()

    @staticmethod
    async def replace_symbols(db: AsyncSession, symbols_data: List[Dict[str, Any]]) -> None:
        """替换所有符号配置"""
        config = await SlotMachineService.get_active_config(db)
        if not config:
            raise ValueError("老虎机配置不存在")

        # 验证数据
        keys = [s.get("symbol_key") for s in symbols_data]
        if any(not k for k in keys):
            raise ValueError("symbol_key 不能为空")
        if len(set(keys)) != len(keys):
            raise ValueError("symbol_key 必须唯一")

        # 删除现有符号
        await db.execute(
            delete(SlotMachineSymbol).where(SlotMachineSymbol.config_id == config.id)
        )

        # 插入新符号
        for s in symbols_data:
            weight = int(s.get("weight", 1))
            multiplier = int(s.get("multiplier", 1))
            if weight < 0 or multiplier < 0:
                raise ValueError("weight 和 multiplier 必须为非负整数")

            db.add(SlotMachineSymbol(
                config_id=config.id,
                symbol_key=s["symbol_key"],
                emoji=s.get("emoji", "🎰"),
                name=s.get("name", s["symbol_key"]),
                multiplier=multiplier,
                weight=weight,
                sort_order=int(s.get("sort_order", 0)),
                is_enabled=bool(s.get("is_enabled", True)),
                is_jackpot=bool(s.get("is_jackpot", False)),
            ))

        await db.commit()

    @staticmethod
    async def get_draw_stats(db: AsyncSession, days: int = 7) -> Dict[str, Any]:
        """获取抽奖统计"""
        from datetime import datetime, timedelta

        since = datetime.now() - timedelta(days=days)

        # 总抽奖次数、总消费、总奖励
        result = await db.execute(
            select(
                func.count(SlotMachineDraw.id).label("total_draws"),
                func.sum(SlotMachineDraw.cost_points).label("total_cost"),
                func.sum(SlotMachineDraw.payout_points).label("total_payout"),
                func.sum(func.IF(SlotMachineDraw.win_type != SlotWinType.NONE, 1, 0)).label("win_count"),
                func.sum(func.IF(SlotMachineDraw.is_jackpot == True, 1, 0)).label("jackpot_count"),
            )
            .where(SlotMachineDraw.created_at >= since)
        )
        row = result.first()

        total_draws = row.total_draws or 0
        total_cost = row.total_cost or 0
        total_payout = row.total_payout or 0
        win_count = row.win_count or 0
        jackpot_count = row.jackpot_count or 0

        actual_rtp = (total_payout / total_cost * 100) if total_cost > 0 else 0
        win_rate = (win_count / total_draws * 100) if total_draws > 0 else 0

        return {
            "days": days,
            "total_draws": total_draws,
            "total_cost": int(total_cost),
            "total_payout": int(total_payout),
            "win_count": int(win_count),
            "jackpot_count": int(jackpot_count),
            "actual_rtp": round(actual_rtp, 2),
            "win_rate": round(win_rate, 2),
            "house_profit": int(total_cost - total_payout),
        }
