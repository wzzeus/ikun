"""
作品评审中心 API
"""
import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.core.database import get_db
from app.models.project import Project
from app.models.project_review import ProjectReview
from app.models.project_review_assignment import ProjectReviewAssignment
from app.models.project_submission import ProjectSubmission
from app.models.user import User
from app.schemas.project import ProjectReviewItem, ProjectReviewListResponse
from app.schemas.review_center import (
    MyReviewResponse,
    ReviewScoreRequest,
    ReviewStatsResponse,
    ReviewerStatsResponse,
)
from app.schemas.submission import UserBrief
from app.services.project_domain import build_project_domain

router = APIRouter()
logger = logging.getLogger(__name__)


async def require_reviewer(
    current_user: User = Depends(get_current_user),
) -> User:
    """要求评审员权限"""
    if not current_user.is_reviewer and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要评审员权限",
        )
    return current_user


def build_empty_stats() -> ReviewStatsResponse:
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
        return build_empty_stats()

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


@router.get(
    "/stats",
    response_model=ReviewerStatsResponse,
    summary="评审员统计",
)
async def get_reviewer_stats(
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """获取评审员统计"""
    total_result = await db.execute(
        select(func.count(ProjectReviewAssignment.id)).where(
            ProjectReviewAssignment.reviewer_id == reviewer.id
        )
    )
    total = total_result.scalar() or 0

    review_result = await db.execute(
        select(
            func.count(ProjectReview.id).label("count"),
            func.avg(ProjectReview.score).label("avg"),
        ).where(ProjectReview.reviewer_id == reviewer.id)
    )
    row = review_result.one()
    reviewed_count = row.count or 0
    avg_score = Decimal(str(row.avg)).quantize(Decimal("0.01")) if row.avg is not None else None

    return ReviewerStatsResponse(
        total_submissions=total,
        reviewed_count=reviewed_count,
        pending_count=max(total - reviewed_count, 0),
        avg_score_given=avg_score,
    )


async def get_review_stats_map(
    db: AsyncSession,
    project_ids: list[int],
) -> dict[int, ReviewStatsResponse]:
    """批量获取作品评分统计"""
    if not project_ids:
        return {}

    result = await db.execute(
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

    stats_map: dict[int, ReviewStatsResponse] = {}
    for row in result:
        stats_map[row.project_id] = build_review_stats(
            review_count=row.count or 0,
            total_score=row.sum,
            avg_score=row.avg,
            min_score=row.min,
            max_score=row.max,
        )
    return stats_map


async def get_my_review_map(
    db: AsyncSession,
    reviewer_id: int,
    project_ids: list[int],
) -> dict[int, MyReviewResponse]:
    """批量获取我的评分"""
    if not project_ids:
        return {}

    result = await db.execute(
        select(ProjectReview).where(
            ProjectReview.project_id.in_(project_ids),
            ProjectReview.reviewer_id == reviewer_id,
        )
    )
    reviews = result.scalars().all()
    return {review.project_id: MyReviewResponse.model_validate(review) for review in reviews}


async def get_assignment_or_403(
    db: AsyncSession,
    project_id: int,
    reviewer_id: int,
) -> ProjectReviewAssignment:
    """确保评审员已被分配"""
    result = await db.execute(
        select(ProjectReviewAssignment)
        .options(
            selectinload(ProjectReviewAssignment.project).selectinload(Project.user)
        )
        .where(
            ProjectReviewAssignment.project_id == project_id,
            ProjectReviewAssignment.reviewer_id == reviewer_id,
        )
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="未分配该作品评审权限",
        )
    return assignment


async def resolve_submission_domains(
    db: AsyncSession,
    projects: list[Project],
) -> dict[int, Optional[str]]:
    """批量解析作品访问域名"""
    submission_ids = [
        project.current_submission_id
        for project in projects
        if project.current_submission_id
    ]
    if not submission_ids:
        return {}

    result = await db.execute(
        select(ProjectSubmission).where(ProjectSubmission.id.in_(submission_ids))
    )
    submissions = result.scalars().all()
    submission_map = {submission.id: submission for submission in submissions}

    domain_map: dict[int, Optional[str]] = {}
    for project in projects:
        submission_id = project.current_submission_id
        if not submission_id:
            domain_map[project.id] = None
            continue
        submission = submission_map.get(submission_id)
        if submission and submission.domain:
            domain_map[project.id] = submission.domain
        else:
            domain_map[project.id] = build_project_domain(submission_id)
    return domain_map


def build_project_review_item(
    project: Project,
    domain: Optional[str],
    my_review: Optional[MyReviewResponse],
    stats: ReviewStatsResponse,
) -> ProjectReviewItem:
    """构建评审中心作品信息"""
    owner = UserBrief.model_validate(project.user) if project.user else None
    return ProjectReviewItem(
        id=project.id,
        title=project.title,
        summary=project.summary,
        description=project.description,
        repo_url=project.repo_url,
        demo_url=project.demo_url,
        readme_url=project.readme_url,
        status=project.status_enum,
        current_submission_id=project.current_submission_id,
        domain=domain,
        created_at=project.created_at,
        owner=owner,
        my_review=my_review,
        stats=stats,
    )


async def build_project_review_detail(
    db: AsyncSession,
    reviewer: User,
    project: Project,
) -> ProjectReviewItem:
    """构建评审中心作品详情"""
    stats_map = await get_review_stats_map(db, [project.id])
    my_review_map = await get_my_review_map(db, reviewer.id, [project.id])
    domain_map = await resolve_submission_domains(db, [project])
    return build_project_review_item(
        project=project,
        domain=domain_map.get(project.id),
        my_review=my_review_map.get(project.id),
        stats=stats_map.get(project.id, build_empty_stats()),
    )


@router.get(
    "/projects",
    response_model=ProjectReviewListResponse,
    summary="评审中心作品列表",
)
async def list_projects_for_review(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    scored: Optional[str] = Query(None, description="评分状态过滤: yes/no"),
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """获取评审员待评作品列表"""
    filters = [ProjectReviewAssignment.reviewer_id == reviewer.id]
    if scored:
        if scored not in {"yes", "no"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="评分状态仅支持 yes/no",
            )
        reviewed_subquery = select(ProjectReview.project_id).where(
            ProjectReview.reviewer_id == reviewer.id
        )
        if scored == "yes":
            filters.append(ProjectReviewAssignment.project_id.in_(reviewed_subquery))
        else:
            filters.append(ProjectReviewAssignment.project_id.notin_(reviewed_subquery))

    total_result = await db.execute(
        select(func.count(ProjectReviewAssignment.id)).where(
            *filters
        )
    )
    total = total_result.scalar() or 0
    offset = (page - 1) * page_size

    assignment_result = await db.execute(
        select(ProjectReviewAssignment)
        .options(
            selectinload(ProjectReviewAssignment.project).selectinload(Project.user)
        )
        .where(*filters)
        .order_by(ProjectReviewAssignment.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    assignments = assignment_result.scalars().all()
    projects = [assignment.project for assignment in assignments if assignment.project]
    if not projects:
        return ProjectReviewListResponse(items=[], total=total, page=page, page_size=page_size)

    project_ids = [project.id for project in projects]
    stats_map = await get_review_stats_map(db, project_ids)
    my_review_map = await get_my_review_map(db, reviewer.id, project_ids)
    domain_map = await resolve_submission_domains(db, projects)

    items = []
    for project in projects:
        items.append(
            build_project_review_item(
                project=project,
                domain=domain_map.get(project.id),
                my_review=my_review_map.get(project.id),
                stats=stats_map.get(project.id, build_empty_stats()),
            )
        )

    return ProjectReviewListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/projects/{project_id}",
    response_model=ProjectReviewItem,
    summary="评审中心作品详情",
)
async def get_project_for_review(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """获取评审中心作品详情"""
    assignment = await get_assignment_or_403(db, project_id, reviewer.id)
    if assignment.project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品不存在")
    return await build_project_review_detail(db, reviewer, assignment.project)


@router.post(
    "/projects/{project_id}/score",
    response_model=ProjectReviewItem,
    summary="提交作品评分",
)
async def submit_project_review(
    project_id: int,
    payload: ReviewScoreRequest,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """提交或更新作品评分"""
    assignment = await get_assignment_or_403(db, project_id, reviewer.id)
    if assignment.project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品不存在")

    result = await db.execute(
        select(ProjectReview).where(
            ProjectReview.project_id == project_id,
            ProjectReview.reviewer_id == reviewer.id,
        )
    )
    existing_review = result.scalar_one_or_none()
    if existing_review:
        existing_review.score = payload.score
        existing_review.comment = payload.comment
        logger.info("评审员 %s 更新作品 #%s 评分: %s", reviewer.username, project_id, payload.score)
    else:
        db.add(
            ProjectReview(
                project_id=project_id,
                reviewer_id=reviewer.id,
                score=payload.score,
                comment=payload.comment,
            )
        )
        logger.info("评审员 %s 对作品 #%s 评分: %s", reviewer.username, project_id, payload.score)

    await db.commit()
    await db.refresh(assignment.project)
    return await build_project_review_detail(db, reviewer, assignment.project)


@router.delete(
    "/projects/{project_id}/score",
    response_model=ProjectReviewItem,
    summary="删除作品评分",
)
async def delete_project_review(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """删除作品评分"""
    assignment = await get_assignment_or_403(db, project_id, reviewer.id)
    if assignment.project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品不存在")

    result = await db.execute(
        select(ProjectReview).where(
            ProjectReview.project_id == project_id,
            ProjectReview.reviewer_id == reviewer.id,
        )
    )
    existing_review = result.scalar_one_or_none()
    if existing_review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评分不存在")

    await db.delete(existing_review)
    await db.commit()
    await db.refresh(assignment.project)
    return await build_project_review_detail(db, reviewer, assignment.project)
