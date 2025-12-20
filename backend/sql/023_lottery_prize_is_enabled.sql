-- 为 lottery_prizes 表添加 is_enabled 字段
-- 支持管理端禁用/启用特定奖品

ALTER TABLE lottery_prizes
ADD COLUMN is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用'
AFTER is_rare;
