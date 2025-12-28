"""
比赛模型
"""
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum, Boolean, JSON
import enum

from app.models.base import BaseModel


class ContestPhase(str, enum.Enum):
    UPCOMING = "upcoming"      # 即将开始
    SIGNUP = "signup"          # 报名中
    SUBMISSION = "submission"  # 提交作品
    VOTING = "voting"          # 投票中
    ENDED = "ended"            # 已结束


class ContestVisibility(str, enum.Enum):
    """比赛可见性"""
    DRAFT = "draft"        # 草稿
    PUBLISHED = "published"  # 已发布
    HIDDEN = "hidden"      # 已隐藏


class Contest(BaseModel):
    """比赛表"""
    __tablename__ = "contests"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    visibility = Column(
        SQLEnum(
            'draft', 'published', 'hidden',
            name='contestvisibility'
        ),
        default='published',
        nullable=False,
        comment="比赛可见性"
    )
    home_visible = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
        comment="是否首页展示",
    )
    banner_url = Column(String(500), nullable=True, comment="比赛 Banner 图片")
    rules_md = Column(Text, nullable=True, comment="比赛规则（Markdown）")
    prizes_md = Column(Text, nullable=True, comment="奖项说明（Markdown）")
    review_rules_md = Column(Text, nullable=True, comment="评审规则（Markdown）")
    faq_md = Column(Text, nullable=True, comment="常见问题（Markdown）")
    template_config = Column(JSON, nullable=True, comment="首页模板配置（JSON）")
    phase = Column(
        SQLEnum(
            'upcoming', 'signup', 'submission', 'voting', 'ended',
            name='contestphase'
        ),
        default='upcoming'
    )
    signup_start = Column(DateTime, nullable=True)
    signup_end = Column(DateTime, nullable=True)
    submit_start = Column(DateTime, nullable=True)
    submit_end = Column(DateTime, nullable=True)
    vote_start = Column(DateTime, nullable=True)
    vote_end = Column(DateTime, nullable=True)
    auto_phase_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        comment="是否自动同步比赛阶段",
    )

    @property
    def phase_enum(self) -> ContestPhase:
        """获取 phase 的枚举类型"""
        return ContestPhase(self.phase) if self.phase else ContestPhase.UPCOMING
