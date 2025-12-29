"""
用户相关 API
"""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status, File, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_dep, get_current_user_optional
from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.models.user import User
from app.schemas.user import UserResponse, UserPublicResponse, UserUpdateRequest
from app.services.media_service import AVATAR_MAX_BYTES, delete_media_file, save_upload_file
from app.services.security_challenge import guard_challenge

router = APIRouter()

# 有效角色列表
VALID_ROLES = ["admin", "reviewer", "contestant", "spectator"]
# 用户自选角色白名单（只能选这两个）
SELECTABLE_ROLES = ["contestant", "spectator"]



@router.get("/me", response_model=UserResponse, summary="获取当前用户信息")
async def get_current_user(
    current_user: User = Depends(get_current_user_dep),
):
    """获取当前登录用户的完整信息，包含角色"""
    return UserResponse.model_validate(current_user)


@router.post("/me/avatar", response_model=UserResponse, summary="上传头像")
@limiter.limit(RateLimits.UPLOAD)
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """上传头像"""
    await guard_challenge(request, scope="upload", user_id=current_user.id)
    media = await save_upload_file(file, "avatars", AVATAR_MAX_BYTES, owner_id=current_user.id)
    old_url = current_user.avatar_url
    current_user.avatar_url = media.url
    await db.commit()
    await db.refresh(current_user)
    delete_media_file(old_url)
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse, summary="更新当前用户信息")
async def update_current_user(
    payload: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """更新当前用户信息"""
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未提供更新字段",
        )

    if "username" in update_data:
        new_username = update_data.get("username")
        if new_username and new_username != current_user.username:
            result = await db.execute(
                select(User).where(User.username == new_username, User.id != current_user.id)
            )
            exists = result.scalar_one_or_none()
            if exists:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="用户名已被使用",
                )
            current_user.username = new_username

    if "email" in update_data:
        new_email = update_data.get("email")
        if isinstance(new_email, str):
            new_email = new_email.strip().lower()
        if new_email != current_user.email:
            if new_email:
                result = await db.execute(
                    select(User).where(User.email == new_email, User.id != current_user.id)
                )
                exists = result.scalar_one_or_none()
                if exists:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="邮箱已被使用",
                    )
            current_user.email = new_email

    if "display_name" in update_data:
        display_name = update_data.get("display_name")
        if isinstance(display_name, str):
            display_name = display_name.strip()
        current_user.display_name = display_name or None

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/{user_id}", response_model=UserPublicResponse, summary="获取指定用户信息")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户信息"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )
    return UserPublicResponse.model_validate(user)


class RoleSwitchRequest(BaseModel):
    """角色切换请求"""
    role: str


@router.post("/me/switch-role", response_model=UserResponse, summary="切换用户角色（管理员专属）")
async def switch_role(
    request: RoleSwitchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    切换当前用户的角色（管理员专属功能）

    - **role**: 目标角色 (admin, reviewer, contestant, spectator)

    只有数据库中 original_role 为 admin 的用户可以使用此功能。
    首次切换时会自动记录原始角色。
    """
    # 获取用户的原始角色（如果未设置，则使用当前角色）
    original_role = current_user.original_role or current_user.role

    # 只有原始角色是管理员的用户才能使用此功能
    if original_role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="角色切换功能仅管理员可用"
        )

    # 验证角色值
    if request.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的角色值，可选值: {', '.join(VALID_ROLES)}"
        )

    # 如果原始角色未设置，先记录
    if current_user.original_role is None:
        current_user.original_role = current_user.role

    # 更新用户角色
    current_user.role = request.role
    await db.commit()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)


class RoleSelectRequest(BaseModel):
    """角色选择请求（新用户引导页专用）"""
    role: Literal["contestant", "spectator"]


@router.post("/me/select-role", response_model=UserResponse, summary="选择用户角色（新用户引导）")
async def select_role(
    request: RoleSelectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    新用户角色选择（引导页使用）

    - **role**: 目标角色，只能选择 contestant（参赛者）或 spectator（吃瓜群众）

    业务规则：
    1. admin/reviewer 用户不能使用此接口（由后台分配）
    2. 已选择过角色的用户不能重复选择
    3. 参赛者不能反悔改成吃瓜群众
    """
    # 获取用户的真实身份（优先检查 original_role，防止管理员切换角色后绕过限制）
    real_role = current_user.original_role or current_user.role

    # 管理员和评审员不能通过此接口改角色
    if real_role in ('admin', 'reviewer'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理员和评审员角色由系统分配，不能自行修改"
        )

    # 已经选过角色的用户不能重复选择（幂等：相同角色允许）
    if current_user.role_selected and current_user.role != request.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="你已经选择过角色，不能重复修改"
        )

    # 参赛者不能反悔改成吃瓜群众
    if current_user.role == 'contestant' and request.role == 'spectator':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="参赛者不能改为吃瓜群众，你已经踏上征途了！"
        )

    # 更新角色和选择状态
    current_user.role = request.role
    current_user.role_selected = True
    current_user.role_selected_at = datetime.utcnow()

    await db.commit()
    await db.refresh(current_user)

    return UserResponse.model_validate(current_user)
