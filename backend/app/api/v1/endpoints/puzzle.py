"""
码神挑战 - 谜题 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from typing import List, Optional
import json

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user, get_current_user_optional
from app.models.user import User

router = APIRouter()

# ============ 进度同步相关 ============

class SyncProgressRequest(BaseModel):
    solved_levels: List[int]
    level_times: dict
    error_counts: dict


@router.post("/sync-progress")
async def sync_puzzle_progress(
    request: SyncProgressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    同步用户的码神挑战进度到服务器
    """
    total_solved = len(request.solved_levels)
    total_time = sum(request.level_times.values()) if request.level_times else 0
    total_errors = sum(request.error_counts.values()) if request.error_counts else 0

    # 使用 UPSERT 逻辑
    check_sql = text("SELECT id FROM puzzle_progress WHERE user_id = :user_id")
    result = await db.execute(check_sql, {"user_id": current_user.id})
    existing = result.fetchone()

    if existing:
        update_sql = text("""
            UPDATE puzzle_progress SET
                total_solved = :total_solved,
                total_time = :total_time,
                total_errors = :total_errors,
                solved_levels = :solved_levels,
                level_times = :level_times,
                level_errors = :level_errors,
                last_solved_at = NOW(),
                updated_at = NOW()
            WHERE user_id = :user_id
        """)
    else:
        update_sql = text("""
            INSERT INTO puzzle_progress
                (user_id, total_solved, total_time, total_errors, solved_levels, level_times, level_errors, last_solved_at)
            VALUES
                (:user_id, :total_solved, :total_time, :total_errors, :solved_levels, :level_times, :level_errors, NOW())
        """)

    await db.execute(update_sql, {
        "user_id": current_user.id,
        "total_solved": total_solved,
        "total_time": total_time,
        "total_errors": total_errors,
        "solved_levels": json.dumps(request.solved_levels),
        "level_times": json.dumps(request.level_times),
        "level_errors": json.dumps(request.error_counts),
    })
    await db.commit()

    return {
        "success": True,
        "total_solved": total_solved,
        "total_time": total_time
    }


@router.get("/my-progress")
async def get_my_puzzle_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户的码神挑战进度
    """
    sql = text("""
        SELECT total_solved, total_time, total_errors, solved_levels, level_times, level_errors, last_solved_at
        FROM puzzle_progress WHERE user_id = :user_id
    """)
    result = await db.execute(sql, {"user_id": current_user.id})
    row = result.fetchone()

    if not row:
        return {
            "total_solved": 0,
            "total_time": 0,
            "total_errors": 0,
            "solved_levels": [],
            "level_times": {},
            "level_errors": {}
        }

    return {
        "total_solved": row.total_solved,
        "total_time": row.total_time,
        "total_errors": row.total_errors,
        "solved_levels": json.loads(row.solved_levels) if row.solved_levels else [],
        "level_times": json.loads(row.level_times) if row.level_times else {},
        "level_errors": json.loads(row.level_errors) if row.level_errors else {},
        "last_solved_at": row.last_solved_at.isoformat() if row.last_solved_at else None
    }


# ============ 排行榜相关 ============

@router.get("/leaderboard")
async def get_puzzle_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    获取码神挑战排行榜
    按完成关卡数排序，关卡数相同则按用时排序
    """
    sql = text("""
        SELECT
            p.user_id,
            p.total_solved,
            p.total_time,
            p.total_errors,
            p.last_solved_at,
            u.username,
            u.display_name,
            u.avatar_url
        FROM puzzle_progress p
        JOIN users u ON p.user_id = u.id
        WHERE p.total_solved > 0
        ORDER BY p.total_solved DESC, p.total_time ASC
        LIMIT :limit
    """)
    result = await db.execute(sql, {"limit": limit})
    rows = result.fetchall()

    items = []
    for idx, row in enumerate(rows):
        items.append({
            "rank": idx + 1,
            "user": {
                "id": row.user_id,
                "username": row.username,
                "display_name": row.display_name or row.username,
                "avatar_url": row.avatar_url
            },
            "total_solved": row.total_solved,
            "total_time": row.total_time,
            "total_errors": row.total_errors,
            "last_solved_at": row.last_solved_at.isoformat() if row.last_solved_at else None,
            "is_completed": row.total_solved >= 42,
            "is_half": row.total_solved >= 21
        })

    # 查询当前用户排名
    my_rank = None
    if current_user:
        # 先检查用户是否有进度记录
        check_sql = text("SELECT total_solved, total_time FROM puzzle_progress WHERE user_id = :user_id")
        check_result = await db.execute(check_sql, {"user_id": current_user.id})
        user_progress = check_result.fetchone()

        if user_progress and user_progress.total_solved > 0:
            # 用户有记录，计算排名
            rank_sql = text("""
                SELECT COUNT(*) + 1 as user_rank FROM puzzle_progress
                WHERE total_solved > :user_solved
                OR (total_solved = :user_solved AND total_time < :user_time)
            """)
            rank_result = await db.execute(rank_sql, {
                "user_solved": user_progress.total_solved,
                "user_time": user_progress.total_time
            })
            rank_row = rank_result.fetchone()
            if rank_row:
                my_rank = rank_row.user_rank

    return {
        "items": items,
        "total": len(items),
        "my_rank": my_rank
    }


@router.get("/answer")
async def get_puzzle_answer():
    """
    第36关：返回谜题答案
    玩家需要通过 Network 面板或 Console 查看响应
    """
    return {
        "success": True,
        "message": "恭喜你找到了服务器的秘密！",
        "answer": "ikun_nb_666",
        "hint": "把 answer 字段的值填入答题框"
    }


class FinalPuzzleRequest(BaseModel):
    code: str


@router.post("/final")
async def get_final_answer(request: FinalPuzzleRequest):
    """
    第42关：终极挑战
    玩家需要手动发送 POST 请求调用此接口
    """
    if request.code == "IKUN2025":
        return {
            "success": True,
            "message": "🎉 恭喜通关码神挑战！",
            "answer": "ikuncode团队提前祝大家2026年元旦快乐，顺风顺水顺财神"
        }
    else:
        return {
            "success": False,
            "message": "code 不正确，再仔细看看题目？"
        }


class ClaimRewardRequest(BaseModel):
    reward_type: str  # "half" or "full"
    admin_bypass: bool = False  # 管理员调试跳过验证


@router.post("/claim-reward")
async def claim_puzzle_reward(
    request: ClaimRewardRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    领取码神挑战奖励
    - 半程奖励：完成21关
    - 全程奖励：完成42关
    """
    # 检查是否是管理员（用于调试跳过验证）
    is_admin = (current_user.original_role or current_user.role) == "admin"
    skip_validation = request.admin_bypass and is_admin

    # 从数据库读取用户实际完成的关卡数（不信任前端参数）
    progress_sql = text("SELECT total_solved FROM puzzle_progress WHERE user_id = :user_id")
    progress_result = await db.execute(progress_sql, {"user_id": current_user.id})
    progress_row = progress_result.fetchone()
    actual_solved = progress_row.total_solved if progress_row else 0

    # 验证领取条件（使用数据库中的实际数据，管理员调试可跳过）
    if request.reward_type == "half":
        if not skip_validation and actual_solved < 21:
            raise HTTPException(status_code=400, detail=f"未达到半程奖励条件（需完成21关，当前{actual_solved}关）")
        description = "码神挑战-半程奖励"
    elif request.reward_type == "full":
        if not skip_validation and actual_solved < 42:
            raise HTTPException(status_code=400, detail=f"未达到全程奖励条件（需完成42关，当前{actual_solved}关）")
        description = "码神挑战-全程奖励"
    else:
        raise HTTPException(status_code=400, detail="无效的奖励类型")

    # 检查用户是否已领取过该类型奖励
    check_sql = text("""
        SELECT id FROM api_key_codes
        WHERE assigned_user_id = :user_id AND description = :description
        LIMIT 1
    """)
    result = await db.execute(check_sql, {"user_id": current_user.id, "description": description})
    existing = result.fetchone()

    if existing:
        raise HTTPException(status_code=400, detail="您已领取过该奖励")

    # 查找可用的 API key（加行锁）
    find_sql = text("""
        SELECT id, code, quota FROM api_key_codes
        WHERE status = 'AVAILABLE' AND description = :description
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
    """)
    result = await db.execute(find_sql, {"description": description})
    available_key = result.fetchone()

    if not available_key:
        raise HTTPException(status_code=404, detail="奖励已发放完毕，请联系管理员")

    # 分配给用户（唯一约束 uk_api_key_user_reward_type 保证不会重复分配）
    try:
        assign_sql = text("""
            UPDATE api_key_codes
            SET status = 'ASSIGNED',
                assigned_user_id = :user_id,
                assigned_at = NOW()
            WHERE id = :key_id
        """)
        await db.execute(assign_sql, {"user_id": current_user.id, "key_id": available_key.id})
        await db.commit()
    except IntegrityError:
        # 唯一约束冲突：用户已通过并发请求领取了该奖励
        await db.rollback()
        raise HTTPException(status_code=400, detail="您已领取过该奖励，请勿重复提交")

    return {
        "success": True,
        "message": f"🎉 恭喜获得{'半程' if request.reward_type == 'half' else '全程'}奖励！",
        "api_key": available_key.code,
        "quota": float(available_key.quota),
        "reward_type": request.reward_type
    }


@router.get("/my-rewards")
async def get_my_puzzle_rewards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取用户已领取的码神挑战奖励
    """
    from sqlalchemy import text
    sql = text("""
        SELECT code, quota, description, assigned_at
        FROM api_key_codes
        WHERE assigned_user_id = :user_id
        AND description LIKE '码神挑战%'
        ORDER BY assigned_at DESC
    """)
    result = await db.execute(sql, {"user_id": current_user.id})
    rewards = result.fetchall()

    return {
        "rewards": [
            {
                "code": r.code,
                "quota": float(r.quota),
                "description": r.description,
                "assigned_at": r.assigned_at.isoformat() if r.assigned_at else None
            }
            for r in rewards
        ],
        "has_half_reward": any("半程" in r.description for r in rewards),
        "has_full_reward": any("全程" in r.description for r in rewards)
    }
