"""
成就系统服务
负责成就进度计算、解锁检测和统计更新
"""
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import (
    AchievementDefinition,
    AchievementStatus,
    UserAchievement,
    UserBadgeShowcase,
    UserStats,
)
from app.models.cheer import Cheer


# 成就规则配置
ACHIEVEMENT_RULES = {
    # ========== 打气类成就 ==========
    "cheer_first": {"type": "cheer_count", "target": 1},
    "cheer_10": {"type": "cheer_count", "target": 10},
    "cheer_50": {"type": "cheer_count", "target": 50},
    "cheer_100": {"type": "cheer_count", "target": 100},
    "cheerleader": {"type": "cheer_count", "target": 100},  # 啦啦队长

    # 打气类型类
    "cheer_all_types": {"type": "cheer_types", "target": 5},

    # 留言类
    "message_first": {"type": "message_count", "target": 1},
    "message_10": {"type": "message_count", "target": 10},
    "message_50": {"type": "message_count", "target": 50},

    # 连续打气类
    "streak_3": {"type": "streak", "target": 3},
    "streak_7": {"type": "streak", "target": 7},
    "streak_14": {"type": "streak", "target": 14},

    # 探索类
    "explore_all_projects": {"type": "unique_projects", "target": 5},
    "early_supporter": {"type": "early_bird", "target": 1, "days_from_start": 3},

    # ========== 扭蛋类成就 ==========
    "gacha_beginner": {"type": "gacha_count", "target": 1},      # 扭蛋新手
    "gacha_addict": {"type": "gacha_count", "target": 10},       # 扭蛋狂人
    "gacha_master": {"type": "gacha_count", "target": 50},       # 扭蛋大师
    "lucky_egg": {"type": "gacha_rare", "target": 1},            # 幸运蛋（获得稀有奖品）
    "golden_touch": {"type": "gacha_rare", "target": 5},         # 点金手（获得5次稀有）

    # ========== 彩蛋类成就（手动颁发，但保留规则以便统一管理）==========
    "easter_hunter": {"type": "easter_egg", "target": 1},        # 彩蛋猎人
    "secret_finder": {"type": "easter_egg", "target": 1},        # 秘密发现者
    "treasure_hunter": {"type": "easter_egg", "target": 1},      # 寻宝达人
    "lucky_star": {"type": "easter_egg", "target": 1},           # 幸运之星
    "ikun_pioneer": {"type": "easter_egg", "target": 1},         # iKun先锋

    # ========== 活动类成就 ==========
    "daily_warrior": {"type": "daily_task_streak", "target": 7}, # 每日战士（连续7天完成任务）
    "weekly_champion": {"type": "weekly_task_complete", "target": 4},  # 周冠军（完成4周任务）

    # ========== 竞猜类成就 ==========
    "prediction_king": {"type": "prediction_accuracy", "target": 80},  # 预言家（准确率>80%）
}


async def get_or_create_user_stats(db: AsyncSession, user_id: int) -> UserStats:
    """获取或创建用户统计（并发安全）"""
    result = await db.execute(
        select(UserStats).where(UserStats.user_id == user_id)
    )
    stats = result.scalar_one_or_none()

    if not stats:
        # 使用 INSERT IGNORE 避免并发冲突
        from sqlalchemy import text
        await db.execute(
            text("""
                INSERT IGNORE INTO user_stats (user_id, total_cheers_given, total_cheers_with_message,
                    consecutive_days, max_consecutive_days, total_points, achievements_unlocked)
                VALUES (:user_id, 0, 0, 0, 0, 0, 0)
            """),
            {"user_id": user_id}
        )
        await db.flush()
        # 重新查询
        result = await db.execute(
            select(UserStats).where(UserStats.user_id == user_id)
        )
        stats = result.scalar_one()

    return stats


async def get_or_create_user_achievement(
    db: AsyncSession, user_id: int, achievement_key: str
) -> UserAchievement:
    """获取或创建用户成就记录（并发安全）"""
    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_key == achievement_key,
        )
    )
    achievement = result.scalar_one_or_none()

    if not achievement:
        # 使用 INSERT IGNORE 避免并发冲突
        from sqlalchemy import text
        await db.execute(
            text("""
                INSERT IGNORE INTO user_achievements (user_id, achievement_key, status, progress_value)
                VALUES (:user_id, :achievement_key, 'locked', 0)
            """),
            {"user_id": user_id, "achievement_key": achievement_key}
        )
        await db.flush()
        # 重新查询
        result = await db.execute(
            select(UserAchievement).where(
                UserAchievement.user_id == user_id,
                UserAchievement.achievement_key == achievement_key,
            )
        )
        achievement = result.scalar_one()

    return achievement


async def update_user_stats_on_cheer(
    db: AsyncSession,
    user_id: int,
    cheer_type: str,
    has_message: bool,
    project_id: int,
) -> UserStats:
    """打气后更新用户统计"""
    stats = await get_or_create_user_stats(db, user_id)
    today = date.today()

    # 更新打气总数
    stats.total_cheers_given += 1

    # 更新带留言打气数
    if has_message:
        stats.total_cheers_with_message += 1

    # 更新打气类型集合
    types_used = stats.cheer_types_used or []
    if cheer_type not in types_used:
        types_used.append(cheer_type)
        stats.cheer_types_used = types_used

    # 更新连续天数
    if stats.last_cheer_date:
        days_diff = (today - stats.last_cheer_date).days
        if days_diff == 1:
            # 连续
            stats.consecutive_days += 1
        elif days_diff > 1:
            # 断了
            stats.consecutive_days = 1
        # days_diff == 0 表示今天已打过气，不更新
    else:
        stats.consecutive_days = 1

    # 更新最大连续天数
    if stats.consecutive_days > stats.max_consecutive_days:
        stats.max_consecutive_days = stats.consecutive_days

    # 更新最后打气日期
    if stats.last_cheer_date != today:
        stats.last_cheer_date = today

    await db.flush()
    return stats


async def check_and_unlock_achievements(
    db: AsyncSession,
    user_id: int,
    stats: UserStats,
    contest_start_date: Optional[date] = None,
) -> list[str]:
    """检查并解锁成就，返回新解锁的成就key列表"""
    newly_unlocked = []

    # 获取所有活跃成就定义
    result = await db.execute(
        select(AchievementDefinition).where(AchievementDefinition.is_active == True)
    )
    definitions = result.scalars().all()

    for definition in definitions:
        key = definition.achievement_key
        rule = ACHIEVEMENT_RULES.get(key)
        if not rule:
            continue

        # 获取用户成就记录
        user_ach = await get_or_create_user_achievement(db, user_id, key)

        # 已解锁则跳过
        if user_ach.status != AchievementStatus.LOCKED.value:
            continue

        # 计算进度和是否解锁
        progress = 0
        should_unlock = False

        rule_type = rule["type"]
        target = rule["target"]

        if rule_type == "cheer_count":
            progress = stats.total_cheers_given
            should_unlock = progress >= target

        elif rule_type == "cheer_types":
            progress = len(stats.cheer_types_used or [])
            should_unlock = progress >= target

        elif rule_type == "message_count":
            progress = stats.total_cheers_with_message
            should_unlock = progress >= target

        elif rule_type == "streak":
            progress = stats.consecutive_days
            should_unlock = progress >= target

        elif rule_type == "unique_projects":
            # 查询用户打气过的不同项目数
            result = await db.execute(
                select(func.count(func.distinct(Cheer.registration_id))).where(
                    Cheer.user_id == user_id
                )
            )
            progress = result.scalar() or 0
            should_unlock = progress >= target

        elif rule_type == "early_bird":
            # 早期支持者：比赛开始 N 天内打气
            if contest_start_date and stats.total_cheers_given > 0:
                days_from_start = rule.get("days_from_start", 3)
                deadline = contest_start_date + timedelta(days=days_from_start)
                if date.today() <= deadline:
                    progress = 1
                    should_unlock = True

        # ========== 扭蛋类成就 ==========
        elif rule_type == "gacha_count":
            progress = stats.total_gacha_count
            should_unlock = progress >= target

        elif rule_type == "gacha_rare":
            progress = stats.gacha_rare_count
            should_unlock = progress >= target

        # ========== 任务类成就 ==========
        elif rule_type == "daily_task_streak":
            progress = stats.max_daily_task_streak
            should_unlock = progress >= target

        elif rule_type == "weekly_task_complete":
            progress = stats.weekly_tasks_completed
            should_unlock = progress >= target

        # ========== 竞猜类成就 ==========
        elif rule_type == "prediction_accuracy":
            # 竞猜准确率需要至少10次竞猜
            if stats.prediction_total >= 10:
                accuracy = (stats.prediction_correct / stats.prediction_total) * 100
                progress = int(accuracy)
                should_unlock = progress >= target

        # ========== 彩蛋类成就（手动颁发，这里不自动检测）==========
        elif rule_type == "easter_egg":
            # 彩蛋成就通过特定 API 手动颁发，这里跳过
            continue

        # 更新进度
        user_ach.progress_value = progress

        # 解锁成就
        if should_unlock:
            user_ach.status = AchievementStatus.UNLOCKED.value
            user_ach.unlocked_at = datetime.utcnow()
            newly_unlocked.append(key)

            # 更新用户统计中的解锁数
            stats.achievements_unlocked += 1

    await db.flush()
    return newly_unlocked


async def claim_achievement(
    db: AsyncSession, user_id: int, achievement_key: str
) -> tuple[bool, int]:
    """领取成就奖励，返回(是否成功, 获得积分)"""
    # 获取成就定义
    result = await db.execute(
        select(AchievementDefinition).where(
            AchievementDefinition.achievement_key == achievement_key
        )
    )
    definition = result.scalar_one_or_none()
    if not definition:
        return False, 0

    # 获取用户成就
    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_key == achievement_key,
        )
    )
    user_ach = result.scalar_one_or_none()

    if not user_ach or user_ach.status != AchievementStatus.UNLOCKED.value:
        return False, 0

    # 领取
    user_ach.status = AchievementStatus.CLAIMED.value
    user_ach.claimed_at = datetime.utcnow()

    # 增加积分
    stats = await get_or_create_user_stats(db, user_id)
    stats.total_points += definition.points

    await db.flush()
    return True, definition.points


async def get_user_achievements(
    db: AsyncSession, user_id: int
) -> list[dict]:
    """获取用户所有成就及进度"""
    # 获取所有成就定义
    result = await db.execute(
        select(AchievementDefinition)
        .where(AchievementDefinition.is_active == True)
        .order_by(AchievementDefinition.sort_order)
    )
    definitions = result.scalars().all()

    # 获取用户成就记录
    result = await db.execute(
        select(UserAchievement).where(UserAchievement.user_id == user_id)
    )
    user_achs = {ua.achievement_key: ua for ua in result.scalars().all()}

    achievements = []
    for d in definitions:
        user_ach = user_achs.get(d.achievement_key)
        progress_value = user_ach.progress_value if user_ach else 0
        status = user_ach.status if user_ach else AchievementStatus.LOCKED.value

        # 计算进度百分比
        progress_percent = min(100, int((progress_value / d.target_value) * 100)) if d.target_value > 0 else 0

        achievements.append({
            "achievement_key": d.achievement_key,
            "name": d.name,
            "description": d.description,
            "category": d.category,
            "badge_icon": d.badge_icon,
            "badge_tier": d.badge_tier,
            "points": d.points,
            "target_value": d.target_value,
            "status": status,
            "progress_value": progress_value,
            "progress_percent": progress_percent,
            "unlocked_at": user_ach.unlocked_at if user_ach else None,
            "claimed_at": user_ach.claimed_at if user_ach else None,
        })

    return achievements


async def get_user_badge_showcase(
    db: AsyncSession, user_id: int
) -> list[dict]:
    """获取用户展示的徽章"""
    result = await db.execute(
        select(UserBadgeShowcase, AchievementDefinition)
        .join(
            AchievementDefinition,
            UserBadgeShowcase.achievement_key == AchievementDefinition.achievement_key,
        )
        .where(UserBadgeShowcase.user_id == user_id)
        .order_by(UserBadgeShowcase.slot)
    )
    rows = result.all()

    badges = []
    for showcase, definition in rows:
        badges.append({
            "slot": showcase.slot,
            "achievement_key": showcase.achievement_key,
            "name": definition.name,
            "badge_icon": definition.badge_icon,
            "badge_tier": definition.badge_tier,
        })

    return badges


async def set_badge_showcase(
    db: AsyncSession, user_id: int, slot: int, achievement_key: str
) -> bool:
    """设置徽章展示槽位"""
    # 验证用户已获得该成就
    result = await db.execute(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_key == achievement_key,
            UserAchievement.status.in_([
                AchievementStatus.UNLOCKED.value,
                AchievementStatus.CLAIMED.value,
            ]),
        )
    )
    if not result.scalar_one_or_none():
        return False

    # 检查是否已存在该槽位
    result = await db.execute(
        select(UserBadgeShowcase).where(
            UserBadgeShowcase.user_id == user_id,
            UserBadgeShowcase.slot == slot,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.achievement_key = achievement_key
        existing.pinned_at = datetime.utcnow()
    else:
        showcase = UserBadgeShowcase(
            user_id=user_id,
            slot=slot,
            achievement_key=achievement_key,
        )
        db.add(showcase)

    await db.flush()
    return True


async def remove_badge_showcase(db: AsyncSession, user_id: int, slot: int) -> bool:
    """移除徽章展示"""
    result = await db.execute(
        select(UserBadgeShowcase).where(
            UserBadgeShowcase.user_id == user_id,
            UserBadgeShowcase.slot == slot,
        )
    )
    showcase = result.scalar_one_or_none()

    if showcase:
        await db.delete(showcase)
        await db.flush()
        return True

    return False


# ========== 扭蛋成就触发 ==========

async def update_user_stats_on_gacha(
    db: AsyncSession,
    user_id: int,
    is_rare: bool = False,
) -> UserStats:
    """扭蛋后更新用户统计"""
    stats = await get_or_create_user_stats(db, user_id)

    # 更新扭蛋总数
    stats.total_gacha_count += 1

    # 如果是稀有奖品
    if is_rare:
        stats.gacha_rare_count += 1

    await db.flush()
    return stats


# ========== 竞猜成就触发 ==========

async def update_user_stats_on_prediction(
    db: AsyncSession,
    user_id: int,
    is_correct: bool,
) -> UserStats:
    """竞猜结算后更新用户统计"""
    stats = await get_or_create_user_stats(db, user_id)

    # 更新竞猜统计
    stats.prediction_total += 1
    if is_correct:
        stats.prediction_correct += 1

    await db.flush()
    return stats


# ========== 任务成就触发 ==========

async def update_user_stats_on_task_complete(
    db: AsyncSession,
    user_id: int,
    is_daily: bool = True,
    is_weekly: bool = False,
) -> UserStats:
    """任务完成后更新用户统计"""
    stats = await get_or_create_user_stats(db, user_id)
    today = date.today()

    if is_daily:
        # 更新连续完成天数
        if stats.last_task_date:
            days_diff = (today - stats.last_task_date).days
            if days_diff == 1:
                stats.daily_task_streak += 1
            elif days_diff > 1:
                stats.daily_task_streak = 1
            # days_diff == 0 表示今天已完成，不更新
        else:
            stats.daily_task_streak = 1

        # 更新最大连续天数
        if stats.daily_task_streak > stats.max_daily_task_streak:
            stats.max_daily_task_streak = stats.daily_task_streak

        # 更新最后完成日期
        if stats.last_task_date != today:
            stats.last_task_date = today

    if is_weekly:
        stats.weekly_tasks_completed += 1

    await db.flush()
    return stats
