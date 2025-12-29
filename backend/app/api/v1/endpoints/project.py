"""
作品与部署提交相关 API
"""
from datetime import datetime, time
import logging
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status, Request, File, UploadFile
import httpx
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.endpoints.submission import require_approved_registration
from app.core.dependencies import get_current_user, get_optional_user
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.core.redis import close_redis, get_redis
from app.services.media_service import (
    delete_media_file,
    ensure_local_media_url,
    ensure_local_media_urls,
    save_upload_file,
)
from app.services.worker_queue import enqueue_worker_action
from app.services.security_challenge import guard_challenge
from app.models.contest import Contest, ContestPhase
from app.models.project import Project, ProjectStatus
from app.models.project_like import ProjectLike
from app.models.project_favorite import ProjectFavorite
from app.models.project_review_assignment import ProjectReviewAssignment
from app.models.project_submission import ProjectSubmission, ProjectSubmissionStatus
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User
from app.schemas.project import (
    ProjectAdminActionRequest,
    ProjectAccessResponse,
    ProjectCreate,
    ProjectInteractionResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectSubmissionCreate,
    ProjectSubmissionListResponse,
    ProjectSubmissionResponse,
    ProjectSubmissionStatusUpdate,
    ProjectUpdate,
    ProjectReviewAssignRequest,
    ProjectReviewerItem,
    ProjectReviewerListResponse,
)
from app.schemas.submission import UserBrief
from app.services.project_domain import build_project_domain

router = APIRouter()
logger = logging.getLogger(__name__)

# 图片大小限制（字节）
MAX_COVER_BYTES = 5 * 1024 * 1024
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024

ALLOWED_REGISTRIES = {"ghcr.io", "docker.io"}
ALLOWED_REPO_HOSTS = ("https://github.com/", "https://gitee.com/")
REPO_CHECK_TIMEOUT_SECONDS = 6.0


def require_admin(user: User) -> None:
    """检查管理员权限"""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")


async def get_contest_or_404(db: AsyncSession, contest_id: int) -> Contest:
    """获取比赛，不存在则抛出 404"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")
    return contest


async def get_project_or_404(db: AsyncSession, project_id: int) -> Project:
    """获取作品，不存在则抛出 404"""
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品不存在")
    return project


def ensure_owner(project: Project, user: User) -> None:
    """确保是作品所有者"""
    if project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限操作该作品")


def ensure_owner_or_admin(project: Project, user: Optional[User]) -> None:
    """确保是作品所有者或管理员"""
    if user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限访问该作品")
    if project.user_id == user.id or user.is_admin:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限访问该作品")


def check_project_phase(contest: Contest) -> None:
    """检查比赛是否允许创建/编辑作品"""
    if contest.phase not in {ContestPhase.SIGNUP.value, ContestPhase.SUBMISSION.value}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前比赛阶段不允许创建或编辑作品"
        )


def check_submission_phase(contest: Contest) -> None:
    """检查比赛是否处于作品提交阶段"""
    if contest.phase != ContestPhase.SUBMISSION.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前比赛不在提交阶段"
        )


def parse_image_ref(image_ref: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """解析镜像引用"""
    if "@sha256:" not in image_ref:
        return None, None, None
    ref, digest = image_ref.split("@", 1)
    parts = ref.split("/")
    if len(parts) < 2:
        return None, None, None
    registry = parts[0]
    repo = "/".join(parts[1:]) if len(parts) > 1 else None
    return registry, repo, digest


async def ensure_public_repo_url(repo_url: str) -> None:
    """校验仓库链接可访问性（GitHub/Gitee）"""
    url = repo_url.strip()
    if not url:
        return
    if not url.startswith(ALLOWED_REPO_HOSTS):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="仓库链接仅支持 GitHub 或 Gitee")

    headers = {"User-Agent": "ikun-repo-check/1.0"}
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=REPO_CHECK_TIMEOUT_SECONDS,
        ) as client:
            response = await client.head(url, headers=headers)
            if response.status_code >= 400:
                response = await client.get(url, headers=headers)
    except httpx.RequestError as exc:
        logger.warning("仓库链接访问失败: url=%s, error=%s", url, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仓库链接无法访问，请确认仓库为公开",
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="仓库链接无法访问，请确认仓库为公开",
        )


def append_status_history(
    submission: ProjectSubmission,
    status_value: str,
    now: datetime,
    message: Optional[str] = None,
    error_code: Optional[str] = None,
) -> None:
    """追加状态历史"""
    history = submission.status_history or []
    history.append({
        "status": status_value,
        "timestamp": now.isoformat(),
        "message": message,
        "error_code": error_code,
    })
    submission.status_history = history


def build_project_response(
    project: Project,
    interaction: Optional[dict] = None,
) -> ProjectResponse:
    """构建作品响应体"""
    response = ProjectResponse.model_validate(project)
    if project.user:
        response.owner = UserBrief.model_validate(project.user)
    if interaction:
        response.like_count = interaction.get("like_count", 0)
        response.favorite_count = interaction.get("favorite_count", 0)
        response.liked = bool(interaction.get("liked", False))
        response.favorited = bool(interaction.get("favorited", False))
    return response


async def build_project_interaction_map(
    db: AsyncSession,
    project_ids: list[int],
    user_id: Optional[int],
) -> dict[int, dict]:
    """批量构建作品互动信息"""
    if not project_ids:
        return {}

    like_result = await db.execute(
        select(ProjectLike.project_id, func.count(ProjectLike.id).label("count"))
        .where(ProjectLike.project_id.in_(project_ids))
        .group_by(ProjectLike.project_id)
    )
    like_counts = {row.project_id: int(row.count or 0) for row in like_result}

    favorite_result = await db.execute(
        select(ProjectFavorite.project_id, func.count(ProjectFavorite.id).label("count"))
        .where(ProjectFavorite.project_id.in_(project_ids))
        .group_by(ProjectFavorite.project_id)
    )
    favorite_counts = {row.project_id: int(row.count or 0) for row in favorite_result}

    liked_ids: set[int] = set()
    favorited_ids: set[int] = set()
    if user_id is not None:
        liked_result = await db.execute(
            select(ProjectLike.project_id).where(
                ProjectLike.project_id.in_(project_ids),
                ProjectLike.user_id == user_id,
            )
        )
        liked_ids = set(liked_result.scalars().all())

        favorited_result = await db.execute(
            select(ProjectFavorite.project_id).where(
                ProjectFavorite.project_id.in_(project_ids),
                ProjectFavorite.user_id == user_id,
            )
        )
        favorited_ids = set(favorited_result.scalars().all())

    interaction_map: dict[int, dict] = {}
    for project_id in project_ids:
        interaction_map[project_id] = {
            "like_count": like_counts.get(project_id, 0),
            "favorite_count": favorite_counts.get(project_id, 0),
            "liked": project_id in liked_ids,
            "favorited": project_id in favorited_ids,
        }
    return interaction_map


async def build_project_interaction_response(
    db: AsyncSession,
    project_id: int,
    user_id: Optional[int],
) -> ProjectInteractionResponse:
    """构建单个作品互动响应"""
    interaction_map = await build_project_interaction_map(db, [project_id], user_id)
    data = interaction_map.get(project_id, {
        "like_count": 0,
        "favorite_count": 0,
        "liked": False,
        "favorited": False,
    })
    return ProjectInteractionResponse(project_id=project_id, **data)


def build_project_reviewer_item(assignment: ProjectReviewAssignment) -> ProjectReviewerItem:
    """构建作品评审员信息"""
    item = ProjectReviewerItem.model_validate(assignment)
    if assignment.reviewer:
        item.reviewer = UserBrief.model_validate(assignment.reviewer)
    return item


async def get_project_review_assignments(
    db: AsyncSession,
    project_id: int,
) -> list[ProjectReviewAssignment]:
    """获取作品评审员分配记录"""
    result = await db.execute(
        select(ProjectReviewAssignment)
        .options(selectinload(ProjectReviewAssignment.reviewer))
        .where(ProjectReviewAssignment.project_id == project_id)
        .order_by(ProjectReviewAssignment.id.desc())
    )
    return result.scalars().all()


async def build_project_reviewer_list_response(
    db: AsyncSession,
    project_id: int,
) -> ProjectReviewerListResponse:
    """构建作品评审员列表响应"""
    assignments = await get_project_review_assignments(db, project_id)
    items = [build_project_reviewer_item(a) for a in assignments]
    return ProjectReviewerListResponse(items=items, total=len(items))


async def ensure_submission_rate_limit(
    db: AsyncSession,
    project_id: int,
    user_id: int,
    now: datetime,
) -> None:
    """检查提交限频"""
    cooldown_seconds = settings.PROJECT_SUBMISSION_COOLDOWN_SECONDS
    daily_limit = settings.PROJECT_SUBMISSION_DAILY_LIMIT

    last_result = await db.execute(
        select(ProjectSubmission)
        .where(
            ProjectSubmission.project_id == project_id,
            ProjectSubmission.user_id == user_id,
        )
        .order_by(ProjectSubmission.submitted_at.desc(), ProjectSubmission.id.desc())
        .limit(1)
    )
    last_submission = last_result.scalar_one_or_none()
    if last_submission and last_submission.submitted_at:
        delta = (now - last_submission.submitted_at).total_seconds()
        if delta < cooldown_seconds:
            retry_after = int(cooldown_seconds - delta)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"提交过于频繁，请在 {retry_after} 秒后重试"
            )

    day_start = datetime.combine(now.date(), time.min)
    count_result = await db.execute(
        select(func.count(ProjectSubmission.id))
        .where(
            ProjectSubmission.project_id == project_id,
            ProjectSubmission.user_id == user_id,
            ProjectSubmission.submitted_at >= day_start,
        )
    )
    daily_count = count_result.scalar() or 0
    if daily_count >= daily_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="今日提交次数已达上限"
        )


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建作品",
)
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建作品"""
    contest = await get_contest_or_404(db, payload.contest_id)
    check_project_phase(contest)

    if payload.repo_url:
        await ensure_public_repo_url(payload.repo_url)

    existing_result = await db.execute(
        select(Project).where(
            Project.contest_id == payload.contest_id,
            Project.user_id == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该比赛已存在作品，请使用更新接口"
        )

    cover_image_url = ensure_local_media_url(payload.cover_image_url, "封面图")
    screenshot_urls = ensure_local_media_urls(payload.screenshot_urls, "截图")
    project = Project(
        contest_id=payload.contest_id,
        user_id=current_user.id,
        title=payload.title,
        summary=payload.summary,
        description=payload.description,
        repo_url=payload.repo_url,
        cover_image_url=cover_image_url,
        screenshot_urls=screenshot_urls,
        readme_url=payload.readme_url,
        demo_url=payload.demo_url,
        status=ProjectStatus.DRAFT.value,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return build_project_response(project)


@router.get(
    "/projects",
    response_model=ProjectListResponse,
    summary="获取作品列表",
)
async def list_projects(
    contest_id: Optional[int] = Query(None, description="比赛ID（可选）"),
    mine: bool = Query(False, description="仅查看我的作品"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取作品列表"""
    query = select(Project).options(selectinload(Project.user))

    if contest_id is not None:
        query = query.where(Project.contest_id == contest_id)

    if mine:
        if current_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="请先登录")
        query = query.where(Project.user_id == current_user.id)
    else:
        is_admin = current_user is not None and current_user.is_admin
        if not is_admin:
            query = query.join(
                Registration,
                (Registration.contest_id == Project.contest_id)
                & (Registration.user_id == Project.user_id),
            )
            query = query.where(Registration.status != RegistrationStatus.WITHDRAWN.value)
            query = query.where(Project.status == ProjectStatus.ONLINE.value)

    query = query.order_by(Project.id.desc())
    result = await db.execute(query)
    projects = result.scalars().all()

    project_ids = [project.id for project in projects]
    interaction_map = await build_project_interaction_map(
        db,
        project_ids,
        current_user.id if current_user else None,
    )
    items = [build_project_response(p, interaction_map.get(p.id)) for p in projects]
    return ProjectListResponse(items=items, total=len(items))


@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="获取作品详情",
)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取作品详情"""
    project = await get_project_or_404(db, project_id)

    if project.status != ProjectStatus.ONLINE.value:
        ensure_owner_or_admin(project, current_user)

    interaction_map = await build_project_interaction_map(
        db,
        [project.id],
        current_user.id if current_user else None,
    )
    return build_project_response(project, interaction_map.get(project.id))


@router.post(
    "/projects/{project_id}/like",
    response_model=ProjectInteractionResponse,
    summary="点赞作品",
)
@limiter.limit(RateLimits.INTERACTION)
async def like_project(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """点赞作品"""
    project = await get_project_or_404(db, project_id)
    if project.status != ProjectStatus.ONLINE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="作品未上线，暂不支持点赞")
    if project.user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不能给自己的作品点赞")

    existing_result = await db.execute(
        select(ProjectLike).where(
            ProjectLike.project_id == project_id,
            ProjectLike.user_id == current_user.id,
        )
    )
    if existing_result.scalar_one_or_none():
        return await build_project_interaction_response(db, project_id, current_user.id)

    db.add(ProjectLike(project_id=project_id, user_id=current_user.id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()

    return await build_project_interaction_response(db, project_id, current_user.id)


@router.delete(
    "/projects/{project_id}/like",
    response_model=ProjectInteractionResponse,
    summary="取消点赞",
)
@limiter.limit(RateLimits.INTERACTION)
async def unlike_project(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消点赞"""
    project = await get_project_or_404(db, project_id)
    if project.status != ProjectStatus.ONLINE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="作品未上线，暂不支持点赞")

    result = await db.execute(
        select(ProjectLike).where(
            ProjectLike.project_id == project_id,
            ProjectLike.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        await db.delete(record)
        await db.commit()

    return await build_project_interaction_response(db, project_id, current_user.id)


@router.post(
    "/projects/{project_id}/favorite",
    response_model=ProjectInteractionResponse,
    summary="收藏作品",
)
@limiter.limit(RateLimits.INTERACTION)
async def favorite_project(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """收藏作品"""
    project = await get_project_or_404(db, project_id)
    if project.status != ProjectStatus.ONLINE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="作品未上线，暂不支持收藏")

    existing_result = await db.execute(
        select(ProjectFavorite).where(
            ProjectFavorite.project_id == project_id,
            ProjectFavorite.user_id == current_user.id,
        )
    )
    if existing_result.scalar_one_or_none():
        return await build_project_interaction_response(db, project_id, current_user.id)

    db.add(ProjectFavorite(project_id=project_id, user_id=current_user.id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()

    return await build_project_interaction_response(db, project_id, current_user.id)


@router.delete(
    "/projects/{project_id}/favorite",
    response_model=ProjectInteractionResponse,
    summary="取消收藏",
)
@limiter.limit(RateLimits.INTERACTION)
async def unfavorite_project(
    request: Request,
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消收藏"""
    project = await get_project_or_404(db, project_id)
    if project.status != ProjectStatus.ONLINE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="作品未上线，暂不支持收藏")

    result = await db.execute(
        select(ProjectFavorite).where(
            ProjectFavorite.project_id == project_id,
            ProjectFavorite.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        await db.delete(record)
        await db.commit()

    return await build_project_interaction_response(db, project_id, current_user.id)


@router.get(
    "/projects/{project_id}/access",
    response_model=ProjectAccessResponse,
    summary="获取作品访问入口",
)
async def get_project_access(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取作品访问入口信息"""
    project = await get_project_or_404(db, project_id)

    if project.status != ProjectStatus.ONLINE.value:
        ensure_owner_or_admin(project, current_user)

    submission_id = project.current_submission_id
    domain = None
    if submission_id:
        result = await db.execute(
            select(ProjectSubmission).where(ProjectSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()
        if submission and submission.domain:
            domain = submission.domain
        else:
            domain = build_project_domain(submission_id)

    message = "作品已上线" if project.status == ProjectStatus.ONLINE.value else "作品未上线"
    return ProjectAccessResponse(
        project_id=project.id,
        status=project.status_enum,
        submission_id=submission_id,
        domain=domain,
        message=message,
    )


@router.patch(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    summary="更新作品",
)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新作品信息"""
    project = await get_project_or_404(db, project_id)
    ensure_owner(project, current_user)

    update_data = payload.model_dump(exclude_unset=True)
    if "repo_url" in update_data and update_data["repo_url"]:
        await ensure_public_repo_url(update_data["repo_url"])
    if "cover_image_url" in update_data:
        update_data["cover_image_url"] = ensure_local_media_url(update_data.get("cover_image_url"), "封面图")
    if "screenshot_urls" in update_data:
        update_data["screenshot_urls"] = ensure_local_media_urls(update_data.get("screenshot_urls"), "截图")
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return build_project_response(project)


@router.post(
    "/projects/{project_id}/cover",
    response_model=ProjectResponse,
    summary="上传作品封面",
)
@limiter.limit(RateLimits.UPLOAD)
async def upload_project_cover(
    request: Request,
    project_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传作品封面"""
    project = await get_project_or_404(db, project_id)
    ensure_owner_or_admin(project, current_user)

    await guard_challenge(request, scope="upload", user_id=current_user.id)
    media = await save_upload_file(file, "project-covers", MAX_COVER_BYTES, owner_id=current_user.id)
    old_url = project.cover_image_url
    project.cover_image_url = media.url
    await db.commit()
    await db.refresh(project)

    delete_media_file(old_url)
    return build_project_response(project)


@router.delete(
    "/projects/{project_id}/cover",
    response_model=ProjectResponse,
    summary="删除作品封面",
)
async def delete_project_cover(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除作品封面"""
    project = await get_project_or_404(db, project_id)
    ensure_owner_or_admin(project, current_user)

    old_url = project.cover_image_url
    project.cover_image_url = None
    await db.commit()
    await db.refresh(project)

    delete_media_file(old_url)
    return build_project_response(project)


@router.post(
    "/projects/{project_id}/screenshots",
    response_model=ProjectResponse,
    summary="上传作品截图",
)
@limiter.limit(RateLimits.UPLOAD)
async def upload_project_screenshot(
    request: Request,
    project_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传作品截图"""
    project = await get_project_or_404(db, project_id)
    ensure_owner_or_admin(project, current_user)

    await guard_challenge(request, scope="upload", user_id=current_user.id)
    media = await save_upload_file(file, "project-screenshots", MAX_SCREENSHOT_BYTES, owner_id=current_user.id)
    urls = list(project.screenshot_urls or [])
    urls.append(media.url)
    project.screenshot_urls = urls
    await db.commit()
    await db.refresh(project)
    return build_project_response(project)


@router.delete(
    "/projects/{project_id}/screenshots",
    response_model=ProjectResponse,
    summary="删除作品截图",
)
async def delete_project_screenshot(
    project_id: int,
    url: str = Query(..., description="截图URL"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除作品截图"""
    project = await get_project_or_404(db, project_id)
    ensure_owner_or_admin(project, current_user)
    ensure_local_media_url(url, "截图")

    urls = list(project.screenshot_urls or [])
    if url not in urls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="截图不存在")
    project.screenshot_urls = [item for item in urls if item != url] or None
    await db.commit()
    await db.refresh(project)

    delete_media_file(url)
    return build_project_response(project)


@router.post(
    "/projects/{project_id}/submissions",
    response_model=ProjectSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="提交镜像",
)
async def create_project_submission(
    project_id: int,
    payload: ProjectSubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交镜像"""
    project = await get_project_or_404(db, project_id)
    ensure_owner(project, current_user)

    contest = await get_contest_or_404(db, project.contest_id)
    check_submission_phase(contest)
    await require_approved_registration(
        db,
        project.contest_id,
        current_user.id,
        message="报名未审核通过，无法提交部署",
    )

    registry, repo, digest = parse_image_ref(payload.image_ref)
    if not registry or registry not in ALLOWED_REGISTRIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="镜像仓库仅支持 ghcr.io 或 docker.io")
    if repo and repo.lower().endswith(":latest"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="镜像标签禁止使用 :latest")
    if not digest or not digest.startswith("sha256:") or len(digest) != 71:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="镜像 digest 格式不正确")

    now = datetime.utcnow()
    await ensure_submission_rate_limit(db, project_id, current_user.id, now)

    if payload.repo_url:
        await ensure_public_repo_url(payload.repo_url)
        project.repo_url = payload.repo_url

    submission = ProjectSubmission(
        project_id=project.id,
        contest_id=project.contest_id,
        user_id=current_user.id,
        image_ref=payload.image_ref,
        image_registry=registry,
        image_repo=repo,
        image_digest=digest,
        status=ProjectSubmissionStatus.CREATED.value,
        submitted_at=now,
        status_history=[{
            "status": ProjectSubmissionStatus.CREATED.value,
            "timestamp": now.isoformat(),
            "message": "已创建提交",
        }],
    )
    db.add(submission)
    await db.flush()

    queued = False
    redis_client = None
    try:
        redis_client = await get_redis()
        await redis_client.rpush(settings.WORKER_QUEUE_KEY, str(submission.id))
        queued = True
    except Exception as exc:
        logger.warning("提交入队失败: submission_id=%s, error=%s", submission.id, exc)
    finally:
        await close_redis(redis_client)

    if queued:
        submission.status = ProjectSubmissionStatus.QUEUED.value
        submission.status_message = "已进入队列"
        append_status_history(
            submission=submission,
            status_value=ProjectSubmissionStatus.QUEUED.value,
            now=now,
            message=submission.status_message,
        )

    if project.status in {ProjectStatus.DRAFT.value, ProjectStatus.OFFLINE.value}:
        project.status = ProjectStatus.SUBMITTED.value

    await db.commit()
    await db.refresh(submission)
    return ProjectSubmissionResponse.model_validate(submission)


@router.get(
    "/projects/{project_id}/submissions",
    response_model=ProjectSubmissionListResponse,
    summary="获取提交记录列表",
)
async def list_project_submissions(
    project_id: int,
    status_filter: Optional[str] = Query(None, description="按状态过滤"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取提交记录列表"""
    project = await get_project_or_404(db, project_id)
    ensure_owner_or_admin(project, current_user)

    query = select(ProjectSubmission).where(ProjectSubmission.project_id == project_id)
    if status_filter:
        query = query.where(ProjectSubmission.status == status_filter)
    query = query.order_by(ProjectSubmission.id.desc())

    result = await db.execute(query)
    items = result.scalars().all()
    return ProjectSubmissionListResponse(
        items=[ProjectSubmissionResponse.model_validate(x) for x in items],
        total=len(items),
    )


@router.get(
    "/projects/{project_id}/submissions/current",
    response_model=ProjectSubmissionResponse,
    summary="获取当前线上版本",
)
async def get_current_project_submission(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取当前线上版本"""
    project = await get_project_or_404(db, project_id)
    if project.status != ProjectStatus.ONLINE.value:
        ensure_owner_or_admin(project, current_user)

    if not project.current_submission_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="暂无线上版本")

    result = await db.execute(
        select(ProjectSubmission).where(ProjectSubmission.id == project.current_submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="线上版本不存在")
    return ProjectSubmissionResponse.model_validate(submission)


@router.get(
    "/project-submissions/{submission_id}",
    response_model=ProjectSubmissionResponse,
    summary="获取提交详情",
)
async def get_project_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取提交详情"""
    result = await db.execute(
        select(ProjectSubmission)
        .options(selectinload(ProjectSubmission.project))
        .where(ProjectSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")

    if submission.project:
        ensure_owner_or_admin(submission.project, current_user)

    return ProjectSubmissionResponse.model_validate(submission)


@router.patch(
    "/project-submissions/{submission_id}/status",
    response_model=ProjectSubmissionResponse,
    summary="更新提交状态（Worker）",
)
async def update_project_submission_status(
    submission_id: int,
    payload: ProjectSubmissionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    worker_token: Optional[str] = Header(None, alias="X-Worker-Token"),
):
    """状态回写接口"""
    if not settings.WORKER_API_TOKEN or worker_token != settings.WORKER_API_TOKEN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无效的 Worker Token")

    result = await db.execute(
        select(ProjectSubmission)
        .options(selectinload(ProjectSubmission.project))
        .where(ProjectSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")

    now = datetime.utcnow()
    submission.status = payload.status.value
    submission.status_message = payload.status_message
    submission.error_code = payload.error_code
    if payload.domain:
        submission.domain = payload.domain

    if payload.log_append:
        if submission.log:
            submission.log += f"\n{payload.log_append}"
        else:
            submission.log = payload.log_append

    append_status_history(
        submission=submission,
        status_value=payload.status.value,
        now=now,
        message=payload.status_message,
        error_code=payload.error_code,
    )

    if payload.status == ProjectSubmissionStatus.ONLINE:
        submission.online_at = now
        if submission.project:
            submission.project.current_submission_id = submission.id
            submission.project.status = ProjectStatus.ONLINE.value
    elif payload.status == ProjectSubmissionStatus.FAILED:
        submission.failed_at = now
        if submission.project and submission.project.current_submission_id == submission.id:
            submission.project.status = ProjectStatus.OFFLINE.value
    elif payload.status == ProjectSubmissionStatus.STOPPED:
        submission.failed_at = None
        if submission.project and submission.project.current_submission_id == submission.id:
            submission.project.status = ProjectStatus.OFFLINE.value

    await db.commit()
    await db.refresh(submission)
    return ProjectSubmissionResponse.model_validate(submission)


@router.get(
    "/admin/projects/{project_id}/reviewers",
    response_model=ProjectReviewerListResponse,
    summary="管理员获取作品评审员",
)
async def admin_list_project_reviewers(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员获取作品评审员"""
    require_admin(current_user)
    await get_project_or_404(db, project_id)
    return await build_project_reviewer_list_response(db, project_id)


@router.post(
    "/admin/projects/{project_id}/reviewers",
    response_model=ProjectReviewerListResponse,
    summary="管理员分配评委",
)
async def admin_assign_project_reviewers(
    project_id: int,
    payload: ProjectReviewAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员分配评委"""
    require_admin(current_user)
    project = await get_project_or_404(db, project_id)

    reviewer_ids = list(dict.fromkeys(payload.reviewer_ids))
    if not reviewer_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="评审员列表不能为空")

    if project.user_id in reviewer_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="作品作者不能被分配为评审员",
        )

    user_result = await db.execute(select(User).where(User.id.in_(reviewer_ids)))
    users = user_result.scalars().all()
    user_map = {user.id: user for user in users}
    missing_ids = [reviewer_id for reviewer_id in reviewer_ids if reviewer_id not in user_map]
    if missing_ids:
        missing_text = ", ".join(str(item) for item in missing_ids)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"评审员不存在: {missing_text}")

    invalid_role_ids = [user.id for user in users if not user.is_reviewer]
    if invalid_role_ids:
        invalid_text = ", ".join(str(item) for item in invalid_role_ids)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"用户不是评审员: {invalid_text}",
        )

    registration_result = await db.execute(
        select(Registration.user_id)
        .where(
            Registration.contest_id == project.contest_id,
            Registration.user_id.in_(reviewer_ids),
            Registration.status != RegistrationStatus.WITHDRAWN.value,
        )
    )
    conflict_ids = registration_result.scalars().all()
    if conflict_ids:
        conflict_text = ", ".join(str(item) for item in conflict_ids)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"已报名参赛，不能分配为评审员: {conflict_text}",
        )

    existing_result = await db.execute(
        select(ProjectReviewAssignment.reviewer_id).where(
            ProjectReviewAssignment.project_id == project_id,
            ProjectReviewAssignment.reviewer_id.in_(reviewer_ids),
        )
    )
    existing_ids = set(existing_result.scalars().all())
    for reviewer_id in reviewer_ids:
        if reviewer_id in existing_ids:
            continue
        db.add(ProjectReviewAssignment(project_id=project_id, reviewer_id=reviewer_id))

    await db.commit()
    return await build_project_reviewer_list_response(db, project_id)


@router.delete(
    "/admin/projects/{project_id}/reviewers/{reviewer_id}",
    response_model=ProjectReviewerListResponse,
    summary="管理员移除评委",
)
async def admin_remove_project_reviewer(
    project_id: int,
    reviewer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员移除评委"""
    require_admin(current_user)
    await get_project_or_404(db, project_id)

    result = await db.execute(
        select(ProjectReviewAssignment).where(
            ProjectReviewAssignment.project_id == project_id,
            ProjectReviewAssignment.reviewer_id == reviewer_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审分配不存在")

    await db.delete(assignment)
    await db.commit()
    return await build_project_reviewer_list_response(db, project_id)


@router.post(
    "/admin/projects/{project_id}/offline",
    response_model=ProjectResponse,
    summary="管理员下架作品",
)
async def admin_offline_project(
    project_id: int,
    payload: ProjectAdminActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员下架作品"""
    require_admin(current_user)
    project = await get_project_or_404(db, project_id)

    now = datetime.utcnow()
    if project.current_submission_id:
        result = await db.execute(
            select(ProjectSubmission).where(ProjectSubmission.id == project.current_submission_id)
        )
        submission = result.scalar_one_or_none()
        if submission:
            await enqueue_worker_action("stop", submission.id)
            submission.status = ProjectSubmissionStatus.STOPPED.value
            submission.status_message = payload.message or "管理员下架"
            submission.error_code = "admin_offline"
            submission.failed_at = None
            append_status_history(
                submission=submission,
                status_value=ProjectSubmissionStatus.STOPPED.value,
                now=now,
                message=submission.status_message,
                error_code=submission.error_code,
            )

    project.status = ProjectStatus.OFFLINE.value
    await db.commit()
    await db.refresh(project)
    return build_project_response(project)


@router.post(
    "/admin/project-submissions/{submission_id}/redeploy",
    response_model=ProjectSubmissionResponse,
    summary="管理员触发重部署",
)
async def admin_redeploy_submission(
    submission_id: int,
    payload: ProjectAdminActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员触发重部署"""
    require_admin(current_user)

    result = await db.execute(
        select(ProjectSubmission)
        .options(selectinload(ProjectSubmission.project))
        .where(ProjectSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")

    await enqueue_worker_action("deploy", submission.id)

    now = datetime.utcnow()
    submission.status = ProjectSubmissionStatus.QUEUED.value
    submission.status_message = payload.message or "管理员触发重部署"
    submission.error_code = None
    submission.failed_at = None
    submission.online_at = None
    append_status_history(
        submission=submission,
        status_value=ProjectSubmissionStatus.QUEUED.value,
        now=now,
        message=submission.status_message,
    )

    if submission.project:
        submission.project.status = ProjectStatus.SUBMITTED.value

    await db.commit()
    await db.refresh(submission)
    return ProjectSubmissionResponse.model_validate(submission)


@router.post(
    "/admin/project-submissions/{submission_id}/stop",
    response_model=ProjectSubmissionResponse,
    summary="管理员强制停止运行",
)
async def admin_stop_submission(
    submission_id: int,
    payload: ProjectAdminActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员强制停止运行"""
    require_admin(current_user)

    result = await db.execute(
        select(ProjectSubmission)
        .options(selectinload(ProjectSubmission.project))
        .where(ProjectSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")

    await enqueue_worker_action("stop", submission.id)

    now = datetime.utcnow()
    submission.status = ProjectSubmissionStatus.STOPPED.value
    submission.status_message = payload.message or "管理员强制停止运行"
    submission.error_code = "admin_stop"
    submission.failed_at = None
    append_status_history(
        submission=submission,
        status_value=ProjectSubmissionStatus.STOPPED.value,
        now=now,
        message=submission.status_message,
        error_code=submission.error_code,
    )

    if submission.project and submission.project.current_submission_id == submission.id:
        submission.project.status = ProjectStatus.OFFLINE.value

    await db.commit()
    await db.refresh(submission)
    return ProjectSubmissionResponse.model_validate(submission)


@router.get(
    "/admin/project-submissions/{submission_id}/logs",
    summary="管理员查看提交日志",
)
async def admin_get_submission_logs(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员查看提交日志"""
    require_admin(current_user)

    result = await db.execute(
        select(ProjectSubmission).where(ProjectSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提交记录不存在")

    return {
        "id": submission.id,
        "status": submission.status,
        "status_message": submission.status_message,
        "error_code": submission.error_code,
        "log": submission.log or "",
        "updated_at": submission.updated_at,
    }
