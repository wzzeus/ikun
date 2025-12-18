"""
每日/每周任务系统数据模型

设计说明：
- TaskDefinition: 任务定义（管理员可配置）
- UserTaskProgress: 用户任务进度（实时累加）
- UserTaskClaim: 任务领取记录（幂等保障）
- UserTaskEvent: 事件去重（同一业务事件只计一次）
"""
from datetime import datetime, date
from typing import Optional
import enum

from sqlalchemy import (
    Column, Integer, String, Date, DateTime, ForeignKey,
    Enum, JSON, UniqueConstraint, Index, Boolean, Text
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class TaskSchedule(str, enum.Enum):
    """任务周期"""
    DAILY = "DAILY"    # 每日任务（每天0点重置）
    WEEKLY = "WEEKLY"  # 每周任务（每周一0点重置）


class TaskType(str, enum.Enum):
    """任务类型（与用户行为对应）"""
    SIGNIN = "SIGNIN"                    # 签到
    BROWSE_PROJECT = "BROWSE_PROJECT"    # 浏览项目
    CHEER = "CHEER"                      # 打气/应援
    VOTE = "VOTE"                        # 投票
    COMMENT = "COMMENT"                  # 评论/留言
    PREDICTION = "PREDICTION"            # 竞猜下注
    LOTTERY = "LOTTERY"                  # 抽奖
    GACHA = "GACHA"                      # 扭蛋
    EXCHANGE = "EXCHANGE"                # 积分兑换
    CHAIN_BONUS = "CHAIN_BONUS"          # 任务链奖励（完成一组任务后额外奖励）


class TaskDefinition(BaseModel):
    """
    任务定义表

    设计要点：
    - task_key: 唯一标识，用于前端/配置引用
    - chain_group_key: 任务分组，用于任务链条件判断
    - chain_requires_group_key: CHAIN_BONUS 任务专用，指定依赖的组
    """
    __tablename__ = "task_definitions"

    # 基本信息
    task_key = Column(String(100), nullable=False, unique=True, comment="任务唯一key")
    name = Column(String(100), nullable=False, comment="任务名称")
    description = Column(String(500), nullable=True, comment="任务描述")

    # 任务类型配置
    schedule = Column(Enum(TaskSchedule), nullable=False, comment="任务周期")
    task_type = Column(Enum(TaskType), nullable=False, comment="任务类型")

    # 目标与奖励
    target_value = Column(Integer, nullable=False, default=1, comment="目标次数")
    reward_points = Column(Integer, nullable=False, default=0, comment="奖励积分")
    reward_payload = Column(JSON, nullable=True, comment="扩展奖励（道具/券等）")

    # 配置开关
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")
    auto_claim = Column(Boolean, nullable=False, default=True, comment="完成后自动发放奖励")
    sort_order = Column(Integer, nullable=False, default=0, comment="排序（越小越靠前）")

    # 有效期
    starts_at = Column(DateTime, nullable=True, comment="开始时间（NULL不限制）")
    ends_at = Column(DateTime, nullable=True, comment="结束时间（NULL不限制）")

    # 任务链配置
    chain_group_key = Column(String(50), nullable=True, comment="任务分组key")
    chain_requires_group_key = Column(String(50), nullable=True, comment="任务链依赖分组key")

    # 元数据
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # 关系
    progresses = relationship("UserTaskProgress", back_populates="task", lazy="dynamic")

    __table_args__ = (
        Index("idx_task_active_schedule_sort", "is_active", "schedule", "sort_order"),
        Index("idx_task_type_schedule", "task_type", "schedule"),
        Index("idx_task_chain_group", "chain_group_key"),
    )


class UserTaskProgress(BaseModel):
    """
    用户任务进度表

    设计要点：
    - (user_id, task_id, period_start) 唯一约束，确保每个周期只有一条进度记录
    - target_value 快照：防止配置变更影响已有进度
    - 使用 INSERT ... ON DUPLICATE KEY UPDATE 实现并发安全的进度累加
    """
    __tablename__ = "user_task_progress"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("task_definitions.id", ondelete="CASCADE"), nullable=False, index=True)

    # 周期信息
    period_start = Column(Date, nullable=False, comment="周期开始日期")
    period_end = Column(Date, nullable=False, comment="周期结束日期")

    # 进度信息
    progress_value = Column(Integer, nullable=False, default=0, comment="当前进度")
    target_value = Column(Integer, nullable=False, default=1, comment="目标快照")

    # 状态时间戳
    completed_at = Column(DateTime, nullable=True, comment="完成时间")
    claimed_at = Column(DateTime, nullable=True, comment="领取/发放时间")
    last_event_at = Column(DateTime, nullable=True, comment="最近一次进度更新时间")

    # 关系
    task = relationship("TaskDefinition", back_populates="progresses")
    user = relationship("User", backref="task_progresses")

    __table_args__ = (
        UniqueConstraint("user_id", "task_id", "period_start", name="uq_user_task_period"),
        Index("idx_user_task_period", "user_id", "period_start"),
        Index("idx_task_period", "task_id", "period_start"),
        Index("idx_user_completed", "user_id", "completed_at"),
    )


class UserTaskClaim(BaseModel):
    """
    任务领取记录表

    设计要点：
    - (user_id, task_id, period_start) 唯一约束，防止同一周期重复领取
    - request_id 唯一约束，确保幂等性（贯穿到 points_ledger）
    - 使用 INSERT IGNORE 处理并发冲突
    """
    __tablename__ = "user_task_claims"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("task_definitions.id", ondelete="CASCADE"), nullable=False, index=True)
    period_start = Column(Date, nullable=False, comment="周期开始日期")

    # 奖励快照
    reward_points = Column(Integer, nullable=False, default=0, comment="奖励积分")
    reward_payload = Column(JSON, nullable=True, comment="扩展奖励快照")

    # 幂等控制
    request_id = Column(String(64), nullable=False, unique=True, comment="幂等请求ID")
    claimed_at = Column(DateTime, nullable=False, default=datetime.utcnow, comment="领取时间")

    # 关系
    task = relationship("TaskDefinition", backref="claims")
    user = relationship("User", backref="task_claims")

    __table_args__ = (
        UniqueConstraint("user_id", "task_id", "period_start", name="uq_user_task_claim"),
        Index("idx_user_claim_time", "user_id", "claimed_at"),
    )


class UserTaskEvent(BaseModel):
    """
    任务事件去重表

    设计要点：
    - event_key 是业务事件的唯一标识（如 "cheer:123"、"signin:2025-01-15"）
    - (user_id, schedule, period_start, event_key) 唯一约束
    - 同一业务事件在同一周期内只计一次进度
    - 使用 INSERT IGNORE 实现幂等去重
    """
    __tablename__ = "user_task_events"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    schedule = Column(Enum(TaskSchedule), nullable=False, index=True, comment="任务周期")
    period_start = Column(Date, nullable=False, index=True, comment="周期开始日期")

    # 事件信息
    task_type = Column(Enum(TaskType), nullable=False, index=True, comment="任务类型")
    event_key = Column(String(128), nullable=False, comment="事件幂等key")

    # 关联信息（可选，用于追溯）
    ref_type = Column(String(50), nullable=True, comment="关联类型")
    ref_id = Column(Integer, nullable=True, comment="关联ID")

    # 关系
    user = relationship("User", backref="task_events")

    __table_args__ = (
        UniqueConstraint("user_id", "schedule", "period_start", "event_key", name="uq_user_period_event"),
        Index("idx_user_type_period", "user_id", "task_type", "schedule", "period_start"),
    )
