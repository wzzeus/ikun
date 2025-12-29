"""
评审中心 API 端点

提供评审员专属的评分功能：
- 查看所有已提交的作品列表
- 对作品进行评分（1-100分）
- 查看/修改自己的评分
- 查看评分统计

评分规则：
- 每个评审员对每个作品只能有一条评分记录
- 评分范围：1-100分
- 最终成绩：去掉最高分和最低分后取平均（不足3个评分时直接平均）
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_review import SubmissionReview
from app.models.user import User
from app.schemas.review_center import (
    ContestantInfo,
    MyReviewResponse,
    ReviewDetailItem,
    ReviewerStatsResponse,
    ReviewScoreRequest,
    ReviewStatsResponse,
    SubmissionDetailForReview,
    SubmissionForReview,
    SubmissionListForReviewResponse,
    SubmissionReviewsResponse,
)

# 复用 submission.py 中的认证依赖
from app.core.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# 认证依赖
# ============================================================================

async def require_reviewer(
    current_user: User = Depends(get_current_user),
) -> User:
    """要求评审员权限"""
    if not current_user.is_reviewer and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要评审员权限"
        )
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """要求管理员权限"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user


# ============================================================================
# 辅助函数
# ============================================================================

async def calculate_review_stats(
    db: AsyncSession,
    submission_id: int,
) -> ReviewStatsResponse:
    """
    计算作品的评分统计

    规则：
    - n >= 3: final_score = (SUM - MAX - MIN) / (n - 2)
    - n < 3: final_score = AVG (直接平均)
    """
    result = await db.execute(
        select(
            func.count(SubmissionReview.id).label("count"),
            func.sum(SubmissionReview.score).label("sum"),
            func.avg(SubmissionReview.score).label("avg"),
            func.min(SubmissionReview.score).label("min"),
            func.max(SubmissionReview.score).label("max"),
        ).where(SubmissionReview.submission_id == submission_id)
    )
    row = result.one()

    review_count = row.count or 0
    if review_count == 0:
        return ReviewStatsResponse(
            review_count=0,
            final_score=None,
            avg_score=None,
            min_score=None,
            max_score=None,
        )

    avg_score = Decimal(str(row.avg)).quantize(Decimal("0.01")) if row.avg is not None else None
    min_score = row.min
    max_score = row.max

    # 计算最终分
    if review_count >= 3:
        # 去掉最高最低后平均
        final_score = Decimal(str(row.sum - row.max - row.min)) / Decimal(review_count - 2)
        final_score = final_score.quantize(Decimal("0.01"))
    else:
        # 不足3个，直接平均
        final_score = avg_score

    return ReviewStatsResponse(
        review_count=review_count,
        final_score=final_score,
        avg_score=avg_score,
        min_score=min_score,
        max_score=max_score,
    )


async def update_submission_score_cache(
    db: AsyncSession,
    submission_id: int,
) -> None:
    """更新作品的评分缓存字段"""
    stats = await calculate_review_stats(db, submission_id)

    await db.execute(
        Submission.__table__.update()
        .where(Submission.id == submission_id)
        .values(
            final_score=stats.final_score,
            review_count=stats.review_count,
            score_updated_at=datetime.utcnow(),
        )
    )


async def get_my_review(
    db: AsyncSession,
    submission_id: int,
    reviewer_id: int,
) -> Optional[SubmissionReview]:
    """获取当前评审员对指定作品的评分"""
    result = await db.execute(
        select(SubmissionReview).where(
            SubmissionReview.submission_id == submission_id,
            SubmissionReview.reviewer_id == reviewer_id,
        )
    )
    return result.scalar_one_or_none()


# ============================================================================
# 评审员统计
# ============================================================================

@router.get(
    "/stats",
    response_model=ReviewerStatsResponse,
    summary="获取评审员工作统计",
    description="获取当前评审员的评审工作统计数据",
)
async def get_reviewer_stats(
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """获取评审员工作统计"""
    # 获取所有已提交作品总数
    total_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.status == SubmissionStatus.SUBMITTED.value
        )
    )
    total_submissions = total_result.scalar() or 0

    # 获取我已评分的数量
    reviewed_result = await db.execute(
        select(func.count(SubmissionReview.id)).where(
            SubmissionReview.reviewer_id == reviewer.id
        )
    )
    reviewed_count = reviewed_result.scalar() or 0

    # 获取我给出的平均分
    avg_result = await db.execute(
        select(func.avg(SubmissionReview.score)).where(
            SubmissionReview.reviewer_id == reviewer.id
        )
    )
    avg_score = avg_result.scalar()
    avg_score_given = Decimal(str(avg_score)).quantize(Decimal("0.01")) if avg_score else None

    return ReviewerStatsResponse(
        total_submissions=total_submissions,
        reviewed_count=reviewed_count,
        pending_count=max(0, total_submissions - reviewed_count),
        avg_score_given=avg_score_given,
    )


# ============================================================================
# 作品列表
# ============================================================================

@router.get(
    "/submissions",
    response_model=SubmissionListForReviewResponse,
    summary="获取待评审作品列表",
    description="获取所有已提交的作品列表，支持筛选和分页",
)
async def list_submissions_for_review(
    scored: Optional[str] = Query(
        None,
        description="筛选：all=全部, yes=已评分, no=未评分"
    ),
    search: Optional[str] = Query(None, description="搜索关键词（作品标题）"),
    sort: Optional[str] = Query(
        "submitted_at",
        description="排序：submitted_at(提交时间), final_score(最终分)"
    ),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """获取待评审作品列表"""
    # 基础查询：只查询已提交的作品
    query = (
        select(Submission)
        .options(selectinload(Submission.user))
        .where(Submission.status == SubmissionStatus.SUBMITTED.value)
    )

    # 搜索过滤
    if search:
        query = query.where(Submission.title.ilike(f"%{search}%"))

    # 获取我的所有评分记录（用于筛选和展示）
    my_reviews_result = await db.execute(
        select(SubmissionReview).where(
            SubmissionReview.reviewer_id == reviewer.id
        )
    )
    my_reviews = {r.submission_id: r for r in my_reviews_result.scalars().all()}

    # 排序 (MySQL 不支持 NULLS LAST，使用 CASE WHEN 模拟)
    if sort == "final_score":
        # NULL 值排在最后：先按是否为NULL排序(0=有值在前, 1=NULL在后)，再按值降序
        query = query.order_by(
            Submission.final_score.is_(None).asc(),
            Submission.final_score.desc(),
            Submission.id.desc()
        )
    else:
        query = query.order_by(
            Submission.submitted_at.is_(None).asc(),
            Submission.submitted_at.desc(),
            Submission.id.desc()
        )

    # 执行查询获取所有符合条件的作品
    result = await db.execute(query)
    all_submissions = result.scalars().all()

    # 根据 scored 参数筛选
    if scored == "yes":
        filtered_submissions = [s for s in all_submissions if s.id in my_reviews]
    elif scored == "no":
        filtered_submissions = [s for s in all_submissions if s.id not in my_reviews]
    else:
        filtered_submissions = list(all_submissions)

    total = len(filtered_submissions)

    # 分页
    start = (page - 1) * page_size
    end = start + page_size
    page_submissions = filtered_submissions[start:end]

    # 构建响应
    items = []
    for sub in page_submissions:
        # 获取评分统计
        stats = await calculate_review_stats(db, sub.id)

        # 构建参赛者信息
        contestant = None
        if sub.user:
            contestant = ContestantInfo(
                id=sub.user.id,
                username=sub.user.username,
                display_name=sub.user.display_name,
                avatar_url=sub.user.avatar_url,
            )

        # 我的评分
        my_review = None
        if sub.id in my_reviews:
            r = my_reviews[sub.id]
            my_review = MyReviewResponse(
                score=r.score,
                comment=r.comment,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )

        items.append(SubmissionForReview(
            id=sub.id,
            title=sub.title,
            description=sub.description,
            repo_url=sub.repo_url,
            demo_url=sub.demo_url,
            submitted_at=sub.submitted_at,
            created_at=sub.created_at,
            contestant=contestant,
            my_review=my_review,
            stats=stats,
        ))

    return SubmissionListForReviewResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# 作品详情
# ============================================================================

@router.get(
    "/submissions/{submission_id}",
    response_model=SubmissionDetailForReview,
    summary="获取作品详情",
    description="获取作品详情（用于评审）",
)
async def get_submission_for_review(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """获取作品详情"""
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.user))
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品不存在"
        )

    if submission.status != SubmissionStatus.SUBMITTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该作品不在评审状态"
        )

    # 获取评分统计
    stats = await calculate_review_stats(db, submission.id)

    # 获取我的评分
    my_review_obj = await get_my_review(db, submission.id, reviewer.id)
    my_review = None
    if my_review_obj:
        my_review = MyReviewResponse(
            score=my_review_obj.score,
            comment=my_review_obj.comment,
            created_at=my_review_obj.created_at,
            updated_at=my_review_obj.updated_at,
        )

    # 构建参赛者信息
    contestant = None
    if submission.user:
        contestant = ContestantInfo(
            id=submission.user.id,
            username=submission.user.username,
            display_name=submission.user.display_name,
            avatar_url=submission.user.avatar_url,
        )

    return SubmissionDetailForReview(
        id=submission.id,
        title=submission.title,
        description=submission.description,
        repo_url=submission.repo_url,
        demo_url=submission.demo_url,
        video_url=submission.video_url,
        project_doc_md=submission.project_doc_md,
        submitted_at=submission.submitted_at,
        created_at=submission.created_at,
        contestant=contestant,
        my_review=my_review,
        stats=stats,
    )


# ============================================================================
# 评分操作
# ============================================================================

@router.put(
    "/submissions/{submission_id}/review",
    response_model=SubmissionDetailForReview,
    summary="提交/更新评分",
    description="提交或更新对作品的评分（幂等操作）",
)
async def submit_or_update_review(
    submission_id: int,
    payload: ReviewScoreRequest,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """提交或更新评分"""
    # 验证作品存在且状态正确
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.user))
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品不存在"
        )

    if submission.status != SubmissionStatus.SUBMITTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该作品不在评审状态"
        )

    # 查找现有评分记录
    existing_review = await get_my_review(db, submission_id, reviewer.id)

    if existing_review:
        # 更新现有评分
        existing_review.score = payload.score
        existing_review.comment = payload.comment
        logger.info(
            f"评审员 {reviewer.username} 更新作品 #{submission_id} 评分: {payload.score}"
        )
    else:
        # 创建新评分
        new_review = SubmissionReview(
            submission_id=submission_id,
            reviewer_id=reviewer.id,
            score=payload.score,
            comment=payload.comment,
        )
        db.add(new_review)
        logger.info(
            f"评审员 {reviewer.username} 对作品 #{submission_id} 评分: {payload.score}"
        )

    # 更新缓存
    await update_submission_score_cache(db, submission_id)

    await db.commit()

    # 返回更新后的详情
    return await get_submission_for_review(submission_id, db, reviewer)


@router.delete(
    "/submissions/{submission_id}/review",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除我的评分",
    description="删除当前评审员对作品的评分",
)
async def delete_my_review(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_reviewer),
):
    """删除我的评分"""
    # 验证作品状态
    sub_result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = sub_result.scalar_one_or_none()

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品不存在"
        )

    if submission.status != SubmissionStatus.SUBMITTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该作品不在评审状态，无法修改评分"
        )

    existing_review = await get_my_review(db, submission_id, reviewer.id)

    if existing_review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到评分记录"
        )

    await db.delete(existing_review)

    # 更新缓存
    await update_submission_score_cache(db, submission_id)

    await db.commit()

    logger.info(
        f"评审员 {reviewer.username} 删除作品 #{submission_id} 的评分"
    )

    return None


# ============================================================================
# 管理员接口
# ============================================================================

@router.get(
    "/admin/submissions/{submission_id}/reviews",
    response_model=SubmissionReviewsResponse,
    summary="查看作品所有评分明细（管理员）",
    description="管理员查看某作品的所有评审员评分明细",
)
async def get_submission_reviews_admin(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """管理员查看作品所有评分明细"""
    # 验证作品存在
    sub_result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = sub_result.scalar_one_or_none()

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品不存在"
        )

    # 获取所有评分
    reviews_result = await db.execute(
        select(SubmissionReview)
        .options(selectinload(SubmissionReview.reviewer))
        .where(SubmissionReview.submission_id == submission_id)
        .order_by(SubmissionReview.created_at.desc())
    )
    reviews = reviews_result.scalars().all()

    # 获取统计
    stats = await calculate_review_stats(db, submission_id)

    # 构建响应
    review_items = []
    for r in reviews:
        reviewer_info = ContestantInfo(
            id=r.reviewer.id,
            username=r.reviewer.username,
            display_name=r.reviewer.display_name,
            avatar_url=r.reviewer.avatar_url,
        )
        review_items.append(ReviewDetailItem(
            id=r.id,
            score=r.score,
            comment=r.comment,
            created_at=r.created_at,
            updated_at=r.updated_at,
            reviewer=reviewer_info,
        ))

    return SubmissionReviewsResponse(
        submission_id=submission_id,
        reviews=review_items,
        stats=stats,
    )
