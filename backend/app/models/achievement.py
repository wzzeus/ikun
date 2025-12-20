"""
成就系统数据模型
"""
from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AchievementTier(str, Enum):
    """成就稀有度"""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class AchievementStatus(str, Enum):
    """成就状态"""
    LOCKED = "locked"
    UNLOCKED = "unlocked"
    CLAIMED = "claimed"


class AchievementCategory(str, Enum):
    """成就分类"""
    CHEERS = "cheers"
    SOCIAL = "social"
    RETENTION = "retention"
    EXPLORER = "explorer"


class AchievementDefinition(Base):
    """成就定义"""
    __tablename__ = "achievement_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    achievement_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    badge_icon: Mapped[str] = mapped_column(String(64), nullable=False)
    badge_tier: Mapped[str] = mapped_column(String(16), default="bronze")
    points: Mapped[int] = mapped_column(Integer, default=0)
    target_value: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
    )


class UserAchievement(Base):
    """用户成就状态"""
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    achievement_key: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="locked")
    progress_value: Mapped[int] = mapped_column(Integer, default=0)
    progress_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    unlocked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
    )

    # Relationships
    user = relationship("User", back_populates="achievements")

    __table_args__ = (
        Index("uk_user_achievement", "user_id", "achievement_key", unique=True),
        Index("idx_user_status", "user_id", "status"),
    )


class UserBadgeShowcase(Base):
    """用户徽章展示槽位"""
    __tablename__ = "user_badge_showcase"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    slot: Mapped[int] = mapped_column(Integer, primary_key=True)
    achievement_key: Mapped[str] = mapped_column(String(64), nullable=False)
    pinned_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP")
    )


class UserStats(Base):
    """用户统计数据"""
    __tablename__ = "user_stats"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # 打气相关
    total_cheers_given: Mapped[int] = mapped_column(Integer, default=0)
    total_cheers_with_message: Mapped[int] = mapped_column(Integer, default=0)
    cheer_types_used: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    consecutive_days: Mapped[int] = mapped_column(Integer, default=0)
    max_consecutive_days: Mapped[int] = mapped_column(Integer, default=0)
    last_cheer_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # 扭蛋相关
    total_gacha_count: Mapped[int] = mapped_column(Integer, default=0)
    gacha_rare_count: Mapped[int] = mapped_column(Integer, default=0)

    # 竞猜相关
    prediction_total: Mapped[int] = mapped_column(Integer, default=0)
    prediction_correct: Mapped[int] = mapped_column(Integer, default=0)

    # 任务相关
    daily_task_streak: Mapped[int] = mapped_column(Integer, default=0)
    max_daily_task_streak: Mapped[int] = mapped_column(Integer, default=0)
    weekly_tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    last_task_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # 通用统计
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    achievements_unlocked: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
    )

    # Relationships
    user = relationship("User", back_populates="stats")
