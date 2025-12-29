-- ============================================================================
-- 038 - 评审员评分表
-- 数据库: MySQL 8.x
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/038_submission_reviews.sql
-- ============================================================================

USE `chicken_king`;
SET NAMES utf8mb4;

-- 1) 创建评分明细表：每个评审员对每个作品的评分记录
CREATE TABLE IF NOT EXISTS `submission_reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `submission_id` INT NOT NULL COMMENT '作品ID',
  `reviewer_id` INT NOT NULL COMMENT '评审员用户ID',

  `score` TINYINT UNSIGNED NOT NULL COMMENT '评分(1-100)',
  `comment` VARCHAR(2000) NULL COMMENT '评审意见(可选)',

  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),

  -- 每个评审员对每个作品最多一条评分记录
  UNIQUE KEY `uk_submission_reviewer` (`submission_id`, `reviewer_id`),

  -- 常用查询索引
  KEY `idx_submission_id` (`submission_id`),
  KEY `idx_reviewer_id` (`reviewer_id`),

  -- 外键约束
  CONSTRAINT `fk_reviews_submission`
    FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_reviews_reviewer`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- 评分范围检查
  CONSTRAINT `chk_score_range` CHECK (`score` BETWEEN 1 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='评审员评分明细表';

-- 2) 为 submissions 表添加缓存字段(可选，用于提升排行榜性能)
-- 这些字段由后台异步更新，不影响核心评分逻辑

-- 检查并添加 final_score 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'chicken_king' AND TABLE_NAME = 'submissions' AND COLUMN_NAME = 'final_score');
SET @sql = IF(@col_exists = 0,
              'ALTER TABLE `submissions` ADD COLUMN `final_score` DECIMAL(5,2) NULL COMMENT ''最终得分(去掉最高最低后平均)''',
              'SELECT ''final_score column already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 review_count 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'chicken_king' AND TABLE_NAME = 'submissions' AND COLUMN_NAME = 'review_count');
SET @sql = IF(@col_exists = 0,
              'ALTER TABLE `submissions` ADD COLUMN `review_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT ''评分数量''',
              'SELECT ''review_count column already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 score_updated_at 字段
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = 'chicken_king' AND TABLE_NAME = 'submissions' AND COLUMN_NAME = 'score_updated_at');
SET @sql = IF(@col_exists = 0,
              'ALTER TABLE `submissions` ADD COLUMN `score_updated_at` DATETIME NULL COMMENT ''评分统计更新时间''',
              'SELECT ''score_updated_at column already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 创建索引用于排行榜排序(如果不存在)
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                   WHERE TABLE_SCHEMA = 'chicken_king' AND TABLE_NAME = 'submissions' AND INDEX_NAME = 'idx_final_score');
SET @sql = IF(@idx_exists = 0,
              'CREATE INDEX `idx_final_score` ON `submissions` (`final_score` DESC)',
              'SELECT ''idx_final_score index already exists''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
