"""
竞猜系统 API
"""
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.rate_limit import limiter, RateLimits

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.points import MarketStatus
from app.services.prediction_service import PredictionService

router = APIRouter()


# ========== Schema ==========

class OptionCreate(BaseModel):
    label: str
    description: Optional[str] = None
    ref_type: Optional[str] = None
    ref_id: Optional[int] = None


class MarketCreate(BaseModel):
    title: str
    description: Optional[str] = None
    options: List[OptionCreate]
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    fee_rate: float = 0.05
    min_bet: int = 10
    max_bet: Optional[int] = None


class PlaceBetRequest(BaseModel):
    option_id: int
    stake_points: int
    request_id: Optional[str] = None


class SettleMarketRequest(BaseModel):
    winner_option_ids: List[int]


class OptionResponse(BaseModel):
    id: int
    label: str
    description: Optional[str] = None
    total_stake: int
    odds: Optional[float] = None
    is_winner: Optional[bool] = None
    percentage: Optional[float] = None


class MarketResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    opens_at: Optional[str] = None
    closes_at: Optional[str] = None
    settled_at: Optional[str] = None
    fee_rate: float
    min_bet: int
    max_bet: Optional[int] = None
    total_pool: int
    options: List[OptionResponse]
    created_at: str


class BetResponse(BaseModel):
    id: int
    market_id: int
    option_id: int
    stake_points: int
    status: str
    payout_points: Optional[int] = None
    created_at: str


class BetHistoryItem(BaseModel):
    id: int
    market_id: int
    market_title: str
    market_status: str
    option_id: int
    option_label: str
    option_is_winner: Optional[bool] = None
    stake_points: int
    payout_points: Optional[int] = None
    status: str
    created_at: str


class MarketStatsResponse(BaseModel):
    market_id: int
    title: str
    status: str
    total_pool: int
    participant_count: int
    bet_count: int
    fee_rate: float
    options: List[OptionResponse]


# ========== 用户接口 ==========

@router.get("/markets", response_model=List[MarketResponse])
async def get_markets(
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db)
):
    """获取竞猜市场列表"""
    market_status = MarketStatus(status) if status else None
    markets = await PredictionService.get_markets(db, market_status, limit, offset)
    return [
        MarketResponse(
            id=m.id,
            title=m.title,
            description=m.description,
            status=m.status.value,
            opens_at=m.opens_at.isoformat() if m.opens_at else None,
            closes_at=m.closes_at.isoformat() if m.closes_at else None,
            settled_at=m.settled_at.isoformat() if m.settled_at else None,
            fee_rate=float(m.fee_rate),
            min_bet=m.min_bet,
            max_bet=m.max_bet,
            total_pool=m.total_pool,
            options=[
                OptionResponse(
                    id=opt.id,
                    label=opt.label,
                    description=opt.description,
                    total_stake=opt.total_stake,
                    odds=float(opt.odds) if opt.odds else None,
                    is_winner=opt.is_winner
                )
                for opt in m.options
            ],
            created_at=m.created_at.isoformat()
        )
        for m in markets
    ]


@router.get("/markets/open", response_model=List[MarketResponse])
async def get_open_markets(
    db: AsyncSession = Depends(get_db)
):
    """获取当前开放的竞猜市场"""
    markets = await PredictionService.get_open_markets(db)
    return [
        MarketResponse(
            id=m.id,
            title=m.title,
            description=m.description,
            status=m.status.value,
            opens_at=m.opens_at.isoformat() if m.opens_at else None,
            closes_at=m.closes_at.isoformat() if m.closes_at else None,
            settled_at=m.settled_at.isoformat() if m.settled_at else None,
            fee_rate=float(m.fee_rate),
            min_bet=m.min_bet,
            max_bet=m.max_bet,
            total_pool=m.total_pool,
            options=[
                OptionResponse(
                    id=opt.id,
                    label=opt.label,
                    description=opt.description,
                    total_stake=opt.total_stake,
                    odds=float(opt.odds) if opt.odds else None,
                    is_winner=opt.is_winner
                )
                for opt in m.options
            ],
            created_at=m.created_at.isoformat()
        )
        for m in markets
    ]


@router.get("/markets/{market_id}", response_model=MarketResponse)
async def get_market(
    market_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取单个竞猜市场详情"""
    market = await PredictionService.get_market(db, market_id)
    if not market:
        raise HTTPException(status_code=404, detail="竞猜不存在")

    return MarketResponse(
        id=market.id,
        title=market.title,
        description=market.description,
        status=market.status.value,
        opens_at=market.opens_at.isoformat() if market.opens_at else None,
        closes_at=market.closes_at.isoformat() if market.closes_at else None,
        settled_at=market.settled_at.isoformat() if market.settled_at else None,
        fee_rate=float(market.fee_rate),
        min_bet=market.min_bet,
        max_bet=market.max_bet,
        total_pool=market.total_pool,
        options=[
            OptionResponse(
                id=opt.id,
                label=opt.label,
                description=opt.description,
                total_stake=opt.total_stake,
                odds=float(opt.odds) if opt.odds else None,
                is_winner=opt.is_winner
            )
            for opt in market.options
        ],
        created_at=market.created_at.isoformat()
    )


@router.get("/markets/{market_id}/stats", response_model=MarketStatsResponse)
async def get_market_stats(
    market_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取竞猜市场统计"""
    stats = await PredictionService.get_market_stats(db, market_id)
    if not stats:
        raise HTTPException(status_code=404, detail="竞猜不存在")

    return MarketStatsResponse(**stats)


@router.post("/markets/{market_id}/bet", response_model=BetResponse)
@limiter.limit(RateLimits.BET)
async def place_bet(
    request: Request,
    market_id: int,
    body: PlaceBetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """下注"""
    try:
        bet = await PredictionService.place_bet(
            db=db,
            user_id=current_user.id,
            market_id=market_id,
            option_id=body.option_id,
            stake_points=body.stake_points,
            request_id=body.request_id
        )
        return BetResponse(
            id=bet.id,
            market_id=bet.market_id,
            option_id=bet.option_id,
            stake_points=bet.stake_points,
            status=bet.status.value,
            payout_points=bet.payout_points,
            created_at=bet.created_at.isoformat()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/bets", response_model=List[BetHistoryItem])
@limiter.limit(RateLimits.READ)
async def get_my_bets(
    request: Request,
    market_id: Optional[int] = None,
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取我的下注记录"""
    bets = await PredictionService.get_user_bets(
        db, current_user.id, market_id, limit, offset
    )
    return [BetHistoryItem(**b) for b in bets]


# ========== 管理员接口 ==========

@router.post("/admin/markets", response_model=MarketResponse)
async def create_market(
    request: MarketCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """创建竞猜市场（管理员）"""
    real_role = current_user.original_role or current_user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    market = await PredictionService.create_market(
        db=db,
        title=request.title,
        description=request.description,
        options=[opt.model_dump() for opt in request.options],
        opens_at=request.opens_at,
        closes_at=request.closes_at,
        fee_rate=Decimal(str(request.fee_rate)),
        min_bet=request.min_bet,
        max_bet=request.max_bet,
        created_by=current_user.id
    )

    return MarketResponse(
        id=market.id,
        title=market.title,
        description=market.description,
        status=market.status.value,
        opens_at=market.opens_at.isoformat() if market.opens_at else None,
        closes_at=market.closes_at.isoformat() if market.closes_at else None,
        settled_at=market.settled_at.isoformat() if market.settled_at else None,
        fee_rate=float(market.fee_rate),
        min_bet=market.min_bet,
        max_bet=market.max_bet,
        total_pool=market.total_pool,
        options=[
            OptionResponse(
                id=opt.id,
                label=opt.label,
                description=opt.description,
                total_stake=opt.total_stake,
                odds=float(opt.odds) if opt.odds else None,
                is_winner=opt.is_winner
            )
            for opt in market.options
        ],
        created_at=market.created_at.isoformat()
    )


@router.post("/admin/markets/{market_id}/open")
async def open_market(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """开启竞猜（管理员）"""
    real_role = current_user.original_role or current_user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    try:
        market = await PredictionService.open_market(db, market_id)
        return {"success": True, "status": market.status.value}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/markets/{market_id}/close")
async def close_market(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """关闭竞猜（管理员）"""
    real_role = current_user.original_role or current_user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    try:
        market = await PredictionService.close_market(db, market_id)
        return {"success": True, "status": market.status.value}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/markets/{market_id}/settle")
async def settle_market(
    market_id: int,
    request: SettleMarketRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """结算竞猜（管理员）"""
    real_role = current_user.original_role or current_user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    try:
        stats = await PredictionService.settle_market(db, market_id, request.winner_option_ids)
        return {"success": True, **stats}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/markets/{market_id}/cancel")
async def cancel_market(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """取消竞猜（管理员）"""
    real_role = current_user.original_role or current_user.role
    if real_role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    try:
        stats = await PredictionService.cancel_market(db, market_id)
        return {"success": True, **stats}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
