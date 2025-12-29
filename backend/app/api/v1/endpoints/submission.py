"""
作品提交相关 API 端点

提供作品提交的完整功能，包括：
- CRUD 操作：创建草稿、更新、获取、删除
- 附件上传：init/complete 两步上传模式
- 材料校验：校验必填材料完整性（演示视频可选）
- 最终提交：强校验后锁定作品
- 管理审核：通过/拒绝作品

作品材料说明：
1. 项目源码 - GitHub/Gitee 仓库链接（必须 Public）
2. 演示视频 - MP4/AVI，3-5分钟（可选）
3. 项目文档 - Markdown 格式（必填）
4. API调用证明 - 截图 + 日志文件（必填）
5. 参赛报名表 - 关联 registrations 表（必填）
"""
import hashlib
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.dependencies import get_current_user, get_optional_user
from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.models.contest import Contest, ContestPhase
from app.models.registration import Registration, RegistrationStatus
from app.models.submission import (
    AttachmentType,
    StorageProvider,
    Submission,
    SubmissionAttachment,
    SubmissionStatus,
)
from app.models.user import User, UserRole
from app.schemas.submission import (
    AttachmentInitRequest,
    AttachmentInitResponse,
    AttachmentResponse,
    SubmissionCreate,
    SubmissionListResponse,
    SubmissionResponse,
    SubmissionReviewRequest,
    SubmissionUpdate,
    SubmissionValidateResponse,
    ValidationError,
)
from app.services.security_challenge import guard_challenge
from app.services.upload_quota import commit_upload_quota, ensure_upload_quota

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================================================
# 配置常量
# ============================================================================

# 上传根目录（默认放在容器内可写目录）
UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", "/app/app/uploads")) / "submissions"

# 各类型附件的最大文件大小（字节）
MAX_SIZE_BY_TYPE: dict[str, int] = {
    AttachmentType.DEMO_VIDEO.value: 1024 * 1024 * 1024,     # 1GB
    AttachmentType.API_SCREENSHOT.value: 10 * 1024 * 1024,   # 10MB
    AttachmentType.API_LOG.value: 50 * 1024 * 1024,          # 50MB
    AttachmentType.DOC_FILE.value: 10 * 1024 * 1024,         # 10MB
    AttachmentType.OTHER.value: 50 * 1024 * 1024,            # 50MB
}

# 各类型附件允许的 MIME 类型
ALLOWED_MIME_TYPES: dict[str, set[str]] = {
    AttachmentType.DEMO_VIDEO.value: {
        "video/mp4",
        "video/x-msvideo",
        "video/avi",
        "video/quicktime",
        "application/octet-stream",
    },
    AttachmentType.API_SCREENSHOT.value: {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
    },
    AttachmentType.API_LOG.value: {
        "text/plain",
        "application/json",
        "application/zip",
        "application/x-zip-compressed",
        "application/gzip",
    },
    AttachmentType.DOC_FILE.value: {
        "text/markdown",
        "text/plain",
        "application/pdf",
    },
    AttachmentType.OTHER.value: {
        "application/octet-stream",
    },
}

# 视频时长限制（秒）
VIDEO_MIN_DURATION = 180  # 3分钟
VIDEO_MAX_DURATION = 300  # 5分钟
VIDEO_DURATION_TOLERANCE = 10  # 容差10秒


async def require_admin_or_reviewer(
    current_user: User = Depends(get_current_user),
) -> User:
    """要求管理员或评审员权限"""
    if not (current_user.is_admin or current_user.is_reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员或评审员权限"
        )
    return current_user


# ============================================================================
# 辅助函数
# ============================================================================

def sanitize_filename(filename: str) -> str:
    """清理文件名，移除危险字符"""
    name = filename.strip().replace("\\", "_").replace("/", "_")
    name = re.sub(r"[^\w\-.\u4e00-\u9fff]+", "_", name)
    return name[:120] if name else "file"


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


def check_submission_phase(contest: Contest) -> None:
    """检查比赛是否处于作品提交阶段"""
    if contest.phase != ContestPhase.SUBMISSION.value:
        phase_messages = {
            ContestPhase.UPCOMING.value: "比赛尚未开始，当前不可提交作品",
            ContestPhase.SIGNUP.value: "当前为报名阶段，作品提交通道尚未开放",
            ContestPhase.VOTING.value: "当前为投票阶段，作品提交通道已关闭",
            ContestPhase.ENDED.value: "比赛已结束，作品提交通道已关闭",
        }
        message = phase_messages.get(contest.phase, "当前比赛不在作品提交阶段")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )


async def get_user_registration(
    db: AsyncSession,
    contest_id: int,
    user_id: int,
) -> Optional[Registration]:
    """获取用户在指定比赛的报名记录"""
    result = await db.execute(
        select(Registration).where(
            Registration.contest_id == contest_id,
            Registration.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def require_registration(
    db: AsyncSession,
    contest_id: int,
    user_id: int,
) -> Registration:
    """要求用户已报名且未撤回"""
    registration = await get_user_registration(db, contest_id, user_id)

    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先完成比赛报名"
        )

    if registration.status == RegistrationStatus.WITHDRAWN.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="报名已撤回，无法提交作品"
        )

    return registration


async def require_approved_registration(
    db: AsyncSession,
    contest_id: int,
    user_id: int,
    message: str = "报名未审核通过，无法提交作品",
) -> Registration:
    """要求报名已通过审核"""
    registration = await require_registration(db, contest_id, user_id)
    if registration.status != RegistrationStatus.APPROVED.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return registration


async def get_submission_or_404(
    db: AsyncSession,
    submission_id: int,
    load_attachments: bool = True,
    load_user: bool = False,
) -> Submission:
    """获取作品，不存在则抛出 404"""
    query = select(Submission).where(Submission.id == submission_id)

    if load_attachments:
        query = query.options(selectinload(Submission.attachments))
    if load_user:
        query = query.options(selectinload(Submission.user))

    result = await db.execute(query)
    submission = result.scalar_one_or_none()

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="作品不存在"
        )

    return submission


def ensure_owner(submission: Submission, user: User) -> None:
    """确保是作品所有者"""
    if submission.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限操作该作品"
        )


def ensure_owner_or_reviewer(submission: Submission, user: User) -> None:
    """确保是作品所有者或评审员"""
    if submission.user_id == user.id:
        return
    if user.is_admin or user.is_reviewer:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="无权限访问该作品"
    )


def ensure_editable(submission: Submission) -> None:
    """确保作品可编辑"""
    if not submission.is_editable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="作品已提交，无法修改"
        )


async def validate_submission_materials(
    db: AsyncSession,
    submission: Submission,
) -> SubmissionValidateResponse:
    """
    校验作品提交的必填材料（演示视频可选）

    Returns:
        SubmissionValidateResponse: 校验结果
    """
    errors: list[ValidationError] = []
    summary: dict = {
        "repo_url": bool(submission.repo_url),
        "project_doc_md": bool(submission.project_doc_md),
        "registration": None,
        "attachments": {},
    }

    # 1. 项目源码仓库（repo_url）
    if not submission.repo_url or not submission.repo_url.strip():
        errors.append(ValidationError(
            field="repo_url",
            code="REQUIRED",
            message="项目源码仓库链接必填"
        ))
    else:
        # URL 格式校验
        url = submission.repo_url.strip()
        if not url.startswith("https://"):
            errors.append(ValidationError(
                field="repo_url",
                code="INVALID_PROTOCOL",
                message="仓库链接必须使用 HTTPS 协议"
            ))
        elif not (url.startswith("https://github.com/") or url.startswith("https://gitee.com/")):
            errors.append(ValidationError(
                field="repo_url",
                code="INVALID_HOST",
                message="仓库链接仅支持 GitHub 或 Gitee"
            ))

    # 2. 项目文档（project_doc_md）
    if not submission.project_doc_md or not submission.project_doc_md.strip():
        errors.append(ValidationError(
            field="project_doc_md",
            code="REQUIRED",
            message="项目文档（Markdown）必填"
        ))
    else:
        doc = submission.project_doc_md.strip()
        # 检查必要章节（兼容常见标题与关键词）
        def has_doc_section(text: str, keywords: tuple[str, ...]) -> bool:
            lower = text.lower()
            for keyword in keywords:
                keyword_lower = keyword.lower()
                pattern = rf"(?m)^\s*#+\s*{re.escape(keyword_lower)}"
                if re.search(pattern, lower):
                    return True
            return any(keyword.lower() in lower for keyword in keywords)

        required_sections = [
            (("安装", "部署", "installation", "install"), "MISSING_INSTALL_SECTION", "项目文档缺少「安装步骤」章节"),
            (("使用", "操作", "运行", "启动", "usage", "quick start", "quickstart"), "MISSING_USAGE_SECTION", "项目文档缺少「使用说明」章节"),
        ]
        for keywords, code, message in required_sections:
            if not has_doc_section(doc, keywords):
                errors.append(ValidationError(
                    field="project_doc_md",
                    code=code,
                    message=message
                ))

    # 3. 参赛报名表（registration）
    registration = None
    if submission.registration_id:
        result = await db.execute(
            select(Registration).where(Registration.id == submission.registration_id)
        )
        registration = result.scalar_one_or_none()

    if registration is None:
        # 尝试通过 contest_id + user_id 查找
        registration = await get_user_registration(
            db, submission.contest_id, submission.user_id
        )

    if registration is None:
        errors.append(ValidationError(
            field="registration",
            code="NOT_FOUND",
            message="未找到报名记录，请先完成比赛报名"
        ))
    elif registration.status == RegistrationStatus.WITHDRAWN.value:
        errors.append(ValidationError(
            field="registration",
            code="WITHDRAWN",
            message="报名已撤回，无法提交作品"
        ))
    else:
        summary["registration"] = {
            "id": registration.id,
            "status": registration.status,
            "title": registration.title,
        }

    # 4. 附件完整性检查
    uploaded_attachments = [
        att for att in (submission.attachments or [])
        if att.is_uploaded
    ]
    uploaded_types = {att.type for att in uploaded_attachments}
    summary["attachments"] = {
        "uploaded_types": sorted(list(uploaded_types)),
        "total_count": len(uploaded_attachments),
    }

    # 4.1 API调用证明截图（必须至少1张）
    if AttachmentType.API_SCREENSHOT.value not in uploaded_types:
        errors.append(ValidationError(
            field="api_screenshot",
            code="REQUIRED",
            message="API调用证明截图必传（至少1张）"
        ))

    # 4.2 API调用证明日志（必须至少1个）
    if AttachmentType.API_LOG.value not in uploaded_types:
        errors.append(ValidationError(
            field="api_log",
            code="REQUIRED",
            message="API调用证明日志必传"
        ))

    ok = len(errors) == 0

    return SubmissionValidateResponse(
        ok=ok,
        errors=errors,
        summary=summary,
        repo_check={"valid": summary["repo_url"]},
        doc_check={"valid": summary["project_doc_md"]},
        registration_check=summary.get("registration"),
        api_proof_check={
            "screenshot": AttachmentType.API_SCREENSHOT.value in uploaded_types,
            "log": AttachmentType.API_LOG.value in uploaded_types,
        },
        video_check={
            "uploaded": AttachmentType.DEMO_VIDEO.value in uploaded_types,
        },
    )


# ============================================================================
# CRUD 端点
# ============================================================================

@router.get(
    "/",
    response_model=SubmissionListResponse,
    summary="获取作品列表",
    description="获取作品列表。默认只展示已通过审核的作品，管理员/评审可查看所有。",
)
async def list_submissions(
    contest_id: Optional[int] = Query(None, description="比赛ID（可选）"),
    status_filter: Optional[str] = Query(None, description="状态过滤（管理员/评审可用）"),
    mine: bool = Query(False, description="仅查看我的作品（需登录）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取作品列表"""
    query = select(Submission).options(
        selectinload(Submission.attachments),
        selectinload(Submission.user),
    )

    # 比赛过滤
    if contest_id is not None:
        query = query.where(Submission.contest_id == contest_id)

    # 我的作品
    if mine:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="请先登录"
            )
        query = query.where(Submission.user_id == current_user.id)
    else:
        # 权限控制
        is_privileged = current_user and (current_user.is_admin or current_user.is_reviewer)

        if is_privileged and status_filter:
            # 管理员/评审可按状态过滤
            query = query.where(Submission.status == status_filter)
        elif not is_privileged:
            # 普通用户只能看已通过的
            query = query.where(Submission.status == SubmissionStatus.APPROVED.value)
            query = query.join(Registration, Registration.id == Submission.registration_id)
            query = query.where(Registration.status != RegistrationStatus.WITHDRAWN.value)

    # 统计总数（复用相同的过滤条件，但不含分页）
    count_query = select(func.count(Submission.id))
    if contest_id is not None:
        count_query = count_query.where(Submission.contest_id == contest_id)

    if mine:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="请先登录"
            )
        count_query = count_query.where(Submission.user_id == current_user.id)
    else:
        is_privileged = current_user and (current_user.is_admin or current_user.is_reviewer)
        if is_privileged and status_filter:
            # 校验 status_filter 是合法枚举值
            valid_statuses = {s.value for s in SubmissionStatus}
            if status_filter not in valid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"无效的状态值 {status_filter}"
                )
            count_query = count_query.where(Submission.status == status_filter)
        elif not is_privileged:
            count_query = count_query.where(Submission.status == SubmissionStatus.APPROVED.value)
            count_query = count_query.join(Registration, Registration.id == Submission.registration_id)
            count_query = count_query.where(Registration.status != RegistrationStatus.WITHDRAWN.value)

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # 排序和分页
    query = query.order_by(Submission.id.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return SubmissionListResponse(
        items=[SubmissionResponse.model_validate(x) for x in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建作品提交（草稿）",
    description="创建作品提交草稿。每个用户在每个比赛只能有一个作品。",
)
async def create_submission(
    payload: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建作品提交（草稿）"""
    # 验证比赛存在且处于提交阶段
    contest = await get_contest_or_404(db, payload.contest_id)
    check_submission_phase(contest)

    # 验证已报名
    registration = await require_registration(db, payload.contest_id, current_user.id)

    # 检查是否已有作品
    existing_result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.attachments))
        .where(
            Submission.contest_id == payload.contest_id,
            Submission.user_id == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        # 如果已有草稿或被拒绝的作品，允许更新
        if existing.is_editable:
            existing.title = payload.title
            existing.description = payload.description
            existing.repo_url = payload.repo_url
            existing.demo_url = payload.demo_url
            existing.video_url = payload.video_url
            existing.project_doc_md = payload.project_doc_md
            existing.registration_id = registration.id
            existing.status = SubmissionStatus.DRAFT.value
            existing.validation_summary = None
            existing.validated_at = None

            await db.commit()
            await db.refresh(existing)
            return SubmissionResponse.model_validate(existing)

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="你已提交该比赛作品，如需修改请联系管理员"
        )

    # 创建新作品
    submission = Submission(
        contest_id=payload.contest_id,
        user_id=current_user.id,
        registration_id=registration.id,
        title=payload.title,
        description=payload.description,
        repo_url=payload.repo_url,
        demo_url=payload.demo_url,
        video_url=payload.video_url,
        project_doc_md=payload.project_doc_md,
        status=SubmissionStatus.DRAFT.value,
    )

    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # 重新加载以获取完整数据
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.attachments))
        .where(Submission.id == submission.id)
    )
    submission = result.scalar_one()

    logger.info(f"用户 {current_user.username} 创建作品草稿 #{submission.id}")
    return SubmissionResponse.model_validate(submission)


@router.get(
    "/{submission_id}",
    response_model=SubmissionResponse,
    summary="获取作品详情",
)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """获取作品详情"""
    submission = await get_submission_or_404(
        db, submission_id,
        load_attachments=True,
        load_user=True
    )

    # 权限检查
    if submission.status != SubmissionStatus.APPROVED.value:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权限访问该作品"
            )
        ensure_owner_or_reviewer(submission, current_user)

    return SubmissionResponse.model_validate(submission)


@router.patch(
    "/{submission_id}",
    response_model=SubmissionResponse,
    summary="更新作品（草稿）",
)
async def update_submission(
    submission_id: int,
    payload: SubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新作品（仅草稿状态可更新）"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)
    ensure_owner(submission, current_user)
    ensure_editable(submission)

    # 更新提供的字段
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(submission, field, value)

    # 重置校验状态
    submission.status = SubmissionStatus.DRAFT.value
    submission.validation_summary = None
    submission.validated_at = None

    await db.commit()
    await db.refresh(submission)

    logger.info(f"用户 {current_user.username} 更新作品 #{submission_id}")
    return SubmissionResponse.model_validate(submission)


@router.delete(
    "/{submission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除作品（仅草稿可删）",
)
async def delete_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除作品（仅草稿或被拒绝状态可删除）"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)
    ensure_owner(submission, current_user)
    ensure_editable(submission)

    # 删除本地文件
    for att in submission.attachments or []:
        if att.storage_provider == StorageProvider.LOCAL.value and att.storage_key:
            try:
                file_path = Path(att.storage_key)
                if file_path.exists() and file_path.is_file():
                    file_path.unlink()
            except Exception as e:
                logger.warning(f"删除附件文件失败: {e}")

    await db.delete(submission)
    await db.commit()

    logger.info(f"用户 {current_user.username} 删除作品 #{submission_id}")
    return None


# ============================================================================
# 附件上传端点
# ============================================================================

@router.post(
    "/{submission_id}/attachments/init",
    response_model=AttachmentInitResponse,
    summary="初始化附件上传",
    description="初始化附件上传，返回上传URL和附件ID。",
)
@limiter.limit(RateLimits.UPLOAD)
async def init_attachment_upload(
    request: Request,
    submission_id: int,
    payload: AttachmentInitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """初始化附件上传"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=False)
    ensure_owner(submission, current_user)
    ensure_editable(submission)

    await guard_challenge(request, scope="upload", user_id=current_user.id)

    attachment_type = payload.type.value
    max_size = MAX_SIZE_BY_TYPE.get(attachment_type, 50 * 1024 * 1024)

    # 检查文件大小
    if payload.size_bytes > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件过大，该类型附件最大允许 {max_size // (1024 * 1024)} MB"
        )

    await ensure_upload_quota(current_user.id, "submission", payload.size_bytes)

    # 检查 MIME 类型
    allowed_types = ALLOWED_MIME_TYPES.get(attachment_type, set())
    if allowed_types and payload.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型 {payload.content_type}"
        )

    # 创建附件记录
    safe_name = sanitize_filename(payload.filename)
    attachment = SubmissionAttachment(
        submission_id=submission.id,
        type=attachment_type,
        storage_provider=StorageProvider.LOCAL.value,
        storage_key="",  # 后续设置
        filename=safe_name,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        is_uploaded=False,
    )

    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    # 设置存储路径
    storage_key = (
        UPLOAD_ROOT / str(submission.contest_id) /
        str(submission.id) / f"{attachment.id}_{safe_name}"
    ).as_posix()
    attachment.storage_key = storage_key
    await db.commit()

    # 生成上传URL
    upload_url = f"/api/v1/submissions/{submission.id}/attachments/{attachment.id}/complete"

    logger.info(
        f"用户 {current_user.username} 初始化附件上传: "
        f"submission={submission.id}, type={attachment_type}, file={safe_name}"
    )

    return AttachmentInitResponse(
        attachment_id=attachment.id,
        upload_url=upload_url,
        max_size_bytes=max_size,
    )


@router.post(
    "/{submission_id}/attachments/{attachment_id}/complete",
    response_model=AttachmentResponse,
    summary="完成附件上传",
    description="上传文件并完成附件上传。使用 multipart/form-data。",
)
@limiter.limit(RateLimits.UPLOAD)
async def complete_attachment_upload(
    request: Request,
    submission_id: int,
    attachment_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """完成附件上传"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)
    ensure_owner(submission, current_user)
    ensure_editable(submission)

    await guard_challenge(request, scope="upload", user_id=current_user.id)

    # 查找附件
    attachment = next(
        (a for a in (submission.attachments or []) if a.id == attachment_id),
        None
    )
    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="附件不存在"
        )

    if attachment.is_uploaded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="附件已上传完成，如需重新上传请删除后重新创建"
        )

    # 验证 MIME 类型
    attachment_type = attachment.type
    allowed_types = ALLOWED_MIME_TYPES.get(attachment_type, set())
    actual_content_type = file.content_type or attachment.content_type or "application/octet-stream"

    if allowed_types and actual_content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型 {actual_content_type}"
        )

    max_size = MAX_SIZE_BY_TYPE.get(attachment_type, 50 * 1024 * 1024)

    # 创建目录
    dest_path = Path(attachment.storage_key)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    # 流式写入并计算 SHA256
    hasher = hashlib.sha256()
    total_bytes = 0

    try:
        async with aiofiles.open(dest_path, "wb") as out_file:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break

                total_bytes += len(chunk)
                if total_bytes > max_size:
                    # 超出限制，删除文件
                    await out_file.close()
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"文件过大，最大允许 {max_size // (1024 * 1024)} MB"
                    )

                hasher.update(chunk)
                await out_file.write(chunk)
    finally:
        await file.close()

    try:
        await commit_upload_quota(current_user.id, "submission", total_bytes)
    except HTTPException:
        dest_path.unlink(missing_ok=True)
        raise

    # 更新附件记录
    attachment.content_type = actual_content_type
    attachment.size_bytes = total_bytes
    attachment.sha256 = hasher.hexdigest()
    attachment.is_uploaded = True
    attachment.uploaded_at = datetime.utcnow()

    # 重置作品校验状态
    submission.validation_summary = None
    submission.validated_at = None
    submission.status = SubmissionStatus.DRAFT.value

    await db.commit()
    await db.refresh(attachment)

    logger.info(
        f"用户 {current_user.username} 完成附件上传: "
        f"attachment={attachment.id}, size={total_bytes}, sha256={attachment.sha256[:16]}..."
    )

    return AttachmentResponse.model_validate(attachment)


@router.delete(
    "/{submission_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除附件",
)
async def delete_attachment(
    submission_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除附件"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)
    ensure_owner(submission, current_user)
    ensure_editable(submission)

    attachment = next(
        (a for a in (submission.attachments or []) if a.id == attachment_id),
        None
    )
    if attachment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="附件不存在"
        )

    # 删除文件
    if attachment.storage_provider == StorageProvider.LOCAL.value and attachment.storage_key:
        try:
            file_path = Path(attachment.storage_key)
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            logger.warning(f"删除附件文件失败: {e}")

    await db.delete(attachment)

    # 重置校验状态
    submission.validation_summary = None
    submission.validated_at = None

    await db.commit()

    logger.info(f"用户 {current_user.username} 删除附件 #{attachment_id}")
    return None


# ============================================================================
# 校验和提交端点
# ============================================================================

@router.post(
    "/{submission_id}/validate",
    response_model=SubmissionValidateResponse,
    summary="校验作品材料",
    description="校验作品的必填材料是否完整（演示视频可选）。",
)
async def validate_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """校验作品材料"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)
    ensure_owner(submission, current_user)
    ensure_editable(submission)

    # 保存原始状态，用于恢复
    prev_status = submission.status

    # 设置校验中状态
    submission.status = SubmissionStatus.VALIDATING.value
    await db.commit()

    # 执行校验
    result = await validate_submission_materials(db, submission)

    # 保存校验结果
    submission.validation_summary = {
        "ok": result.ok,
        "errors": [e.model_dump() for e in result.errors],
        "summary": result.summary,
    }
    submission.validated_at = datetime.utcnow()

    # 恢复原始状态（不改变 rejected/draft 状态）
    submission.status = prev_status

    await db.commit()

    logger.info(
        f"用户 {current_user.username} 校验作品 #{submission_id}: "
        f"ok={result.ok}, errors={len(result.errors)}"
    )

    return result


@router.post(
    "/{submission_id}/finalize",
    response_model=SubmissionResponse,
    summary="最终提交作品",
    description="执行强校验后最终提交作品。提交后不可修改。",
)
async def finalize_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """最终提交作品"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)
    ensure_owner(submission, current_user)
    ensure_editable(submission)
    await require_approved_registration(
        db,
        submission.contest_id,
        current_user.id,
        message="报名未审核通过，无法最终提交",
    )

    # 强制校验
    validation = await validate_submission_materials(db, submission)

    submission.validation_summary = {
        "ok": validation.ok,
        "errors": [e.model_dump() for e in validation.errors],
        "summary": validation.summary,
    }
    submission.validated_at = datetime.utcnow()

    if not validation.ok:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "材料校验未通过，请补全所有必填材料",
                "errors": [e.model_dump() for e in validation.errors],
            }
        )

    # 提交成功
    submission.status = SubmissionStatus.SUBMITTED.value
    submission.submitted_at = datetime.utcnow()

    await db.commit()

    # 重新加载
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.attachments))
        .where(Submission.id == submission.id)
    )
    submission = result.scalar_one()

    logger.info(f"用户 {current_user.username} 成功提交作品 #{submission_id}")

    return SubmissionResponse.model_validate(submission)


# ============================================================================
# 管理审核端点
# ============================================================================

@router.post(
    "/{submission_id}/review",
    response_model=SubmissionResponse,
    summary="审核作品（管理员/评审）",
    description="通过或拒绝作品。",
)
async def review_submission(
    submission_id: int,
    payload: SubmissionReviewRequest,
    db: AsyncSession = Depends(get_db),
    reviewer: User = Depends(require_admin_or_reviewer),
):
    """审核作品"""
    submission = await get_submission_or_404(db, submission_id, load_attachments=True)

    if submission.status != SubmissionStatus.SUBMITTED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"作品状态为 {submission.status}，无法审核"
        )

    if payload.action == "approve":
        submission.status = SubmissionStatus.APPROVED.value
    elif payload.action == "reject":
        submission.status = SubmissionStatus.REJECTED.value
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的审核操作"
        )

    submission.reviewer_id = reviewer.id
    submission.review_comment = payload.comment
    submission.reviewed_at = datetime.utcnow()

    await db.commit()

    # 重新加载
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.attachments))
        .where(Submission.id == submission.id)
    )
    submission = result.scalar_one()

    logger.info(
        f"评审 {reviewer.username} {payload.action} 作品 #{submission_id}"
    )

    return SubmissionResponse.model_validate(submission)
