"""
每日/每周任务系统 API 端点

功能：
- 用户端：获取任务列表、领取奖励
- 管理端：任务定义 CRUD
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.task import TaskSchedule, TaskType
from app.services.task_service import TaskService

router = APIRouter()


# =========================================================================
# 权限检查
# =========================================================================

def require_admin(user: User) -> User:
    """检查管理员权限"""
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return user


# =========================================================================
# Pydantic 模型
# =========================================================================

class ClaimRequest(BaseModel):
    """领取奖励请求"""
    request_id: Optional[str] = Field(
        None,
        max_length=64,
        description="幂等请求ID（可选，不传则自动生成）"
    )


class TaskDefinitionCreate(BaseModel):
    """创建任务定义"""
    task_key: str = Field(..., min_length=1, max_length=100, description="任务唯一key")
    name: str = Field(..., min_length=1, max_length=100, description="任务名称")
    description: Optional[str] = Field(None, max_length=500, description="任务描述")
    schedule: TaskSchedule = Field(..., description="任务周期：DAILY/WEEKLY")
    task_type: TaskType = Field(..., description="任务类型")
    target_value: int = Field(1, ge=1, description="目标次数")
    reward_points: int = Field(0, ge=0, description="奖励积分")
    reward_payload: Optional[dict[str, Any]] = Field(None, description="扩展奖励")
    is_active: bool = Field(True, description="是否启用")
    auto_claim: bool = Field(True, description="完成后自动发放")
    sort_order: int = Field(0, description="排序")
    starts_at: Optional[datetime] = Field(None, description="开始时间")
    ends_at: Optional[datetime] = Field(None, description="结束时间")
    chain_group_key: Optional[str] = Field(None, max_length=50, description="任务分组key")
    chain_requires_group_key: Optional[str] = Field(None, max_length=50, description="链奖励依赖组key")


class TaskDefinitionUpdate(BaseModel):
    """更新任务定义"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    schedule: Optional[TaskSchedule] = None
    task_type: Optional[TaskType] = None
    target_value: Optional[int] = Field(None, ge=1)
    reward_points: Optional[int] = Field(None, ge=0)
    reward_payload: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None
    auto_claim: Optional[bool] = None
    sort_order: Optional[int] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    chain_group_key: Optional[str] = Field(None, max_length=50)
    chain_requires_group_key: Optional[str] = Field(None, max_length=50)


# =========================================================================
# 用户端点
# =========================================================================

@router.get("/definitions", summary="获取任务定义（公开）")
async def list_task_definitions(
    schedule: Optional[TaskSchedule] = Query(None, description="筛选周期：DAILY/WEEKLY"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取当前有效的任务定义列表

    - 仅返回已激活且在有效期内的任务
    - 按 sort_order 排序
    """
    items = await TaskService.list_definitions(
        db=db,
        schedule=schedule,
        include_inactive=False,
    )
    return {
        "items": [TaskService.serialize_definition(d) for d in items],
        "total": len(items),
    }


@router.get("/me", summary="获取我的任务列表")
async def get_my_tasks(
    schedule: TaskSchedule = Query(TaskSchedule.DAILY, description="任务周期"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取当前用户的任务列表（含进度）

    返回格式：
    ```json
    {
        "schedule": "DAILY",
        "period_start": "2025-01-15",
        "period_end": "2025-01-15",
        "items": [
            {
                "task": {...},
                "progress": {
                    "progress_value": 2,
                    "target_value": 3,
                    "is_completed": false,
                    "is_claimed": false,
                    "progress_percent": 66
                }
            }
        ],
        "stats": {"total": 6, "completed": 3, "claimed": 2}
    }
    ```
    """
    return await TaskService.get_user_tasks(
        db=db,
        user_id=current_user.id,
        schedule=schedule,
    )


@router.post("/me/{task_id}/claim", summary="领取任务奖励")
async def claim_task_reward(
    task_id: int,
    payload: ClaimRequest = ClaimRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    领取任务奖励（幂等）

    - 任务必须已完成才能领取
    - 重复调用返回 `already_claimed: true`
    - 积分自动发放到账户

    返回格式：
    ```json
    {
        "success": true,
        "task_id": 1,
        "already_claimed": false,
        "period_start": "2025-01-15",
        "reward_points": 20,
        "request_id": "task:123:1:2025-01-15"
    }
    ```
    """
    try:
        result = await TaskService.claim_task_reward(
            db=db,
            user_id=current_user.id,
            task_id=task_id,
            request_id=payload.request_id,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =========================================================================
# 管理端点
# =========================================================================

@router.get("/admin/definitions", summary="获取任务定义列表（管理员）")
async def admin_list_task_definitions(
    include_inactive: bool = Query(True, description="是否包含未激活任务"),
    schedule: Optional[TaskSchedule] = Query(None, description="筛选周期"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    管理员获取所有任务定义

    - 可查看未激活和已过期的任务
    """
    require_admin(current_user)

    items = await TaskService.list_definitions(
        db=db,
        schedule=schedule,
        include_inactive=include_inactive,
    )
    return {
        "items": [TaskService.serialize_definition(d) for d in items],
        "total": len(items),
    }


@router.post("/admin/definitions", summary="创建任务定义（管理员）")
async def admin_create_task_definition(
    payload: TaskDefinitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    管理员创建新任务定义

    注意：
    - task_key 必须唯一
    - CHAIN_BONUS 类型任务需设置 chain_requires_group_key
    """
    require_admin(current_user)

    try:
        task = await TaskService.create_definition(
            db=db,
            created_by=current_user.id,
            **payload.model_dump(),
        )
        await db.commit()
        return {
            "success": True,
            "item": TaskService.serialize_definition(task),
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"创建失败：{str(e)}",
        )


@router.put("/admin/definitions/{task_id}", summary="更新任务定义（管理员）")
async def admin_update_task_definition(
    task_id: int,
    payload: TaskDefinitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    管理员更新任务定义

    注意：
    - 修改 target_value 不影响已有进度（进度记录中有快照）
    - 修改 reward_points 不影响已领取的奖励
    """
    require_admin(current_user)

    task = await TaskService.update_definition(
        db=db,
        task_id=task_id,
        **payload.model_dump(exclude_unset=True),
    )

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在",
        )

    await db.commit()
    return {
        "success": True,
        "item": TaskService.serialize_definition(task),
    }


@router.delete("/admin/definitions/{task_id}", summary="停用任务定义（管理员）")
async def admin_deactivate_task_definition(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    管理员停用任务定义

    注意：
    - 停用后任务不再显示给用户
    - 已完成但未领取的奖励仍可领取
    - 如需彻底删除，请直接操作数据库
    """
    require_admin(current_user)

    success = await TaskService.deactivate_definition(
        db=db,
        task_id=task_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在",
        )

    await db.commit()
    return {"success": True}


@router.get("/admin/definitions/{task_id}", summary="获取任务定义详情（管理员）")
async def admin_get_task_definition(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取单个任务定义详情"""
    require_admin(current_user)

    task = await TaskService.get_definition_by_id(db=db, task_id=task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在",
        )

    return TaskService.serialize_definition(task)
