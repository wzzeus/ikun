-- 022_user_stats_gacha_fields.sql
-- 添加扭蛋机、竞猜和任务统计字段到 user_stats 表
-- 修复 gacha_draws 表缺少 updated_at 字段的问题

-- 扭蛋相关字段
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS total_gacha_count INT NOT NULL DEFAULT 0 COMMENT '扭蛋总次数' AFTER last_cheer_date,
ADD COLUMN IF NOT EXISTS gacha_rare_count INT NOT NULL DEFAULT 0 COMMENT '稀有奖品次数' AFTER total_gacha_count;

-- 竞猜相关字段
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS prediction_total INT NOT NULL DEFAULT 0 COMMENT '竞猜总次数' AFTER gacha_rare_count,
ADD COLUMN IF NOT EXISTS prediction_correct INT NOT NULL DEFAULT 0 COMMENT '竞猜正确次数' AFTER prediction_total;

-- 任务相关字段
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS daily_task_streak INT NOT NULL DEFAULT 0 COMMENT '每日任务连续完成天数' AFTER prediction_correct,
ADD COLUMN IF NOT EXISTS max_daily_task_streak INT NOT NULL DEFAULT 0 COMMENT '最大每日任务连续天数' AFTER daily_task_streak,
ADD COLUMN IF NOT EXISTS weekly_tasks_completed INT NOT NULL DEFAULT 0 COMMENT '累计完成的周任务数' AFTER max_daily_task_streak,
ADD COLUMN IF NOT EXISTS last_task_date DATE NULL COMMENT '上次完成任务日期' AFTER weekly_tasks_completed;

-- 修复 gacha_draws 表缺少 updated_at 字段
ALTER TABLE gacha_draws
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
