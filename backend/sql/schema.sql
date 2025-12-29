-- ============================================================================
-- 鸡王争霸赛 - 数据库初始化脚本
-- 数据库: MySQL 8.x
-- 字符集: utf8mb4
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `chicken_king`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `chicken_king`;

-- ============================================================================
-- 删除旧表（按依赖顺序）
-- ============================================================================
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `project_favorites`;
DROP TABLE IF EXISTS `project_likes`;
DROP TABLE IF EXISTS `project_reviews`;
DROP TABLE IF EXISTS `project_review_assignments`;
DROP TABLE IF EXISTS `project_submissions`;
DROP TABLE IF EXISTS `projects`;
DROP TABLE IF EXISTS `submissions`;
DROP TABLE IF EXISTS `registrations`;
DROP TABLE IF EXISTS `contests`;
DROP TABLE IF EXISTS `users`;

-- ============================================================================
-- 用户表
-- ============================================================================
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 基础认证信息
  `email` VARCHAR(255) NULL COMMENT '邮箱地址',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `hashed_password` VARCHAR(255) NULL COMMENT '密码哈希（OAuth用户为空）',
  `role` ENUM('admin', 'reviewer', 'contestant', 'spectator') NOT NULL DEFAULT 'spectator' COMMENT '用户角色: admin=管理员, reviewer=评审员, contestant=参赛者, spectator=吃瓜用户',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否激活',
  `avatar_url` VARCHAR(500) NULL COMMENT '头像URL',

  -- Linux.do OAuth 信息
  `linux_do_id` VARCHAR(50) NULL COMMENT 'Linux.do 用户ID',
  `linux_do_username` VARCHAR(50) NULL COMMENT 'Linux.do 用户名',
  `display_name` VARCHAR(100) NULL COMMENT '显示名称',
  `linux_do_avatar_template` VARCHAR(500) NULL COMMENT 'Linux.do 头像模板',
  `trust_level` INT NULL COMMENT 'Linux.do 信任等级',
  `is_silenced` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否被禁言',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_linux_do_id` (`linux_do_id`),
  KEY `ix_users_role` (`role`),
  KEY `ix_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================================
-- 比赛表
-- ============================================================================
CREATE TABLE `contests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 比赛基本信息
  `title` VARCHAR(200) NOT NULL COMMENT '比赛标题',
  `description` TEXT NULL COMMENT '比赛描述',
  `phase` ENUM('upcoming', 'signup', 'submission', 'voting', 'ended') NOT NULL DEFAULT 'upcoming' COMMENT '比赛阶段',

  -- 各阶段时间配置
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
CREATE TABLE `registrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '关联用户ID',

  -- 项目信息
  `title` VARCHAR(200) NOT NULL COMMENT '项目名称',
  `summary` VARCHAR(500) NOT NULL COMMENT '一句话简介',
  `description` TEXT NOT NULL COMMENT '项目详细介绍',
  `plan` TEXT NOT NULL COMMENT '实现计划/里程碑',
  `tech_stack` JSON NOT NULL COMMENT '技术栈（JSON格式）',

  -- 联系方式
  `contact_email` VARCHAR(255) NOT NULL COMMENT '联系邮箱',
  `contact_wechat` VARCHAR(100) NULL COMMENT '微信号（可选）',
  `contact_phone` VARCHAR(30) NULL COMMENT '手机号（可选）',

  -- 状态管理
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
CREATE TABLE `submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `user_id` INT NOT NULL COMMENT '提交者ID',
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',

  -- 作品信息
  `title` VARCHAR(200) NOT NULL COMMENT '作品标题',
  `description` TEXT NULL COMMENT '作品描述',
  `repo_url` VARCHAR(500) NOT NULL COMMENT '代码仓库URL',
  `demo_url` VARCHAR(500) NULL COMMENT '演示地址',
  `video_url` VARCHAR(500) NULL COMMENT '演示视频URL',

  -- 状态与统计
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `vote_count` INT NOT NULL DEFAULT 0 COMMENT '票数',

  PRIMARY KEY (`id`),
  KEY `ix_submissions_user` (`user_id`),
  KEY `ix_submissions_contest` (`contest_id`),
  KEY `ix_submissions_status` (`status`),
  KEY `ix_submissions_vote_count` (`vote_count` DESC),
  KEY `ix_submissions_contest_status_vote` (`contest_id`, `status`, `vote_count` DESC),
  CONSTRAINT `fk_submissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submissions_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品提交表';

-- ============================================================================
-- 作品表（部署体系）
-- ============================================================================
CREATE TABLE `projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '创建者ID',

  `title` VARCHAR(200) NOT NULL COMMENT '作品名称',
  `summary` VARCHAR(500) NULL COMMENT '作品简介',
  `description` TEXT NULL COMMENT '作品详情',
  `repo_url` VARCHAR(500) NULL COMMENT '开源仓库地址',
  `cover_image_url` VARCHAR(500) NULL COMMENT '封面图',
  `screenshot_urls` JSON NULL COMMENT '截图列表',
  `readme_url` VARCHAR(500) NULL COMMENT 'README 链接',
  `demo_url` VARCHAR(500) NULL COMMENT '演示地址',

  `status` ENUM('draft', 'submitted', 'online', 'offline') NOT NULL DEFAULT 'draft' COMMENT '作品状态',
  `current_submission_id` INT NULL COMMENT '当前线上 submission_id',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_contest_user` (`contest_id`, `user_id`),
  KEY `ix_projects_contest` (`contest_id`),
  KEY `ix_projects_user` (`user_id`),
  KEY `ix_projects_status` (`status`),
  CONSTRAINT `fk_projects_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品表';

-- ============================================================================
-- 作品部署提交表
-- ============================================================================
CREATE TABLE `project_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '提交者ID',

  `image_ref` VARCHAR(500) NOT NULL COMMENT '镜像引用（含 digest）',
  `image_registry` VARCHAR(100) NULL COMMENT '镜像仓库域名',
  `image_repo` VARCHAR(300) NULL COMMENT '镜像仓库路径',
  `image_digest` VARCHAR(128) NULL COMMENT '镜像 digest',

  `status` ENUM('created', 'queued', 'pulling', 'deploying', 'healthchecking', 'online', 'failed', 'stopped')
    NOT NULL DEFAULT 'created' COMMENT '提交状态',
  `status_message` VARCHAR(500) NULL COMMENT '状态说明',
  `error_code` VARCHAR(100) NULL COMMENT '错误码',
  `log` LONGTEXT NULL COMMENT '部署日志',
  `domain` VARCHAR(255) NULL COMMENT '访问域名',
  `status_history` JSON NULL COMMENT '状态历史',

  `submitted_at` DATETIME(6) NULL COMMENT '提交时间',
  `online_at` DATETIME(6) NULL COMMENT '上线时间',
  `failed_at` DATETIME(6) NULL COMMENT '失败时间',

  PRIMARY KEY (`id`),
  KEY `ix_project_submissions_project` (`project_id`),
  KEY `ix_project_submissions_contest` (`contest_id`),
  KEY `ix_project_submissions_user` (`user_id`),
  KEY `ix_project_submissions_status` (`status`),
  KEY `ix_project_submissions_contest_status` (`contest_id`, `status`),
  KEY `ix_project_submissions_submitted` (`submitted_at`),
  CONSTRAINT `fk_project_submissions_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_submissions_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_submissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品部署提交表';

-- ============================================================================
-- 作品评审分配表
-- ============================================================================
CREATE TABLE `project_review_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `reviewer_id` INT NOT NULL COMMENT '评审员用户ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_review_assignment` (`project_id`, `reviewer_id`),
  KEY `ix_project_review_assignments_project` (`project_id`),
  KEY `ix_project_review_assignments_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_project_review_assignments_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_review_assignments_reviewer_id`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品评审分配表';

-- ============================================================================
-- 作品评审评分表
-- ============================================================================
CREATE TABLE `project_reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `reviewer_id` INT NOT NULL COMMENT '评审员用户ID',
  `score` SMALLINT NOT NULL COMMENT '评分(1-100)',
  `comment` VARCHAR(2000) NULL COMMENT '评审意见(可选)',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_reviewer` (`project_id`, `reviewer_id`),
  KEY `ix_project_reviews_project` (`project_id`),
  KEY `ix_project_reviews_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_project_reviews_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_reviews_reviewer_id`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品评审评分表';

-- ============================================================================
-- 作品点赞表
-- ============================================================================
CREATE TABLE `project_likes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `user_id` INT NOT NULL COMMENT '点赞用户ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_like` (`project_id`, `user_id`),
  KEY `ix_project_likes_project` (`project_id`),
  KEY `ix_project_likes_user` (`user_id`),
  CONSTRAINT `fk_project_likes_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_likes_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品点赞表';

-- ============================================================================
-- 作品收藏表
-- ============================================================================
CREATE TABLE `project_favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `user_id` INT NOT NULL COMMENT '收藏用户ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_favorite` (`project_id`, `user_id`),
  KEY `ix_project_favorites_project` (`project_id`),
  KEY `ix_project_favorites_user` (`user_id`),
  CONSTRAINT `fk_project_favorites_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_favorites_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品收藏表';

-- ============================================================================
-- 投票表
-- ============================================================================
CREATE TABLE `votes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `user_id` INT NOT NULL COMMENT '投票用户ID',
  `submission_id` INT NOT NULL COMMENT '被投作品ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vote_user_submission` (`user_id`, `submission_id`),
  KEY `ix_votes_submission` (`submission_id`),
  CONSTRAINT `fk_votes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_votes_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票表';

-- ============================================================================
-- 密码重置令牌表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `user_id` INT NOT NULL COMMENT '用户ID',
  `token_hash` VARCHAR(64) NOT NULL COMMENT '重置令牌哈希',
  `expires_at` DATETIME(6) NOT NULL COMMENT '过期时间',
  `used_at` DATETIME(6) NULL COMMENT '使用时间',
  `requested_ip` VARCHAR(50) NULL COMMENT '请求IP',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_password_reset_token_hash` (`token_hash`),
  KEY `ix_password_reset_user` (`user_id`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码重置令牌表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 初始数据：创建第一届比赛
-- ============================================================================
INSERT INTO `contests` (`title`, `description`, `phase`, `signup_start`, `signup_end`)
VALUES (
  '第一届鸡王争霸赛',
  '# ikuncode 开发者实战大赏\n\n这是一场面向所有开发者的创意编程比赛，展示你的技术实力，赢取丰厚奖品！',
  'signup',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);
