-- 扩展 user_stats 表，添加扭蛋、竞猜、任务相关统计字段
-- 支持成就系统精确触发

-- 添加扭蛋相关字段
ALTER TABLE user_stats
ADD COLUMN total_gacha_count INT NOT NULL DEFAULT 0 COMMENT '扭蛋总次数',
ADD COLUMN gacha_rare_count INT NOT NULL DEFAULT 0 COMMENT '扭蛋稀有奖品次数';

-- 添加竞猜相关字段
ALTER TABLE user_stats
ADD COLUMN prediction_total INT NOT NULL DEFAULT 0 COMMENT '竞猜总次数',
ADD COLUMN prediction_correct INT NOT NULL DEFAULT 0 COMMENT '竞猜正确次数';

-- 添加任务相关字段
ALTER TABLE user_stats
ADD COLUMN daily_task_streak INT NOT NULL DEFAULT 0 COMMENT '连续完成每日任务天数',
ADD COLUMN max_daily_task_streak INT NOT NULL DEFAULT 0 COMMENT '最大连续完成天数',
ADD COLUMN weekly_tasks_completed INT NOT NULL DEFAULT 0 COMMENT '完成的周任务数',
ADD COLUMN last_task_date DATE DEFAULT NULL COMMENT '最后完成任务日期';
