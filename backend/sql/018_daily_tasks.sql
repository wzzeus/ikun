-- =====================================================
-- 018_daily_tasks.sql
-- 每日/每周任务系统
-- =====================================================

-- 1. 任务定义表（管理员可配置）
CREATE TABLE IF NOT EXISTS task_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_key VARCHAR(100) NOT NULL UNIQUE COMMENT '任务唯一key（用于前端/配置）',
    name VARCHAR(100) NOT NULL COMMENT '任务名称',
    description VARCHAR(500) DEFAULT NULL COMMENT '任务描述',

    -- 任务类型配置
    schedule ENUM('DAILY', 'WEEKLY') NOT NULL COMMENT '任务周期',
    task_type ENUM(
        'SIGNIN',          -- 签到
        'BROWSE_PROJECT',  -- 浏览项目
        'CHEER',           -- 打气
        'VOTE',            -- 投票
        'COMMENT',         -- 评论
        'PREDICTION',      -- 竞猜
        'LOTTERY',         -- 抽奖
        'GACHA',           -- 扭蛋
        'EXCHANGE',        -- 兑换
        'CHAIN_BONUS'      -- 任务链奖励
    ) NOT NULL COMMENT '任务类型',

    -- 目标与奖励
    target_value INT NOT NULL DEFAULT 1 COMMENT '目标次数',
    reward_points INT NOT NULL DEFAULT 0 COMMENT '奖励积分',
    reward_payload JSON DEFAULT NULL COMMENT '扩展奖励（道具等）',

    -- 配置开关
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    auto_claim TINYINT(1) NOT NULL DEFAULT 1 COMMENT '完成后是否自动发放奖励',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序（越小越靠前）',

    -- 有效期（NULL表示不限制）
    starts_at DATETIME DEFAULT NULL COMMENT '开始时间',
    ends_at DATETIME DEFAULT NULL COMMENT '结束时间',

    -- 任务链配置
    chain_group_key VARCHAR(50) DEFAULT NULL COMMENT '任务分组key（用于任务链条件）',
    chain_requires_group_key VARCHAR(50) DEFAULT NULL COMMENT '任务链依赖分组key（CHAIN_BONUS专用）',

    -- 元数据
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_active_schedule_sort (is_active, schedule, sort_order),
    INDEX idx_type_schedule (task_type, schedule),
    INDEX idx_chain_group (chain_group_key),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务定义（每日/每周）';

-- 2. 用户任务进度表（实时累加）
CREATE TABLE IF NOT EXISTS user_task_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,

    period_start DATE NOT NULL COMMENT '周期开始日期（DAILY为当天，WEEKLY为周一）',
    period_end DATE NOT NULL COMMENT '周期结束日期',

    progress_value INT NOT NULL DEFAULT 0 COMMENT '当前进度',
    target_value INT NOT NULL DEFAULT 1 COMMENT '目标快照（防止配置变更影响已有进度）',

    completed_at DATETIME DEFAULT NULL COMMENT '完成时间',
    claimed_at DATETIME DEFAULT NULL COMMENT '领取/发放时间',
    last_event_at DATETIME DEFAULT NULL COMMENT '最近一次进度更新事件时间',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_task_period (user_id, task_id, period_start),
    INDEX idx_user_period (user_id, period_start),
    INDEX idx_task_period (task_id, period_start),
    INDEX idx_completed (user_id, completed_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES task_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户任务进度';

-- 3. 用户任务领取记录（并发安全 + 幂等）
CREATE TABLE IF NOT EXISTS user_task_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    period_start DATE NOT NULL COMMENT '周期开始日期',

    reward_points INT NOT NULL DEFAULT 0 COMMENT '奖励积分快照',
    reward_payload JSON DEFAULT NULL COMMENT '扩展奖励快照（JSON）',

    request_id VARCHAR(64) NOT NULL UNIQUE COMMENT '幂等请求ID（用于防重复领取/跨系统幂等）',
    claimed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_task_claim (user_id, task_id, period_start),
    INDEX idx_user_claimed_at (user_id, claimed_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES task_definitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户任务领取记录';

-- 4. 任务事件去重表（同一业务事件只计一次进度）
CREATE TABLE IF NOT EXISTS user_task_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    schedule ENUM('DAILY', 'WEEKLY') NOT NULL,
    period_start DATE NOT NULL,

    task_type ENUM(
        'SIGNIN', 'BROWSE_PROJECT', 'CHEER', 'VOTE', 'COMMENT',
        'PREDICTION', 'LOTTERY', 'GACHA', 'EXCHANGE', 'CHAIN_BONUS'
    ) NOT NULL,
    event_key VARCHAR(128) NOT NULL COMMENT '事件幂等key（如 cheer:123 / signin:2025-01-01）',

    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
    ref_id INT DEFAULT NULL COMMENT '关联ID',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user_period_event (user_id, schedule, period_start, event_key),
    INDEX idx_user_type_period (user_id, task_type, schedule, period_start),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务事件去重';

-- =====================================================
-- 初始化：默认每日任务配置
-- =====================================================

INSERT INTO task_definitions
    (task_key, name, description, schedule, task_type, target_value, reward_points, is_active, auto_claim, sort_order, chain_group_key)
VALUES
    ('daily_signin', '每日签到', '完成每日签到', 'DAILY', 'SIGNIN', 1, 20, 1, 1, 10, 'daily_core'),
    ('daily_browse_3', '浏览项目', '浏览3个项目详情页', 'DAILY', 'BROWSE_PROJECT', 3, 15, 1, 1, 20, 'daily_core'),
    ('daily_cheer_1', '给选手打气', '为任意选手打气1次', 'DAILY', 'CHEER', 1, 20, 1, 1, 30, 'daily_core'),
    ('daily_vote_1', '投票支持', '为喜欢的作品投票1次', 'DAILY', 'VOTE', 1, 15, 1, 1, 40, 'daily_core'),
    ('daily_prediction', '参与竞猜', '参与一次竞猜下注', 'DAILY', 'PREDICTION', 1, 20, 1, 1, 50, 'daily_core'),
    ('daily_lottery', '幸运抽奖', '参与一次抽奖活动', 'DAILY', 'LOTTERY', 1, 10, 1, 1, 60, 'daily_core');

-- 初始化：每日任务链额外奖励（完成 daily_core 组全部任务）
INSERT INTO task_definitions
    (task_key, name, description, schedule, task_type, target_value, reward_points, is_active, auto_claim, sort_order, chain_requires_group_key)
VALUES
    ('daily_all_complete', '今日全勤', '完成所有每日任务后额外奖励', 'DAILY', 'CHAIN_BONUS', 1, 100, 1, 1, 999, 'daily_core');

-- =====================================================
-- 初始化：默认每周任务配置
-- =====================================================

INSERT INTO task_definitions
    (task_key, name, description, schedule, task_type, target_value, reward_points, is_active, auto_claim, sort_order, chain_group_key)
VALUES
    ('weekly_signin_5', '周签到达人', '本周累计签到5天', 'WEEKLY', 'SIGNIN', 5, 100, 1, 1, 10, 'weekly_core'),
    ('weekly_cheer_10', '应援达人', '本周累计打气10次', 'WEEKLY', 'CHEER', 10, 80, 1, 1, 20, 'weekly_core'),
    ('weekly_vote_5', '投票达人', '本周累计投票5次', 'WEEKLY', 'VOTE', 5, 60, 1, 1, 30, 'weekly_core'),
    ('weekly_lottery_7', '幸运七连抽', '本周累计抽奖7次', 'WEEKLY', 'LOTTERY', 7, 50, 1, 1, 40, 'weekly_core');

-- 每周任务链奖励
INSERT INTO task_definitions
    (task_key, name, description, schedule, task_type, target_value, reward_points, is_active, auto_claim, sort_order, chain_requires_group_key)
VALUES
    ('weekly_all_complete', '周全勤王', '完成所有每周任务后额外奖励', 'WEEKLY', 'CHAIN_BONUS', 1, 200, 1, 1, 999, 'weekly_core');

-- =====================================================
-- 更新积分变动原因 ENUM（新增 TASK_REWARD / TASK_CHAIN_BONUS）
-- =====================================================

ALTER TABLE points_ledger MODIFY COLUMN reason ENUM(
    'SIGNIN_DAILY', 'SIGNIN_STREAK_BONUS',
    'CHEER_GIVE', 'CHEER_RECEIVE',
    'LOTTERY_SPEND', 'LOTTERY_WIN',
    'BET_STAKE', 'BET_PAYOUT', 'BET_REFUND',
    'ADMIN_GRANT', 'ADMIN_DEDUCT',
    'ACHIEVEMENT_CLAIM', 'EASTER_EGG_REDEEM',
    'GACHA_SPEND', 'EXCHANGE_SPEND',
    'TASK_REWARD', 'TASK_CHAIN_BONUS'
) NOT NULL;
