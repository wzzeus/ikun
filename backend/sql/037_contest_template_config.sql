-- ============================================================================
-- 比赛首页模板配置
-- 数据库: MySQL 8.x
-- 描述: 为 contests 表增加首页模板配置（JSON）
-- ============================================================================

USE `chicken_king`;

ALTER TABLE `contests`
  ADD COLUMN `template_config` JSON NULL COMMENT '首页模板配置（JSON）' AFTER `faq_md`;

SELECT '037_contest_template_config.sql 迁移完成' AS message;
