"""
积分兑换商城服务
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert

from app.models.points import (
    ExchangeItem, ExchangeRecord, UserExchangeQuota,
    ExchangeItemType, PointsReason, ApiKeyCode, ApiKeyStatus
)
from app.services.points_service import PointsService


class ExchangeService:
    """积分兑换服务"""

    @staticmethod
    async def get_exchange_items(db: AsyncSession) -> List[Dict[str, Any]]:
        """获取所有上架的兑换商品"""
        result = await db.execute(
            select(ExchangeItem)
            .where(ExchangeItem.is_active == True)
            .order_by(ExchangeItem.sort_order, ExchangeItem.id)
        )
        items = result.scalars().all()

        return [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "item_type": item.item_type.value,
                "cost_points": item.cost_points,
                "stock": item.stock,
                "daily_limit": item.daily_limit,
                "total_limit": item.total_limit,
                "icon": item.icon,
                "is_hot": item.is_hot,
                "has_stock": item.stock is None or item.stock > 0
            }
            for item in items
        ]

    @staticmethod
    async def get_user_exchange_info(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, Any]:
        """获取用户兑换相关信息（余额、券额度等）"""
        # 获取余额
        balance = await PointsService.get_balance(db, user_id)

        # 获取用户的券额度
        result = await db.execute(
            select(UserExchangeQuota)
            .where(UserExchangeQuota.user_id == user_id)
        )
        quotas = result.scalars().all()
        quota_map = {q.quota_type: q.quantity for q in quotas}

        return {
            "balance": balance,
            "lottery_tickets": quota_map.get("LOTTERY_TICKET", 0),
            "scratch_tickets": quota_map.get("SCRATCH_TICKET", 0),
            "gacha_tickets": quota_map.get("GACHA_TICKET", 0),
        }

    @staticmethod
    async def get_user_today_exchange_count(
        db: AsyncSession,
        user_id: int,
        item_id: int,
        for_update: bool = False
    ) -> int:
        """
        获取用户今日对某商品的兑换次数

        Args:
            for_update: 是否加行锁（用于并发安全的限购校验）
        """
        today = date.today()
        query = select(func.sum(ExchangeRecord.quantity)).where(
            and_(
                ExchangeRecord.user_id == user_id,
                ExchangeRecord.item_id == item_id,
                func.date(ExchangeRecord.created_at) == today
            )
        )
        if for_update:
            # 使用 FOR UPDATE 锁定相关记录，防止并发绕过限购
            query = query.with_for_update()
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def get_user_total_exchange_count(
        db: AsyncSession,
        user_id: int,
        item_id: int,
        for_update: bool = False
    ) -> int:
        """
        获取用户对某商品的总兑换次数

        Args:
            for_update: 是否加行锁（用于并发安全的限购校验）
        """
        query = select(func.sum(ExchangeRecord.quantity)).where(
            and_(
                ExchangeRecord.user_id == user_id,
                ExchangeRecord.item_id == item_id
            )
        )
        if for_update:
            # 使用 FOR UPDATE 锁定相关记录，防止并发绕过限购
            query = query.with_for_update()
        result = await db.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def _add_user_quota(
        db: AsyncSession,
        user_id: int,
        quota_type: str,
        quantity: int = 1
    ):
        """给用户添加券额度"""
        stmt = insert(UserExchangeQuota).values(
            user_id=user_id,
            quota_type=quota_type,
            quantity=quantity
        ).on_duplicate_key_update(
            quantity=UserExchangeQuota.quantity + quantity
        )
        await db.execute(stmt)

    @staticmethod
    async def exchange(
        db: AsyncSession,
        user_id: int,
        item_id: int,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """
        执行兑换
        """
        # 获取商品信息（加锁）
        result = await db.execute(
            select(ExchangeItem)
            .where(ExchangeItem.id == item_id)
            .with_for_update()
        )
        item = result.scalar_one_or_none()

        if not item:
            raise ValueError("商品不存在")

        if not item.is_active:
            raise ValueError("商品已下架")

        # 检查库存
        if item.stock is not None and item.stock < quantity:
            raise ValueError("库存不足")

        # ========== 使用计数表进行并发安全的限购检查 ==========
        # 使用 INSERT ... ON DUPLICATE KEY UPDATE 原子性地增加计数
        # 然后检查计数是否超过限制，如果超过则回滚
        from sqlalchemy import text as sql_text
        from datetime import date as date_type

        today_str = date_type.today().isoformat()

        if item.daily_limit or item.total_limit:
            # 先尝试插入或更新计数记录（加行锁）
            upsert_sql = sql_text("""
                INSERT INTO user_item_purchase_counts
                    (user_id, item_id, purchase_date, daily_count, total_count)
                VALUES
                    (:user_id, :item_id, :today, :quantity, :quantity)
                ON DUPLICATE KEY UPDATE
                    daily_count = IF(purchase_date = :today, daily_count + :quantity, :quantity),
                    total_count = total_count + :quantity,
                    purchase_date = :today
            """)
            await db.execute(upsert_sql, {
                "user_id": user_id,
                "item_id": item_id,
                "today": today_str,
                "quantity": quantity
            })

            # 查询更新后的计数（加行锁确保一致性）
            count_sql = sql_text("""
                SELECT daily_count, total_count FROM user_item_purchase_counts
                WHERE user_id = :user_id AND item_id = :item_id
                FOR UPDATE
            """)
            count_result = await db.execute(count_sql, {
                "user_id": user_id,
                "item_id": item_id
            })
            count_row = count_result.fetchone()

            if count_row:
                # 检查每日限购
                if item.daily_limit and count_row.daily_count > item.daily_limit:
                    raise ValueError(f"今日限购{item.daily_limit}件，请勿重复提交")

                # 检查总限购
                if item.total_limit and count_row.total_count > item.total_limit:
                    raise ValueError(f"限购{item.total_limit}件，请勿重复提交")

        # 计算总消费
        total_cost = item.cost_points * quantity

        try:
            # 扣除积分
            await PointsService.deduct_points(
                db=db,
                user_id=user_id,
                amount=total_cost,
                reason=PointsReason.EXCHANGE_SPEND,
                description=f"兑换 {item.name} x{quantity}",
                auto_commit=False
            )

            # 扣减库存
            if item.stock is not None:
                item.stock -= quantity

            # 发放奖励
            reward_value = None
            reward_message = None

            if item.item_type == ExchangeItemType.LOTTERY_TICKET:
                await ExchangeService._add_user_quota(
                    db, user_id, "LOTTERY_TICKET", quantity
                )
                reward_message = f"获得{quantity}张抽奖券"

            elif item.item_type == ExchangeItemType.SCRATCH_TICKET:
                await ExchangeService._add_user_quota(
                    db, user_id, "SCRATCH_TICKET", quantity
                )
                reward_message = f"获得{quantity}张刮刮乐券"

            elif item.item_type == ExchangeItemType.GACHA_TICKET:
                await ExchangeService._add_user_quota(
                    db, user_id, "GACHA_TICKET", quantity
                )
                reward_message = f"获得{quantity}张扭蛋券"

            elif item.item_type == ExchangeItemType.API_KEY:
                # 分配API Key，按用途（item_value）从对应库存分配
                # item_value 存储用途类型，对应 api_key_codes.description
                # 注意：API Key 商品每次只能购买 1 个（quantity 必须为 1）
                if quantity > 1:
                    raise ValueError("API Key 商品每次只能兑换 1 个")
                usage_type = item.item_value or "兑换"  # 默认用途为"兑换"
                api_key_info = await ExchangeService._assign_api_key(db, user_id, usage_type)
                if api_key_info:
                    reward_value = api_key_info["code"][:8] + "****"
                    quota_display = f"${api_key_info['quota']}" if api_key_info['quota'] else ""
                    reward_message = f"获得{quota_display}API Key兑换码，请在个人中心查看"
                else:
                    # 库存不足，退还积分
                    await PointsService.add_points(
                        db=db,
                        user_id=user_id,
                        amount=total_cost,
                        reason=PointsReason.ADMIN_GRANT,
                        description="API Key库存不足，退还积分",
                        auto_commit=False
                    )
                    raise ValueError("API Key库存不足，积分已退还")

            elif item.item_type == ExchangeItemType.ITEM:
                # 发放道具
                from app.services.lottery_service import LotteryService
                await LotteryService._add_user_item(db, user_id, item.item_value, quantity)
                reward_message = f"获得{item.name} x{quantity}"

            # 创建兑换记录
            record = ExchangeRecord(
                user_id=user_id,
                item_id=item_id,
                item_name=item.name,
                item_type=item.item_type.value,
                cost_points=total_cost,
                quantity=quantity,
                reward_value=reward_value
            )
            db.add(record)

            # 确保 record 有 id
            await db.flush()

            # 记录任务进度（兑换任务）
            from app.services.task_service import TaskService
            from app.models.task import TaskType
            await TaskService.record_event(
                db=db,
                user_id=user_id,
                task_type=TaskType.EXCHANGE,
                delta=quantity,
                event_key=f"exchange:{record.id}",
                ref_type="exchange_record",
                ref_id=record.id,
                auto_claim=True,
            )

            await db.commit()

            # 获取更新后的余额
            balance = await PointsService.get_balance(db, user_id)

            return {
                "success": True,
                "item_name": item.name,
                "quantity": quantity,
                "cost_points": total_cost,
                "reward_value": reward_value,
                "message": reward_message,
                "balance": balance
            }

        except Exception:
            await db.rollback()
            raise

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
            usage_type: 用途类型，对应 api_key_codes.description
                       如果为空则从任意可用的key中分配

        Returns:
            分配成功返回包含 code 和 quota 的字典，失败返回 None
        """
        query = select(ApiKeyCode).where(ApiKeyCode.status == ApiKeyStatus.AVAILABLE)

        if usage_type:
            query = query.where(ApiKeyCode.description == usage_type)

        result = await db.execute(
            query.limit(1).with_for_update()
        )
        api_key = result.scalar_one_or_none()

        if not api_key:
            return None

        api_key.status = ApiKeyStatus.ASSIGNED
        api_key.assigned_user_id = user_id
        api_key.assigned_at = datetime.now()

        return {
            "code": api_key.code,
            "quota": float(api_key.quota) if api_key.quota else 0,
            "description": api_key.description
        }

    @staticmethod
    async def get_exchange_history(
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """获取用户兑换历史"""
        result = await db.execute(
            select(ExchangeRecord)
            .where(ExchangeRecord.user_id == user_id)
            .order_by(ExchangeRecord.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        records = result.scalars().all()

        return [
            {
                "id": r.id,
                "item_name": r.item_name,
                "item_type": r.item_type,
                "cost_points": r.cost_points,
                "quantity": r.quantity,
                "reward_value": r.reward_value,
                "created_at": r.created_at.isoformat()
            }
            for r in records
        ]

    @staticmethod
    async def use_ticket(
        db: AsyncSession,
        user_id: int,
        ticket_type: str
    ) -> bool:
        """
        使用一张券
        返回是否成功使用
        """
        # 查询用户额度（加锁）
        result = await db.execute(
            select(UserExchangeQuota)
            .where(
                and_(
                    UserExchangeQuota.user_id == user_id,
                    UserExchangeQuota.quota_type == ticket_type
                )
            )
            .with_for_update()
        )
        quota = result.scalar_one_or_none()

        if not quota or quota.quantity <= 0:
            return False

        quota.quantity -= 1
        await db.flush()
        return True

    @staticmethod
    async def get_user_tickets(
        db: AsyncSession,
        user_id: int
    ) -> Dict[str, int]:
        """获取用户的券数量"""
        result = await db.execute(
            select(UserExchangeQuota)
            .where(UserExchangeQuota.user_id == user_id)
        )
        quotas = result.scalars().all()

        return {q.quota_type: q.quantity for q in quotas}
