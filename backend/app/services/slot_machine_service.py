"""
老虎机服务
包含：配置管理、抽奖逻辑、概率计算
管理员可通过调整符号权重和中奖规则来完全控制胜率
"""
import random
import uuid
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal

from datetime import datetime, date
from sqlalchemy import select, delete, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.slot_machine import (
    SlotMachineConfig, SlotMachineSymbol, SlotMachineDraw,
    SlotWinType, SlotMachineRule, SlotRuleType
)
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
    async def get_enabled_rules(
        db: AsyncSession,
        config_id: int
    ) -> List[SlotMachineRule]:
        """获取启用的中奖规则，按优先级降序排序"""
        result = await db.execute(
            select(SlotMachineRule)
            .where(
                and_(
                    SlotMachineRule.config_id == config_id,
                    SlotMachineRule.is_enabled == True
                )
            )
            .order_by(SlotMachineRule.priority.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    def match_pattern(reels_keys: List[str], pattern: List[str], ordered: bool = True) -> bool:
        """检查滚轴结果是否匹配模式"""
        if not pattern:
            return False
        if ordered:
            # 顺序匹配：检查 reels_keys 是否以 pattern 开头
            if len(pattern) > len(reels_keys):
                return False
            return reels_keys[:len(pattern)] == pattern
        else:
            # 无序匹配：检查 pattern 中的所有元素是否都在 reels_keys 中
            return all(k in reels_keys for k in pattern)

    @staticmethod
    def count_symbol(reels_keys: List[str], symbol_key: str) -> int:
        """统计某个符号出现的次数"""
        return reels_keys.count(symbol_key)

    @staticmethod
    def check_rule_match(
        rule: SlotMachineRule,
        reels_keys: List[str],
        symbols_map: Dict[str, SlotMachineSymbol]
    ) -> Tuple[bool, Optional[str]]:
        """
        检查规则是否匹配
        返回：(是否匹配, 匹配的符号key)
        """
        rule_type = rule.rule_type
        pattern = rule.pattern or []

        if rule_type == SlotRuleType.THREE_SAME:
            # 三连规则
            if pattern:
                # 指定模式：完全匹配
                if reels_keys[:3] == pattern[:3] if len(pattern) >= 3 else False:
                    return True, pattern[0] if pattern else None
                # 也检查无序的三个相同（如果pattern长度为1，表示任意三个该符号）
                if len(pattern) == 1 and SlotMachineService.count_symbol(reels_keys, pattern[0]) >= 3:
                    return True, pattern[0]
            else:
                # 任意三连
                if len(reels_keys) >= 3 and reels_keys[0] == reels_keys[1] == reels_keys[2]:
                    return True, reels_keys[0]
            return False, None

        elif rule_type == SlotRuleType.TWO_SAME:
            # 两连规则
            if pattern:
                if len(pattern) == 1 and SlotMachineService.count_symbol(reels_keys, pattern[0]) >= 2:
                    return True, pattern[0]
            else:
                # 任意两连
                from collections import Counter
                counts = Counter(reels_keys)
                for k, c in counts.items():
                    if c >= 2:
                        return True, k
            return False, None

        elif rule_type == SlotRuleType.SPECIAL_COMBO:
            # 特殊组合（如姬霓太美 j→n→t→m）
            if pattern:
                if len(pattern) <= len(reels_keys):
                    # 检查顺序匹配
                    if reels_keys[:len(pattern)] == pattern:
                        return True, None
                    # 检查无序匹配（包含所有元素）
                    if set(pattern).issubset(set(reels_keys)) and len(set(pattern)) == len(pattern):
                        return True, None
            return False, None

        elif rule_type == SlotRuleType.PENALTY:
            # 惩罚规则（如律师函）
            if pattern:
                symbol = pattern[0] if pattern else None
                if symbol and symbol in reels_keys:
                    count = SlotMachineService.count_symbol(reels_keys, symbol)
                    # 检查概率
                    prob = float(rule.probability) if rule.probability else 1.0
                    if random.random() < prob:
                        return True, symbol
            return False, None

        elif rule_type == SlotRuleType.BONUS:
            # 奖励规则（如 Man! 符号）
            if pattern:
                symbol = pattern[0] if pattern else None
                if symbol and symbol in reels_keys:
                    count = SlotMachineService.count_symbol(reels_keys, symbol)
                    prob = float(rule.probability) if rule.probability else 1.0
                    if random.random() < prob:
                        return True, symbol
            return False, None

        return False, None

    @staticmethod
    async def calculate_payout_with_rules(
        db: AsyncSession,
        config: SlotMachineConfig,
        reels: List[SlotMachineSymbol],
        rules: List[SlotMachineRule]
    ) -> Tuple[SlotWinType, float, int, bool, str, List[Dict]]:
        """
        使用数据库规则计算中奖结果
        返回：(中奖类型, 倍率, 奖励积分, 是否大奖, 中奖名称, 匹配的规则列表)
        """
        cost = int(config.cost_points)
        keys = [r.symbol_key for r in reels]
        symbols_map = {r.symbol_key: r for r in reels}

        matched_rules = []
        total_multiplier = 0.0
        has_penalty = False
        has_bonus = False
        win_names = []

        # 按优先级顺序检查规则
        for rule in rules:
            matched, matched_symbol = SlotMachineService.check_rule_match(rule, keys, symbols_map)
            if matched:
                multiplier = float(rule.multiplier) if rule.multiplier else 0

                # 处理随机奖励金额
                if rule.min_amount is not None and rule.max_amount is not None:
                    random_amount = random.randint(rule.min_amount, rule.max_amount)
                    multiplier = random_amount / cost if cost > 0 else 0

                if rule.fixed_points is not None:
                    # 固定积分直接转换为倍率
                    multiplier = rule.fixed_points / cost if cost > 0 else 0

                matched_rules.append({
                    "rule_key": rule.rule_key,
                    "rule_name": rule.rule_name,
                    "rule_type": rule.rule_type.value,
                    "multiplier": multiplier,
                    "matched_symbol": matched_symbol,
                })

                if rule.rule_type == SlotRuleType.PENALTY:
                    has_penalty = True
                    total_multiplier += multiplier  # 惩罚规则的 multiplier 为负数
                elif rule.rule_type == SlotRuleType.BONUS:
                    has_bonus = True
                    total_multiplier += multiplier
                else:
                    total_multiplier += multiplier
                    win_names.append(rule.rule_name)

        # 如果没有匹配到任何规则，使用默认逻辑
        if not matched_rules:
            # 三个相同
            if len(keys) >= 3 and keys[0] == keys[1] == keys[2]:
                multiplier = int(reels[0].multiplier)
                payout = cost * multiplier
                is_jackpot = (reels[0].symbol_key == config.jackpot_symbol_key) or bool(reels[0].is_jackpot)
                return SlotWinType.THREE, float(multiplier), int(payout), is_jackpot, "三连", []

            # 两个相同
            has_two = False
            if len(keys) >= 3:
                if keys[0] == keys[1] or keys[1] == keys[2] or keys[0] == keys[2]:
                    has_two = True
            if len(keys) >= 4:
                if keys[0] == keys[3] or keys[1] == keys[3] or keys[2] == keys[3]:
                    has_two = True

            if has_two:
                mult = float(config.two_kind_multiplier)
                payout = int(cost * mult)
                return SlotWinType.TWO, mult, payout, False, "两连", []

            # 未中奖
            return SlotWinType.NONE, 0.0, 0, False, "", []

        # 计算最终奖励
        payout = int(cost * total_multiplier)
        is_jackpot = any(r.get("multiplier", 0) >= 50 for r in matched_rules)

        win_type = SlotWinType.NONE
        if total_multiplier > 0:
            if any(r.get("multiplier", 0) >= 3 for r in matched_rules):
                win_type = SlotWinType.THREE
            else:
                win_type = SlotWinType.TWO
        elif total_multiplier < 0:
            win_type = SlotWinType.NONE  # 惩罚也算 NONE

        win_name = " + ".join(win_names) if win_names else ("惩罚" if has_penalty else "")

        return win_type, total_multiplier, payout, is_jackpot, win_name, matched_rules

    @staticmethod
    def calculate_payout(
        config: SlotMachineConfig,
        reels: List[SlotMachineSymbol]
    ) -> tuple[SlotWinType, float, int, bool]:
        """
        计算中奖结果（简单版本，不使用规则）
        返回：(中奖类型, 倍率, 奖励积分, 是否大奖)
        """
        cost = int(config.cost_points)
        keys = [r.symbol_key for r in reels]

        # 三个相同
        if len(keys) >= 3 and keys[0] == keys[1] == keys[2]:
            multiplier = int(reels[0].multiplier)
            payout = cost * multiplier
            is_jackpot = (reels[0].symbol_key == config.jackpot_symbol_key) or bool(reels[0].is_jackpot)
            return SlotWinType.THREE, float(multiplier), int(payout), is_jackpot

        # 两个相同
        has_two = False
        if len(keys) >= 3:
            if keys[0] == keys[1] or keys[1] == keys[2] or keys[0] == keys[2]:
                has_two = True
        if len(keys) >= 4:
            if keys[0] == keys[3] or keys[1] == keys[3] or keys[2] == keys[3]:
                has_two = True

        if has_two:
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
        request_id: Optional[str] = None,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """
        执行老虎机抽奖
        - 后端生成随机结果（按权重）
        - 使用数据库规则计算中奖
        - 扣除积分
        - 发放奖励（或扣除惩罚）
        - 记录抽奖日志

        Args:
            is_admin: 是否是管理员（管理员不受日限限制）
        """
        config = await SlotMachineService.get_active_config(db)
        if not config:
            raise ValueError("老虎机未启用")

        # 检查日限（管理员不受限制）
        if config.daily_limit and not is_admin:
            today_count = await SlotMachineService.get_today_count(db, user_id, config.id)
            if today_count >= config.daily_limit:
                raise ValueError(f"今日次数已用完（{today_count}/{config.daily_limit}）")

        symbols = await SlotMachineService.get_enabled_symbols(db, config.id, include_disabled=False)
        if not symbols:
            raise ValueError("老虎机符号池为空")

        # 获取规则
        rules = await SlotMachineService.get_enabled_rules(db, config.id)

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

        # 使用规则计算中奖
        if rules:
            win_type, multiplier, payout, is_jackpot, win_name, matched_rules = \
                await SlotMachineService.calculate_payout_with_rules(db, config, reels, rules)
        else:
            # 没有规则时使用简单计算
            win_type, multiplier, payout, is_jackpot = SlotMachineService.calculate_payout(config, reels)
            win_name = ""
            matched_rules = []

        # 大奖尝试额外发放 API Key（从 api_key_codes.description="彩蛋" 分配）
        api_key_code = None
        api_key_quota = None
        if is_jackpot:
            from app.services.lottery_service import LotteryService
            api_key_info = await LotteryService._assign_api_key(db, user_id, "彩蛋")
            if api_key_info:
                api_key_code = api_key_info["code"]
                api_key_quota = api_key_info["quota"]

        # 发放奖励或扣除惩罚
        if payout > 0:
            await PointsService.add_points(
                db=db,
                user_id=user_id,
                amount=payout,
                reason=PointsReason.LOTTERY_WIN,
                description=f"老虎机{'大奖' if is_jackpot else '中奖'}: {win_name}" if win_name else f"老虎机{'大奖' if is_jackpot else '中奖'}",
                auto_commit=False,
            )
        elif payout < 0:
            # 惩罚扣除积分
            try:
                await PointsService.deduct_points(
                    db=db,
                    user_id=user_id,
                    amount=abs(payout),
                    reason=PointsReason.LOTTERY_SPEND,
                    description=f"老虎机惩罚: {win_name}" if win_name else "老虎机惩罚",
                    auto_commit=False,
                )
            except ValueError:
                # 积分不足时不额外扣除
                payout = 0

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
            "win_name": win_name,
            "matched_rules": matched_rules,
            "api_key_code": api_key_code,
            "api_key_quota": api_key_quota,
        }

    # ==================== 管理员方法 ====================

    @staticmethod
    async def get_admin_config(db: AsyncSession) -> Dict[str, Any]:
        """获取管理员配置视图（包含统计指标和规则）"""
        config = await SlotMachineService.get_active_config(db)
        if not config:
            raise ValueError("老虎机配置不存在，请先执行数据库迁移")

        symbols = await SlotMachineService.get_enabled_symbols(db, config.id, include_disabled=True)

        # 获取规则
        rules = await SlotMachineService.get_enabled_rules(db, config.id)
        # 同时也获取禁用的规则（管理员需要看到全部）
        all_rules_result = await db.execute(
            select(SlotMachineRule)
            .where(SlotMachineRule.config_id == config.id)
            .order_by(SlotMachineRule.priority.desc())
        )
        all_rules = list(all_rules_result.scalars().all())

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
            "rules": [
                {
                    "id": r.id,
                    "rule_key": r.rule_key,
                    "rule_name": r.rule_name,
                    "rule_type": r.rule_type.value if hasattr(r.rule_type, 'value') else str(r.rule_type),
                    "pattern": r.pattern,
                    "multiplier": float(r.multiplier) if r.multiplier else 0,
                    "fixed_points": r.fixed_points,
                    "probability": float(r.probability) if r.probability else None,
                    "min_amount": r.min_amount,
                    "max_amount": r.max_amount,
                    "priority": r.priority,
                    "is_enabled": r.is_enabled,
                    "description": r.description,
                }
                for r in all_rules
            ],
            "metrics": {
                "total_weight": total_weight,
                "symbols_count": len(symbols),
                "enabled_count": len(enabled_symbols),
                "rules_count": len(all_rules),
                "enabled_rules_count": len([r for r in all_rules if r.is_enabled]),
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
