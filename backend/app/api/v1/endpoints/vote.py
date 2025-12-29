"""
投票相关 API
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.models.contest import Contest, ContestPhase
from app.models.registration import Registration, RegistrationStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.task import TaskType
from app.models.user import User
from app.models.vote import Vote
from app.services.log_service import log_vote
from app.services.task_service import TaskService

router = APIRouter()


class VoteActionResponse(BaseModel):
    """投票动作响应"""
    submission_id: int
    vote_count: int
    voted: bool


class MyVoteItem(BaseModel):
    """我的投票记录条目"""
    submission_id: int
    contest_id: int
    title: str
    voted_at: datetime


class MyVoteListResponse(BaseModel):
    """我的投票记录响应"""
    items: list[MyVoteItem]
    total: int


async def get_contest_or_404(db: AsyncSession, contest_id: int) -> Contest:
    """获取比赛，不存在则抛出 404"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在",
        )
    return contest


async def get_submission_or_404(db: AsyncSession, submission_id: int) -> Submission:
    """获取作品，不存在则抛出 404"""
    result = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = result.scalar_one_or_none()
    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品不存在",
        )
    return submission


def ensure_voting_phase(contest: Contest) -> None:
    """确保比赛处于投票阶段"""
    if contest.phase != ContestPhase.VOTING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前比赛不在投票阶段",
        )


async def refresh_submission_vote_count(db: AsyncSession, submission: Submission) -> None:
    """刷新作品票数"""
    count_result = await db.execute(
        select(func.count(Vote.id)).where(Vote.submission_id == submission.id)
    )
    submission.vote_count = int(count_result.scalar() or 0)


@router.post(
    "/{submission_id}",
    response_model=VoteActionResponse,
    summary="为作品投票",
)
@limiter.limit(RateLimits.VOTE)
async def vote_submission(
    request: Request,
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """为作品投票"""
    submission = await get_submission_or_404(db, submission_id)
    if submission.status != SubmissionStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="作品未通过审核，暂不可投票",
        )

    registration = None
    if submission.registration_id:
        result = await db.execute(
            select(Registration).where(Registration.id == submission.registration_id)
        )
        registration = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(Registration).where(
                Registration.contest_id == submission.contest_id,
                Registration.user_id == submission.user_id,
            )
        )
        registration = result.scalar_one_or_none()

    if registration is not None and registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="作品已撤回报名，暂不可投票",
        )

    contest = await get_contest_or_404(db, submission.contest_id)
    ensure_voting_phase(contest)

    if submission.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能给自己的作品投票",
        )

    existing_result = await db.execute(
        select(Vote).where(
            Vote.user_id == current_user.id,
            Vote.submission_id == submission.id,
        )
    )
    existing_vote = existing_result.scalar_one_or_none()
    if existing_vote:
        await refresh_submission_vote_count(db, submission)
        await db.commit()
        return VoteActionResponse(
            submission_id=submission.id,
            vote_count=submission.vote_count,
            voted=True,
        )

    vote = Vote(user_id=current_user.id, submission_id=submission.id)
    db.add(vote)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        submission = await get_submission_or_404(db, submission_id)
        await refresh_submission_vote_count(db, submission)
        await db.commit()
        return VoteActionResponse(
            submission_id=submission.id,
            vote_count=submission.vote_count,
            voted=True,
        )

    await refresh_submission_vote_count(db, submission)
    await log_vote(db, current_user.id, submission.title, request=request)
    await TaskService.record_event(
        db=db,
        user_id=current_user.id,
        task_type=TaskType.VOTE,
        delta=1,
        event_key=f"vote:{vote.id}",
        ref_type="vote",
        ref_id=vote.id,
        auto_claim=True,
    )

    await db.commit()
    await db.refresh(submission)
    return VoteActionResponse(
        submission_id=submission.id,
        vote_count=submission.vote_count,
        voted=True,
    )


@router.delete(
    "/{submission_id}",
    response_model=VoteActionResponse,
    summary="取消投票",
)
@limiter.limit(RateLimits.VOTE)
async def cancel_vote(
    request: Request,
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消投票"""
    submission = await get_submission_or_404(db, submission_id)
    contest = await get_contest_or_404(db, submission.contest_id)
    ensure_voting_phase(contest)

    existing_result = await db.execute(
        select(Vote).where(
            Vote.user_id == current_user.id,
            Vote.submission_id == submission.id,
        )
    )
    existing_vote = existing_result.scalar_one_or_none()
    if existing_vote is None:
        await refresh_submission_vote_count(db, submission)
        await db.commit()
        return VoteActionResponse(
            submission_id=submission.id,
            vote_count=submission.vote_count,
            voted=False,
        )

    await db.delete(existing_vote)
    await db.flush()
    await refresh_submission_vote_count(db, submission)
    await db.commit()
    await db.refresh(submission)
    return VoteActionResponse(
        submission_id=submission.id,
        vote_count=submission.vote_count,
        voted=False,
    )


@router.get(
    "/my",
    response_model=MyVoteListResponse,
    summary="获取我的投票记录",
)
async def get_my_votes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取我的投票记录"""
    result = await db.execute(
        select(Vote)
        .options(selectinload(Vote.submission))
        .where(Vote.user_id == current_user.id)
        .order_by(Vote.created_at.desc())
    )
    votes = result.scalars().all()

    items = []
    for vote in votes:
        submission = vote.submission
        if not submission:
            continue
        items.append(
            MyVoteItem(
                submission_id=submission.id,
                contest_id=submission.contest_id,
                title=submission.title,
                voted_at=vote.created_at,
            )
        )

    return MyVoteListResponse(items=items, total=len(items))


@router.get("/leaderboard")
async def get_heat_leaderboard(
    contest_id: int = Query(1, description="比赛ID"),
    limit: int = Query(50, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取热力榜 - 按用户打赏消耗的积分（热力值）排行，展示最热心的吃瓜群众"""
    from app.models.registration import Registration, RegistrationStatus
    from app.models.cheer import Cheer, CheerType

    # 道具分数配置
    ITEM_POINTS = {
        CheerType.CHEER: 1,
        CheerType.COFFEE: 2,
        CheerType.ENERGY: 3,
        CheerType.PIZZA: 4,
        CheerType.STAR: 5,
    }

    # 获取比赛的所有报名ID
    reg_query = select(Registration.id).where(
        Registration.contest_id == contest_id,
        Registration.status.in_([
            RegistrationStatus.SUBMITTED.value,
            RegistrationStatus.APPROVED.value,
        ])
    )
    reg_result = await db.execute(reg_query)
    registration_ids = [r for r in reg_result.scalars().all()]

    if not registration_ids:
        return {"items": [], "total": 0}

    # 统计每个用户的打气次数（按类型分组）
    stats_query = (
        select(
            Cheer.user_id,
            Cheer.cheer_type,
            func.count(Cheer.id).label("count")
        )
        .where(Cheer.registration_id.in_(registration_ids))
        .group_by(Cheer.user_id, Cheer.cheer_type)
    )
    stats_result = await db.execute(stats_query)
    raw_stats = stats_result.all()

    # 汇总每个用户的热力值
    user_stats = {}
    for user_id, cheer_type, count in raw_stats:
        if user_id not in user_stats:
            user_stats[user_id] = {
                "cheer": 0, "coffee": 0, "energy": 0, "pizza": 0, "star": 0,
                "total_count": 0,  # 总打气次数
                "heat_value": 0,   # 总热力值（积分）
            }
        type_key = cheer_type.value
        user_stats[user_id][type_key] = count
        user_stats[user_id]["total_count"] += count
        user_stats[user_id]["heat_value"] += count * ITEM_POINTS.get(cheer_type, 1)

    if not user_stats:
        return {"items": [], "total": 0}

    # 按热力值排序
    sorted_users = sorted(user_stats.items(), key=lambda x: x[1]["heat_value"], reverse=True)[:limit]

    # 获取用户详情
    user_ids = [u[0] for u in sorted_users]
    user_query = select(User).where(User.id.in_(user_ids))
    user_result = await db.execute(user_query)
    user_map = {u.id: u for u in user_result.scalars().all()}

    items = []
    for rank, (user_id, stats) in enumerate(sorted_users, 1):
        user = user_map.get(user_id)
        if user:
            items.append({
                "rank": rank,
                "user_id": user_id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "heat_value": stats["heat_value"],
                "total_count": stats["total_count"],
                "stats": {
                    "cheer": stats["cheer"],
                    "coffee": stats["coffee"],
                    "energy": stats["energy"],
                    "pizza": stats["pizza"],
                    "star": stats["star"],
                },
            })

    return {"items": items, "total": len(items)}
