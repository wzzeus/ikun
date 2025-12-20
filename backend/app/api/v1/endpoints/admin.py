"""
管理后台 API
包含：用户管理、签到配置、抽奖配置、系统数据
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User
from app.models.points import (
    UserPoints, PointsLedger, PointsReason,
    DailySignin, SigninMilestone,
    LotteryConfig, LotteryPrize, LotteryDraw,
    UserItem, ApiKeyCode, ExchangeItem, ExchangeRecord,
    ScratchCard
)

router = APIRouter()


# ========== 权限检查 ==========

def require_admin(user: User):
    """检查管理员权限

    支持角色切换场景：如果用户的 original_role 是 admin，即使当前 role 不是 admin 也允许访问。
    这样管理员可以切换到其他角色测试功能，同时仍能访问管理后台。
    """
    # 优先检查 original_role（管理员切换角色后的真实身份）
    real_role = user.original_role or user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")


# ========== Schema ==========

class UserListItem(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    trust_level: Optional[int] = None
    balance: int = 0
    total_earned: int = 0
    total_spent: int = 0
    created_at: str


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class PointsAdjustRequest(BaseModel):
    amount: int
    reason: str = "管理员调整"


class SigninConfigResponse(BaseModel):
    base_points: int = 100
    milestones: List[dict]


class MilestoneUpdateRequest(BaseModel):
    day: int
    bonus_points: int
    description: Optional[str] = None


class LotteryConfigResponse(BaseModel):
    id: int
    name: str
    cost_points: int
    daily_limit: Optional[int] = None
    is_active: bool
    prizes: List[dict]


class LotteryConfigUpdateRequest(BaseModel):
    name: Optional[str] = None
    cost_points: Optional[int] = None
    daily_limit: Optional[int] = None
    is_active: Optional[bool] = None


class LotteryConfigCreateRequest(BaseModel):
    name: str
    cost_points: int = 10
    daily_limit: Optional[int] = None
    is_active: bool = True


class PrizeUpdateRequest(BaseModel):
    name: Optional[str] = None  # 前端使用 name
    type: Optional[str] = None  # 前端使用 type
    value: Optional[str] = None  # 前端使用 value
    weight: Optional[int] = None
    stock: Optional[int] = None
    is_rare: Optional[bool] = None
    is_enabled: Optional[bool] = None


class PrizeCreateRequest(BaseModel):
    config_id: int
    name: str  # 前端使用 name
    type: str  # 前端使用 type
    value: Optional[str] = None  # 前端使用 value
    weight: int = 100
    stock: Optional[int] = None
    is_rare: bool = False
    is_enabled: bool = True


class ApiKeyCreateRequest(BaseModel):
    code: str
    quota: float = 0
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class DashboardStats(BaseModel):
    total_users: int
    active_users_today: int
    total_points_circulation: int
    total_signins_today: int
    total_draws_today: int
    total_bets_today: int


# ========== 仪表盘 ==========

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取仪表盘数据"""
    require_admin(current_user)
    today = datetime.now().date()

    # 总用户数
    total_users = await db.scalar(select(func.count(User.id)))

    # 今日活跃用户（有签到或抽奖）
    signin_users = await db.scalar(
        select(func.count(func.distinct(DailySignin.user_id)))
        .where(DailySignin.signin_date == today)
    )

    # 积分总流通量
    total_earned = await db.scalar(
        select(func.coalesce(func.sum(UserPoints.total_earned), 0))
    )

    # 今日签到数
    total_signins = await db.scalar(
        select(func.count(DailySignin.id))
        .where(DailySignin.signin_date == today)
    )

    # 今日抽奖数
    total_draws = await db.scalar(
        select(func.count(LotteryDraw.id))
        .where(func.date(LotteryDraw.created_at) == today)
    )

    # 今日下注数
    from app.models.points import PredictionBet
    total_bets = await db.scalar(
        select(func.count(PredictionBet.id))
        .where(func.date(PredictionBet.created_at) == today)
    )

    return DashboardStats(
        total_users=total_users or 0,
        active_users_today=signin_users or 0,
        total_points_circulation=total_earned or 0,
        total_signins_today=total_signins or 0,
        total_draws_today=total_draws or 0,
        total_bets_today=total_bets or 0
    )


@router.get("/dashboard/charts")
async def get_dashboard_charts(
    days: int = Query(7, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取仪表盘图表数据"""
    require_admin(current_user)
    from datetime import timedelta
    from app.models.points import PredictionBet

    today = datetime.now().date()
    start_date = today - timedelta(days=days - 1)

    # 生成日期列表
    date_list = [(start_date + timedelta(days=i)).isoformat() for i in range(days)]

    # 每日签到趋势
    signin_result = await db.execute(
        select(DailySignin.signin_date, func.count(DailySignin.id))
        .where(DailySignin.signin_date >= start_date)
        .group_by(DailySignin.signin_date)
    )
    signin_data = {str(row[0]): row[1] for row in signin_result.fetchall()}

    # 每日抽奖趋势
    draw_result = await db.execute(
        select(func.date(LotteryDraw.created_at), func.count(LotteryDraw.id))
        .where(func.date(LotteryDraw.created_at) >= start_date)
        .group_by(func.date(LotteryDraw.created_at))
    )
    draw_data = {str(row[0]): row[1] for row in draw_result.fetchall()}

    # 每日下注趋势
    bet_result = await db.execute(
        select(func.date(PredictionBet.created_at), func.count(PredictionBet.id))
        .where(func.date(PredictionBet.created_at) >= start_date)
        .group_by(func.date(PredictionBet.created_at))
    )
    bet_data = {str(row[0]): row[1] for row in bet_result.fetchall()}

    # 每日新增用户
    user_result = await db.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(func.date(User.created_at) >= start_date)
        .group_by(func.date(User.created_at))
    )
    user_data = {str(row[0]): row[1] for row in user_result.fetchall()}

    # 用户角色分布
    role_result = await db.execute(
        select(User.role, func.count(User.id))
        .group_by(User.role)
    )
    role_distribution = [{"name": row[0], "value": row[1]} for row in role_result.fetchall()]

    # 奖品类型分布
    prize_result = await db.execute(
        select(LotteryDraw.prize_type, func.count(LotteryDraw.id))
        .group_by(LotteryDraw.prize_type)
    )
    prize_distribution = [{"name": row[0], "value": row[1]} for row in prize_result.fetchall()]

    # 积分流入流出（近7天）
    points_in_result = await db.execute(
        select(func.date(PointsLedger.created_at), func.sum(PointsLedger.amount))
        .where(PointsLedger.amount > 0)
        .where(func.date(PointsLedger.created_at) >= start_date)
        .group_by(func.date(PointsLedger.created_at))
    )
    points_in_data = {str(row[0]): int(row[1] or 0) for row in points_in_result.fetchall()}

    points_out_result = await db.execute(
        select(func.date(PointsLedger.created_at), func.sum(func.abs(PointsLedger.amount)))
        .where(PointsLedger.amount < 0)
        .where(func.date(PointsLedger.created_at) >= start_date)
        .group_by(func.date(PointsLedger.created_at))
    )
    points_out_data = {str(row[0]): int(row[1] or 0) for row in points_out_result.fetchall()}

    return {
        "dates": date_list,
        "signins": [signin_data.get(d, 0) for d in date_list],
        "draws": [draw_data.get(d, 0) for d in date_list],
        "bets": [bet_data.get(d, 0) for d in date_list],
        "new_users": [user_data.get(d, 0) for d in date_list],
        "role_distribution": role_distribution,
        "prize_distribution": prize_distribution,
        "points_in": [points_in_data.get(d, 0) for d in date_list],
        "points_out": [points_out_data.get(d, 0) for d in date_list],
    }


# ========== 用户管理 ==========

@router.get("/users")
async def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    sort_by: Optional[str] = Query(None, description="排序字段: balance, total_earned, total_spent, created_at"),
    sort_order: Optional[str] = Query("desc", description="排序方向: asc, desc"),
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户列表（带分页、总数和排序）"""
    require_admin(current_user)

    # 按积分排序需要 JOIN UserPoints
    if sort_by in ('balance', 'total_earned', 'total_spent'):
        # 使用左外连接查询
        base_query = select(User, UserPoints).outerjoin(UserPoints, User.id == UserPoints.user_id)

        if search:
            base_query = base_query.where(
                (User.username.contains(search)) |
                (User.display_name.contains(search)) |
                (User.email.contains(search))
            )
        if role:
            base_query = base_query.where(User.role == role)

        # 查询总数（只需统计 User，不需要 JOIN）
        count_query = select(func.count(User.id))
        if search:
            count_query = count_query.where(
                (User.username.contains(search)) |
                (User.display_name.contains(search)) |
                (User.email.contains(search))
            )
        if role:
            count_query = count_query.where(User.role == role)
        total = await db.scalar(count_query) or 0

        # 排序（二级排序键方向与主排序一致，确保分页稳定）
        sort_column = getattr(UserPoints, sort_by, UserPoints.balance)
        if sort_order == 'asc':
            base_query = base_query.order_by(func.coalesce(sort_column, 0).asc(), User.id.asc())
        else:
            base_query = base_query.order_by(func.coalesce(sort_column, 0).desc(), User.id.desc())

        # 分页
        query = base_query.offset(offset).limit(limit)
        result = await db.execute(query)
        rows = result.all()

        items = []
        for row in rows:
            u = row[0]  # User
            points = row[1]  # UserPoints (可能为 None)
            items.append(UserListItem(
                id=u.id,
                username=u.username,
                display_name=u.display_name,
                email=u.email,
                avatar_url=u.avatar_url,
                role=u.role,
                is_active=u.is_active,
                trust_level=u.trust_level,
                balance=points.balance if points and points.balance is not None else 0,
                total_earned=points.total_earned if points and points.total_earned is not None else 0,
                total_spent=points.total_spent if points and points.total_spent is not None else 0,
                created_at=u.created_at.isoformat() if u.created_at else ""
            ))
    else:
        # 普通查询（按 User 字段排序）
        base_query = select(User)
        if search:
            base_query = base_query.where(
                (User.username.contains(search)) |
                (User.display_name.contains(search)) |
                (User.email.contains(search))
            )
        if role:
            base_query = base_query.where(User.role == role)

        # 查询总数
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await db.scalar(count_query) or 0

        # 排序（添加 User.id 作为稳定的二级排序键）
        if sort_by == 'created_at':
            if sort_order == 'asc':
                base_query = base_query.order_by(User.created_at.asc(), User.id.asc())
            else:
                base_query = base_query.order_by(User.created_at.desc(), User.id.desc())
        else:
            base_query = base_query.order_by(User.id.desc())

        # 分页查询
        query = base_query.offset(offset).limit(limit)
        result = await db.execute(query)
        users = result.scalars().all()

        # 获取用户积分
        user_ids = [u.id for u in users]
        points_result = await db.execute(
            select(UserPoints).where(UserPoints.user_id.in_(user_ids))
        ) if user_ids else None
        points_map = {p.user_id: p for p in points_result.scalars().all()} if points_result else {}

        items = []
        for u in users:
            points = points_map.get(u.id)
            items.append(UserListItem(
                id=u.id,
                username=u.username,
                display_name=u.display_name,
                email=u.email,
                avatar_url=u.avatar_url,
                role=u.role,
                is_active=u.is_active,
                trust_level=u.trust_level,
                balance=points.balance if points and points.balance is not None else 0,
                total_earned=points.total_earned if points and points.total_earned is not None else 0,
                total_spent=points.total_spent if points and points.total_spent is not None else 0,
                created_at=u.created_at.isoformat() if u.created_at else ""
            ))

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新用户信息"""
    require_admin(current_user)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if request.role is not None:
        user.role = request.role
    if request.is_active is not None:
        user.is_active = request.is_active

    await db.commit()
    return {"success": True, "message": "更新成功"}


@router.post("/users/{user_id}/points")
async def adjust_user_points(
    user_id: int,
    request: PointsAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """调整用户积分"""
    require_admin(current_user)

    # 获取或创建用户积分
    result = await db.execute(select(UserPoints).where(UserPoints.user_id == user_id))
    user_points = result.scalar_one_or_none()

    if not user_points:
        user_points = UserPoints(user_id=user_id, balance=0, total_earned=0, total_spent=0)
        db.add(user_points)
        await db.flush()

    # 调整积分
    user_points.balance += request.amount
    if request.amount > 0:
        user_points.total_earned += request.amount
    else:
        user_points.total_spent += abs(request.amount)

    # 记录流水
    ledger = PointsLedger(
        user_id=user_id,
        amount=request.amount,
        balance_after=user_points.balance,
        reason=PointsReason.ADMIN_GRANT if request.amount > 0 else PointsReason.ADMIN_DEDUCT,
        description=request.reason
    )
    db.add(ledger)
    await db.commit()

    return {
        "success": True,
        "balance": user_points.balance,
        "message": f"积分调整成功，当前余额: {user_points.balance}"
    }


@router.get("/users/{user_id}/points-history")
async def get_user_points_history(
    user_id: int,
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取指定用户的积分流水（管理员）"""
    require_admin(current_user)

    # 查询用户信息
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 查询总数
    count_query = select(func.count(PointsLedger.id)).where(PointsLedger.user_id == user_id)
    total = await db.scalar(count_query) or 0

    # 查询流水记录
    query = (
        select(PointsLedger)
        .where(PointsLedger.user_id == user_id)
        .order_by(PointsLedger.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    ledger_items = result.scalars().all()

    # 获取用户当前积分
    points_result = await db.execute(select(UserPoints).where(UserPoints.user_id == user_id))
    user_points = points_result.scalar_one_or_none()

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
        },
        "current_balance": user_points.balance if user_points else 0,
        "total_earned": user_points.total_earned if user_points else 0,
        "total_spent": user_points.total_spent if user_points else 0,
        "items": [
            {
                "id": item.id,
                "amount": item.amount,
                "balance_after": item.balance_after,
                "reason": item.reason.value if hasattr(item.reason, 'value') else item.reason,
                "description": item.description,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in ledger_items
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


# ========== 签到配置 ==========

@router.get("/signin/config")
async def get_signin_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取签到配置"""
    require_admin(current_user)

    result = await db.execute(
        select(SigninMilestone).order_by(SigninMilestone.day)
    )
    milestones = result.scalars().all()

    return {
        "base_points": 100,
        "milestones": [
            {
                "id": m.id,
                "day": m.day,
                "bonus_points": m.bonus_points,
                "description": m.description
            }
            for m in milestones
        ]
    }


@router.post("/signin/milestones")
async def create_milestone(
    request: MilestoneUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建签到里程碑"""
    require_admin(current_user)

    milestone = SigninMilestone(
        day=request.day,
        bonus_points=request.bonus_points,
        description=request.description
    )
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)

    return {"success": True, "id": milestone.id}


@router.put("/signin/milestones/{milestone_id}")
async def update_milestone(
    milestone_id: int,
    request: MilestoneUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新签到里程碑"""
    require_admin(current_user)

    result = await db.execute(
        select(SigninMilestone).where(SigninMilestone.id == milestone_id)
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="里程碑不存在")

    milestone.day = request.day
    milestone.bonus_points = request.bonus_points
    if request.description is not None:
        milestone.description = request.description

    await db.commit()
    return {"success": True}


@router.delete("/signin/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除签到里程碑"""
    require_admin(current_user)

    await db.execute(
        delete(SigninMilestone).where(SigninMilestone.id == milestone_id)
    )
    await db.commit()
    return {"success": True}


# ========== 抽奖配置 ==========

@router.get("/lottery/configs")
async def get_lottery_configs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取所有抽奖配置"""
    require_admin(current_user)

    result = await db.execute(
        select(LotteryConfig).order_by(LotteryConfig.id.desc())
    )
    configs = result.scalars().all()

    items = []
    for config in configs:
        # 获取奖品
        prizes_result = await db.execute(
            select(LotteryPrize)
            .where(LotteryPrize.config_id == config.id)
            .order_by(LotteryPrize.weight.desc())
        )
        prizes = prizes_result.scalars().all()

        items.append({
            "id": config.id,
            "name": config.name,
            "cost_points": config.cost_points,
            "daily_limit": config.daily_limit,
            "is_active": config.is_active,
            "starts_at": config.starts_at.isoformat() if config.starts_at else None,
            "ends_at": config.ends_at.isoformat() if config.ends_at else None,
            "prizes": [
                {
                    "id": p.id,
                    "name": p.prize_name,  # 前端使用 name
                    "type": p.prize_type.value,  # 前端使用 type
                    "value": p.prize_value,  # 前端使用 value
                    "weight": p.weight,
                    "stock": p.stock,
                    "is_rare": p.is_rare,
                    "is_enabled": getattr(p, 'is_enabled', True)  # 兼容旧数据
                }
                for p in prizes
            ]
        })

    return {"configs": items}


@router.post("/lottery/configs")
async def create_lottery_config(
    request: LotteryConfigCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建抽奖配置"""
    require_admin(current_user)

    config = LotteryConfig(
        name=request.name,
        cost_points=request.cost_points,
        daily_limit=request.daily_limit,
        is_active=request.is_active
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)

    return {
        "success": True,
        "id": config.id,
        "name": config.name,
        "cost_points": config.cost_points,
        "daily_limit": config.daily_limit,
        "is_active": config.is_active
    }


@router.put("/lottery/configs/{config_id}")
async def update_lottery_config(
    config_id: int,
    request: LotteryConfigUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新抽奖配置"""
    require_admin(current_user)

    result = await db.execute(
        select(LotteryConfig).where(LotteryConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="配置不存在")

    if request.name is not None:
        config.name = request.name
    if request.cost_points is not None:
        config.cost_points = request.cost_points
    if request.daily_limit is not None:
        config.daily_limit = request.daily_limit
    if request.is_active is not None:
        config.is_active = request.is_active

    await db.commit()
    return {"success": True}


@router.post("/lottery/prizes")
async def create_prize(
    request: PrizeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建奖品"""
    require_admin(current_user)

    from app.models.points import PrizeType
    prize = LotteryPrize(
        config_id=request.config_id,
        prize_name=request.name,  # 前端使用 name
        prize_type=PrizeType(request.type),  # 前端使用 type
        prize_value=request.value,  # 前端使用 value
        weight=request.weight,
        stock=request.stock,
        is_rare=request.is_rare,
        is_enabled=request.is_enabled
    )
    db.add(prize)
    await db.commit()
    await db.refresh(prize)

    return {"success": True, "id": prize.id}


@router.put("/lottery/prizes/{prize_id}")
async def update_prize(
    prize_id: int,
    request: PrizeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新奖品"""
    require_admin(current_user)

    result = await db.execute(
        select(LotteryPrize).where(LotteryPrize.id == prize_id)
    )
    prize = result.scalar_one_or_none()
    if not prize:
        raise HTTPException(status_code=404, detail="奖品不存在")

    # 使用前端字段名映射到数据库字段
    if request.name is not None:
        prize.prize_name = request.name
    if request.type is not None:
        from app.models.points import PrizeType
        prize.prize_type = PrizeType(request.type)
    if request.value is not None:
        prize.prize_value = request.value
    if request.weight is not None:
        prize.weight = request.weight
    if request.stock is not None:
        prize.stock = request.stock
    if request.is_rare is not None:
        prize.is_rare = request.is_rare
    if request.is_enabled is not None:
        prize.is_enabled = request.is_enabled

    await db.commit()
    return {"success": True}


@router.delete("/lottery/prizes/{prize_id}")
async def delete_prize(
    prize_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除奖品"""
    require_admin(current_user)

    await db.execute(
        delete(LotteryPrize).where(LotteryPrize.id == prize_id)
    )
    await db.commit()
    return {"success": True}


# ========== API Key 管理 ==========

@router.get("/api-keys")
async def list_api_keys(
    status: Optional[str] = None,
    description: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = Query(10, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取 API Key 列表（带分页、用户名和筛选）"""
    require_admin(current_user)

    from sqlalchemy import func, and_

    # 构建查询条件列表
    filters = []

    # 状态筛选
    if status:
        from app.models.points import ApiKeyStatus
        try:
            filters.append(ApiKeyCode.status == ApiKeyStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"无效的状态值: {status}")

    # 描述筛选（模糊匹配）
    if description:
        filters.append(ApiKeyCode.description.ilike(f"%{description}%"))

    # 用户名筛选（需要先查找匹配的用户ID）
    user_ids_filter = None
    if username:
        user_query = select(User.id).where(
            (User.username.ilike(f"%{username}%")) |
            (User.display_name.ilike(f"%{username}%"))
        )
        user_result = await db.execute(user_query)
        matched_user_ids = [row.id for row in user_result]
        if matched_user_ids:
            filters.append(ApiKeyCode.assigned_user_id.in_(matched_user_ids))
        else:
            # 没有匹配的用户，返回空结果
            return {
                "items": [],
                "total": 0,
                "limit": limit,
                "offset": offset
            }

    # 构建查询
    count_query = select(func.count(ApiKeyCode.id))
    data_query = select(ApiKeyCode)

    if filters:
        combined_filter = and_(*filters)
        count_query = count_query.where(combined_filter)
        data_query = data_query.where(combined_filter)

    # 查询总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # 分页查询 API Keys
    data_query = (
        data_query
        .order_by(ApiKeyCode.id.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(data_query)
    keys = result.scalars().all()

    # 批量查询已分配的用户名（避免N+1查询）
    assigned_user_ids = [k.assigned_user_id for k in keys if k.assigned_user_id is not None]
    user_map = {}
    if assigned_user_ids:
        user_query = select(User.id, User.username, User.display_name).where(
            User.id.in_(assigned_user_ids)
        )
        user_result = await db.execute(user_query)
        for row in user_result:
            user_map[row.id] = row.display_name or row.username

    return {
        "items": [
            {
                "id": k.id,
                "code": k.code,
                "quota": float(k.quota) if k.quota else 0,
                "status": k.status.value,
                "assigned_user_id": k.assigned_user_id,
                "assigned_username": user_map.get(k.assigned_user_id) if k.assigned_user_id is not None else None,
                "assigned_at": k.assigned_at.isoformat() if k.assigned_at else None,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "description": k.description,
                "created_at": k.created_at.isoformat() if k.created_at else None
            }
            for k in keys
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.post("/api-keys")
async def create_api_key(
    request: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建 API Key"""
    require_admin(current_user)

    key = ApiKeyCode(
        code=request.code,
        quota=Decimal(str(request.quota)),
        description=request.description,
        expires_at=request.expires_at
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)

    return {"success": True, "id": key.id}


class BatchApiKeyCreateRequest(BaseModel):
    """批量创建 API Key 请求"""
    items: List[ApiKeyCreateRequest]


@router.post("/api-keys/batch")
async def batch_create_api_keys(
    request: BatchApiKeyCreateRequest = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """批量创建 API Key（支持两种格式：{items: [...]} 或直接传数组）"""
    require_admin(current_user)

    # 获取 items 列表
    items = request.items if request else []

    if not items:
        return {"success": False, "message": "没有要创建的兑换码", "created": 0}

    created = 0
    for item in items:
        key = ApiKeyCode(
            code=item.code,
            quota=Decimal(str(item.quota)),
            description=item.description,
            expires_at=item.expires_at
        )
        db.add(key)
        created += 1

    await db.commit()
    return {"success": True, "created": created}


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除 API Key"""
    require_admin(current_user)

    await db.execute(
        delete(ApiKeyCode).where(ApiKeyCode.id == key_id)
    )
    await db.commit()
    return {"success": True}


# ========== API Key 监控（参赛者 Key 消耗） ==========

@router.get("/apikey-monitor/summary")
async def get_apikey_monitor_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取所有参赛者 API Key 消耗汇总"""
    require_admin(current_user)

    from app.models.registration import Registration, RegistrationStatus
    from app.services.quota_service import quota_service
    from sqlalchemy.orm import selectinload

    # 获取所有有 API Key 的报名
    reg_query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value,
            ]),
            Registration.api_key.isnot(None),
            Registration.api_key != "",
        )
    )
    reg_result = await db.execute(reg_query)
    registrations = reg_result.scalars().all()

    if not registrations:
        return {
            "items": [],
            "total_used": 0,
            "total_remaining": 0,
            "total_count": 0,
            "active_count": 0,
        }

    # 批量查询额度
    api_keys = [(r.id, r.api_key) for r in registrations]
    quota_map = await quota_service.batch_get_quota(api_keys)

    # 构建结果
    items = []
    total_used = 0
    total_remaining = 0
    active_count = 0

    for reg in registrations:
        quota_info = quota_map.get(reg.id)

        if quota_info:
            total_used += quota_info.used
            total_remaining += quota_info.remaining if not quota_info.is_unlimited else 0
            if quota_info.today_used > 0:
                active_count += 1

            items.append({
                "registration_id": reg.id,
                "title": reg.title,
                "status": reg.status.value if hasattr(reg.status, 'value') else reg.status,
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
                "quota": {
                    "used": round(quota_info.used, 4),
                    "today_used": round(quota_info.today_used, 4),
                    "remaining": round(quota_info.remaining, 4),
                    "total": round(quota_info.total, 4),
                    "is_unlimited": quota_info.is_unlimited,
                    "username": quota_info.username,
                    "group": quota_info.group,
                },
                "query_status": "ok",
            })
        else:
            items.append({
                "registration_id": reg.id,
                "title": reg.title,
                "status": reg.status.value if hasattr(reg.status, 'value') else reg.status,
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
                "quota": None,
                "query_status": "error",
            })

    # 按消耗降序排序
    items.sort(key=lambda x: (
        x["query_status"] != "ok",
        -(x["quota"]["used"] if x["quota"] else 0)
    ))

    return {
        "items": items,
        "total_used": round(total_used, 4),
        "total_remaining": round(total_remaining, 4),
        "total_count": len(items),
        "active_count": active_count,
        "success_count": len([i for i in items if i["query_status"] == "ok"]),
        "error_count": len([i for i in items if i["query_status"] == "error"]),
    }


@router.get("/apikey-monitor/{registration_id}/logs")
async def get_apikey_monitor_logs(
    registration_id: int,
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取单个参赛者的 API 调用日志"""
    require_admin(current_user)

    import httpx
    from app.models.registration import Registration
    from app.core.config import settings

    # 获取报名信息
    reg_result = await db.execute(
        select(Registration).where(Registration.id == registration_id)
    )
    registration = reg_result.scalar_one_or_none()

    if not registration:
        raise HTTPException(status_code=404, detail="报名记录不存在")

    if not registration.api_key:
        return {
            "registration_id": registration_id,
            "logs": [],
            "status": "no_api_key",
            "message": "该选手未设置 API Key",
        }

    # 调用日志 API
    base_url = settings.QUOTA_BASE_URLS[0] if settings.QUOTA_BASE_URLS else "https://api.ikuncode.cc"
    url = f"{base_url.rstrip('/')}/api/log/token"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url,
                params={
                    "key": registration.api_key,
                    "p": 0,
                    "order": "desc",
                },
                headers={"Accept": "application/json"}
            )

            if resp.status_code != 200:
                return {
                    "registration_id": registration_id,
                    "logs": [],
                    "status": "error",
                    "message": f"日志查询失败: {resp.status_code}",
                }

            data = resp.json()
            if not data.get("success"):
                return {
                    "registration_id": registration_id,
                    "logs": [],
                    "status": "error",
                    "message": "日志查询失败",
                }

            logs = data.get("data", [])
            if not isinstance(logs, list):
                logs = []

            # API 返回的数据是按时间升序排列的（最早在前）
            # 我们需要取最后的 limit 条（最新的），然后反转顺序（最新在前）
            recent_logs = logs[-limit:] if len(logs) > limit else logs
            recent_logs = list(reversed(recent_logs))  # 反转，最新的在前面

            return {
                "registration_id": registration_id,
                "title": registration.title,
                "logs": recent_logs,
                "total": len(logs),
                "status": "ok",
            }

    except Exception as e:
        return {
            "registration_id": registration_id,
            "logs": [],
            "status": "error",
            "message": f"日志查询失败: {str(e)}",
        }


@router.get("/apikey-monitor/all-logs")
async def get_all_apikey_logs(
    limit: int = Query(200, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取所有参赛者的 API 调用日志汇总"""
    require_admin(current_user)

    import httpx
    from app.models.registration import Registration, RegistrationStatus
    from app.core.config import settings
    from sqlalchemy.orm import selectinload

    # 获取所有有 API Key 的报名
    reg_query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value,
            ]),
            Registration.api_key.isnot(None),
            Registration.api_key != "",
        )
    )
    reg_result = await db.execute(reg_query)
    registrations = reg_result.scalars().all()

    all_logs = []
    base_url = settings.QUOTA_BASE_URLS[0] if settings.QUOTA_BASE_URLS else "https://api.ikuncode.cc"
    url = f"{base_url.rstrip('/')}/api/log/token"

    async with httpx.AsyncClient(timeout=15.0) as client:
        for reg in registrations:
            if not reg.api_key:
                continue

            try:
                resp = await client.get(
                    url,
                    params={
                        "key": reg.api_key,
                        "p": 0,
                        "order": "desc",
                    },
                    headers={"Accept": "application/json"}
                )

                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("success"):
                        logs = data.get("data", [])
                        if isinstance(logs, list):
                            # API 返回的数据是按时间升序排列的（最早在前）
                            # 取最后 50 条（最新的）
                            recent_logs = logs[-50:] if len(logs) > 50 else logs
                            # 添加用户信息到每条日志
                            for log in recent_logs:
                                log["_registration_id"] = reg.id
                                log["_title"] = reg.title
                                log["_user"] = {
                                    "id": reg.user.id,
                                    "username": reg.user.username,
                                    "display_name": reg.user.display_name,
                                    "avatar_url": reg.user.avatar_url,
                                } if reg.user else None
                                all_logs.append(log)
            except Exception:
                continue

    # 按时间排序
    all_logs.sort(key=lambda x: x.get("created_at", 0), reverse=True)

    return {
        "logs": all_logs[:limit],
        "total": len(all_logs),
        "status": "ok",
    }


# ========== 系统日志 ==========

@router.get("/logs")
async def get_system_logs(
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1, description="页码，从1开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量，默认10"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取系统操作日志（带分页）"""
    require_admin(current_user)

    try:
        from app.models.system_log import SystemLog
        from sqlalchemy.orm import selectinload

        # 构建基础查询
        query = select(SystemLog).options(selectinload(SystemLog.user))

        if action:
            query = query.where(SystemLog.action == action)
        if user_id:
            query = query.where(SystemLog.user_id == user_id)
        if search:
            # 搜索支持：描述、IP、用户名
            query = query.join(User, SystemLog.user_id == User.id, isouter=True).where(
                (SystemLog.description.contains(search)) |
                (SystemLog.ip_address.contains(search)) |
                (User.username.contains(search)) |
                (User.display_name.contains(search))
            )

        # 总数统计
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0

        # 计算分页
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        # 校正页码（防止请求的页码超出范围）
        actual_page = min(page, total_pages) if total_pages > 0 else 1
        offset = (actual_page - 1) * page_size

        # 分页查询
        query = query.order_by(SystemLog.created_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(query)
        logs = result.scalars().all()

        return {
            "items": [
                {
                    "id": log.id,
                    "action": log.action,
                    "description": log.description,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                    "user": {
                        "id": log.user.id,
                        "username": log.user.username,
                        "display_name": log.user.display_name,
                        "avatar_url": log.user.avatar_url,
                    } if log.user else None,
                }
                for log in logs
            ],
            "total": total,
            "page": actual_page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": actual_page < total_pages,
            "has_prev": actual_page > 1 and total_pages > 0,
        }
    except Exception as e:
        import logging
        logging.warning(f"SystemLog query failed: {e}")
        return {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0,
            "has_next": False,
            "has_prev": False,
        }


# ========== 请求日志（全量 API 监控） ==========

@router.get("/request-logs")
async def get_request_logs(
    method: Optional[str] = None,
    path: Optional[str] = None,
    user_id: Optional[int] = None,
    status_code: Optional[int] = None,
    status_type: Optional[str] = None,  # success, client_error, server_error
    ip_address: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1, description="页码，从1开始"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量，默认10"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取 API 请求日志

    支持筛选:
    - method: HTTP 方法 (GET, POST, PUT, DELETE)
    - path: 请求路径 (支持模糊匹配)
    - user_id: 用户ID
    - status_code: 精确状态码
    - status_type: 状态类型 (success=2xx, client_error=4xx, server_error=5xx)
    - ip_address: IP 地址
    - search: 综合搜索 (路径、用户名、IP)
    """
    require_admin(current_user)

    try:
        from app.models.request_log import RequestLog

        query = select(RequestLog)

        # 筛选条件
        if method:
            query = query.where(RequestLog.method == method.upper())
        if path:
            query = query.where(RequestLog.path.contains(path))
        if user_id:
            query = query.where(RequestLog.user_id == user_id)
        if status_code:
            query = query.where(RequestLog.status_code == status_code)
        if status_type:
            if status_type == "success":
                query = query.where(RequestLog.status_code >= 200, RequestLog.status_code < 300)
            elif status_type == "client_error":
                query = query.where(RequestLog.status_code >= 400, RequestLog.status_code < 500)
            elif status_type == "server_error":
                query = query.where(RequestLog.status_code >= 500)
        if ip_address:
            query = query.where(RequestLog.ip_address == ip_address)
        if search:
            query = query.where(
                (RequestLog.path.contains(search)) |
                (RequestLog.username.contains(search)) |
                (RequestLog.ip_address.contains(search))
            )

        # 总数统计
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0

        # 计算分页
        offset = (page - 1) * page_size
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        # 分页查询
        query = query.order_by(RequestLog.created_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(query)
        logs = result.scalars().all()

        return {
            "items": [
                {
                    "id": log.id,
                    "method": log.method,
                    "path": log.path,
                    "query_params": log.query_params,
                    "user_id": log.user_id,
                    "username": log.username,
                    "ip_address": log.ip_address,
                    "user_agent": log.user_agent,
                    "status_code": log.status_code,
                    "response_time_ms": log.response_time_ms,
                    "error_message": log.error_message,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                }
                for log in logs
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }
    except Exception as e:
        import logging
        logging.warning(f"RequestLog query failed: {e}")
        return {
            "items": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0,
            "has_next": False,
            "has_prev": False,
        }


@router.get("/request-logs/stats")
async def get_request_logs_stats(
    hours: int = Query(24, le=168),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取请求日志统计

    返回:
    - 请求总数
    - 成功/失败分布
    - 按路径分组的统计
    - 按用户分组的统计
    - 平均响应时间
    """
    require_admin(current_user)

    try:
        from app.models.request_log import RequestLog
        from datetime import timedelta

        since = datetime.now() - timedelta(hours=hours)

        # 总请求数
        total_requests = await db.scalar(
            select(func.count(RequestLog.id))
            .where(RequestLog.created_at >= since)
        )

        # 状态码分布
        status_result = await db.execute(
            select(
                func.floor(RequestLog.status_code / 100).label("status_group"),
                func.count(RequestLog.id)
            )
            .where(RequestLog.created_at >= since)
            .group_by("status_group")
        )
        status_distribution = {
            f"{int(row[0])}xx": row[1]
            for row in status_result.fetchall()
        }

        # 热门路径 TOP 10
        path_result = await db.execute(
            select(
                RequestLog.path,
                func.count(RequestLog.id).label("count"),
                func.avg(RequestLog.response_time_ms).label("avg_time")
            )
            .where(RequestLog.created_at >= since)
            .group_by(RequestLog.path)
            .order_by(func.count(RequestLog.id).desc())
            .limit(10)
        )
        top_paths = [
            {"path": row[0], "count": row[1], "avg_time_ms": round(row[2] or 0, 2)}
            for row in path_result.fetchall()
        ]

        # 活跃用户 TOP 10
        user_result = await db.execute(
            select(
                RequestLog.user_id,
                RequestLog.username,
                func.count(RequestLog.id).label("count")
            )
            .where(RequestLog.created_at >= since, RequestLog.user_id.isnot(None))
            .group_by(RequestLog.user_id, RequestLog.username)
            .order_by(func.count(RequestLog.id).desc())
            .limit(10)
        )
        top_users = [
            {"user_id": row[0], "username": row[1], "count": row[2]}
            for row in user_result.fetchall()
        ]

        # 平均响应时间
        avg_response_time = await db.scalar(
            select(func.avg(RequestLog.response_time_ms))
            .where(RequestLog.created_at >= since)
        )

        # 错误率
        error_count = await db.scalar(
            select(func.count(RequestLog.id))
            .where(RequestLog.created_at >= since, RequestLog.status_code >= 400)
        )
        error_rate = (error_count / total_requests * 100) if total_requests else 0

        # 慢请求 (>1000ms)
        slow_requests = await db.scalar(
            select(func.count(RequestLog.id))
            .where(RequestLog.created_at >= since, RequestLog.response_time_ms > 1000)
        )

        # 按小时分布
        hourly_result = await db.execute(
            select(
                func.date_format(RequestLog.created_at, "%Y-%m-%d %H:00:00").label("hour"),
                func.count(RequestLog.id)
            )
            .where(RequestLog.created_at >= since)
            .group_by("hour")
            .order_by("hour")
        )
        hourly_distribution = [
            {"hour": row[0], "count": row[1]}
            for row in hourly_result.fetchall()
        ]

        return {
            "period_hours": hours,
            "total_requests": total_requests or 0,
            "status_distribution": status_distribution,
            "error_rate": round(error_rate, 2),
            "avg_response_time_ms": round(avg_response_time or 0, 2),
            "slow_requests": slow_requests or 0,
            "top_paths": top_paths,
            "top_users": top_users,
            "hourly_distribution": hourly_distribution,
        }
    except Exception as e:
        import logging
        logging.warning(f"RequestLog stats failed: {e}")
        return {
            "period_hours": hours,
            "total_requests": 0,
            "status_distribution": {},
            "error_rate": 0,
            "avg_response_time_ms": 0,
            "slow_requests": 0,
            "top_paths": [],
            "top_users": [],
            "hourly_distribution": [],
        }


# ========== 活动统计 ==========

@router.get("/activity/stats")
async def get_activity_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取活动中心统计数据"""
    require_admin(current_user)
    today = datetime.now().date()

    # 累计发放积分
    total_points_issued = await db.scalar(
        select(func.coalesce(func.sum(UserPoints.total_earned), 0))
    ) or 0

    # 累计消耗积分
    total_points_spent = await db.scalar(
        select(func.coalesce(func.sum(UserPoints.total_spent), 0))
    ) or 0

    # 今日发放积分
    points_issued_today = await db.scalar(
        select(func.coalesce(func.sum(PointsLedger.amount), 0))
        .where(PointsLedger.amount > 0)
        .where(func.date(PointsLedger.created_at) == today)
    ) or 0

    # 今日消耗积分
    points_spent_today = await db.scalar(
        select(func.coalesce(func.sum(func.abs(PointsLedger.amount)), 0))
        .where(PointsLedger.amount < 0)
        .where(func.date(PointsLedger.created_at) == today)
    ) or 0

    # 签到次数
    total_signins = await db.scalar(
        select(func.count(DailySignin.id))
    ) or 0

    # 抽奖次数
    total_lottery_draws = await db.scalar(
        select(func.count(LotteryDraw.id))
    ) or 0

    # 刮刮乐次数
    total_scratch_cards = 0
    try:
        total_scratch_cards = await db.scalar(
            select(func.count(ScratchCard.id))
        ) or 0
    except Exception:
        pass

    # 扭蛋机次数 (暂无独立模型，跟踪抽奖记录中的扭蛋类型)
    total_gacha_draws = 0

    # 兑换次数
    total_exchanges = 0
    try:
        total_exchanges = await db.scalar(
            select(func.count(ExchangeRecord.id))
        ) or 0
    except Exception:
        pass

    # 今日活跃用户
    active_users_today = await db.scalar(
        select(func.count(func.distinct(DailySignin.user_id)))
        .where(DailySignin.signin_date == today)
    ) or 0

    return {
        "total_points_issued": int(total_points_issued),
        "total_points_spent": int(total_points_spent),
        "points_issued_today": int(points_issued_today),
        "points_spent_today": int(points_spent_today),
        "total_signins": total_signins,
        "total_lottery_draws": total_lottery_draws,
        "total_scratch_cards": total_scratch_cards,
        "total_gacha_draws": total_gacha_draws,
        "total_slot_plays": 0,  # 老虎机是纯前端，无后端记录
        "total_exchanges": total_exchanges,
        "active_users_today": active_users_today,
    }


@router.get("/activity/stats/daily")
async def get_daily_activity_stats(
    date: Optional[str] = Query(None, description="日期，格式：YYYY-MM-DD，不传则返回今天"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取指定日期的活动统计数据"""
    require_admin(current_user)

    from datetime import date as date_type

    # 解析日期
    if date:
        try:
            query_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="日期格式错误，应为 YYYY-MM-DD")
    else:
        query_date = datetime.now().date()

    # 当日发放积分
    points_issued = await db.scalar(
        select(func.coalesce(func.sum(PointsLedger.amount), 0))
        .where(PointsLedger.amount > 0)
        .where(func.date(PointsLedger.created_at) == query_date)
    ) or 0

    # 当日消耗积分
    points_spent = await db.scalar(
        select(func.coalesce(func.sum(func.abs(PointsLedger.amount)), 0))
        .where(PointsLedger.amount < 0)
        .where(func.date(PointsLedger.created_at) == query_date)
    ) or 0

    # 当日签到人数
    signins = await db.scalar(
        select(func.count(DailySignin.id))
        .where(DailySignin.signin_date == query_date)
    ) or 0

    # 当日抽奖次数
    lottery_draws = await db.scalar(
        select(func.count(LotteryDraw.id))
        .where(func.date(LotteryDraw.created_at) == query_date)
    ) or 0

    # 当日刮刮乐次数
    scratch_cards = 0
    try:
        scratch_cards = await db.scalar(
            select(func.count(ScratchCard.id))
            .where(func.date(ScratchCard.created_at) == query_date)
        ) or 0
    except Exception:
        pass

    # 当日兑换次数
    exchanges = 0
    try:
        exchanges = await db.scalar(
            select(func.count(ExchangeRecord.id))
            .where(func.date(ExchangeRecord.created_at) == query_date)
        ) or 0
    except Exception:
        pass

    # 当日活跃用户（通过签到判断）
    active_users = await db.scalar(
        select(func.count(func.distinct(DailySignin.user_id)))
        .where(DailySignin.signin_date == query_date)
    ) or 0

    return {
        "date": query_date.isoformat(),
        "points_issued": int(points_issued),
        "points_spent": int(points_spent),
        "signins": signins,
        "lottery_draws": lottery_draws,
        "scratch_cards": scratch_cards,
        "gacha_draws": 0,
        "slot_plays": 0,
        "exchanges": exchanges,
        "active_users": active_users,
    }


@router.get("/activity/stats/range")
async def get_range_activity_stats(
    start_date: str = Query(..., description="开始日期，格式：YYYY-MM-DD"),
    end_date: str = Query(..., description="结束日期，格式：YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取日期范围内每天的活动统计数据"""
    require_admin(current_user)

    from datetime import timedelta

    # 解析日期
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="日期格式错误，应为 YYYY-MM-DD")

    if start > end:
        raise HTTPException(status_code=400, detail="开始日期不能大于结束日期")

    if (end - start).days > 90:
        raise HTTPException(status_code=400, detail="查询范围不能超过90天")

    # 获取每日数据
    daily_stats = []
    current = start
    while current <= end:
        # 当日发放积分
        points_issued = await db.scalar(
            select(func.coalesce(func.sum(PointsLedger.amount), 0))
            .where(PointsLedger.amount > 0)
            .where(func.date(PointsLedger.created_at) == current)
        ) or 0

        # 当日消耗积分
        points_spent = await db.scalar(
            select(func.coalesce(func.sum(func.abs(PointsLedger.amount)), 0))
            .where(PointsLedger.amount < 0)
            .where(func.date(PointsLedger.created_at) == current)
        ) or 0

        # 当日签到人数
        signins = await db.scalar(
            select(func.count(DailySignin.id))
            .where(DailySignin.signin_date == current)
        ) or 0

        # 当日抽奖次数
        lottery_draws = await db.scalar(
            select(func.count(LotteryDraw.id))
            .where(func.date(LotteryDraw.created_at) == current)
        ) or 0

        # 当日刮刮乐次数
        scratch_cards = 0
        try:
            scratch_cards = await db.scalar(
                select(func.count(ScratchCard.id))
                .where(func.date(ScratchCard.created_at) == current)
            ) or 0
        except Exception:
            pass

        # 当日兑换次数
        exchanges = 0
        try:
            exchanges = await db.scalar(
                select(func.count(ExchangeRecord.id))
                .where(func.date(ExchangeRecord.created_at) == current)
            ) or 0
        except Exception:
            pass

        # 当日活跃用户
        active_users = await db.scalar(
            select(func.count(func.distinct(DailySignin.user_id)))
            .where(DailySignin.signin_date == current)
        ) or 0

        daily_stats.append({
            "date": current.isoformat(),
            "points_issued": int(points_issued),
            "points_spent": int(points_spent),
            "signins": signins,
            "lottery_draws": lottery_draws,
            "scratch_cards": scratch_cards,
            "gacha_draws": 0,
            "slot_plays": 0,
            "exchanges": exchanges,
            "active_users": active_users,
        })

        current += timedelta(days=1)

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "days": daily_stats
    }


# ========== 兑换商品管理 ==========

class ExchangeItemUpdateRequest(BaseModel):
    price: Optional[int] = None
    stock: Optional[int] = None
    daily_limit: Optional[int] = None
    total_limit: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/exchange/items")
async def get_exchange_items_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取所有兑换商品（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).order_by(ExchangeItem.sort_order, ExchangeItem.id)
    )
    items = result.scalars().all()

    return {
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "item_type": item.item_type.value if hasattr(item.item_type, 'value') else item.item_type,
                "price": item.cost_points,  # 前端使用 price，后端字段是 cost_points
                "stock": item.stock,
                "daily_limit": item.daily_limit,
                "total_limit": item.total_limit,
                "is_active": item.is_active,
                "is_hot": item.is_hot if hasattr(item, 'is_hot') else False,
                "sort_order": item.sort_order,
                "exchange_count": 0,  # 暂无此字段，返回0
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ]
    }


@router.put("/exchange/items/{item_id}")
async def update_exchange_item(
    item_id: int,
    request: ExchangeItemUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新兑换商品"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).where(ExchangeItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    if request.price is not None:
        item.cost_points = request.price
    if request.stock is not None:
        item.stock = request.stock
    if request.daily_limit is not None:
        item.daily_limit = request.daily_limit
    if request.total_limit is not None:
        item.total_limit = request.total_limit
    if request.is_active is not None:
        item.is_active = request.is_active

    await db.commit()
    return {"success": True, "message": "更新成功"}


class ExchangeItemCreateRequest(BaseModel):
    """创建兑换商品"""
    name: str
    description: Optional[str] = None
    item_type: str  # LOTTERY_TICKET, SCRATCH_TICKET, GACHA_TICKET, API_KEY, ITEM
    item_value: Optional[str] = None
    cost_points: int
    stock: Optional[int] = None
    daily_limit: Optional[int] = None
    total_limit: Optional[int] = None
    icon: Optional[str] = None
    is_hot: bool = False
    is_active: bool = True
    sort_order: int = 0


@router.post("/exchange/items")
async def create_exchange_item_admin(
    request: ExchangeItemCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建兑换商品（管理员）"""
    require_admin(current_user)

    from app.models.points import ExchangeItemType

    try:
        item_type = ExchangeItemType(request.item_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的商品类型: {request.item_type}")

    item = ExchangeItem(
        name=request.name,
        description=request.description,
        item_type=item_type,
        item_value=request.item_value,
        cost_points=request.cost_points,
        stock=request.stock,
        daily_limit=request.daily_limit,
        total_limit=request.total_limit,
        icon=request.icon,
        is_hot=request.is_hot,
        is_active=request.is_active,
        sort_order=request.sort_order
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return {"success": True, "id": item.id, "message": "商品创建成功"}


@router.delete("/exchange/items/{item_id}")
async def delete_exchange_item_admin(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除兑换商品（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).where(ExchangeItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    await db.delete(item)
    await db.commit()
    return {"success": True, "message": "商品删除成功"}


@router.post("/exchange/items/{item_id}/add-stock")
async def add_item_stock_admin(
    item_id: int,
    quantity: int = Query(..., ge=1, description="添加的库存数量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """补充商品库存（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).where(ExchangeItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    if item.stock is None:
        return {"success": True, "message": "该商品为无限库存", "stock": None}

    item.stock += quantity
    await db.commit()

    return {"success": True, "message": f"已补充{quantity}个库存", "stock": item.stock}


@router.post("/exchange/items/{item_id}/toggle")
async def toggle_item_status_admin(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """切换商品上架/下架状态（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).where(ExchangeItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    item.is_active = not item.is_active
    await db.commit()

    status = "上架" if item.is_active else "下架"
    return {"success": True, "message": f"商品已{status}", "is_active": item.is_active}
