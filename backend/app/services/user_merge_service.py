"""
用户合并服务
"""
from datetime import datetime
from typing import Iterable
import logging

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.achievement import UserAchievement, UserBadgeShowcase, UserStats
from app.models.points import UserPoints
from app.models.password_reset import PasswordResetToken


ROLE_PRIORITY = {
    "spectator": 0,
    "contestant": 1,
    "reviewer": 2,
    "admin": 3,
}

ACHIEVEMENT_PRIORITY = {
    "locked": 0,
    "unlocked": 1,
    "claimed": 2,
}

logger = logging.getLogger(__name__)


async def _get_existing_tables(db: AsyncSession) -> set[str]:
    result = await db.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()")
    )
    return {row[0] for row in result.fetchall()}


def _pick_role(target_role: str, source_role: str) -> str:
    """保留权限更高的角色"""
    target_level = ROLE_PRIORITY.get(target_role or "", 0)
    source_level = ROLE_PRIORITY.get(source_role or "", 0)
    return source_role if source_level > target_level else target_role


def _merge_list(left: Iterable | None, right: Iterable | None) -> list | None:
    """合并列表去重"""
    if not left and not right:
        return None
    merged = []
    if left:
        merged.extend(left)
    if right:
        merged.extend(right)
    return list(dict.fromkeys(merged))


async def _dedupe_and_update(
    db: AsyncSession,
    table: str,
    column: str,
    key_columns: list[str],
    source_id: int,
    target_id: int,
) -> None:
    """删除冲突后更新外键"""
    join_conditions = " AND ".join([f"t.{key} = s.{key}" for key in key_columns])
    delete_sql = f"""
        DELETE s FROM {table} s
        JOIN {table} t ON {join_conditions}
        WHERE s.{column} = :source_id AND t.{column} = :target_id
    """
    await db.execute(text(delete_sql), {"source_id": source_id, "target_id": target_id})
    await db.execute(
        text(f"UPDATE {table} SET {column} = :target_id WHERE {column} = :source_id"),
        {"source_id": source_id, "target_id": target_id},
    )


async def _update_column(
    db: AsyncSession,
    table: str,
    column: str,
    source_id: int,
    target_id: int,
) -> None:
    """批量更新外键列"""
    await db.execute(
        text(f"UPDATE {table} SET {column} = :target_id WHERE {column} = :source_id"),
        {"source_id": source_id, "target_id": target_id},
    )


async def _merge_user_points(db: AsyncSession, target_id: int, source_id: int) -> None:
    """合并积分汇总"""
    target = await db.get(UserPoints, target_id)
    source = await db.get(UserPoints, source_id)
    if not source:
        return
    if target:
        target.balance += source.balance
        target.total_earned += source.total_earned
        target.total_spent += source.total_spent
        await db.delete(source)
        return
    source.user_id = target_id


async def _merge_user_stats(db: AsyncSession, target_id: int, source_id: int) -> None:
    """合并用户统计"""
    target = await db.get(UserStats, target_id)
    source = await db.get(UserStats, source_id)
    if not source:
        return
    if not target:
        source.user_id = target_id
        return

    target.total_cheers_given += source.total_cheers_given
    target.total_cheers_with_message += source.total_cheers_with_message
    target.cheer_types_used = _merge_list(target.cheer_types_used, source.cheer_types_used)
    target.consecutive_days = max(target.consecutive_days, source.consecutive_days)
    target.max_consecutive_days = max(target.max_consecutive_days, source.max_consecutive_days)
    target.last_cheer_date = max(
        filter(None, [target.last_cheer_date, source.last_cheer_date]),
        default=target.last_cheer_date or source.last_cheer_date,
    )
    target.total_gacha_count += source.total_gacha_count
    target.gacha_rare_count += source.gacha_rare_count
    target.prediction_total += source.prediction_total
    target.prediction_correct += source.prediction_correct
    target.daily_task_streak = max(target.daily_task_streak, source.daily_task_streak)
    target.max_daily_task_streak = max(target.max_daily_task_streak, source.max_daily_task_streak)
    target.weekly_tasks_completed += source.weekly_tasks_completed
    target.last_task_date = max(
        filter(None, [target.last_task_date, source.last_task_date]),
        default=target.last_task_date or source.last_task_date,
    )
    target.total_points += source.total_points
    target.achievements_unlocked += source.achievements_unlocked
    await db.delete(source)


async def _merge_user_achievements(db: AsyncSession, target_id: int, source_id: int) -> None:
    """合并成就状态"""
    target_rows = (
        await db.execute(select(UserAchievement).where(UserAchievement.user_id == target_id))
    ).scalars().all()
    source_rows = (
        await db.execute(select(UserAchievement).where(UserAchievement.user_id == source_id))
    ).scalars().all()

    target_map = {row.achievement_key: row for row in target_rows}

    for row in source_rows:
        target_row = target_map.get(row.achievement_key)
        if not target_row:
            row.user_id = target_id
            continue

        target_status = ACHIEVEMENT_PRIORITY.get(target_row.status, 0)
        source_status = ACHIEVEMENT_PRIORITY.get(row.status, 0)
        if source_status > target_status:
            target_row.status = row.status
            target_row.progress_value = max(target_row.progress_value, row.progress_value)
            target_row.progress_data = target_row.progress_data or row.progress_data
            target_row.unlocked_at = row.unlocked_at or target_row.unlocked_at
            target_row.claimed_at = row.claimed_at or target_row.claimed_at
        elif source_status == target_status:
            target_row.progress_value = max(target_row.progress_value, row.progress_value)
            if not target_row.progress_data:
                target_row.progress_data = row.progress_data
        await db.delete(row)


async def _merge_user_badges(db: AsyncSession, target_id: int, source_id: int) -> None:
    """合并徽章展示"""
    target_rows = (
        await db.execute(select(UserBadgeShowcase).where(UserBadgeShowcase.user_id == target_id))
    ).scalars().all()
    source_rows = (
        await db.execute(select(UserBadgeShowcase).where(UserBadgeShowcase.user_id == source_id))
    ).scalars().all()

    target_slots = {row.slot for row in target_rows}
    for row in source_rows:
        if row.slot in target_slots:
            await db.delete(row)
            continue
        row.user_id = target_id


async def merge_users(db: AsyncSession, target_user: User, source_user: User) -> User:
    """合并两个用户账号（以 target_user 为主账号）"""
    if target_user.id == source_user.id:
        return target_user

    existing_tables = await _get_existing_tables(db)

    def has_table(name: str) -> bool:
        return name in existing_tables

    # 角色与基础信息合并
    target_user.role = _pick_role(target_user.role, source_user.role)
    if target_user.original_role is None:
        target_user.original_role = source_user.original_role or source_user.role or target_user.role
    else:
        if ROLE_PRIORITY.get(target_user.role or "", 0) > ROLE_PRIORITY.get(target_user.original_role or "", 0):
            target_user.original_role = target_user.role
    source_email = source_user.email
    source_github_id = source_user.github_id
    source_github_username = source_user.github_username
    source_github_email = source_user.github_email
    source_linux_do_id = source_user.linux_do_id
    source_linux_do_username = source_user.linux_do_username
    source_linux_do_avatar_template = source_user.linux_do_avatar_template

    if not target_user.display_name and source_user.display_name:
        target_user.display_name = source_user.display_name
    if not target_user.avatar_url and source_user.avatar_url:
        target_user.avatar_url = source_user.avatar_url
    if target_user.trust_level is None and source_user.trust_level is not None:
        target_user.trust_level = source_user.trust_level
    elif source_user.trust_level is not None:
        target_user.trust_level = max(target_user.trust_level or 0, source_user.trust_level)
    target_user.is_silenced = target_user.is_silenced or source_user.is_silenced
    target_user.role_selected = target_user.role_selected or source_user.role_selected
    if not target_user.role_selected_at and source_user.role_selected_at:
        target_user.role_selected_at = source_user.role_selected_at

    # 先清理 source 的唯一字段并落库，避免合并过程触发唯一约束冲突
    source_user.email = None
    source_user.github_id = None
    source_user.github_username = None
    source_user.github_email = None
    source_user.linux_do_id = None
    source_user.linux_do_username = None
    source_user.linux_do_avatar_template = None
    await db.flush()

    if not target_user.email and source_email:
        target_user.email = source_email
    if not target_user.github_id and source_github_id:
        target_user.github_id = source_github_id
    if not target_user.github_username and source_github_username:
        target_user.github_username = source_github_username
    if not target_user.github_email and source_github_email:
        target_user.github_email = source_github_email
    if not target_user.linux_do_id and source_linux_do_id:
        target_user.linux_do_id = source_linux_do_id
    if not target_user.linux_do_username and source_linux_do_username:
        target_user.linux_do_username = source_linux_do_username
    if not target_user.linux_do_avatar_template and source_linux_do_avatar_template:
        target_user.linux_do_avatar_template = source_linux_do_avatar_template

    # 先合并统计与徽章（表不存在时跳过）
    if has_table(UserPoints.__tablename__):
        await _merge_user_points(db, target_user.id, source_user.id)
    else:
        logger.warning("跳过合并积分表，表不存在: %s", UserPoints.__tablename__)

    if has_table(UserStats.__tablename__):
        await _merge_user_stats(db, target_user.id, source_user.id)
    else:
        logger.warning("跳过合并用户统计表，表不存在: %s", UserStats.__tablename__)

    if has_table(UserAchievement.__tablename__):
        await _merge_user_achievements(db, target_user.id, source_user.id)
    else:
        logger.warning("跳过合并用户成就表，表不存在: %s", UserAchievement.__tablename__)

    if has_table(UserBadgeShowcase.__tablename__):
        await _merge_user_badges(db, target_user.id, source_user.id)
    else:
        logger.warning("跳过合并徽章展示表，表不存在: %s", UserBadgeShowcase.__tablename__)

    # 清理密码重置令牌（表不存在时跳过）
    if has_table(PasswordResetToken.__tablename__):
        await db.execute(
            text("DELETE FROM password_reset_tokens WHERE user_id = :source_id"),
            {"source_id": source_user.id},
        )
    else:
        logger.warning("跳过清理密码重置令牌，表不存在: %s", PasswordResetToken.__tablename__)

    user_id_dedupe_rules = [
        ("registrations", ["contest_id"]),
        ("project_likes", ["project_id"]),
        ("project_favorites", ["project_id"]),
        ("votes", ["submission_id"]),
        ("daily_signins", ["signin_date"]),
        ("user_items", ["item_type"]),
        ("user_exchange_quotas", ["quota_type"]),
        ("user_task_progress", ["task_id", "period_start"]),
        ("user_task_claims", ["task_id", "period_start"]),
        ("user_task_events", ["schedule", "period_start", "event_key"]),
    ]
    for table, keys in user_id_dedupe_rules:
        if not has_table(table):
            logger.warning("跳过合并表（不存在）: %s", table)
            continue
        await _dedupe_and_update(db, table, "user_id", keys, source_user.id, target_user.id)

    reviewer_id_dedupe_rules = [
        ("submission_reviews", ["submission_id"]),
        ("project_review_assignments", ["project_id"]),
        ("project_reviews", ["project_id"]),
    ]
    for table, keys in reviewer_id_dedupe_rules:
        if not has_table(table):
            logger.warning("跳过合并表（不存在）: %s", table)
            continue
        await _dedupe_and_update(db, table, "reviewer_id", keys, source_user.id, target_user.id)

    user_id_tables = [
        "projects",
        "submissions",
        "project_submissions",
        "cheers",
        "points_ledger",
        "exchange_records",
        "lottery_draws",
        "scratch_cards",
        "gacha_draws",
        "slot_machine_draws",
        "prediction_bets",
        "request_logs",
        "system_logs",
    ]
    for table in user_id_tables:
        if not has_table(table):
            logger.warning("跳过合并表（不存在）: %s", table)
            continue
        await _update_column(db, table, "user_id", source_user.id, target_user.id)

    reviewer_tables = [
        "submissions",
    ]
    for table in reviewer_tables:
        if not has_table(table):
            logger.warning("跳过合并表（不存在）: %s", table)
            continue
        await _update_column(db, table, "reviewer_id", source_user.id, target_user.id)

    other_columns = [
        ("announcements", "author_id"),
        ("api_key_codes", "assigned_user_id"),
        ("task_definitions", "created_by"),
        ("lottery_configs", "created_by"),
        ("prediction_markets", "created_by"),
        ("gacha_configs", "created_by"),
        ("slot_machine_configs", "created_by"),
    ]
    for table, column in other_columns:
        if not has_table(table):
            logger.warning("跳过合并表（不存在）: %s", table)
            continue
        await _update_column(db, table, column, source_user.id, target_user.id)

    # 解除 source 用户的第三方绑定，禁用账号
    source_user.is_active = False
    source_user.github_id = None
    source_user.github_username = None
    source_user.github_email = None
    source_user.linux_do_id = None
    source_user.linux_do_username = None
    source_user.linux_do_avatar_template = None
    if source_user.email == target_user.email:
        source_user.email = None

    source_user.updated_at = datetime.utcnow()
    return target_user
