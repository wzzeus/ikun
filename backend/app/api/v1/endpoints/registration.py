"""
报名相关 API 端点

提供用户报名参赛的完整功能，包括：
- 创建报名
- 查看自己的报名信息
- 更新报名信息
- 撤回报名
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user, get_optional_user
from app.core.database import get_db
from app.models.contest import Contest, ContestPhase
from app.models.project import Project, ProjectStatus
from app.models.project_submission import ProjectSubmission, ProjectSubmissionStatus
from app.models.registration import Registration, RegistrationStatus
from app.models.user import User, UserRole
from app.schemas.registration import (
    RegistrationCreate,
    RegistrationResponse,
    RegistrationUpdate,
)
from app.services.worker_queue import enqueue_worker_action

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# 辅助函数
# ============================================================================

async def get_contest_or_404(db: AsyncSession, contest_id: int) -> Contest:
    """获取比赛，不存在则抛出 404"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    return contest


async def get_user_registration(
    db: AsyncSession,
    contest_id: int,
    user_id: int,
    load_user: bool = True,
) -> Optional[Registration]:
    """获取用户在指定比赛的报名记录"""
    query = select(Registration).where(
        Registration.contest_id == contest_id,
        Registration.user_id == user_id,
    )

    if load_user:
        query = query.options(selectinload(Registration.user))

    result = await db.execute(query)
    return result.scalar_one_or_none()


def check_signup_phase(contest: Contest) -> None:
    """检查比赛是否处于报名阶段"""
    if contest.phase != ContestPhase.SIGNUP.value:
        phase_messages = {
            ContestPhase.UPCOMING.value: "比赛尚未开始报名",
            ContestPhase.SUBMISSION.value: "报名已截止，当前为作品提交阶段",
            ContestPhase.VOTING.value: "报名已截止，当前为投票阶段",
            ContestPhase.ENDED.value: "比赛已结束",
        }
        message = phase_messages.get(contest.phase, "当前比赛不在报名阶段")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


# ============================================================================
# API 端点
# ============================================================================

@router.post(
    "/contests/{contest_id}/registrations",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建报名",
    description="为当前登录用户创建比赛报名。每个用户在每个比赛只能报名一次。",
)
async def create_registration(
    contest_id: int,
    payload: RegistrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建报名"""
    # 验证比赛存在且处于报名阶段
    contest = await get_contest_or_404(db, contest_id)
    check_signup_phase(contest)

    # 检查是否已报名
    existing = await get_user_registration(db, contest_id, current_user.id)

    now = datetime.utcnow()

    if existing is not None:
        # 如果已撤回，允许重新报名（复用记录）
        if existing.status == RegistrationStatus.WITHDRAWN.value:
            existing.title = payload.title
            existing.summary = payload.summary
            existing.description = payload.description
            existing.plan = payload.plan
            existing.tech_stack = payload.tech_stack
            existing.repo_url = payload.repo_url
            existing.api_key = payload.api_key
            existing.contact_email = str(payload.contact_email)
            existing.contact_wechat = payload.contact_wechat
            existing.contact_phone = payload.contact_phone
            existing.status = RegistrationStatus.SUBMITTED.value
            existing.submitted_at = now

            # 注意：角色升级在审核通过时进行，不在报名提交时

            await db.commit()

            # 重新加载以确保 user 关系已加载
            result = await db.execute(
                select(Registration)
                .options(selectinload(Registration.user))
                .where(Registration.id == existing.id)
            )
            existing = result.scalar_one()
            return RegistrationResponse.model_validate(existing)
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="你已报名该比赛，如需修改请使用更新接口"
            )

    # 创建新报名
    registration = Registration(
        contest_id=contest_id,
        user_id=current_user.id,
        title=payload.title,
        summary=payload.summary,
        description=payload.description,
        plan=payload.plan,
        tech_stack=payload.tech_stack,
        repo_url=payload.repo_url,
        api_key=payload.api_key,
        contact_email=str(payload.contact_email),
        contact_wechat=payload.contact_wechat,
        contact_phone=payload.contact_phone,
        status=RegistrationStatus.SUBMITTED.value,
        submitted_at=now,
    )

    db.add(registration)

    # 注意：角色升级在审核通过时进行，不在报名提交时

    try:
        await db.commit()
        await db.refresh(registration)
    except IntegrityError:
        # 并发情况下唯一约束冲突，返回 409
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="你已报名该比赛（并发冲突），请刷新页面后重试"
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"创建报名失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报名失败，请稍后重试"
        ) from e

    # 重新加载以获取用户关系
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration.id)
    )
    registration = result.scalar_one()

    return RegistrationResponse.model_validate(registration)


@router.get(
    "/contests/{contest_id}/registrations/me",
    response_model=RegistrationResponse,
    summary="获取我的报名",
    description="获取当前登录用户在指定比赛的报名信息。",
)
async def get_my_registration(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的报名信息"""
    await get_contest_or_404(db, contest_id)

    registration = await get_user_registration(db, contest_id, current_user.id)

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="你还没有报名该比赛"
        )

    if registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="你已撤回报名"
        )

    return RegistrationResponse.model_validate(registration)


@router.put(
    "/contests/{contest_id}/registrations/me",
    response_model=RegistrationResponse,
    summary="更新我的报名",
    description="更新当前登录用户的报名信息。仅在报名阶段且报名未被审核通过时可修改。",
)
async def update_my_registration(
    contest_id: int,
    payload: RegistrationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新当前用户的报名信息"""
    contest = await get_contest_or_404(db, contest_id)
    registration = await get_user_registration(db, contest_id, current_user.id)

    if registration is None or registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到报名记录"
        )

    # 已审核通过的报名不能修改
    if registration.status == RegistrationStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="报名已通过审核，无法修改"
        )

    # 检查是否在报名阶段
    check_signup_phase(contest)

    # 更新字段（仅更新提供的字段）
    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "contact_email" and value is not None:
            value = str(value)
        setattr(registration, field, value)

    await db.commit()

    # 重新加载以获取最新数据和用户关系
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration.id)
    )
    registration = result.scalar_one()

    return RegistrationResponse.model_validate(registration)


@router.delete(
    "/contests/{contest_id}/registrations/me",
    response_model=RegistrationResponse,
    summary="撤回报名/退赛",
    description="报名期内可撤回报名；报名期结束且已审核通过时视为退赛（状态变为 withdrawn）。",
)
async def withdraw_my_registration(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """撤回报名（软删除）"""
    contest = await get_contest_or_404(db, contest_id)

    registration = await get_user_registration(db, contest_id, current_user.id)

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到报名记录"
        )

    if registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="报名已撤回"
        )

    is_retired = (
        contest.phase != ContestPhase.SIGNUP.value
        and registration.status == RegistrationStatus.APPROVED.value
    )
    status_message = "已退赛，已下线" if is_retired else "报名已撤回，已下线"

    project_result = await db.execute(
        select(Project).where(
            Project.contest_id == contest_id,
            Project.user_id == current_user.id,
        )
    )
    project = project_result.scalar_one_or_none()
    if project is not None:
        if project.current_submission_id:
            submission_result = await db.execute(
                select(ProjectSubmission).where(
                    ProjectSubmission.id == project.current_submission_id
                )
            )
            submission = submission_result.scalar_one_or_none()
            if submission is not None:
                await enqueue_worker_action("stop", submission.id)
                submission.status = ProjectSubmissionStatus.STOPPED.value
                submission.status_message = status_message
                submission.error_code = "registration_withdrawn"
                submission.failed_at = None

        project.status = ProjectStatus.OFFLINE.value

    registration.status = RegistrationStatus.WITHDRAWN.value
    await db.commit()

    # 重新加载以获取最新数据
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration.id)
    )
    registration = result.scalar_one()

    return RegistrationResponse.model_validate(registration)


@router.get(
    "/contests/{contest_id}/registrations/check",
    summary="检查报名状态",
    description="检查当前用户是否已报名指定比赛。无需登录也可调用，未登录返回未报名。",
)
async def check_registration_status(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """检查当前用户的报名状态"""
    await get_contest_or_404(db, contest_id)

    if current_user is None:
        return {
            "registered": False,
            "status": None,
            "message": "请先登录"
        }

    registration = await get_user_registration(
        db, contest_id, current_user.id, load_user=False
    )

    if registration is None or registration.status == RegistrationStatus.WITHDRAWN.value:
        return {
            "registered": False,
            "status": None,
            "message": "未报名"
        }

    return {
        "registered": True,
        "status": registration.status,
        "registration_id": registration.id,
        "message": "已报名"
    }


@router.get(
    "/contests/{contest_id}/registrations/public",
    summary="获取公开的参赛选手列表",
    description="获取指定比赛已通过审核或已提交的报名列表（公开展示）。",
)
async def list_public_registrations(
    contest_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取公开的参赛选手列表"""
    await get_contest_or_404(db, contest_id)

    # 查询已提交或已通过的报名
    query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.contest_id == contest_id,
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value
            ])
        )
        .order_by(Registration.submitted_at.desc())
    )

    result = await db.execute(query)
    registrations = result.scalars().all()

    # 构建公开响应（隐藏敏感信息）
    items = []
    for reg in registrations:
        items.append({
            "id": reg.id,
            "title": reg.title,
            "summary": reg.summary,
            "description": reg.description,
            "plan": reg.plan,
            "tech_stack": reg.tech_stack,
            "repo_url": reg.repo_url,
            "status": reg.status,
            "submitted_at": reg.submitted_at,
            "created_at": reg.created_at,
            "user": {
                "id": reg.user.id,
                "username": reg.user.username,
                "display_name": reg.user.display_name,
                "avatar_url": reg.user.avatar_url,
                "trust_level": reg.user.trust_level,
            } if reg.user else None
        })

    return {
        "items": items,
        "total": len(items)
    }


# ============================================================================
# 管理员审核接口
# ============================================================================

async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """要求管理员权限"""
    if current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user


@router.get(
    "/contests/{contest_id}/registrations/all",
    summary="获取所有报名列表（管理员）",
    description="管理员获取指定比赛的所有报名记录，包含待审核、已通过、已拒绝等状态。",
)
async def list_all_registrations(
    contest_id: int,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """获取所有报名列表（管理员专用）"""
    await get_contest_or_404(db, contest_id)

    # 构建查询
    query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.contest_id == contest_id)
    )

    # 状态过滤
    if status_filter:
        query = query.where(Registration.status == status_filter)

    query = query.order_by(Registration.submitted_at.desc())

    result = await db.execute(query)
    registrations = result.scalars().all()

    # 构建响应
    items = []
    for reg in registrations:
        items.append({
            "id": reg.id,
            "title": reg.title,
            "summary": reg.summary,
            "description": reg.description,
            "plan": reg.plan,
            "tech_stack": reg.tech_stack,
            "repo_url": reg.repo_url,
            "api_key": reg.api_key,
            "contact_email": reg.contact_email,
            "contact_wechat": reg.contact_wechat,
            "contact_phone": reg.contact_phone,
            "status": reg.status,
            "submitted_at": reg.submitted_at,
            "created_at": reg.created_at,
            "updated_at": reg.updated_at,
            "user": {
                "id": reg.user.id,
                "username": reg.user.username,
                "display_name": reg.user.display_name,
                "avatar_url": reg.user.avatar_url,
                "role": reg.user.role,
                "trust_level": reg.user.trust_level,
            } if reg.user else None
        })

    return {
        "items": items,
        "total": len(items)
    }


@router.post(
    "/contests/{contest_id}/registrations/{registration_id}/approve",
    response_model=RegistrationResponse,
    summary="审核通过报名",
    description="管理员审核通过报名，用户角色将升级为参赛者。",
)
async def approve_registration(
    contest_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """审核通过报名"""
    await get_contest_or_404(db, contest_id)

    # 查询报名记录
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.id == registration_id,
            Registration.contest_id == contest_id,
        )
    )
    registration = result.scalar_one_or_none()

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报名记录不存在"
        )

    if registration.status == RegistrationStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该报名已审核通过"
        )

    if registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该报名已撤回，无法审核"
        )

    # 更新报名状态
    registration.status = RegistrationStatus.APPROVED.value

    # 升级用户为参赛者（仅当当前为观众时，不覆盖管理员）
    user = registration.user
    if user and user.role == UserRole.SPECTATOR.value:
        user.role = UserRole.CONTESTANT.value

    await db.commit()

    # 重新加载
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration.id)
    )
    registration = result.scalar_one()

    logger.info(f"管理员 {admin.username} 审核通过报名 #{registration_id}")
    return RegistrationResponse.model_validate(registration)


@router.post(
    "/contests/{contest_id}/registrations/{registration_id}/reject",
    response_model=RegistrationResponse,
    summary="拒绝报名",
    description="管理员拒绝报名申请。",
)
async def reject_registration(
    contest_id: int,
    registration_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """拒绝报名"""
    await get_contest_or_404(db, contest_id)

    # 查询报名记录
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.id == registration_id,
            Registration.contest_id == contest_id,
        )
    )
    registration = result.scalar_one_or_none()

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报名记录不存在"
        )

    if registration.status == RegistrationStatus.REJECTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该报名已被拒绝"
        )

    if registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该报名已撤回，无法审核"
        )

    # 更新报名状态
    registration.status = RegistrationStatus.REJECTED.value

    await db.commit()

    # 重新加载
    result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration.id)
    )
    registration = result.scalar_one()

    logger.info(f"管理员 {admin.username} 拒绝报名 #{registration_id}")
    return RegistrationResponse.model_validate(registration)
