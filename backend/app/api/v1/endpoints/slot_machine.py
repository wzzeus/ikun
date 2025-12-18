"""
老虎机 API 端点
- 用户端：获取配置、执行抽奖
- 管理端：配置管理、符号管理、统计数据
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user, get_current_user_optional
from app.models.user import User
from app.services.slot_machine_service import SlotMachineService


router = APIRouter()


# ==================== Schemas ====================

class SlotSymbolInfo(BaseModel):
    """符号信息"""
    symbol_key: str
    emoji: str
    name: str
    multiplier: int
    weight: int
    sort_order: int = 0
    is_enabled: bool = True
    is_jackpot: bool = False


class SlotConfigInfo(BaseModel):
    """配置信息"""
    id: int
    name: str
    is_active: bool
    cost_points: int
    reels: int
    two_kind_multiplier: float
    jackpot_symbol_key: str
    daily_limit: Optional[int] = None


class SlotConfigResponse(BaseModel):
    """用户端配置响应"""
    active: bool
    config: Optional[SlotConfigInfo] = None
    symbols: List[SlotSymbolInfo] = []
    today_count: int = 0
    remaining_today: Optional[int] = None
    balance: int = 0
    can_play: bool = False


class SlotSpinResponse(BaseModel):
    """抽奖结果响应"""
    success: bool = True
    cost_points: int
    reels: List[str]
    win_type: str
    multiplier: float
    payout_points: int
    balance: int
    is_jackpot: bool
    api_key_code: Optional[str] = None
    api_key_quota: Optional[float] = None


class SlotConfigUpdateRequest(BaseModel):
    """配置更新请求"""
    name: Optional[str] = None
    is_active: Optional[bool] = None
    cost_points: Optional[int] = Field(None, ge=1)
    reels: Optional[int] = Field(None, ge=3, le=5)
    two_kind_multiplier: Optional[float] = Field(None, ge=1.0)
    jackpot_symbol_key: Optional[str] = None


class SlotSymbolUpdateItem(BaseModel):
    """符号更新项"""
    symbol_key: str
    emoji: str
    name: str
    multiplier: int = Field(ge=0)
    weight: int = Field(ge=0)
    sort_order: int = 0
    is_enabled: bool = True
    is_jackpot: bool = False


class SlotSymbolsReplaceRequest(BaseModel):
    """符号批量替换请求"""
    symbols: List[SlotSymbolUpdateItem]


# ==================== 用户端 API ====================

@router.get("/config", response_model=SlotConfigResponse)
async def get_slot_config(
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """获取老虎机配置（支持可选登录，登录后返回今日次数等）"""
    user_id = current_user.id if current_user else None
    data = await SlotMachineService.get_public_config(db, user_id)
    return SlotConfigResponse(**data)


@router.post("/spin", response_model=SlotSpinResponse)
async def spin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    执行老虎机抽奖
    - 需要登录
    - 自动扣除积分
    - 返回结果由后端生成（按权重随机）
    """
    try:
        result = await SlotMachineService.spin(db=db, user_id=current_user.id)
        return SlotSpinResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"老虎机抽取失败: {str(e)}")


# ==================== 管理员 API ====================

def require_admin(user: User):
    """检查管理员权限"""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="仅管理员可访问")


@router.get("/admin/config")
async def get_admin_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取管理员配置视图
    - 包含所有符号（包括禁用的）
    - 包含统计指标（总权重、理论返奖率等）
    """
    require_admin(current_user)
    try:
        data = await SlotMachineService.get_admin_config(db)
        return data
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/admin/config")
async def update_config(
    body: SlotConfigUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新老虎机基础配置"""
    require_admin(current_user)
    try:
        updates = body.model_dump(exclude_none=True)
        await SlotMachineService.update_config(db, updates)
        return {"success": True, "message": "配置更新成功"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/symbols")
async def replace_symbols(
    body: SlotSymbolsReplaceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    批量替换符号配置
    - 会删除现有符号，插入新符号
    - 用于管理员调整胜率
    """
    require_admin(current_user)
    try:
        symbols_data = [s.model_dump() for s in body.symbols]
        await SlotMachineService.replace_symbols(db, symbols_data)
        return {"success": True, "message": "符号配置更新成功"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/stats")
async def get_draw_stats(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    获取抽奖统计
    - 实际返奖率
    - 中奖率
    - 大奖次数
    """
    require_admin(current_user)
    stats = await SlotMachineService.get_draw_stats(db, days=days)
    return stats
