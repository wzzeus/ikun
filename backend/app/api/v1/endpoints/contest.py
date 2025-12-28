"""
比赛相关 API

提供比赛信息的查询功能。
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.endpoints.submission import get_current_user, get_optional_user
from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.models.contest import Contest, ContestPhase, ContestVisibility
from app.models.project import Project, ProjectStatus
from app.models.project_favorite import ProjectFavorite
from app.models.project_like import ProjectLike
from app.models.project_review import ProjectReview
from app.models.project_review_assignment import ProjectReviewAssignment
from app.models.registration import Registration, RegistrationStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User
from app.services.media_service import delete_media_file, ensure_local_media_url, save_upload_file
from app.services.security_challenge import guard_challenge
from app.schemas.review_center import ReviewStatsResponse
from app.schemas.submission import UserBrief

router = APIRouter()

# 图片大小限制（字节）
MAX_BANNER_BYTES = 5 * 1024 * 1024


class ContestResponse(BaseModel):
    """比赛响应体"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    phase: ContestPhase
    visibility: ContestVisibility = ContestVisibility.PUBLISHED
    home_visible: bool = False
    banner_url: Optional[str] = None
    rules_md: Optional[str] = None
    prizes_md: Optional[str] = None
    review_rules_md: Optional[str] = None
    faq_md: Optional[str] = None
    template_config: Optional[dict] = None
    signup_start: Optional[datetime] = None
    signup_end: Optional[datetime] = None
    submit_start: Optional[datetime] = None
    submit_end: Optional[datetime] = None
    vote_start: Optional[datetime] = None
    vote_end: Optional[datetime] = None
    auto_phase_enabled: bool = True


class ContestListResponse(BaseModel):
    """比赛列表响应"""
    items: list[ContestResponse]
    total: int


class ContestRegistrationStats(BaseModel):
    """比赛报名统计"""
    total: int
    draft: int
    submitted: int
    approved: int
    rejected: int
    withdrawn: int


class ContestSubmissionStats(BaseModel):
    """比赛作品提交统计"""
    total: int
    draft: int
    validating: int
    submitted: int
    approved: int
    rejected: int
    finalized: int
    coverage_rate: float


class ContestReviewStats(BaseModel):
    """比赛评审统计"""
    assignment_count: int
    reviewed_count: int
    assignment_coverage_rate: float
    assigned_project_count: int
    reviewed_project_count: int
    project_coverage_rate: float


class ContestStatsResponse(BaseModel):
    """比赛统计汇总响应"""
    registration: ContestRegistrationStats
    submission: ContestSubmissionStats
    review: ContestReviewStats


class ContestCreateRequest(BaseModel):
    """创建比赛请求体"""
    title: str
    description: Optional[str] = None
    phase: Optional[ContestPhase] = None
    visibility: Optional[ContestVisibility] = None
    home_visible: Optional[bool] = None
    banner_url: Optional[str] = None
    rules_md: Optional[str] = None
    prizes_md: Optional[str] = None
    review_rules_md: Optional[str] = None
    faq_md: Optional[str] = None
    template_config: Optional[dict] = None
    signup_start: Optional[datetime] = None
    signup_end: Optional[datetime] = None
    submit_start: Optional[datetime] = None
    submit_end: Optional[datetime] = None
    vote_start: Optional[datetime] = None
    vote_end: Optional[datetime] = None
    auto_phase_enabled: Optional[bool] = None


class ContestUpdateRequest(BaseModel):
    """更新比赛请求体"""
    title: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[ContestPhase] = None
    visibility: Optional[ContestVisibility] = None
    home_visible: Optional[bool] = None
    banner_url: Optional[str] = None
    rules_md: Optional[str] = None
    prizes_md: Optional[str] = None
    review_rules_md: Optional[str] = None
    faq_md: Optional[str] = None
    template_config: Optional[dict] = None
    signup_start: Optional[datetime] = None
    signup_end: Optional[datetime] = None
    submit_start: Optional[datetime] = None
    submit_end: Optional[datetime] = None
    vote_start: Optional[datetime] = None
    vote_end: Optional[datetime] = None
    auto_phase_enabled: Optional[bool] = None


class ContestPhaseUpdateRequest(BaseModel):
    """比赛阶段更新请求体"""
    phase: ContestPhase


class ProjectRankingItem(BaseModel):
    """作品排行榜条目"""
    rank: int
    project_id: int
    title: str
    status: ProjectStatus
    user: Optional[UserBrief] = None
    stats: ReviewStatsResponse


class ContestRankingResponse(BaseModel):
    """比赛排行榜响应"""
    items: list[ProjectRankingItem]
    total: int


class ProjectRankingDetailResponse(BaseModel):
    """比赛排行榜详情响应"""
    rank: int
    project_id: int
    title: str
    summary: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    readme_url: Optional[str] = None
    status: ProjectStatus
    user: Optional[UserBrief] = None
    stats: ReviewStatsResponse


class ProjectInteractionLeaderboardItem(BaseModel):
    """作品互动排行榜条目"""
    rank: int
    project_id: int
    title: str
    status: ProjectStatus
    user: Optional[UserBrief] = None
    count: int


class ContestInteractionLeaderboardResponse(BaseModel):
    """作品互动排行榜响应"""
    items: list[ProjectInteractionLeaderboardItem]
    total: int
    type: str


def require_admin(user: User) -> None:
    """检查管理员权限"""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")


def ensure_contest_visible(contest: Contest, user: Optional[User]) -> None:
    """确保比赛对当前用户可见"""
    if contest.visibility != ContestVisibility.PUBLISHED.value:
        if not (user and user.is_admin):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")


def build_empty_review_stats() -> ReviewStatsResponse:
    """构建空的评分统计"""
    return ReviewStatsResponse(
        review_count=0,
        final_score=None,
        avg_score=None,
        min_score=None,
        max_score=None,
    )


def build_review_stats(
    review_count: int,
    total_score: Optional[int],
    avg_score: Optional[float],
    min_score: Optional[int],
    max_score: Optional[int],
) -> ReviewStatsResponse:
    """构建评分统计"""
    if review_count == 0:
        return build_empty_review_stats()

    avg_value = Decimal(str(avg_score)).quantize(Decimal("0.01")) if avg_score is not None else None
    if review_count >= 3 and total_score is not None and min_score is not None and max_score is not None:
        final_score = Decimal(str(total_score - max_score - min_score)) / Decimal(review_count - 2)
        final_score = final_score.quantize(Decimal("0.01"))
    else:
        final_score = avg_value

    return ReviewStatsResponse(
        review_count=review_count,
        final_score=final_score,
        avg_score=avg_value,
        min_score=min_score,
        max_score=max_score,
    )


def calculate_rate(numerator: int, denominator: int) -> float:
    """计算覆盖率"""
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def validate_contest_schedule(schedule: dict) -> None:
    """验证比赛时间窗口配置是否合理"""
    signup_start = schedule.get("signup_start")
    signup_end = schedule.get("signup_end")
    submit_start = schedule.get("submit_start")
    submit_end = schedule.get("submit_end")
    vote_start = schedule.get("vote_start")
    vote_end = schedule.get("vote_end")

    def check_window(start: Optional[datetime], end: Optional[datetime], label: str) -> None:
        if start and end and start > end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{label}时间范围不合法",
            )

    def check_order(
        left: Optional[datetime],
        right: Optional[datetime],
        left_label: str,
        right_label: str,
    ) -> None:
        if left and right and left > right:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{left_label}不能晚于{right_label}",
            )

    check_window(signup_start, signup_end, "报名")
    check_window(submit_start, submit_end, "提交")
    check_window(vote_start, vote_end, "投票")

    check_order(signup_start, submit_start, "报名开始时间", "提交开始时间")
    check_order(signup_end, submit_start, "报名截止时间", "提交开始时间")
    check_order(submit_start, vote_start, "提交开始时间", "投票开始时间")
    check_order(submit_end, vote_start, "提交截止时间", "投票开始时间")


async def build_project_ranking_items(
    db: AsyncSession,
    contest_id: int,
) -> list[ProjectRankingItem]:
    """构建比赛作品排行榜列表"""
    project_result = await db.execute(
        select(Project)
        .join(
            Registration,
            (Registration.contest_id == Project.contest_id)
            & (Registration.user_id == Project.user_id),
        )
        .options(selectinload(Project.user))
        .where(
            Project.contest_id == contest_id,
            Project.status.in_({ProjectStatus.SUBMITTED.value, ProjectStatus.ONLINE.value}),
            Registration.status != RegistrationStatus.WITHDRAWN.value,
        )
    )
    projects = project_result.scalars().all()
    if not projects:
        return []

    project_ids = [project.id for project in projects]
    stats_result = await db.execute(
        select(
            ProjectReview.project_id.label("project_id"),
            func.count(ProjectReview.id).label("count"),
            func.sum(ProjectReview.score).label("sum"),
            func.avg(ProjectReview.score).label("avg"),
            func.min(ProjectReview.score).label("min"),
            func.max(ProjectReview.score).label("max"),
        )
        .where(ProjectReview.project_id.in_(project_ids))
        .group_by(ProjectReview.project_id)
    )
    stats_map = {row.project_id: row for row in stats_result}

    entries = []
    for project in projects:
        row = stats_map.get(project.id)
        stats = build_review_stats(
            review_count=row.count if row else 0,
            total_score=row.sum if row else None,
            avg_score=row.avg if row else None,
            min_score=row.min if row else None,
            max_score=row.max if row else None,
        )
        owner = UserBrief.model_validate(project.user) if project.user else None
        entries.append({
            "project": project,
            "stats": stats,
            "owner": owner,
        })

    def sort_key(entry: dict) -> tuple[float, int, int]:
        stats = entry["stats"]
        score_value = float(stats.final_score) if stats.final_score is not None else -1.0
        project = entry["project"]
        return (score_value, stats.review_count, project.id)

    entries.sort(key=sort_key, reverse=True)
    ranked_items: list[ProjectRankingItem] = []
    for rank, entry in enumerate(entries, 1):
        project = entry["project"]
        ranked_items.append(
            ProjectRankingItem(
                rank=rank,
                project_id=project.id,
                title=project.title,
                status=project.status_enum,
                user=entry["owner"],
                stats=entry["stats"],
            )
        )

    return ranked_items


@router.get("/", response_model=ContestListResponse)
async def list_contests(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取比赛列表"""
    query = select(Contest).order_by(Contest.id.desc())
    if not (current_user and current_user.is_admin):
        query = query.where(Contest.visibility == ContestVisibility.PUBLISHED.value)
    result = await db.execute(query)
    contests = result.scalars().all()

    return ContestListResponse(
        items=[ContestResponse.model_validate(c) for c in contests],
        total=len(contests)
    )

@router.get("/homepage", response_model=ContestResponse, summary="获取首页展示比赛")
async def get_homepage_contest(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取首页展示比赛，未配置时返回 404。"""
    query = select(Contest).where(Contest.home_visible.is_(True))
    if not (current_user and current_user.is_admin):
        query = query.where(Contest.visibility == ContestVisibility.PUBLISHED.value)
    result = await db.execute(query.order_by(Contest.updated_at.desc(), Contest.id.desc()))
    contest = result.scalars().first()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未配置首页展示比赛",
        )

    return ContestResponse.model_validate(contest)


@router.get("/current", response_model=ContestResponse, summary="获取当前比赛")
async def get_current_contest(
    include_ended: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    获取当前比赛（默认只取未结束的比赛）。

    - include_ended=True 时，若未找到进行中的比赛，则回退到最新一场。
    """
    is_admin = current_user is not None and current_user.is_admin
    query = select(Contest).where(Contest.phase != ContestPhase.ENDED.value)
    if not is_admin:
        query = query.where(Contest.visibility == ContestVisibility.PUBLISHED.value)
    result = await db.execute(query.order_by(Contest.id.desc()))
    contest = result.scalars().first()

    if contest is None and include_ended:
        fallback_query = select(Contest)
        if not is_admin:
            fallback_query = fallback_query.where(Contest.visibility == ContestVisibility.PUBLISHED.value)
        fallback_result = await db.execute(fallback_query.order_by(Contest.id.desc()))
        contest = fallback_result.scalars().first()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在",
        )

    return ContestResponse.model_validate(contest)


@router.get("/{contest_id}", response_model=ContestResponse)
async def get_contest(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取比赛详情"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    ensure_contest_visible(contest, current_user)
    return ContestResponse.model_validate(contest)


@router.get(
    "/{contest_id}/stats",
    response_model=ContestStatsResponse,
    summary="获取比赛统计汇总（管理员）",
)
async def get_contest_stats(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取比赛统计汇总"""
    require_admin(current_user)

    contest_result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = contest_result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在",
        )

    registration_rows = (
        await db.execute(
            select(
                Registration.status.label("status"),
                func.count(Registration.id).label("count"),
            )
            .where(Registration.contest_id == contest_id)
            .group_by(Registration.status)
        )
    ).all()
    registration_counts = {status.value: 0 for status in RegistrationStatus}
    for row in registration_rows:
        if row.status in registration_counts:
            registration_counts[row.status] = int(row.count or 0)
    registration_total = sum(registration_counts.values())

    submission_rows = (
        await db.execute(
            select(
                Submission.status.label("status"),
                func.count(Submission.id).label("count"),
            )
            .where(Submission.contest_id == contest_id)
            .group_by(Submission.status)
        )
    ).all()
    submission_counts = {status.value: 0 for status in SubmissionStatus}
    for row in submission_rows:
        if row.status in submission_counts:
            submission_counts[row.status] = int(row.count or 0)
    submission_total = sum(submission_counts.values())
    submission_finalized = (
        submission_counts[SubmissionStatus.SUBMITTED.value]
        + submission_counts[SubmissionStatus.APPROVED.value]
        + submission_counts[SubmissionStatus.REJECTED.value]
    )
    eligible_registrations = registration_counts[RegistrationStatus.APPROVED.value]
    submission_coverage_rate = calculate_rate(submission_finalized, eligible_registrations)

    assignment_count_result = await db.execute(
        select(func.count(ProjectReviewAssignment.id))
        .join(Project, Project.id == ProjectReviewAssignment.project_id)
        .where(Project.contest_id == contest_id)
    )
    assignment_count = assignment_count_result.scalar() or 0

    reviewed_count_result = await db.execute(
        select(func.count(ProjectReview.id))
        .join(Project, Project.id == ProjectReview.project_id)
        .where(Project.contest_id == contest_id)
    )
    reviewed_count = reviewed_count_result.scalar() or 0

    assigned_project_count_result = await db.execute(
        select(func.count(func.distinct(ProjectReviewAssignment.project_id)))
        .join(Project, Project.id == ProjectReviewAssignment.project_id)
        .where(Project.contest_id == contest_id)
    )
    assigned_project_count = assigned_project_count_result.scalar() or 0

    reviewed_project_count_result = await db.execute(
        select(func.count(func.distinct(ProjectReview.project_id)))
        .join(Project, Project.id == ProjectReview.project_id)
        .where(Project.contest_id == contest_id)
    )
    reviewed_project_count = reviewed_project_count_result.scalar() or 0

    return ContestStatsResponse(
        registration=ContestRegistrationStats(
            total=registration_total,
            draft=registration_counts[RegistrationStatus.DRAFT.value],
            submitted=registration_counts[RegistrationStatus.SUBMITTED.value],
            approved=registration_counts[RegistrationStatus.APPROVED.value],
            rejected=registration_counts[RegistrationStatus.REJECTED.value],
            withdrawn=registration_counts[RegistrationStatus.WITHDRAWN.value],
        ),
        submission=ContestSubmissionStats(
            total=submission_total,
            draft=submission_counts[SubmissionStatus.DRAFT.value],
            validating=submission_counts[SubmissionStatus.VALIDATING.value],
            submitted=submission_counts[SubmissionStatus.SUBMITTED.value],
            approved=submission_counts[SubmissionStatus.APPROVED.value],
            rejected=submission_counts[SubmissionStatus.REJECTED.value],
            finalized=submission_finalized,
            coverage_rate=submission_coverage_rate,
        ),
        review=ContestReviewStats(
            assignment_count=assignment_count,
            reviewed_count=reviewed_count,
            assignment_coverage_rate=calculate_rate(reviewed_count, assignment_count),
            assigned_project_count=assigned_project_count,
            reviewed_project_count=reviewed_project_count,
            project_coverage_rate=calculate_rate(reviewed_project_count, assigned_project_count),
        ),
    )


@router.get("/{contest_id}/ranking", response_model=ContestRankingResponse, summary="获取排行榜")
async def get_ranking(
    contest_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取排行榜"""
    # 验证比赛存在
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )
    ensure_contest_visible(contest, current_user)

    if limit < 1 or limit > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit 必须在 1-200 之间")
    ranked_items = await build_project_ranking_items(db, contest_id)
    total = len(ranked_items)
    return ContestRankingResponse(items=ranked_items[:limit], total=total)


@router.get(
    "/{contest_id}/ranking/{project_id}",
    response_model=ProjectRankingDetailResponse,
    summary="获取排行榜详情",
)
async def get_ranking_detail(
    contest_id: int,
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取排行榜详情"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )
    ensure_contest_visible(contest, current_user)

    project_result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(
            Project.id == project_id,
            Project.contest_id == contest_id,
            Project.status.in_({ProjectStatus.SUBMITTED.value, ProjectStatus.ONLINE.value}),
        )
    )
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品不存在")

    ranked_items = await build_project_ranking_items(db, contest_id)
    target_item = next((item for item in ranked_items if item.project_id == project_id), None)
    if target_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品未进入排行榜")

    return ProjectRankingDetailResponse(
        rank=target_item.rank,
        project_id=project.id,
        title=project.title,
        summary=project.summary,
        description=project.description,
        repo_url=project.repo_url,
        demo_url=project.demo_url,
        readme_url=project.readme_url,
        status=project.status_enum,
        user=target_item.user,
        stats=target_item.stats,
    )


@router.get(
    "/{contest_id}/interaction-leaderboard",
    response_model=ContestInteractionLeaderboardResponse,
    summary="获取互动排行榜",
)
async def get_interaction_leaderboard(
    contest_id: int,
    type: str = "like",
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取作品点赞/收藏排行榜"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )
    ensure_contest_visible(contest, current_user)

    if type not in {"like", "favorite"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type 仅支持 like 或 favorite")

    if limit < 1 or limit > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit 必须在 1-200 之间")

    if type == "like":
        model = ProjectLike
    else:
        model = ProjectFavorite

    stats_result = await db.execute(
        select(model.project_id.label("project_id"), func.count(model.id).label("count"))
        .join(Project, Project.id == model.project_id)
        .where(
            Project.contest_id == contest_id,
            Project.status == ProjectStatus.ONLINE.value,
        )
        .group_by(model.project_id)
    )
    stats_rows = stats_result.all()
    if not stats_rows:
        return ContestInteractionLeaderboardResponse(items=[], total=0, type=type)

    count_map = {row.project_id: int(row.count or 0) for row in stats_rows}
    project_ids = list(count_map.keys())

    project_result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(Project.id.in_(project_ids))
    )
    projects = project_result.scalars().all()
    project_map = {project.id: project for project in projects}

    entries = []
    for project_id, count in count_map.items():
        project = project_map.get(project_id)
        if not project:
            continue
        owner = UserBrief.model_validate(project.user) if project.user else None
        entries.append({
            "project": project,
            "owner": owner,
            "count": count,
        })

    entries.sort(key=lambda item: (item["count"], item["project"].id), reverse=True)
    ranked_items: list[ProjectInteractionLeaderboardItem] = []
    for rank, entry in enumerate(entries, 1):
        project = entry["project"]
        ranked_items.append(
            ProjectInteractionLeaderboardItem(
                rank=rank,
                project_id=project.id,
                title=project.title,
                status=project.status_enum,
                user=entry["owner"],
                count=entry["count"],
            )
        )

    total = len(ranked_items)
    return ContestInteractionLeaderboardResponse(
        items=ranked_items[:limit],
        total=total,
        type=type,
    )


@router.post(
    "/",
    response_model=ContestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建比赛（管理员）",
)
async def create_contest(
    payload: ContestCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建比赛"""
    require_admin(current_user)

    validate_contest_schedule(payload.model_dump())
    auto_phase_enabled = True if payload.auto_phase_enabled is None else payload.auto_phase_enabled
    visibility_value = (
        payload.visibility.value
        if payload.visibility
        else ContestVisibility.PUBLISHED.value
    )
    banner_url = ensure_local_media_url(payload.banner_url, "赛事 Banner")
    home_visible = bool(payload.home_visible) if payload.home_visible is not None else False

    if home_visible:
        await db.execute(update(Contest).values(home_visible=False))

    contest = Contest(
        title=payload.title,
        description=payload.description,
        phase=(payload.phase.value if payload.phase else ContestPhase.UPCOMING.value),
        visibility=visibility_value,
        home_visible=home_visible,
        banner_url=banner_url,
        rules_md=payload.rules_md,
        prizes_md=payload.prizes_md,
        review_rules_md=payload.review_rules_md,
        faq_md=payload.faq_md,
        template_config=payload.template_config,
        signup_start=payload.signup_start,
        signup_end=payload.signup_end,
        submit_start=payload.submit_start,
        submit_end=payload.submit_end,
        vote_start=payload.vote_start,
        vote_end=payload.vote_end,
        auto_phase_enabled=auto_phase_enabled,
    )
    db.add(contest)
    await db.commit()
    await db.refresh(contest)
    return ContestResponse.model_validate(contest)


@router.patch(
    "/{contest_id}",
    response_model=ContestResponse,
    summary="更新比赛（管理员）",
)
async def update_contest(
    contest_id: int,
    payload: ContestUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新比赛"""
    require_admin(current_user)

    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("home_visible") is True:
        await db.execute(
            update(Contest).where(Contest.id != contest_id).values(home_visible=False)
        )
    if "banner_url" in update_data:
        update_data["banner_url"] = ensure_local_media_url(update_data.get("banner_url"), "赛事 Banner")
    schedule = {
        "signup_start": update_data.get("signup_start", contest.signup_start),
        "signup_end": update_data.get("signup_end", contest.signup_end),
        "submit_start": update_data.get("submit_start", contest.submit_start),
        "submit_end": update_data.get("submit_end", contest.submit_end),
        "vote_start": update_data.get("vote_start", contest.vote_start),
        "vote_end": update_data.get("vote_end", contest.vote_end),
    }
    validate_contest_schedule(schedule)
    for field, value in update_data.items():
        if isinstance(value, ContestPhase):
            value = value.value
        if isinstance(value, ContestVisibility):
            value = value.value
        setattr(contest, field, value)

    await db.commit()
    await db.refresh(contest)
    return ContestResponse.model_validate(contest)


@router.post(
    "/{contest_id}/banner",
    response_model=ContestResponse,
    summary="上传赛事 Banner（管理员）",
)
@limiter.limit(RateLimits.UPLOAD)
async def upload_contest_banner(
    request: Request,
    contest_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传赛事 Banner"""
    require_admin(current_user)
    await guard_challenge(request, scope="upload", user_id=current_user.id)

    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")

    media = await save_upload_file(file, "contest-banners", MAX_BANNER_BYTES, owner_id=current_user.id)
    old_url = contest.banner_url
    contest.banner_url = media.url
    await db.commit()
    await db.refresh(contest)

    delete_media_file(old_url)
    return ContestResponse.model_validate(contest)


@router.put(
    "/{contest_id}/phase",
    response_model=ContestResponse,
    summary="更新比赛阶段（管理员）",
)
async def update_contest_phase(
    contest_id: int,
    payload: ContestPhaseUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新比赛阶段"""
    require_admin(current_user)

    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")

    contest.phase = payload.phase.value
    contest.auto_phase_enabled = False
    await db.commit()
    await db.refresh(contest)
    return ContestResponse.model_validate(contest)
