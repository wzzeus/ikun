"""
扭蛋机配置数据模型
支持管理员配置奖池、权重、费用来完全控制扭蛋机
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, ForeignKey, DECIMAL, Enum, JSON
)
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class GachaPrizeType(str, enum.Enum):
    """扭蛋奖品类型"""
    POINTS = "points"      # 积分
    ITEM = "item"          # 道具
    BADGE = "badge"        # 徽章
    API_KEY = "api_key"    # API Key兑换码


class GachaConfig(BaseModel):
    """扭蛋机配置"""
    __tablename__ = "gacha_configs"

    name = Column(String(100), nullable=False, default="幸运扭蛋机", comment="配置名称")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")
    cost_points = Column(Integer, nullable=False, default=50, comment="每次消耗积分")
    daily_limit = Column(Integer, nullable=True, default=30, comment="每日限制次数")
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # 关系
    prizes = relationship("GachaPrize", back_populates="config", lazy="selectin")
    draws = relationship("GachaDraw", back_populates="config")


class GachaPrize(BaseModel):
    """扭蛋机奖品配置"""
    __tablename__ = "gacha_prizes"

    config_id = Column(Integer, ForeignKey("gacha_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    # 使用 values_callable 确保 SQLAlchemy 用枚举的 value（如 'points'）而不是 name（如 'POINTS'）
    prize_type = Column(
        Enum(GachaPrizeType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        comment="奖品类型"
    )
    prize_name = Column(String(100), nullable=False, comment="奖品名称")
    prize_value = Column(JSON, nullable=True, comment="奖品值(JSON格式)")
    weight = Column(DECIMAL(10, 2), nullable=False, default=1.00, comment="权重")
    stock = Column(Integer, nullable=True, comment="库存(NULL为无限)")
    is_rare = Column(Boolean, nullable=False, default=False, comment="是否稀有")
    is_enabled = Column(Boolean, nullable=False, default=True, comment="是否启用")
    sort_order = Column(Integer, nullable=False, default=0, comment="排序")

    # 关系
    config = relationship("GachaConfig", back_populates="prizes")


class GachaDraw(BaseModel):
    """扭蛋机抽奖记录"""
    __tablename__ = "gacha_draws"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    config_id = Column(Integer, ForeignKey("gacha_configs.id", ondelete="CASCADE"), nullable=False, index=True)
    prize_id = Column(Integer, nullable=False, comment="中奖奖品ID")
    cost_points = Column(Integer, nullable=False, default=0, comment="消耗积分")
    prize_type = Column(String(20), nullable=False)
    prize_name = Column(String(100), nullable=False)
    prize_value = Column(JSON, nullable=True, comment="奖品详情")
    is_rare = Column(Boolean, nullable=False, default=False)
    used_ticket = Column(Boolean, nullable=False, default=False, comment="是否使用了扭蛋券")
    request_id = Column(String(64), nullable=True, unique=True, comment="幂等请求ID")

    # 关系
    user = relationship("User", backref="gacha_draws")
    config = relationship("GachaConfig", back_populates="draws")
