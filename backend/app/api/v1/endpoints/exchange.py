"""
积分兑换商城 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User
from app.services.exchange_service import ExchangeService

router = APIRouter()


# ========== Schema ==========

class ExchangeItemInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_type: str
    cost_points: int
    stock: Optional[int] = None
    daily_limit: Optional[int] = None
    total_limit: Optional[int] = None
    icon: Optional[str] = None
    is_hot: bool = False
    has_stock: bool = True


class UserExchangeInfo(BaseModel):
    balance: int
    lottery_tickets: int = 0
    scratch_tickets: int = 0
    gacha_tickets: int = 0


class ExchangeRequest(BaseModel):
    item_id: int
    quantity: int = 1


class ExchangeResponse(BaseModel):
    success: bool
    item_name: str
    quantity: int
    cost_points: int
    reward_value: Optional[str] = None
    message: Optional[str] = None
    balance: int


class ExchangeHistoryItem(BaseModel):
    id: int
    item_name: str
    item_type: str
    cost_points: int
    quantity: int
    reward_value: Optional[str] = None
    created_at: str


# ========== 接口 ==========

@router.get("/items", response_model=List[ExchangeItemInfo])
async def get_exchange_items(
    db: AsyncSession = Depends(get_db)
):
    """获取兑换商品列表"""
    items = await ExchangeService.get_exchange_items(db)
    return [ExchangeItemInfo(**item) for item in items]


@router.get("/info", response_model=UserExchangeInfo)
async def get_user_exchange_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户兑换信息（余额、券数量）"""
    info = await ExchangeService.get_user_exchange_info(db, current_user.id)
    return UserExchangeInfo(**info)


@router.post("/redeem", response_model=ExchangeResponse)
async def exchange_item(
    request: ExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """兑换商品"""
    try:
        result = await ExchangeService.exchange(
            db, current_user.id, request.item_id, request.quantity
        )
        return ExchangeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history", response_model=List[ExchangeHistoryItem])
async def get_exchange_history(
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取兑换历史"""
    history = await ExchangeService.get_exchange_history(
        db, current_user.id, limit, offset
    )
    return [ExchangeHistoryItem(**h) for h in history]


@router.get("/tickets")
async def get_user_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的券数量"""
    tickets = await ExchangeService.get_user_tickets(db, current_user.id)
    return {
        "lottery_tickets": tickets.get("LOTTERY_TICKET", 0),
        "scratch_tickets": tickets.get("SCRATCH_TICKET", 0),
        "gacha_tickets": tickets.get("GACHA_TICKET", 0),
    }


# ========== 管理员接口 ==========

from sqlalchemy import select, update
from app.models.points import ExchangeItem, ExchangeItemType


def require_admin(user: User):
    """检查管理员权限"""
    real_role = user.original_role or user.role
    if real_role != "admin":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="需要管理员权限")


class ExchangeItemCreate(BaseModel):
    """创建商品"""
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


class ExchangeItemUpdate(BaseModel):
    """更新商品"""
    name: Optional[str] = None
    description: Optional[str] = None
    item_value: Optional[str] = None
    cost_points: Optional[int] = None
    stock: Optional[int] = None
    daily_limit: Optional[int] = None
    total_limit: Optional[int] = None
    icon: Optional[str] = None
    is_hot: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class ExchangeItemAdminInfo(BaseModel):
    """管理员商品信息"""
    id: int
    name: str
    description: Optional[str] = None
    item_type: str
    item_value: Optional[str] = None
    cost_points: int
    stock: Optional[int] = None
    daily_limit: Optional[int] = None
    total_limit: Optional[int] = None
    icon: Optional[str] = None
    is_hot: bool = False
    is_active: bool = True
    sort_order: int = 0


@router.get("/admin/items", response_model=List[ExchangeItemAdminInfo])
async def get_exchange_items_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取所有商品（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).order_by(ExchangeItem.sort_order, ExchangeItem.id)
    )
    items = result.scalars().all()

    return [
        ExchangeItemAdminInfo(
            id=item.id,
            name=item.name,
            description=item.description,
            item_type=item.item_type.value,
            item_value=item.item_value,
            cost_points=item.cost_points,
            stock=item.stock,
            daily_limit=item.daily_limit,
            total_limit=item.total_limit,
            icon=item.icon,
            is_hot=item.is_hot,
            is_active=item.is_active,
            sort_order=item.sort_order
        )
        for item in items
    ]


@router.post("/admin/items")
async def create_exchange_item(
    data: ExchangeItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建商品（管理员）"""
    require_admin(current_user)

    try:
        item_type = ExchangeItemType(data.item_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的商品类型: {data.item_type}")

    item = ExchangeItem(
        name=data.name,
        description=data.description,
        item_type=item_type,
        item_value=data.item_value,
        cost_points=data.cost_points,
        stock=data.stock,
        daily_limit=data.daily_limit,
        total_limit=data.total_limit,
        icon=data.icon,
        is_hot=data.is_hot,
        is_active=data.is_active,
        sort_order=data.sort_order
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return {"success": True, "id": item.id, "message": "商品创建成功"}


@router.put("/admin/items/{item_id}")
async def update_exchange_item(
    item_id: int,
    data: ExchangeItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """更新商品（管理员）"""
    require_admin(current_user)

    result = await db.execute(
        select(ExchangeItem).where(ExchangeItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="商品不存在")

    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    await db.commit()
    return {"success": True, "message": "商品更新成功"}


@router.delete("/admin/items/{item_id}")
async def delete_exchange_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """删除商品（管理员）"""
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


@router.post("/admin/items/{item_id}/add-stock")
async def add_item_stock(
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
        # 无限库存商品不需要补货
        return {"success": True, "message": "该商品为无限库存", "stock": None}

    item.stock += quantity
    await db.commit()

    return {"success": True, "message": f"已补充{quantity}个库存", "stock": item.stock}


@router.post("/admin/items/{item_id}/toggle")
async def toggle_item_status(
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
