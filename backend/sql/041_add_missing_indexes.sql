-- ============================================================================
-- 041 - 补充关键复合索引
-- 数据库: MySQL 8.x
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/041_add_missing_indexes.sql
-- ============================================================================

USE `chicken_king`;
SET NAMES utf8mb4;

-- 1) submissions：按比赛 + 状态 + 投票数排序的复合索引
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'chicken_king'
    AND TABLE_NAME = 'submissions'
    AND INDEX_NAME = 'ix_submissions_contest_status_vote'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX `ix_submissions_contest_status_vote` ON `submissions` (`contest_id`, `status`, `vote_count` DESC)',
  'SELECT ''ix_submissions_contest_status_vote index already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) points_ledger：按用户 + 时间倒序查询的复合索引
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'chicken_king'
    AND TABLE_NAME = 'points_ledger'
    AND INDEX_NAME = 'idx_user_created_at'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_user_created_at` ON `points_ledger` (`user_id`, `created_at` DESC)',
  'SELECT ''idx_user_created_at index already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) prediction_bets：按用户 + 市场组合查询的复合索引
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'chicken_king'
    AND TABLE_NAME = 'prediction_bets'
    AND INDEX_NAME = 'idx_user_market'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX `idx_user_market` ON `prediction_bets` (`user_id`, `market_id`)',
  'SELECT ''idx_user_market index already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) project_submissions：按比赛 + 状态过滤的复合索引
SET @idx_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'chicken_king'
    AND TABLE_NAME = 'project_submissions'
    AND INDEX_NAME = 'ix_project_submissions_contest_status'
);
SET @sql = IF(
  @idx_exists = 0,
  'CREATE INDEX `ix_project_submissions_contest_status` ON `project_submissions` (`contest_id`, `status`)',
  'SELECT ''ix_project_submissions_contest_status index already exists'''
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
