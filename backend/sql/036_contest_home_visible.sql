-- ============================================================================
-- 比赛首页展示配置
-- 数据库: MySQL 8.x
-- 描述: 为 contests 表增加首页展示标记
-- ============================================================================

USE `chicken_king`;

ALTER TABLE `contests`
  ADD COLUMN `home_visible` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否首页展示' AFTER `visibility`;

SELECT '036_contest_home_visible.sql 迁移完成' AS message;
