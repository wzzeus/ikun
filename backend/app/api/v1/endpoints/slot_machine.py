"""
老虎机 API 端点
- 用户端：获取配置、执行抽奖
- 管理端：配置管理、符号管理、规则管理、统计数据
"""
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user, get_current_user_optional
from app.models.user import User
from app.models.slot_machine import SlotMachineRule, SlotMachineConfig, SlotRuleType
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
    slot_tickets: int = 0  # 老虎机券数量


class MatchedRuleInfo(BaseModel):
    """匹配的规则信息"""
    rule_key: str
    rule_name: str
    rule_type: str
    multiplier: float
    matched_symbol: Optional[str] = None


class SlotSpinRequest(BaseModel):
    """抽奖请求"""
    use_ticket: bool = False  # 是否使用老虎机券


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
    win_name: Optional[str] = None
    matched_rules: List[MatchedRuleInfo] = []
    api_key_code: Optional[str] = None
    api_key_quota: Optional[float] = None
    api_key_message: Optional[str] = None
    used_ticket: bool = False  # 是否使用了券


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
    request: SlotSpinRequest = SlotSpinRequest(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    执行老虎机抽奖
    - 需要登录
    - 可选使用老虎机券（免费）
    - 返回结果由后端生成（按权重随机）
    """
    try:
        is_admin = current_user.role == "admin"
        result = await SlotMachineService.spin(
            db=db,
            user_id=current_user.id,
            is_admin=is_admin,
            use_ticket=request.use_ticket
        )
        return SlotSpinResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"老虎机抽取失败: {str(e)}")


# ==================== 管理员 API ====================

def require_admin(user: User):
    """检查管理员权限

    支持角色切换场景：如果用户的 original_role 是 admin，即使当前 role 不是 admin 也允许访问。
    """
    real_role = user.original_role or user.role
    if real_role != "admin":
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


# ==================== 规则管理 API ====================

class SlotRuleInfo(BaseModel):
    """规则信息"""
    id: int
    rule_key: str
    rule_name: str
    rule_type: str
    pattern: Optional[List[str]] = None
    multiplier: float
    fixed_points: Optional[int] = None
    probability: Optional[float] = None
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None
    priority: int
    is_enabled: bool
    description: Optional[str] = None


class SlotRuleCreate(BaseModel):
    """创建规则"""
    rule_key: str
    rule_name: str
    rule_type: str
    pattern: Optional[List[str]] = None
    multiplier: float = 1.0
    fixed_points: Optional[int] = None
    probability: Optional[float] = None
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None
    priority: int = 0
    is_enabled: bool = True
    description: Optional[str] = None


class SlotRuleUpdate(BaseModel):
    """更新规则"""
    rule_name: Optional[str] = None
    pattern: Optional[List[str]] = None
    multiplier: Optional[float] = None
    fixed_points: Optional[int] = None
    probability: Optional[float] = None
    min_amount: Optional[int] = None
    max_amount: Optional[int] = None
    priority: Optional[int] = None
    is_enabled: Optional[bool] = None
    description: Optional[str] = None


@router.get("/admin/rules")
async def get_slot_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取老虎机中奖规则列表"""
    require_admin(current_user)

    # 获取配置
    result = await db.execute(
        select(SlotMachineConfig).where(SlotMachineConfig.is_active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if not config:
        return {"rules": [], "config_id": None}

    # 获取规则
    result = await db.execute(
        select(SlotMachineRule)
        .where(SlotMachineRule.config_id == config.id)
        .order_by(SlotMachineRule.priority.desc())
    )
    rules = result.scalars().all()

    return {
        "config_id": config.id,
        "rules": [
            {
                "id": r.id,
                "rule_key": r.rule_key,
                "rule_name": r.rule_name,
                "rule_type": r.rule_type.value if hasattr(r.rule_type, 'value') else r.rule_type,
                "pattern": r.pattern,
                "multiplier": float(r.multiplier) if r.multiplier else 0,
                "fixed_points": r.fixed_points,
                "probability": float(r.probability) if r.probability else None,
                "min_amount": r.min_amount,
                "max_amount": r.max_amount,
                "priority": r.priority,
                "is_enabled": r.is_enabled,
                "description": r.description
            }
            for r in rules
        ]
    }


@router.post("/admin/rules")
async def create_slot_rule(
    data: SlotRuleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建老虎机中奖规则"""
    require_admin(current_user)

    # 获取配置
    result = await db.execute(
        select(SlotMachineConfig).where(SlotMachineConfig.is_active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="未找到老虎机配置")

    rule = SlotMachineRule(
        config_id=config.id,
        rule_key=data.rule_key,
        rule_name=data.rule_name,
        rule_type=SlotRuleType(data.rule_type),
        pattern=data.pattern,
        multiplier=Decimal(str(data.multiplier)),
        fixed_points=data.fixed_points,
        probability=Decimal(str(data.probability)) if data.probability else None,
        min_amount=data.min_amount,
        max_amount=data.max_amount,
        priority=data.priority,
        is_enabled=data.is_enabled,
        description=data.description
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    return {"success": True, "id": rule.id}


@router.put("/admin/rules/{rule_id}")
async def update_slot_rule(
    rule_id: int,
    data: SlotRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新老虎机中奖规则"""
    require_admin(current_user)

    result = await db.execute(select(SlotMachineRule).where(SlotMachineRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    update_data = data.dict(exclude_unset=True)
    if "multiplier" in update_data and update_data["multiplier"] is not None:
        update_data["multiplier"] = Decimal(str(update_data["multiplier"]))
    if "probability" in update_data and update_data["probability"] is not None:
        update_data["probability"] = Decimal(str(update_data["probability"]))

    for key, value in update_data.items():
        setattr(rule, key, value)

    await db.commit()
    return {"success": True}


@router.delete("/admin/rules/{rule_id}")
async def delete_slot_rule(
    rule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除老虎机中奖规则"""
    require_admin(current_user)

    result = await db.execute(select(SlotMachineRule).where(SlotMachineRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="规则不存在")

    await db.delete(rule)
    await db.commit()
    return {"success": True}


# ==================== 管理员测试 API ====================

class AdminTestDrawResponse(BaseModel):
    """管理员测试抽奖响应"""
    success: bool
    prize_name: str
    prize_type: str
    api_key_code: Optional[str] = None
    api_key_quota: Optional[float] = None
    message: str


@router.post("/admin/test-draw-apikey", response_model=AdminTestDrawResponse)
async def admin_test_draw_apikey(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    管理员测试：强制抽中 API Key 兑换码
    - 仅管理员可用
    - 不消耗积分
    - 直接分配一个可用的 API Key
    """
    require_admin(current_user)
    user_id = current_user.id

    try:
        from app.services.lottery_service import LotteryService
        api_key_info = await LotteryService._assign_api_key(db, user_id, "老虎机")

        if api_key_info:
            await db.commit()
            return AdminTestDrawResponse(
                success=True,
                prize_name="API Key 兑换码",
                prize_type="API_KEY",
                api_key_code=api_key_info["code"],
                api_key_quota=api_key_info["quota"],
                message="测试成功！已分配 API Key 兑换码"
            )
        else:
            return AdminTestDrawResponse(
                success=False,
                prize_name="API Key（已发完）",
                prize_type="EMPTY",
                message="API Key 库存不足，无法分配"
            )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"测试失败: {str(e)}")
