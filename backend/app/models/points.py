"""
积分系统、签到、抽奖、竞猜相关数据模型
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date, DateTime,
    ForeignKey, Enum, DECIMAL, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class PointsReason(str, enum.Enum):
    """积分变动原因"""
    REGISTER_BONUS = "REGISTER_BONUS"  # 新用户注册奖励
    SIGNIN_DAILY = "SIGNIN_DAILY"
    SIGNIN_STREAK_BONUS = "SIGNIN_STREAK_BONUS"
    CHEER_GIVE = "CHEER_GIVE"
    CHEER_RECEIVE = "CHEER_RECEIVE"
    LOTTERY_SPEND = "LOTTERY_SPEND"
    LOTTERY_WIN = "LOTTERY_WIN"
    BET_STAKE = "BET_STAKE"
    BET_PAYOUT = "BET_PAYOUT"
    BET_REFUND = "BET_REFUND"
    ADMIN_GRANT = "ADMIN_GRANT"
    ADMIN_DEDUCT = "ADMIN_DEDUCT"
    ACHIEVEMENT_CLAIM = "ACHIEVEMENT_CLAIM"
    EASTER_EGG_REDEEM = "EASTER_EGG_REDEEM"  # 彩蛋兑换
    GACHA_SPEND = "GACHA_SPEND"  # 扭蛋机消费
    GACHA_WIN = "GACHA_WIN"  # 扭蛋机中奖
    EXCHANGE_SPEND = "EXCHANGE_SPEND"  # 积分兑换消费
    TASK_REWARD = "TASK_REWARD"  # 任务奖励
    TASK_CHAIN_BONUS = "TASK_CHAIN_BONUS"  # 任务链额外奖励
    BADGE_EXCHANGE = "BADGE_EXCHANGE"  # 徽章兑换积分


class PrizeType(str, enum.Enum):
    """奖品类型"""
    ITEM = "ITEM"
    API_KEY = "API_KEY"
    POINTS = "POINTS"
    EMPTY = "EMPTY"


class MarketStatus(str, enum.Enum):
    """竞猜市场状态"""
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    SETTLED = "SETTLED"
    CANCELED = "CANCELED"


class BetStatus(str, enum.Enum):
    """下注状态"""
    PLACED = "PLACED"
    WON = "WON"
    LOST = "LOST"
    REFUNDED = "REFUNDED"


class ApiKeyStatus(str, enum.Enum):
    """API Key 状态"""
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    REDEEMED = "REDEEMED"
    EXPIRED = "EXPIRED"


class PointsLedger(BaseModel):
    """积分账本"""
    __tablename__ = "points_ledger"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False, comment="变动金额")
    balance_after = Column(Integer, nullable=False, comment="变动后余额")
    reason = Column(Enum(PointsReason), nullable=False)
    ref_type = Column(String(50), nullable=True, comment="关联类型")
    ref_id = Column(Integer, nullable=True, comment="关联ID")
    description = Column(String(255), nullable=True)
    request_id = Column(String(64), nullable=True, unique=True, comment="幂等请求ID")

    # 关系
    user = relationship("User", backref="points_ledger")

    __table_args__ = (
        Index("idx_ref", "ref_type", "ref_id"),
    )


class UserPoints(BaseModel):
    """用户积分余额缓存"""
    __tablename__ = "user_points"
    __table_args__ = {'extend_existing': True}

    # 移除默认的id主键，使用user_id作为主键
    id = None
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    balance = Column(Integer, nullable=False, default=0, comment="当前积分余额")
    total_earned = Column(Integer, nullable=False, default=0, comment="累计获得积分")
    total_spent = Column(Integer, nullable=False, default=0, comment="累计消费积分")

    # 关系
    user = relationship("User", backref="points")


class DailySignin(BaseModel):
    """每日签到记录"""
    __tablename__ = "daily_signins"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    signin_date = Column(Date, nullable=False, comment="签到日期")
    points_earned = Column(Integer, nullable=False, default=100)
    streak_day = Column(Integer, nullable=False, default=1, comment="连续签到天数")
    bonus_points = Column(Integer, nullable=False, default=0, comment="连续签到奖励积分")

    # 关系
    user = relationship("User", backref="signins")

    __table_args__ = (
        UniqueConstraint("user_id", "signin_date", name="idx_user_date"),
        Index("idx_signin_date", "signin_date"),
    )


class SigninMilestone(BaseModel):
    """连续签到里程碑配置"""
    __tablename__ = "signin_milestones"

    day = Column(Integer, nullable=False, unique=True, comment="连续天数")
    bonus_points = Column(Integer, nullable=False, comment="奖励积分")
    description = Column(String(100), nullable=True)


class LotteryConfig(BaseModel):
    """抽奖配置"""
    __tablename__ = "lottery_configs"

    name = Column(String(100), nullable=False, comment="抽奖活动名称")
    cost_points = Column(Integer, nullable=False, default=20)
    is_active = Column(Boolean, nullable=False, default=True)
    daily_limit = Column(Integer, nullable=True, comment="每日抽奖次数限制")
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # 关系
    prizes = relationship("LotteryPrize", back_populates="config", lazy="selectin")


class LotteryPrize(BaseModel):
    """抽奖奖池"""
    __tablename__ = "lottery_prizes"

    config_id = Column(Integer, ForeignKey("lottery_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    prize_type = Column(Enum(PrizeType), nullable=False)
    prize_name = Column(String(100), nullable=False)
    prize_value = Column(String(255), nullable=True, comment="奖品值")
    weight = Column(Integer, nullable=False, default=100, comment="权重")
    stock = Column(Integer, nullable=True, comment="库存数量")
    is_rare = Column(Boolean, nullable=False, default=False)
    is_enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")

    # 关系
    config = relationship("LotteryConfig", back_populates="prizes")


class ApiKeyCode(BaseModel):
    """API Key 兑换码库存"""
    __tablename__ = "api_key_codes"

    code = Column(String(64), nullable=False, unique=True)
    quota = Column(DECIMAL(10, 2), nullable=True, default=0, comment="额度")
    status = Column(Enum(ApiKeyStatus), nullable=False, default=ApiKeyStatus.AVAILABLE)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_at = Column(DateTime, nullable=True)
    redeemed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    description = Column(String(255), nullable=True)

    # 关系
    assigned_user = relationship("User", backref="api_key_codes")


class LotteryDraw(BaseModel):
    """抽奖记录"""
    __tablename__ = "lottery_draws"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("lottery_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    cost_points = Column(Integer, nullable=False)
    prize_id = Column(Integer, nullable=False)
    prize_type = Column(String(20), nullable=False)
    prize_name = Column(String(100), nullable=False)
    prize_value = Column(String(255), nullable=True)
    is_rare = Column(Boolean, nullable=False, default=False)
    request_id = Column(String(64), nullable=True, unique=True)

    # 关系
    user = relationship("User", backref="lottery_draws")
    config = relationship("LotteryConfig", backref="draws")


class PredictionMarket(BaseModel):
    """竞猜市场"""
    __tablename__ = "prediction_markets"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(MarketStatus), nullable=False, default=MarketStatus.DRAFT)
    opens_at = Column(DateTime, nullable=True)
    closes_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)
    fee_rate = Column(DECIMAL(5, 4), nullable=False, default=Decimal("0.05"), comment="平台抽成比例")
    min_bet = Column(Integer, nullable=False, default=10)
    max_bet = Column(Integer, nullable=True)
    total_pool = Column(Integer, nullable=False, default=0)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # 关系
    options = relationship("PredictionOption", back_populates="market", lazy="selectin")
    bets = relationship("PredictionBet", back_populates="market")
    creator = relationship("User", backref="created_markets")

    __table_args__ = (
        Index("idx_status", "status"),
        Index("idx_closes_at", "closes_at"),
    )


class PredictionOption(BaseModel):
    """竞猜选项"""
    __tablename__ = "prediction_options"

    market_id = Column(Integer, ForeignKey("prediction_markets.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    ref_type = Column(String(50), nullable=True)
    ref_id = Column(Integer, nullable=True)
    total_stake = Column(Integer, nullable=False, default=0)
    is_winner = Column(Boolean, nullable=True, comment="是否为赢家")
    odds = Column(DECIMAL(10, 2), nullable=True, comment="当前赔率")

    # 关系
    market = relationship("PredictionMarket", back_populates="options")
    bets = relationship("PredictionBet", back_populates="option")


class PredictionBet(BaseModel):
    """用户下注记录"""
    __tablename__ = "prediction_bets"

    market_id = Column(Integer, ForeignKey("prediction_markets.id", ondelete="CASCADE"), nullable=False, index=True)
    option_id = Column(Integer, ForeignKey("prediction_options.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stake_points = Column(Integer, nullable=False)
    status = Column(Enum(BetStatus), nullable=False, default=BetStatus.PLACED)
    payout_points = Column(Integer, nullable=True)
    request_id = Column(String(64), nullable=True, unique=True)

    # 关系
    market = relationship("PredictionMarket", back_populates="bets")
    option = relationship("PredictionOption", back_populates="bets")
    user = relationship("User", backref="bets")


class UserItem(BaseModel):
    """用户道具库存"""
    __tablename__ = "user_items"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(50), nullable=False, comment="道具类型")
    quantity = Column(Integer, nullable=False, default=0)

    # 关系
    user = relationship("User", backref="items")

    __table_args__ = (
        UniqueConstraint("user_id", "item_type", name="idx_user_item"),
    )


class ScratchCardStatus(str, enum.Enum):
    """刮刮乐卡片状态"""
    PURCHASED = "PURCHASED"  # 已购买，未刮开
    REVEALED = "REVEALED"    # 已刮开


class ScratchCard(BaseModel):
    """刮刮乐卡片"""
    __tablename__ = "scratch_cards"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("lottery_configs.id", ondelete="CASCADE"), nullable=False)
    cost_points = Column(Integer, nullable=False, comment="购买花费积分")
    prize_id = Column(Integer, nullable=False, comment="预定奖品ID")
    prize_type = Column(String(20), nullable=False)
    prize_name = Column(String(100), nullable=False)
    prize_value = Column(String(255), nullable=True)
    is_rare = Column(Boolean, nullable=False, default=False)
    status = Column(Enum(ScratchCardStatus), nullable=False, default=ScratchCardStatus.PURCHASED)
    revealed_at = Column(DateTime, nullable=True, comment="刮开时间")

    # 关系
    user = relationship("User", backref="scratch_cards")
    config = relationship("LotteryConfig", backref="scratch_cards")


class ExchangeItemType(str, enum.Enum):
    """兑换商品类型"""
    LOTTERY_TICKET = "LOTTERY_TICKET"      # 抽奖券（免费抽奖次数）
    SCRATCH_TICKET = "SCRATCH_TICKET"      # 刮刮乐券
    GACHA_TICKET = "GACHA_TICKET"          # 扭蛋券
    SLOT_TICKET = "SLOT_TICKET"            # 老虎机券
    API_KEY = "API_KEY"                    # API Key 兑换码
    ITEM = "ITEM"                          # 道具


class ExchangeItem(BaseModel):
    """积分兑换商品配置"""
    __tablename__ = "exchange_items"

    name = Column(String(100), nullable=False, comment="商品名称")
    description = Column(String(500), nullable=True, comment="商品描述")
    item_type = Column(Enum(ExchangeItemType), nullable=False, comment="商品类型")
    item_value = Column(String(100), nullable=True, comment="商品值（如道具类型）")
    cost_points = Column(Integer, nullable=False, comment="所需积分")
    stock = Column(Integer, nullable=True, comment="库存（NULL为无限）")
    daily_limit = Column(Integer, nullable=True, comment="每人每日限购")
    total_limit = Column(Integer, nullable=True, comment="每人总限购")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否上架")
    sort_order = Column(Integer, nullable=False, default=0, comment="排序")
    icon = Column(String(50), nullable=True, comment="图标名称")
    is_hot = Column(Boolean, nullable=False, default=False, comment="是否热门")

    __table_args__ = (
        Index("idx_active_sort", "is_active", "sort_order"),
    )


class ExchangeRecord(BaseModel):
    """积分兑换记录"""
    __tablename__ = "exchange_records"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("exchange_items.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(100), nullable=False, comment="商品名称快照")
    item_type = Column(String(50), nullable=False, comment="商品类型快照")
    cost_points = Column(Integer, nullable=False, comment="消费积分")
    quantity = Column(Integer, nullable=False, default=1, comment="兑换数量")
    reward_value = Column(String(255), nullable=True, comment="发放的奖励值")

    # 关系
    user = relationship("User", backref="exchange_records")
    item = relationship("ExchangeItem", backref="records")

    __table_args__ = (
        Index("idx_user_item", "user_id", "item_id"),
        Index("idx_created_at", "created_at"),
    )


class UserExchangeQuota(BaseModel):
    """用户兑换券额度（免费使用次数）"""
    __tablename__ = "user_exchange_quotas"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quota_type = Column(String(50), nullable=False, comment="额度类型")
    quantity = Column(Integer, nullable=False, default=0, comment="剩余数量")

    # 关系
    user = relationship("User", backref="exchange_quotas")

    __table_args__ = (
        UniqueConstraint("user_id", "quota_type", name="idx_user_quota_type"),
    )
