-- ============================================================================
-- 鸡王争霸赛 - Docker 初始化脚本 (00 - 主表结构)
-- 此文件会被 Docker 自动执行
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `chicken_king`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `chicken_king`;

-- ============================================================================
-- 用户表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 基础认证信息
  `email` VARCHAR(255) NULL COMMENT '邮箱地址',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `hashed_password` VARCHAR(255) NULL COMMENT '密码哈希（OAuth用户为空）',
  `role` ENUM('admin', 'reviewer', 'contestant', 'spectator') NOT NULL DEFAULT 'spectator' COMMENT '用户角色',
  `original_role` ENUM('admin', 'reviewer', 'contestant', 'spectator') NULL COMMENT '原始角色（管理员切换用）',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否激活',
  `avatar_url` VARCHAR(500) NULL COMMENT '头像URL',

  -- Linux.do OAuth 信息
  `linux_do_id` VARCHAR(50) NULL COMMENT 'Linux.do 用户ID',
  `linux_do_username` VARCHAR(50) NULL COMMENT 'Linux.do 用户名',
  `display_name` VARCHAR(100) NULL COMMENT '显示名称',
  `linux_do_avatar_template` VARCHAR(500) NULL COMMENT 'Linux.do 头像模板',
  `trust_level` INT NULL COMMENT 'Linux.do 信任等级',
  `is_silenced` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否被禁言',

  -- GitHub OAuth 信息
  `github_id` VARCHAR(50) NULL COMMENT 'GitHub 用户ID',
  `github_username` VARCHAR(100) NULL COMMENT 'GitHub 用户名',
  `github_avatar_url` VARCHAR(500) NULL COMMENT 'GitHub 头像URL',
  `github_email` VARCHAR(255) NULL COMMENT 'GitHub 邮箱',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_linux_do_id` (`linux_do_id`),
  UNIQUE KEY `uq_users_github_id` (`github_id`),
  KEY `ix_users_role` (`role`),
  KEY `ix_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================================
-- 比赛表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `contests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `title` VARCHAR(200) NOT NULL COMMENT '比赛标题',
  `description` TEXT NULL COMMENT '比赛描述',
  `phase` ENUM('upcoming', 'signup', 'submission', 'voting', 'ended') NOT NULL DEFAULT 'upcoming' COMMENT '比赛阶段',

  `signup_start` DATETIME NULL COMMENT '报名开始时间',
  `signup_end` DATETIME NULL COMMENT '报名结束时间',
  `submit_start` DATETIME NULL COMMENT '提交开始时间',
  `submit_end` DATETIME NULL COMMENT '提交结束时间',
  `vote_start` DATETIME NULL COMMENT '投票开始时间',
  `vote_end` DATETIME NULL COMMENT '投票结束时间',

  PRIMARY KEY (`id`),
  KEY `ix_contests_phase` (`phase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='比赛表';

-- ============================================================================
-- 报名表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `registrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '关联用户ID',

  `title` VARCHAR(200) NOT NULL COMMENT '项目名称',
  `summary` VARCHAR(500) NOT NULL COMMENT '一句话简介',
  `description` TEXT NOT NULL COMMENT '项目详细介绍',
  `plan` TEXT NOT NULL COMMENT '实现计划/里程碑',
  `tech_stack` JSON NOT NULL COMMENT '技术栈',
  `repo_url` VARCHAR(500) NULL COMMENT '仓库地址',

  `contact_email` VARCHAR(255) NOT NULL COMMENT '联系邮箱',
  `contact_wechat` VARCHAR(100) NULL COMMENT '微信号',
  `contact_phone` VARCHAR(30) NULL COMMENT '手机号',

  `status` ENUM('draft', 'submitted', 'approved', 'rejected', 'withdrawn') NOT NULL DEFAULT 'submitted' COMMENT '报名状态',
  `submitted_at` DATETIME NULL COMMENT '提交时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_registration_contest_user` (`contest_id`, `user_id`),
  KEY `ix_registration_contest_status` (`contest_id`, `status`),
  KEY `ix_registration_user` (`user_id`),
  CONSTRAINT `fk_registrations_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registrations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报名表';

-- ============================================================================
-- 作品提交表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '提交者ID',
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',

  `title` VARCHAR(200) NOT NULL COMMENT '作品标题',
  `description` TEXT NULL COMMENT '作品描述',
  `repo_url` VARCHAR(500) NOT NULL COMMENT '代码仓库URL',
  `demo_url` VARCHAR(500) NULL COMMENT '演示地址',
  `video_url` VARCHAR(500) NULL COMMENT '演示视频URL',

  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `vote_count` INT NOT NULL DEFAULT 0 COMMENT '票数',

  PRIMARY KEY (`id`),
  KEY `ix_submissions_user` (`user_id`),
  KEY `ix_submissions_contest` (`contest_id`),
  KEY `ix_submissions_status` (`status`),
  KEY `ix_submissions_vote_count` (`vote_count` DESC),
  CONSTRAINT `fk_submissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submissions_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品提交表';

-- ============================================================================
-- 投票表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `votes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '投票用户ID',
  `submission_id` INT NOT NULL COMMENT '被投作品ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vote_user_submission` (`user_id`, `submission_id`),
  KEY `ix_votes_submission` (`submission_id`),
  CONSTRAINT `fk_votes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_votes_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票表';

-- ============================================================================
-- GitHub 统计表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `github_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `registration_id` INT NOT NULL COMMENT '关联报名ID',
  `commits` INT NOT NULL DEFAULT 0 COMMENT '提交次数',
  `additions` INT NOT NULL DEFAULT 0 COMMENT '新增行数',
  `deletions` INT NOT NULL DEFAULT 0 COMMENT '删除行数',
  `last_commit_at` DATETIME NULL COMMENT '最后提交时间',
  `last_commit_message` VARCHAR(500) NULL COMMENT '最后提交信息',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_github_stats_registration` (`registration_id`),
  CONSTRAINT `fk_github_stats_registration_id` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GitHub统计表';

-- ============================================================================
-- GitHub 同步日志表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `github_sync_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  `registration_id` INT NOT NULL COMMENT '关联报名ID',
  `status` ENUM('success', 'failed') NOT NULL COMMENT '同步状态',
  `message` TEXT NULL COMMENT '日志信息',
  `commits_delta` INT NOT NULL DEFAULT 0 COMMENT '新增提交数',

  PRIMARY KEY (`id`),
  KEY `ix_github_sync_log_registration` (`registration_id`),
  KEY `ix_github_sync_log_created_at` (`created_at`),
  CONSTRAINT `fk_github_sync_log_registration_id` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GitHub同步日志表';

-- ============================================================================
-- 应援表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `cheers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '应援者ID',
  `registration_id` INT NOT NULL COMMENT '被应援的报名ID',
  `message` VARCHAR(200) NULL COMMENT '应援留言',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cheer_user_registration` (`user_id`, `registration_id`),
  KEY `ix_cheers_registration` (`registration_id`),
  CONSTRAINT `fk_cheers_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cheers_registration_id` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应援表';

-- ============================================================================
-- 公告表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告内容',
  `type` ENUM('info', 'warning', 'success', 'error') NOT NULL DEFAULT 'info' COMMENT '公告类型',
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `author_id` INT NULL COMMENT '作者ID',

  PRIMARY KEY (`id`),
  KEY `ix_announcements_is_active` (`is_active`),
  KEY `ix_announcements_is_pinned` (`is_pinned`),
  CONSTRAINT `fk_announcements_author_id` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告表';

-- ============================================================================
-- 用户统计表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `user_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '用户ID',
  `points` INT NOT NULL DEFAULT 0 COMMENT '积分',
  `level` INT NOT NULL DEFAULT 1 COMMENT '等级',
  `exp` INT NOT NULL DEFAULT 0 COMMENT '经验值',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_stats_user` (`user_id`),
  CONSTRAINT `fk_user_stats_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计表';

-- ============================================================================
-- 成就定义表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `achievement_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  `code` VARCHAR(50) NOT NULL COMMENT '成就代码',
  `name` VARCHAR(100) NOT NULL COMMENT '成就名称',
  `description` VARCHAR(500) NULL COMMENT '成就描述',
  `icon` VARCHAR(100) NULL COMMENT '图标',
  `category` VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '分类',
  `points` INT NOT NULL DEFAULT 10 COMMENT '奖励积分',
  `is_hidden` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否隐藏成就',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_achievement_definitions_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成就定义表';

-- ============================================================================
-- 用户成就表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '用户ID',
  `achievement_id` INT NOT NULL COMMENT '成就ID',
  `unlocked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '解锁时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_achievements_user_achievement` (`user_id`, `achievement_id`),
  KEY `ix_user_achievements_achievement` (`achievement_id`),
  CONSTRAINT `fk_user_achievements_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_achievements_achievement_id` FOREIGN KEY (`achievement_id`) REFERENCES `achievement_definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户成就表';

-- ============================================================================
-- 积分记录表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `point_records` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '用户ID',
  `amount` INT NOT NULL COMMENT '积分变化量（正为获得，负为消耗）',
  `reason` VARCHAR(100) NOT NULL COMMENT '原因',
  `description` VARCHAR(500) NULL COMMENT '详细描述',
  `ref_type` VARCHAR(50) NULL COMMENT '关联类型',
  `ref_id` INT NULL COMMENT '关联ID',

  PRIMARY KEY (`id`),
  KEY `ix_point_records_user` (`user_id`),
  KEY `ix_point_records_created_at` (`created_at`),
  CONSTRAINT `fk_point_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分记录表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 初始数据：创建第一届比赛
-- ============================================================================
INSERT INTO `contests` (`title`, `description`, `phase`, `signup_start`, `signup_end`)
SELECT '第一届鸡王争霸赛',
       '# ikuncode 开发者实战大赏\n\n这是一场面向所有开发者的创意编程比赛，展示你的技术实力，赢取丰厚奖品！',
       'signup',
       NOW(),
       DATE_ADD(NOW(), INTERVAL 30 DAY)
WHERE NOT EXISTS (SELECT 1 FROM `contests` WHERE `id` = 1);
