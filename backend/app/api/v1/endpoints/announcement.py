"""
公告管理 API
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.user import User, UserRole
from app.models.announcement import Announcement
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementListResponse,
    AuthorInfo,
)

router = APIRouter()


def require_admin(user: User) -> User:
    """要求管理员权限"""
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return user


def build_announcement_response(announcement: Announcement) -> dict:
    """构建公告响应"""
    return {
        "id": announcement.id,
        "title": announcement.title,
        "content": announcement.content,
        "type": announcement.type.value if hasattr(announcement.type, 'value') else announcement.type,
        "is_pinned": announcement.is_pinned,
        "is_active": announcement.is_active,
        "author": {
            "id": announcement.author.id,
            "username": announcement.author.username,
            "display_name": announcement.author.display_name,
            "avatar_url": announcement.author.avatar_url,
        } if announcement.author else None,
        "view_count": announcement.view_count,
        "published_at": announcement.published_at,
        "expires_at": announcement.expires_at,
        "created_at": announcement.created_at,
        "updated_at": announcement.updated_at,
    }


# ============================================================================
# 公开接口 - 查看公告
# ============================================================================

@router.get("/public", summary="获取公开公告列表")
async def get_public_announcements(
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    type: Optional[str] = Query(None, description="公告类型过滤"),
    db: AsyncSession = Depends(get_db),
):
    """获取公开的公告列表（已发布、未过期、已启用）"""
    now = datetime.now()

    # 构建查询条件
    conditions = [
        Announcement.is_active == True,
        Announcement.published_at != None,
        Announcement.published_at <= now,
        or_(
            Announcement.expires_at == None,
            Announcement.expires_at > now
        )
    ]

    if type:
        conditions.append(Announcement.type == type)

    # 查询总数
    count_query = select(func.count(Announcement.id)).where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 查询列表（置顶优先，然后按发布时间倒序）
    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(and_(*conditions))
        .order_by(desc(Announcement.is_pinned), desc(Announcement.published_at))
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(query)
    announcements = result.scalars().all()

    return {
        "items": [build_announcement_response(a) for a in announcements],
        "total": total,
    }


@router.get("/public/{announcement_id}", summary="获取单个公告详情")
async def get_public_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取单个公告详情并增加查看次数"""
    now = datetime.now()

    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(
            Announcement.id == announcement_id,
            Announcement.is_active == True,
            Announcement.published_at != None,
            Announcement.published_at <= now,
            or_(
                Announcement.expires_at == None,
                Announcement.expires_at > now
            )
        )
    )

    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在或已过期"
        )

    # 增加查看次数
    announcement.view_count += 1
    await db.commit()

    return build_announcement_response(announcement)


# ============================================================================
# 管理员接口 - 管理公告
# ============================================================================

@router.get("", summary="获取所有公告（管理员）")
async def list_announcements(
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    type: Optional[str] = Query(None, description="公告类型"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员获取所有公告列表"""
    require_admin(current_user)

    # 构建查询条件
    conditions = []
    if is_active is not None:
        conditions.append(Announcement.is_active == is_active)
    if type:
        conditions.append(Announcement.type == type)

    # 查询总数
    count_query = select(func.count(Announcement.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 查询列表
    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .order_by(desc(Announcement.is_pinned), desc(Announcement.created_at))
        .offset(offset)
        .limit(limit)
    )
    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    announcements = result.scalars().all()

    return {
        "items": [build_announcement_response(a) for a in announcements],
        "total": total,
    }


@router.post("", summary="创建公告", status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新公告"""
    require_admin(current_user)

    announcement = Announcement(
        title=payload.title,
        content=payload.content,
        type=payload.type.value,
        is_pinned=payload.is_pinned,
        is_active=payload.is_active,
        author_id=current_user.id,
        published_at=datetime.now() if payload.is_active else None,
        expires_at=payload.expires_at,
    )

    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)

    # 重新加载关联
    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.id == announcement.id)
    )
    result = await db.execute(query)
    announcement = result.scalar_one()

    return build_announcement_response(announcement)


@router.get("/{announcement_id}", summary="获取公告详情（管理员）")
async def get_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """管理员获取单个公告详情"""
    require_admin(current_user)

    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.id == announcement_id)
    )

    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )

    return build_announcement_response(announcement)


@router.put("/{announcement_id}", summary="更新公告")
async def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新公告"""
    require_admin(current_user)

    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.id == announcement_id)
    )

    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )

    # 更新字段
    if payload.title is not None:
        announcement.title = payload.title
    if payload.content is not None:
        announcement.content = payload.content
    if payload.type is not None:
        announcement.type = payload.type.value
    if payload.is_pinned is not None:
        announcement.is_pinned = payload.is_pinned
    if payload.is_active is not None:
        announcement.is_active = payload.is_active
        # 如果启用且尚未发布，设置发布时间
        if payload.is_active and not announcement.published_at:
            announcement.published_at = datetime.now()
    if payload.expires_at is not None:
        announcement.expires_at = payload.expires_at

    await db.commit()
    await db.refresh(announcement)

    return build_announcement_response(announcement)


@router.delete("/{announcement_id}", summary="删除公告", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除公告"""
    require_admin(current_user)

    query = select(Announcement).where(Announcement.id == announcement_id)
    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )

    await db.delete(announcement)
    await db.commit()

    return None


@router.post("/{announcement_id}/publish", summary="发布公告")
async def publish_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """发布公告（设置发布时间并启用）"""
    require_admin(current_user)

    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.id == announcement_id)
    )

    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )

    announcement.is_active = True
    announcement.published_at = datetime.now()

    await db.commit()
    await db.refresh(announcement)

    return build_announcement_response(announcement)


@router.post("/{announcement_id}/toggle-pin", summary="切换置顶状态")
async def toggle_pin_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """切换公告置顶状态"""
    require_admin(current_user)

    query = (
        select(Announcement)
        .options(selectinload(Announcement.author))
        .where(Announcement.id == announcement_id)
    )

    result = await db.execute(query)
    announcement = result.scalar_one_or_none()

    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )

    announcement.is_pinned = not announcement.is_pinned

    await db.commit()
    await db.refresh(announcement)

    return build_announcement_response(announcement)
