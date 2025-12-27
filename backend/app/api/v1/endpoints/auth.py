"""
认证相关 API
"""
import base64
import hashlib
import hmac
import json
import re
import logging
from datetime import datetime, timedelta
from secrets import token_urlsafe
from typing import Optional
from urllib.parse import urlencode, quote

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy import select, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.core.security import create_access_token, decode_token, get_password_hash, verify_password
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas.user import UserResponse
from app.api.v1.endpoints.user import get_current_user_dep
from app.services.email_service import send_email, EmailServiceError
from app.services.security_challenge import guard_challenge
from app.services.user_merge_service import merge_users
from app.services.linux_do_oauth import (
    LinuxDoOAuthError,
    exchange_code_for_token,
    fetch_linuxdo_userinfo,
    normalize_avatar_url,
)
from app.services.github_oauth import (
    GitHubOAuthError,
    exchange_code_for_token as github_exchange_code,
    fetch_github_userinfo,
    fetch_github_emails,
    get_primary_email,
)
from app.services.media_service import AVATAR_MAX_BYTES, download_image_to_media, is_local_media_url
from app.services.points_service import PointsService
from app.models.points import PointsReason
from app.services.log_service import log_login, log_register

# 新用户注册奖励积分
REGISTER_BONUS_POINTS = 500

router = APIRouter()
logger = logging.getLogger(__name__)


def _sanitize_next_path(next_path: Optional[str]) -> str:
    """
    校验并清理 next_path 参数，防止参数注入攻击

    规则：
    1. 必须是相对路径（以 / 开头）
    2. 不能包含 & # ? 等可能导致参数注入的字符
    3. 不能是外部 URL（防止开放重定向）
    """
    if not next_path:
        return ""

    # 只允许以 / 开头的相对路径
    if not next_path.startswith("/"):
        return ""

    # 禁止包含可能导致参数注入的特殊字符
    if re.search(r'[&#?]', next_path):
        return ""

    # 禁止协议前缀（防止 //evil.com 这种相对协议 URL）
    if next_path.startswith("//"):
        return ""

    # 返回 URL 编码后的路径
    return quote(next_path, safe="/")


def _validate_password_value(value: str) -> str:
    """校验密码格式"""
    if re.search(r"\s", value):
        raise ValueError("密码不能包含空白字符")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("密码长度过长")
    return value


def _hash_reset_token(token: str) -> str:
    """生成重置令牌哈希"""
    secret = (settings.SECRET_KEY or "").encode("utf-8")
    return hmac.new(secret, token.encode("utf-8"), hashlib.sha256).hexdigest()


def _build_password_reset_link(token: str) -> str:
    """构建前端重置链接"""
    frontend = settings.FRONTEND_URL.rstrip("/")
    return f"{frontend}/reset-password?token={token}"


def _b64url_json(data: dict) -> str:
    """将字典编码为 base64url JSON"""
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


async def _generate_unique_username(
    db: AsyncSession,
    base_username: str,
    linux_do_id: str,
    max_len: int = 50,
) -> str:
    """
    生成唯一用户名

    如果 base_username 已被占用，则添加 linux_do_id 后缀
    """
    base_username = (base_username or "").strip()
    if not base_username:
        base_username = f"linuxdo_{linux_do_id}"

    candidate = base_username[:max_len]
    result = await db.execute(select(User).where(User.username == candidate))
    existing = result.scalar_one_or_none()

    if existing is None or existing.linux_do_id == linux_do_id:
        return candidate

    # 用户名已被占用，添加后缀
    suffix = f"_{linux_do_id}"
    candidate = (base_username[: max_len - len(suffix)] + suffix)[:max_len]
    return candidate


async def _upsert_linuxdo_user(db: AsyncSession, userinfo: dict) -> User:
    """
    创建或更新 Linux.do 用户

    Args:
        db: 数据库会话
        userinfo: Linux.do 返回的用户信息

    Returns:
        用户对象
    """
    linux_do_id = str(userinfo.get("id"))
    if not linux_do_id or linux_do_id == "None":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Linux.do 用户信息缺少 id",
        )

    # 查找现有用户
    result = await db.execute(select(User).where(User.linux_do_id == linux_do_id))
    user = result.scalar_one_or_none()

    # 解析用户信息
    linux_username = (userinfo.get("username") or "").strip()
    display_name = (userinfo.get("name") or "").strip() or None
    avatar_template = userinfo.get("avatar_template") or None
    download_url = normalize_avatar_url(avatar_template)
    avatar_url = None
    if download_url and (user is None or not is_local_media_url(user.avatar_url)):
        try:
            media = await download_image_to_media(download_url, "avatars", AVATAR_MAX_BYTES)
            avatar_url = media.url if media else None
        except HTTPException as exc:
            logger.warning("Linux.do 头像下载失败: %s", getattr(exc, "detail", exc))
    active = bool(userinfo.get("active", True))
    trust_level = userinfo.get("trust_level")
    silenced = bool(userinfo.get("silenced", False))

    is_new_user = False
    if user is None:
        # 创建新用户
        is_new_user = True
        username = await _generate_unique_username(db, linux_username, linux_do_id)
        user = User(
            email=None,
            username=username,
            hashed_password=None,
            linux_do_id=linux_do_id,
            linux_do_username=linux_username or None,
            display_name=display_name,
            linux_do_avatar_template=avatar_template,
            avatar_url=avatar_url,
            is_active=active,
            trust_level=int(trust_level) if trust_level is not None else None,
            is_silenced=silenced,
        )
        db.add(user)
    else:
        # 更新现有用户
        user.linux_do_username = linux_username or user.linux_do_username
        user.display_name = display_name or user.display_name
        user.linux_do_avatar_template = avatar_template or user.linux_do_avatar_template
        user.avatar_url = avatar_url or user.avatar_url
        user.is_active = active
        user.trust_level = int(trust_level) if trust_level is not None else user.trust_level
        user.is_silenced = silenced

        # 如果 Linux.do 用户名变更，同步更新
        if linux_username and user.username != linux_username:
            user.username = await _generate_unique_username(db, linux_username, linux_do_id)

    await db.commit()
    await db.refresh(user)

    # 新用户赠送注册奖励积分
    if is_new_user and REGISTER_BONUS_POINTS > 0:
        await PointsService.add_points(
            db=db,
            user_id=user.id,
            amount=REGISTER_BONUS_POINTS,
            reason=PointsReason.REGISTER_BONUS,
            ref_type="register",
            ref_id=user.id,
            description=f"新用户注册奖励 {REGISTER_BONUS_POINTS} 积分",
        )

    return user


async def _apply_linuxdo_profile(target_user: User, userinfo: dict) -> str:
    """绑定时更新 Linux.do 用户信息"""
    linux_do_id = str(userinfo.get("id"))
    if not linux_do_id or linux_do_id == "None":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Linux.do 用户信息缺少 id",
        )

    linux_username = (userinfo.get("username") or "").strip()
    display_name = (userinfo.get("name") or "").strip() or None
    avatar_template = userinfo.get("avatar_template") or None
    download_url = normalize_avatar_url(avatar_template)
    avatar_url = None
    if download_url and (not target_user.avatar_url or not is_local_media_url(target_user.avatar_url)):
        try:
            media = await download_image_to_media(download_url, "avatars", AVATAR_MAX_BYTES)
            avatar_url = media.url if media else None
        except HTTPException as exc:
            logger.warning("Linux.do 头像下载失败: %s", getattr(exc, "detail", exc))

    active = bool(userinfo.get("active", True))
    trust_level = userinfo.get("trust_level")
    silenced = bool(userinfo.get("silenced", False))

    target_user.linux_do_id = linux_do_id
    target_user.linux_do_username = linux_username or target_user.linux_do_username
    target_user.display_name = display_name or target_user.display_name
    target_user.linux_do_avatar_template = avatar_template or target_user.linux_do_avatar_template
    target_user.avatar_url = avatar_url or target_user.avatar_url
    target_user.is_active = active
    target_user.trust_level = int(trust_level) if trust_level is not None else target_user.trust_level
    target_user.is_silenced = silenced
    return linux_do_id


async def _generate_unique_username_for_github(
    db: AsyncSession,
    base_username: str,
    github_id: str,
    max_len: int = 50,
) -> str:
    """
    为 GitHub 用户生成唯一用户名

    如果 base_username 已被占用，则添加 github_id 后缀
    """
    base_username = (base_username or "").strip()
    if not base_username:
        base_username = f"github_{github_id}"

    candidate = base_username[:max_len]
    result = await db.execute(select(User).where(User.username == candidate))
    existing = result.scalar_one_or_none()

    if existing is None or existing.github_id == github_id:
        return candidate

    # 用户名已被占用，添加后缀
    suffix = f"_{github_id}"
    candidate = (base_username[: max_len - len(suffix)] + suffix)[:max_len]
    return candidate


async def _upsert_github_user(db: AsyncSession, userinfo: dict, email: Optional[str] = None) -> User:
    """
    创建或更新 GitHub 用户

    Args:
        db: 数据库会话
        userinfo: GitHub 返回的用户信息
        email: 用户主邮箱

    Returns:
        用户对象
    """
    github_id = str(userinfo.get("id"))
    if not github_id or github_id == "None":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub 用户信息缺少 id",
        )

    # 查找现有用户（优先通过 github_id 查找）
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    # 解析用户信息
    github_username = (userinfo.get("login") or "").strip()
    display_name = (userinfo.get("name") or "").strip() or None
    avatar_source_url = userinfo.get("avatar_url") or None
    avatar_url = None
    if avatar_source_url and (user is None or not is_local_media_url(user.avatar_url)):
        try:
            media = await download_image_to_media(avatar_source_url, "avatars", AVATAR_MAX_BYTES)
            avatar_url = media.url if media else None
        except HTTPException as exc:
            logger.warning("GitHub 头像下载失败: %s", getattr(exc, "detail", exc))
    github_email = email or userinfo.get("email")

    is_new_user = False
    if user is None:
        # 创建新用户
        is_new_user = True
        username = await _generate_unique_username_for_github(db, github_username, github_id)
        user = User(
            email=github_email,
            username=username,
            hashed_password=None,
            github_id=github_id,
            github_username=github_username or None,
            github_avatar_url=avatar_url,
            github_email=github_email,
            display_name=display_name,
            avatar_url=avatar_url,
            is_active=True,
        )
        db.add(user)
    else:
        # 更新现有用户
        user.github_username = github_username or user.github_username
        user.github_avatar_url = avatar_url or user.github_avatar_url
        user.github_email = github_email or user.github_email
        user.display_name = display_name or user.display_name
        user.avatar_url = avatar_url or user.avatar_url

        # 如果 GitHub 用户名变更，同步更新
        if github_username and user.username != github_username:
            user.username = await _generate_unique_username_for_github(db, github_username, github_id)

    await db.commit()
    await db.refresh(user)

    # 新用户赠送注册奖励积分
    if is_new_user and REGISTER_BONUS_POINTS > 0:
        await PointsService.add_points(
            db=db,
            user_id=user.id,
            amount=REGISTER_BONUS_POINTS,
            reason=PointsReason.REGISTER_BONUS,
            ref_type="register",
            ref_id=user.id,
            description=f"新用户注册奖励 {REGISTER_BONUS_POINTS} 积分",
        )

    return user


async def _apply_github_profile(
    target_user: User,
    userinfo: dict,
    email: Optional[str] = None,
) -> str:
    """绑定时更新 GitHub 用户信息"""
    github_id = str(userinfo.get("id"))
    if not github_id or github_id == "None":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub 用户信息缺少 id",
        )

    github_username = (userinfo.get("login") or "").strip()
    display_name = (userinfo.get("name") or "").strip() or None
    avatar_source_url = userinfo.get("avatar_url") or None
    avatar_url = None
    if avatar_source_url and (not target_user.avatar_url or not is_local_media_url(target_user.avatar_url)):
        try:
            media = await download_image_to_media(avatar_source_url, "avatars", AVATAR_MAX_BYTES)
            avatar_url = media.url if media else None
        except HTTPException as exc:
            logger.warning("GitHub 头像下载失败: %s", getattr(exc, "detail", exc))

    github_email = email or userinfo.get("email")

    target_user.github_id = github_id
    target_user.github_username = github_username or target_user.github_username
    target_user.github_avatar_url = avatar_url or target_user.github_avatar_url
    target_user.github_email = github_email or target_user.github_email
    target_user.display_name = display_name or target_user.display_name
    target_user.avatar_url = avatar_url or target_user.avatar_url
    if not target_user.email and github_email:
        target_user.email = github_email
    return github_id


class RegisterRequest(BaseModel):
    """本地注册请求"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    email: Optional[EmailStr] = None
    display_name: Optional[str] = Field(None, max_length=100)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("用户名不能为空")
        if re.search(r"\s", value):
            raise ValueError("用户名不能包含空白字符")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_value(value)

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        return value or None


class LoginRequest(BaseModel):
    """本地登录请求"""
    model_config = ConfigDict(populate_by_name=True)

    account: str = Field(..., alias="username", min_length=2, max_length=255)
    password: str = Field(..., min_length=8)

    @field_validator("account")
    @classmethod
    def validate_account(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("账号不能为空")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_value(value)


class PasswordForgotRequest(BaseModel):
    """忘记密码请求"""
    email: EmailStr


class PasswordResetRequest(BaseModel):
    """密码重置请求"""
    token: str = Field(..., min_length=10, max_length=255)
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_value(value)


class PasswordChangeRequest(BaseModel):
    """修改密码请求"""
    old_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)

    @field_validator("old_password", "new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_value(value)


class PasswordSetRequest(BaseModel):
    """设置密码请求（OAuth 用户）"""
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_value(value)


class OAuthBindInitRequest(BaseModel):
    """绑定第三方账号请求"""
    next: Optional[str] = None


class AuthTokenResponse(BaseModel):
    """认证返回"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/register", response_model=AuthTokenResponse, summary="本地注册")
@limiter.limit(RateLimits.AUTH)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """用户注册"""
    await guard_challenge(request, scope="auth")
    username = payload.username.strip()
    email = payload.email.lower() if payload.email else None

    conditions = [User.username == username]
    if email:
        conditions.append(User.email == email)
    result = await db.execute(select(User).where(or_(*conditions)))
    existing = result.scalar_one_or_none()
    if existing:
        if existing.username == username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="用户名已被使用",
            )
        if email and existing.email == email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="邮箱已被使用",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="账号已存在",
        )

    user = User(
        email=email,
        username=username,
        hashed_password=get_password_hash(payload.password),
        display_name=payload.display_name,
        is_active=True,
    )
    db.add(user)
    try:
        await db.flush()
        await log_register(db, user.id, user.username, request=request)
        if REGISTER_BONUS_POINTS > 0:
            await PointsService.add_points(
                db=db,
                user_id=user.id,
                amount=REGISTER_BONUS_POINTS,
                reason=PointsReason.REGISTER_BONUS,
                ref_type="register",
                ref_id=user.id,
                description=f"新用户注册奖励 {REGISTER_BONUS_POINTS} 积分",
                auto_commit=False,
            )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名或邮箱已被使用",
        )

    await db.refresh(user)
    jwt_token = create_access_token({
        "sub": str(user.id),
        "provider": "local",
        "username": user.username,
    })
    return AuthTokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthTokenResponse, summary="本地登录")
@limiter.limit(RateLimits.AUTH)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """用户登录"""
    await guard_challenge(request, scope="auth")
    account = payload.account.strip()
    result = await db.execute(
        select(User).where(or_(User.username == account, User.email == account))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    if not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该账号未设置密码，请使用 OAuth 登录",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    await log_login(db, user.id, request=request, success=True)
    await db.commit()

    jwt_token = create_access_token({
        "sub": str(user.id),
        "provider": "local",
        "username": user.username,
    })
    return AuthTokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=AuthTokenResponse, summary="刷新 Token")
@limiter.limit(RateLimits.AUTH)
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """刷新 Token"""
    await guard_challenge(request, scope="auth")
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
        )
    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录",
        )

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证信息",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用",
        )

    token_payload = {
        "sub": str(user.id),
        "provider": payload.get("provider") or "local",
        "username": user.username,
    }
    if payload.get("linux_do_id"):
        token_payload["linux_do_id"] = payload.get("linux_do_id")

    jwt_token = create_access_token(token_payload)
    return AuthTokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/password/forgot", summary="忘记密码")
@limiter.limit(RateLimits.AUTH)
async def forgot_password(
    payload: PasswordForgotRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """发送重置密码链接"""
    await guard_challenge(request, scope="auth")
    email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.is_active:
        token = token_urlsafe(32)
        token_hash = _hash_reset_token(token)
        expires_at = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES)
        now = datetime.utcnow()

        await db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )

        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            requested_ip=request.client.host if request.client else None,
        ))
        await db.commit()

        reset_link = _build_password_reset_link(token)
        subject = "重置密码"
        content = (
            "你好，\n\n"
            f"请在 {settings.PASSWORD_RESET_TOKEN_TTL_MINUTES} 分钟内通过以下链接重置密码：\n"
            f"{reset_link}\n\n"
            "如果不是你本人操作，请忽略本邮件。"
        )
        try:
            if settings.SMTP_HOST and settings.SMTP_FROM_EMAIL:
                background_tasks.add_task(send_email, user.email, subject, content, False)
            else:
                raise EmailServiceError("SMTP 未配置")
        except EmailServiceError:
            if settings.DEBUG:
                return {"message": "重置链接已生成", "reset_link": reset_link}
            logger.warning("SMTP 未配置，重置链接未发送")

    return {"message": "如果邮箱存在，重置链接已发送"}


@router.post("/password/reset", summary="重置密码")
@limiter.limit(RateLimits.AUTH)
async def reset_password(
    payload: PasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """使用重置令牌设置新密码"""
    await guard_challenge(request, scope="auth")
    token_hash = _hash_reset_token(payload.token)
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    record = result.scalar_one_or_none()
    now = datetime.utcnow()

    if record is None or record.used_at or record.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="重置链接无效或已过期",
        )

    user = await db.get(User, record.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在",
        )

    user.hashed_password = get_password_hash(payload.password)
    record.used_at = now
    await db.commit()

    return {"message": "密码已重置"}


@router.post("/password/change", summary="修改密码")
@limiter.limit(RateLimits.AUTH)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """修改当前用户密码"""
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该账号尚未设置本地密码",
        )
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码不正确",
        )
    current_user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return {"message": "密码已更新"}


@router.post("/password/set", summary="设置本地密码")
@limiter.limit(RateLimits.AUTH)
async def set_password(
    payload: PasswordSetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """为 OAuth 用户设置本地密码"""
    if current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该账号已设置本地密码",
        )
    current_user.hashed_password = get_password_hash(payload.password)
    await db.commit()
    return {"message": "密码已设置"}


@router.get("/linuxdo/login")
async def linuxdo_login(request: Request, next: Optional[str] = None):
    """
    跳转到 Linux.do 授权页

    Args:
        next: 登录成功后跳转的路径
    """
    if not settings.LINUX_DO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINUX_DO_CLIENT_ID 未配置",
        )
    if not settings.LINUX_DO_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINUX_DO_REDIRECT_URI 未配置",
        )

    # 生成 state 防止 CSRF
    state = token_urlsafe(32)

    params = {
        "response_type": "code",
        "client_id": settings.LINUX_DO_CLIENT_ID,
        "redirect_uri": settings.LINUX_DO_REDIRECT_URI,
        "state": state,
        "scope": settings.LINUX_DO_SCOPE,
    }
    url = f"{settings.LINUX_DO_AUTHORIZE_URL}?{urlencode(params)}"

    resp = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)

    # 存储 state 到 cookie 用于后续验证
    # 生产环境必须使用 secure=True，开发环境允许 HTTP
    is_secure = not settings.DEBUG
    resp.set_cookie(
        "linuxdo_oauth_state",
        state,
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )

    # 存储 next 路径
    if next:
        resp.set_cookie(
            "linuxdo_oauth_next",
            next,
            httponly=True,
            samesite="none" if settings.DEBUG else "lax",
            secure=is_secure,
            max_age=600,
        )

    return resp


@router.post("/linuxdo/bind", summary="绑定 Linux.do 账号")
@limiter.limit(RateLimits.AUTH)
async def linuxdo_bind(
    payload: OAuthBindInitRequest,
    request: Request,
    current_user: User = Depends(get_current_user_dep),
):
    """初始化 Linux.do 绑定流程"""
    if not settings.LINUX_DO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINUX_DO_CLIENT_ID 未配置",
        )
    if not settings.LINUX_DO_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINUX_DO_REDIRECT_URI 未配置",
        )

    state = token_urlsafe(32)
    params = {
        "response_type": "code",
        "client_id": settings.LINUX_DO_CLIENT_ID,
        "redirect_uri": settings.LINUX_DO_REDIRECT_URI,
        "state": state,
        "scope": settings.LINUX_DO_SCOPE,
    }
    url = f"{settings.LINUX_DO_AUTHORIZE_URL}?{urlencode(params)}"

    resp = JSONResponse({"authorize_url": url})
    is_secure = not settings.DEBUG
    resp.set_cookie(
        "linuxdo_oauth_state",
        state,
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )
    next_path = _sanitize_next_path(payload.next)
    if next_path:
        resp.set_cookie(
            "linuxdo_oauth_next",
            next_path,
            httponly=True,
            samesite="none" if settings.DEBUG else "lax",
            secure=is_secure,
            max_age=600,
        )
    resp.set_cookie(
        "linuxdo_bind_user",
        str(current_user.id),
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )
    return resp


@router.get("/linuxdo/callback")
async def linuxdo_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Linux.do OAuth2 回调

    处理流程：
    1. 验证 state 防止 CSRF
    2. 用授权码换取 access_token
    3. 获取用户信息
    4. 创建/更新本地用户
    5. 签发本系统 JWT
    6. 重定向到前端
    """
    # 验证 state（开发环境下允许跳过，因为 cookie 在跨站跳转时可能丢失）
    cookie_state = request.cookies.get("linuxdo_oauth_state")
    if not settings.DEBUG:
        if not cookie_state or state != cookie_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state 校验失败",
            )
    elif cookie_state and state != cookie_state:
        # 开发环境：state 不匹配时只记录警告，不阻止
        import logging
        logging.warning(f"OAuth state mismatch: cookie={cookie_state}, param={state}")

    try:
        # 换取 access_token
        access_token = await exchange_code_for_token(code=code)

        # 获取用户信息
        userinfo = await fetch_linuxdo_userinfo(access_token=access_token)
    except LinuxDoOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    bind_user_id = request.cookies.get("linuxdo_bind_user")
    if bind_user_id:
        try:
            target_user_id = int(bind_user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="绑定信息无效",
            )

        target_user = await db.get(User, target_user_id)
        if target_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="绑定账号不存在",
            )

        linux_do_id = str(userinfo.get("id"))
        if not linux_do_id or linux_do_id == "None":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Linux.do 用户信息缺少 id",
            )
        if target_user.linux_do_id and target_user.linux_do_id != linux_do_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="已绑定其他 Linux.do 账号",
            )

        result = await db.execute(select(User).where(User.linux_do_id == linux_do_id))
        existing_user = result.scalar_one_or_none()
        if existing_user and existing_user.id != target_user.id:
            frontend = settings.FRONTEND_URL.rstrip("/")
            redirect_to = f"{frontend}/account/security?merge=linuxdo"
            resp = RedirectResponse(url=redirect_to, status_code=status.HTTP_302_FOUND)
            is_secure = not settings.DEBUG
            resp.set_cookie(
                "linuxdo_merge_source",
                str(existing_user.id),
                httponly=True,
                samesite="none" if settings.DEBUG else "lax",
                secure=is_secure,
                max_age=600,
            )
            resp.set_cookie(
                "linuxdo_merge_target",
                str(target_user.id),
                httponly=True,
                samesite="none" if settings.DEBUG else "lax",
                secure=is_secure,
                max_age=600,
            )
            resp.delete_cookie("linuxdo_oauth_state")
            resp.delete_cookie("linuxdo_oauth_next")
            resp.delete_cookie("linuxdo_bind_user")
            return resp

        await _apply_linuxdo_profile(target_user, userinfo)
        await db.commit()
        await db.refresh(target_user)
        user = target_user
        next_path = _sanitize_next_path(request.cookies.get("linuxdo_oauth_next")) or "/account/security"
    else:
        # 创建/更新用户
        user = await _upsert_linuxdo_user(db, userinfo)

        # 记录登录日志
        from app.services.log_service import log_login
        await log_login(db, user.id, request=request, success=True)
        await db.commit()

        next_path = _sanitize_next_path(request.cookies.get("linuxdo_oauth_next"))

    # 签发 JWT（包含用户名和 Linux.do ID，用于日志记录）
    jwt_token = create_access_token({
        "sub": str(user.id),
        "provider": "linuxdo",
        "username": user.username,
        "linux_do_id": user.linux_do_id,
    })

    # 构建重定向 URL
    frontend = settings.FRONTEND_URL.rstrip("/")
    redirect_to = f"{frontend}/login#token={jwt_token}"

    if next_path:
        redirect_to += f"&next={next_path}"
    # 附加用户信息（base64 编码）
    redirect_to += "&user=" + _b64url_json({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "role": user.role,  # admin / reviewer / contestant / spectator
        "original_role": user.original_role,  # 原始角色（管理员切换用）
        "role_selected": user.role_selected,  # 是否已完成角色选择引导
        "linux_do_id": user.linux_do_id,
        "trust_level": user.trust_level,
        "is_silenced": user.is_silenced,
    })

    resp = RedirectResponse(url=redirect_to, status_code=status.HTTP_302_FOUND)

    # 清除 OAuth cookie
    resp.delete_cookie("linuxdo_oauth_state")
    resp.delete_cookie("linuxdo_oauth_next")
    resp.delete_cookie("linuxdo_bind_user")

    return resp


# ==================== GitHub OAuth2 ====================

@router.post("/linuxdo/merge/confirm", response_model=UserResponse, summary="确认合并 Linux.do 账号")
async def linuxdo_merge_confirm(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
):
    """
    确认合并 Linux.do 账号

    仅在绑定流程中检测到冲突时使用。
    """
    source_id = request.cookies.get("linuxdo_merge_source")
    target_id = request.cookies.get("linuxdo_merge_target")
    if not source_id or not target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="没有待确认的合并请求",
        )
    if str(current_user.id) != str(target_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="合并请求与当前账号不匹配",
        )

    source_user = await db.get(User, int(source_id))
    if source_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="待合并账号不存在",
        )

    await merge_users(db, current_user, source_user)
    await db.commit()
    await db.refresh(current_user)

    response.delete_cookie("linuxdo_merge_source")
    response.delete_cookie("linuxdo_merge_target")
    return current_user


@router.post("/linuxdo/merge/cancel", summary="取消合并 Linux.do 账号")
async def linuxdo_merge_cancel(
    response: Response,
    current_user: User = Depends(get_current_user_dep),
):
    """
    取消 Linux.do 账号合并请求
    """
    response.delete_cookie("linuxdo_merge_source")
    response.delete_cookie("linuxdo_merge_target")
    return {"ok": True}

@router.get("/github/login")
async def github_login(request: Request, next: Optional[str] = None):
    """
    跳转到 GitHub 授权页

    Args:
        next: 登录成功后跳转的路径
    """
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID 未配置",
        )

    # 生成 state 防止 CSRF
    state = token_urlsafe(32)

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "state": state,
        "scope": settings.GITHUB_SCOPE,
    }
    url = f"{settings.GITHUB_AUTHORIZE_URL}?{urlencode(params)}"

    resp = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)

    # 存储 state 到 cookie 用于后续验证
    # 生产环境必须使用 secure=True
    is_secure = not settings.DEBUG
    resp.set_cookie(
        "github_oauth_state",
        state,
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )

    # 存储 next 路径
    if next:
        resp.set_cookie(
            "github_oauth_next",
            next,
            httponly=True,
            samesite="none" if settings.DEBUG else "lax",
            secure=is_secure,
            max_age=600,
        )

    return resp


@router.post("/github/bind", summary="绑定 GitHub 账号")
@limiter.limit(RateLimits.AUTH)
async def github_bind(
    payload: OAuthBindInitRequest,
    request: Request,
    current_user: User = Depends(get_current_user_dep),
):
    """初始化 GitHub 绑定流程"""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID 未配置",
        )

    state = token_urlsafe(32)
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "state": state,
        "scope": settings.GITHUB_SCOPE,
    }
    url = f"{settings.GITHUB_AUTHORIZE_URL}?{urlencode(params)}"

    resp = JSONResponse({"authorize_url": url})
    is_secure = not settings.DEBUG
    resp.set_cookie(
        "github_oauth_state",
        state,
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )
    next_path = _sanitize_next_path(payload.next)
    if next_path:
        resp.set_cookie(
            "github_oauth_next",
            next_path,
            httponly=True,
            samesite="none" if settings.DEBUG else "lax",
            secure=is_secure,
            max_age=600,
        )
    resp.set_cookie(
        "github_bind_user",
        str(current_user.id),
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )
    return resp


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """
    GitHub OAuth2 回调

    处理流程：
    1. 验证 state 防止 CSRF
    2. 用授权码换取 access_token
    3. 获取用户信息和邮箱
    4. 创建/更新本地用户
    5. 签发本系统 JWT
    6. 重定向到前端
    """
    # 验证 state
    cookie_state = request.cookies.get("github_oauth_state")
    if not settings.DEBUG:
        if not cookie_state or state != cookie_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state 校验失败",
            )
    elif cookie_state and state != cookie_state:
        import logging
        logging.warning(f"GitHub OAuth state mismatch: cookie={cookie_state}, param={state}")

    try:
        # 换取 access_token
        access_token = await github_exchange_code(code=code)

        # 获取用户信息
        userinfo = await fetch_github_userinfo(access_token=access_token)

        # 获取用户邮箱
        emails = await fetch_github_emails(access_token=access_token)
        primary_email = get_primary_email(emails)
    except GitHubOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    bind_user_id = request.cookies.get("github_bind_user")
    if bind_user_id:
        try:
            target_user_id = int(bind_user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="绑定信息无效",
            )

        target_user = await db.get(User, target_user_id)
        if target_user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="绑定账号不存在",
            )

        github_id = str(userinfo.get("id"))
        if not github_id or github_id == "None":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub 用户信息缺少 id",
            )
        if target_user.github_id and target_user.github_id != github_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="已绑定其他 GitHub 账号",
            )

        result = await db.execute(select(User).where(User.github_id == github_id))
        existing_user = result.scalar_one_or_none()
        if existing_user and existing_user.id != target_user.id:
            await merge_users(db, target_user, existing_user)

        await _apply_github_profile(target_user, userinfo, primary_email)
        await db.commit()
        await db.refresh(target_user)
        user = target_user
        next_path = _sanitize_next_path(request.cookies.get("github_oauth_next")) or "/account/security"
    else:
        # 创建/更新用户
        user = await _upsert_github_user(db, userinfo, primary_email)

        # 记录登录日志
        from app.services.log_service import log_login
        await log_login(db, user.id, request=request, success=True)
        await db.commit()

        next_path = _sanitize_next_path(request.cookies.get("github_oauth_next"))

    # 签发 JWT（包含用户名，用于日志记录）
    jwt_token = create_access_token({
        "sub": str(user.id),
        "provider": "github",
        "username": user.username,
    })

    # 构建重定向 URL
    frontend = settings.FRONTEND_URL.rstrip("/")
    redirect_to = f"{frontend}/login#token={jwt_token}"

    if next_path:
        redirect_to += f"&next={next_path}"

    # 附加用户信息（base64 编码）
    redirect_to += "&user=" + _b64url_json({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "original_role": user.original_role,  # 原始角色（管理员切换用）
        "role_selected": user.role_selected,  # 是否已完成角色选择引导
        "email": user.email or user.github_email,
        "github_id": user.github_id,
        "github_username": user.github_username,
    })

    resp = RedirectResponse(url=redirect_to, status_code=status.HTTP_302_FOUND)

    # 清除 OAuth cookie
    resp.delete_cookie("github_oauth_state")
    resp.delete_cookie("github_oauth_next")
    resp.delete_cookie("github_bind_user")

    return resp
