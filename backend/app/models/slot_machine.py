"""
老虎机配置数据模型
支持管理员配置符号、倍率、权重、规则来完全控制胜率
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, DECIMAL, Enum, JSON
)
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class SlotWinType(str, enum.Enum):
    """老虎机中奖类型"""
    NONE = "none"      # 未中奖
    TWO = "two"        # 两个相同
    THREE = "three"    # 三个相同


class SlotRuleType(str, enum.Enum):
    """老虎机规则类型"""
    THREE_SAME = "three_same"       # 三连
    TWO_SAME = "two_same"           # 两连
    SPECIAL_COMBO = "special_combo" # 特殊组合
    PENALTY = "penalty"             # 惩罚
    BONUS = "bonus"                 # 奖励


class SlotMachineConfig(BaseModel):
    """老虎机配置"""
    __tablename__ = "slot_machine_configs"

    name = Column(String(100), nullable=False, default="幸运老虎机", comment="配置名称")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")
    cost_points = Column(Integer, nullable=False, default=30, comment="每次消耗积分")
    reels = Column(Integer, nullable=False, default=3, comment="滚轴数量")
    two_kind_multiplier = Column(DECIMAL(6, 2), nullable=False, default=1.50, comment="两连奖励倍数")
    jackpot_symbol_key = Column(String(50), nullable=False, default="seven", comment="大奖符号key")
    daily_limit = Column(Integer, nullable=True, default=20, comment="每日限制次数")
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # 关系
    symbols = relationship("SlotMachineSymbol", back_populates="config", lazy="selectin")
    rules = relationship("SlotMachineRule", back_populates="config", lazy="selectin")
    draws = relationship("SlotMachineDraw", back_populates="config")


class SlotMachineSymbol(BaseModel):
    """老虎机符号配置"""
    __tablename__ = "slot_machine_symbols"

    config_id = Column(Integer, ForeignKey("slot_machine_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol_key = Column(String(50), nullable=False, comment="符号唯一key")
    emoji = Column(String(32), nullable=False, comment="展示emoji")
    name = Column(String(50), nullable=False, comment="名称")
    multiplier = Column(Integer, nullable=False, default=1, comment="三连倍率")
    weight = Column(Integer, nullable=False, default=1, comment="权重（越大出现概率越高）")
    sort_order = Column(Integer, nullable=False, default=0, comment="排序")
    is_enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")
    is_jackpot = Column(Boolean, nullable=False, default=False, comment="是否大奖符号")

    # 关系
    config = relationship("SlotMachineConfig", back_populates="symbols")


class SlotMachineDraw(BaseModel):
    """老虎机抽奖记录"""
    __tablename__ = "slot_machine_draws"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("slot_machine_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    cost_points = Column(Integer, nullable=False, comment="消费积分")
    reel_1 = Column(String(50), nullable=False, comment="第一个滚轴结果")
    reel_2 = Column(String(50), nullable=False, comment="第二个滚轴结果")
    reel_3 = Column(String(50), nullable=False, comment="第三个滚轴结果")
    win_type = Column(Enum(SlotWinType), nullable=False, default=SlotWinType.NONE, comment="中奖类型")
    multiplier = Column(DECIMAL(10, 2), nullable=False, default=0, comment="倍率")
    payout_points = Column(Integer, nullable=False, default=0, comment="获得积分")
    is_jackpot = Column(Boolean, nullable=False, default=False, comment="是否大奖")
    request_id = Column(String(64), nullable=True, unique=True, comment="幂等请求ID")

    # 关系
    user = relationship("User", backref="slot_draws")
    config = relationship("SlotMachineConfig", back_populates="draws")


class SlotMachineRule(BaseModel):
    """老虎机中奖规则配置"""
    __tablename__ = "slot_machine_rules"

    config_id = Column(Integer, ForeignKey("slot_machine_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_key = Column(String(50), nullable=False, comment="规则唯一标识")
    rule_name = Column(String(100), nullable=False, comment="规则名称")
    # 使用 values_callable 确保 SQLAlchemy 用枚举的 value（如 'three_same'）而不是 name（如 'THREE_SAME'）
    rule_type = Column(
        Enum(SlotRuleType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        comment="规则类型"
    )
    pattern = Column(JSON, nullable=True, comment="匹配模式")
    multiplier = Column(DECIMAL(10, 2), nullable=False, default=1.00, comment="倍率")
    fixed_points = Column(Integer, nullable=True, comment="固定奖励/惩罚积分")
    probability = Column(DECIMAL(5, 4), nullable=True, comment="触发概率")
    min_amount = Column(Integer, nullable=True, comment="最小金额")
    max_amount = Column(Integer, nullable=True, comment="最大金额")
    priority = Column(Integer, nullable=False, default=0, comment="优先级")
    is_enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")
    description = Column(String(500), nullable=True, comment="规则描述")

    # 关系
    config = relationship("SlotMachineConfig", back_populates="rules")
