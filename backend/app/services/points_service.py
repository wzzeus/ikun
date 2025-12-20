"""
积分系统服务
包含：积分账本、签到、余额管理
"""
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import uuid

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.mysql import insert

from app.models.points import (
    PointsLedger, UserPoints, DailySignin, SigninMilestone,
    PointsReason
)


class PointsService:
    """积分服务"""

    @staticmethod
    async def get_or_create_user_points(
        db: AsyncSession,
        user_id: int,
        auto_commit: bool = True
    ) -> UserPoints:
        """
        获取或创建用户积分记录
        auto_commit: 是否自动提交，设为False时由调用方控制事务
        """
        result = await db.execute(
            select(UserPoints).where(UserPoints.user_id == user_id)
        )
        user_points = result.scalar_one_or_none()

        if not user_points:
            # 使用 INSERT IGNORE 防止并发创建
            stmt = insert(UserPoints).values(
                user_id=user_id,
                balance=0,
                total_earned=0,
                total_spent=0
            ).prefix_with('IGNORE')
            await db.execute(stmt)

            if auto_commit:
                await db.commit()
            else:
                await db.flush()

            # 重新查询
            result = await db.execute(
                select(UserPoints).where(UserPoints.user_id == user_id)
            )
            user_points = result.scalar_one_or_none()

        return user_points

    @staticmethod
    async def get_balance(db: AsyncSession, user_id: int) -> int:
        """获取用户积分余额"""
        user_points = await PointsService.get_or_create_user_points(db, user_id)
        return user_points.balance if user_points else 0

    @staticmethod
    async def add_points(
        db: AsyncSession,
        user_id: int,
        amount: int,
        reason: PointsReason,
        ref_type: str = None,
        ref_id: int = None,
        description: str = None,
        request_id: str = None,
        auto_commit: bool = True
    ) -> PointsLedger:
        """
        增加积分（通用方法）
        返回积分账本记录
        auto_commit: 是否自动提交，设为False时由调用方控制事务
        """
        if amount <= 0:
            raise ValueError("增加积分必须为正数")

        # 获取当前余额（带行锁）
        from sqlalchemy import text
        result = await db.execute(
            select(UserPoints)
            .where(UserPoints.user_id == user_id)
            .with_for_update()
        )
        user_points = result.scalar_one_or_none()

        if not user_points:
            # 创建新记录（传递 auto_commit 参数，避免破坏外层事务）
            user_points = await PointsService.get_or_create_user_points(
                db, user_id, auto_commit=auto_commit
            )
            # 重新获取带锁
            result = await db.execute(
                select(UserPoints)
                .where(UserPoints.user_id == user_id)
                .with_for_update()
            )
            user_points = result.scalar_one()

        new_balance = user_points.balance + amount

        # 创建账本记录
        ledger = PointsLedger(
            user_id=user_id,
            amount=amount,
            balance_after=new_balance,
            reason=reason,
            ref_type=ref_type,
            ref_id=ref_id,
            description=description,
            request_id=request_id or str(uuid.uuid4())
        )
        db.add(ledger)

        # 更新余额缓存
        user_points.balance = new_balance
        user_points.total_earned += amount

        if auto_commit:
            await db.commit()
            await db.refresh(ledger)
        else:
            await db.flush()

        return ledger

    @staticmethod
    async def deduct_points(
        db: AsyncSession,
        user_id: int,
        amount: int,
        reason: PointsReason,
        ref_type: str = None,
        ref_id: int = None,
        description: str = None,
        request_id: str = None,
        auto_commit: bool = True
    ) -> PointsLedger:
        """
        扣除积分（通用方法）
        返回积分账本记录
        余额不足时抛出异常
        auto_commit: 是否自动提交，设为False时由调用方控制事务
        """
        if amount <= 0:
            raise ValueError("扣除积分必须为正数")

        # 获取当前余额（带行锁防并发）
        result = await db.execute(
            select(UserPoints)
            .where(UserPoints.user_id == user_id)
            .with_for_update()
        )
        user_points = result.scalar_one_or_none()

        if not user_points:
            # 创建新记录（传递 auto_commit 参数，避免破坏外层事务）
            user_points = await PointsService.get_or_create_user_points(
                db, user_id, auto_commit=auto_commit
            )
            # 重新获取带锁
            result = await db.execute(
                select(UserPoints)
                .where(UserPoints.user_id == user_id)
                .with_for_update()
            )
            user_points = result.scalar_one()

        if user_points.balance < amount:
            raise ValueError(f"积分不足，当前余额 {user_points.balance}，需要 {amount}")

        new_balance = user_points.balance - amount

        # 创建账本记录（负数）
        ledger = PointsLedger(
            user_id=user_id,
            amount=-amount,
            balance_after=new_balance,
            reason=reason,
            ref_type=ref_type,
            ref_id=ref_id,
            description=description,
            request_id=request_id or str(uuid.uuid4())
        )
        db.add(ledger)

        # 更新余额缓存
        user_points.balance = new_balance
        user_points.total_spent += amount

        if auto_commit:
            await db.commit()
            await db.refresh(ledger)
        else:
            await db.flush()

        return ledger

    @staticmethod
    async def record_zero_spend(
        db: AsyncSession,
        user_id: int,
        reason: PointsReason,
        ref_type: str = None,
        ref_id: int = None,
        description: str = None,
        auto_commit: bool = True
    ) -> PointsLedger:
        """
        记录一条 0 积分消耗的日志（用于统计使用券的次数）
        不影响余额，只记录日志
        """
        # 获取当前余额
        user_points = await PointsService.get_or_create_user_points(db, user_id, auto_commit=False)
        current_balance = user_points.balance if user_points else 0

        # 创建账本记录
        ledger = PointsLedger(
            user_id=user_id,
            amount=0,
            balance_after=current_balance,
            reason=reason,
            ref_type=ref_type,
            ref_id=ref_id,
            description=description,
            request_id=str(uuid.uuid4())
        )
        db.add(ledger)

        if auto_commit:
            await db.commit()
            await db.refresh(ledger)
        else:
            await db.flush()

        return ledger

    @staticmethod
    async def get_points_history(
        db: AsyncSession,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
        filter_type: str = None
    ) -> List[PointsLedger]:
        """获取积分变动历史"""
        query = select(PointsLedger).where(PointsLedger.user_id == user_id)

        # 按收入/支出筛选
        if filter_type == "income":
            query = query.where(PointsLedger.amount > 0)
        elif filter_type == "expense":
            query = query.where(PointsLedger.amount < 0)

        result = await db.execute(
            query.order_by(PointsLedger.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def get_points_history_count(
        db: AsyncSession,
        user_id: int,
        filter_type: str = None
    ) -> int:
        """获取积分变动历史总数"""
        query = select(func.count(PointsLedger.id)).where(PointsLedger.user_id == user_id)

        if filter_type == "income":
            query = query.where(PointsLedger.amount > 0)
        elif filter_type == "expense":
            query = query.where(PointsLedger.amount < 0)

        result = await db.execute(query)
        return result.scalar() or 0


class SigninService:
    """签到服务"""

    @staticmethod
    async def get_signin_milestones(db: AsyncSession) -> Dict[int, int]:
        """获取连续签到里程碑配置"""
        result = await db.execute(select(SigninMilestone))
        milestones = result.scalars().all()
        return {m.day: m.bonus_points for m in milestones}

    @staticmethod
    async def get_streak_days(db: AsyncSession, user_id: int) -> int:
        """计算当前连续签到天数"""
        today = date.today()

        # 查询最近30天的签到记录
        result = await db.execute(
            select(DailySignin.signin_date)
            .where(
                and_(
                    DailySignin.user_id == user_id,
                    DailySignin.signin_date >= today - timedelta(days=30)
                )
            )
            .order_by(DailySignin.signin_date.desc())
        )
        signin_dates = [row[0] for row in result.fetchall()]

        if not signin_dates:
            return 0

        # 计算连续天数（从昨天开始往前算）
        streak = 0
        check_date = today - timedelta(days=1)

        # 如果今天已签到，从今天开始算
        if signin_dates and signin_dates[0] == today:
            streak = 1
            check_date = today - timedelta(days=1)
            signin_dates = signin_dates[1:]

        for d in signin_dates:
            if d == check_date:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break

        return streak

    @staticmethod
    async def check_signed_today(db: AsyncSession, user_id: int) -> bool:
        """检查今天是否已签到"""
        today = date.today()
        result = await db.execute(
            select(DailySignin)
            .where(
                and_(
                    DailySignin.user_id == user_id,
                    DailySignin.signin_date == today
                )
            )
        )
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def signin(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """
        每日签到
        返回签到结果，包含获得积分、连续天数、额外奖励等
        使用唯一约束处理并发问题
        """
        from sqlalchemy.exc import IntegrityError

        today = date.today()

        # 计算连续签到天数（加上今天）
        streak = await SigninService.get_streak_days(db, user_id) + 1

        # 基础积分
        base_points = 100
        bonus_points = 0

        # 检查里程碑奖励
        milestones = await SigninService.get_signin_milestones(db)
        if streak in milestones:
            bonus_points = milestones[streak]

        total_points = base_points + bonus_points

        try:
            # 创建签到记录（依赖唯一约束防止重复签到）
            signin = DailySignin(
                user_id=user_id,
                signin_date=today,
                points_earned=base_points,
                streak_day=streak,
                bonus_points=bonus_points
            )
            db.add(signin)
            await db.flush()

            # 发放基础积分（不自动提交，由本方法统一提交）
            await PointsService.add_points(
                db=db,
                user_id=user_id,
                amount=base_points,
                reason=PointsReason.SIGNIN_DAILY,
                ref_type="daily_signin",
                ref_id=signin.id,
                description=f"每日签到（连续{streak}天）",
                auto_commit=False
            )

            # 发放里程碑奖励
            if bonus_points > 0:
                await PointsService.add_points(
                    db=db,
                    user_id=user_id,
                    amount=bonus_points,
                    reason=PointsReason.SIGNIN_STREAK_BONUS,
                    ref_type="daily_signin",
                    ref_id=signin.id,
                    description=f"连续签到{streak}天奖励",
                    auto_commit=False
                )

            # 记录任务进度（签到任务）
            from app.services.task_service import TaskService
            from app.models.task import TaskType
            await TaskService.record_event(
                db=db,
                user_id=user_id,
                task_type=TaskType.SIGNIN,
                delta=1,
                event_key=f"signin:{today.isoformat()}",
                ref_type="daily_signin",
                ref_id=signin.id,
                auto_claim=True,
            )

            await db.commit()

        except IntegrityError:
            await db.rollback()
            raise ValueError("今天已经签到过了")

        # 获取更新后的余额
        balance = await PointsService.get_balance(db, user_id)

        return {
            "success": True,
            "signin_date": today.isoformat(),
            "streak_day": streak,
            "base_points": base_points,
            "bonus_points": bonus_points,
            "total_points": total_points,
            "balance": balance,
            "is_milestone": bonus_points > 0,
            "milestone_message": f"连续签到{streak}天，额外获得{bonus_points}积分！" if bonus_points > 0 else None
        }

    @staticmethod
    async def get_signin_status(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """获取签到状态"""
        today = date.today()
        signed_today = await SigninService.check_signed_today(db, user_id)
        streak = await SigninService.get_streak_days(db, user_id)

        # 如果今天已签到，streak已经包含今天
        if not signed_today:
            # 如果今天还没签到，显示签到后的天数
            streak_display = streak + 1
        else:
            streak_display = streak

        # 获取本月签到记录
        first_day_of_month = today.replace(day=1)
        result = await db.execute(
            select(DailySignin.signin_date)
            .where(
                and_(
                    DailySignin.user_id == user_id,
                    DailySignin.signin_date >= first_day_of_month
                )
            )
        )
        monthly_signins = [row[0].isoformat() for row in result.fetchall()]

        # 获取里程碑配置
        milestones = await SigninService.get_signin_milestones(db)

        # 下一个里程碑
        next_milestone = None
        next_milestone_bonus = 0
        for day in sorted(milestones.keys()):
            if day > streak:
                next_milestone = day
                next_milestone_bonus = milestones[day]
                break

        return {
            "signed_today": signed_today,
            "streak_days": streak if signed_today else streak,
            "streak_display": streak_display,
            "monthly_signins": monthly_signins,
            "monthly_count": len(monthly_signins),
            "next_milestone": next_milestone,
            "next_milestone_bonus": next_milestone_bonus,
            "days_to_milestone": next_milestone - streak if next_milestone else None,
            "milestones": [
                {"day": d, "bonus": b, "reached": streak >= d}
                for d, b in sorted(milestones.items())
            ]
        }
