-- MySQL dump 10.13  Distrib 8.0.43, for macos13.7 (arm64)
--
-- Host: localhost    Database: chicken_king
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `achievement_definitions`
--

DROP TABLE IF EXISTS `achievement_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `achievement_definitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `achievement_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成就唯一标识',
  `name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成就名称',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '成就描述',
  `category` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类: cheers/retention/social/explorer',
  `badge_icon` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '徽章图标标识',
  `badge_tier` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'bronze' COMMENT '稀有度: bronze/silver/gold/platinum',
  `points` int NOT NULL DEFAULT '0' COMMENT '成就积分',
  `target_value` int NOT NULL DEFAULT '1' COMMENT '目标值(如打气次数)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序权重',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_achievement_key` (`achievement_key`),
  KEY `idx_category_active` (`category`,`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成就定义表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `achievement_definitions`
--

LOCK TABLES `achievement_definitions` WRITE;
/*!40000 ALTER TABLE `achievement_definitions` DISABLE KEYS */;
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (1,'cheer_first','初次打气','送出你的第一份应援','cheers','heart','bronze',5,1,1,100,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (2,'cheer_10','小小应援','累计打气 10 次','cheers','heart','bronze',10,10,1,101,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (3,'cheer_50','应援达人','累计打气 50 次','cheers','heart','silver',25,50,1,102,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (4,'cheer_100','超级粉丝','累计打气 100 次','cheers','heart','gold',50,100,1,103,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (5,'cheer_all_types','全套礼物','使用过所有5种打气类型','cheers','gift','silver',30,5,1,110,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (6,'message_first','有话要说','第一次带留言打气','social','message','bronze',5,1,1,200,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (7,'message_10','话痨出道','带留言打气 10 次','social','message','silver',20,10,1,201,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (8,'message_50','金牌嘴替','带留言打气 50 次','social','message','gold',40,50,1,202,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (9,'streak_3','三天不断','连续 3 天打气','retention','fire','bronze',15,3,1,300,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (10,'streak_7','一周坚守','连续 7 天打气','retention','fire','silver',35,7,1,301,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (11,'streak_14','两周狂热','连续 14 天打气','retention','fire','gold',70,14,1,302,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (12,'explore_all_projects','全场巡视','给至少 5 个不同项目打过气','explorer','compass','silver',25,5,1,400,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (13,'early_supporter','先锋观众','在比赛开始 3 天内打气','explorer','rocket','bronze',20,1,1,401,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (14,'easter_hunter','彩蛋猎人','成功发现并兑换了隐藏彩蛋','easter_egg','egg','bronze',500,1,1,100,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (15,'secret_finder','秘密发现者','发现了网站中隐藏的秘密','easter_egg','search','silver',500,1,1,101,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (16,'treasure_hunter','寻宝达人','在寻宝活动中展现了非凡的能力','easter_egg','gem','gold',500,1,1,102,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (17,'lucky_star','幸运之星','被幸运女神眷顾的玩家','easter_egg','star','gold',500,1,1,103,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (18,'ikun_pioneer','iKun先锋','鸡王争霸赛的先锋参与者','easter_egg','crown','diamond',500,1,1,104,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (19,'gacha_beginner','扭蛋新手','首次使用扭蛋机','gacha','gift','bronze',100,1,1,200,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (20,'gacha_addict','扭蛋狂人','累计扭蛋10次','gacha','gift','silver',300,10,1,201,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (21,'gacha_master','扭蛋大师','累计扭蛋50次','gacha','gift','gold',800,50,1,202,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (22,'lucky_egg','幸运蛋','扭蛋获得稀有奖励','gacha','star','gold',500,1,1,210,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (23,'golden_touch','点金手','连续3次扭蛋获得高价值奖励','gacha','crown','diamond',1000,1,1,211,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (24,'daily_warrior','每日战士','连续7天完成所有每日任务','activity','flame','gold',500,7,1,220,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (25,'weekly_champion','周冠军','连续4周完成所有每周任务','activity','trophy','diamond',1000,4,1,221,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (26,'cheerleader','啦啦队长','累计为选手打气100次','social','heart','gold',500,100,1,230,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (27,'prediction_king','预言家','竞猜准确率超过80%','social','zap','diamond',800,1,1,231,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (28,'gacha_lucky_bronze','幸运铜蛋','扭蛋机获得的幸运徽章','explorer','egg','bronze',0,1,1,100,'2025-12-18 04:57:22','2025-12-18 04:57:22');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (29,'gacha_lucky_silver','幸运银蛋','扭蛋机获得的稀有徽章','explorer','egg','silver',0,1,1,101,'2025-12-18 04:57:22','2025-12-18 04:57:22');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (30,'gacha_lucky_gold','幸运金蛋','扭蛋机获得的珍贵徽章','explorer','egg','gold',0,1,1,102,'2025-12-18 04:57:22','2025-12-18 04:57:22');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (31,'gacha_lucky_diamond','幸运钻蛋','扭蛋机获得的璀璨徽章','explorer','gem','diamond',0,1,1,103,'2025-12-18 05:07:26','2025-12-18 05:07:26');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (32,'gacha_lucky_star','幸运星耀','扭蛋机获得的闪耀徽章','explorer','sparkles','star',0,1,1,104,'2025-12-18 05:07:26','2025-12-18 05:07:26');
INSERT INTO `achievement_definitions` (`id`, `achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES (33,'gacha_lucky_king','幸运王者','扭蛋机获得的传说徽章','explorer','crown','king',0,1,1,105,'2025-12-18 05:07:26','2025-12-18 05:07:26');
/*!40000 ALTER TABLE `achievement_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告标题',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '公告内容',
  `type` enum('info','warning','success','error') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info' COMMENT '公告类型',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否置顶',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `author_id` int NOT NULL COMMENT '发布者ID',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '查看次数',
  `published_at` datetime DEFAULT NULL COMMENT '发布时间',
  `expires_at` datetime DEFAULT NULL COMMENT '过期时间（可选）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_pinned` (`is_pinned`),
  KEY `idx_published_at` (`published_at`),
  KEY `idx_type` (`type`),
  CONSTRAINT `announcements_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` (`id`, `title`, `content`, `type`, `is_pinned`, `is_active`, `author_id`, `view_count`, `published_at`, `expires_at`, `created_at`, `updated_at`) VALUES (3,'测试公告','测试一下','info',1,1,2,0,'2025-12-17 18:29:38',NULL,'2025-12-17 10:29:38','2025-12-17 10:44:25');
INSERT INTO `announcements` (`id`, `title`, `content`, `type`, `is_pinned`, `is_active`, `author_id`, `view_count`, `published_at`, `expires_at`, `created_at`, `updated_at`) VALUES (4,'测试项目','1111','warning',1,1,2,0,'2025-12-17 18:43:56',NULL,'2025-12-17 10:43:56','2025-12-17 10:43:56');
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_key_codes`
--

DROP TABLE IF EXISTS `api_key_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_key_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '兑换码',
  `quota` decimal(10,2) DEFAULT '0.00' COMMENT '额度（美元）',
  `status` enum('AVAILABLE','ASSIGNED','REDEEMED','EXPIRED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `assigned_user_id` int DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT NULL,
  `redeemed_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned_user` (`assigned_user_id`),
  CONSTRAINT `api_key_codes_ibfk_1` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=118 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Key兑换码表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_key_codes`
--

LOCK TABLES `api_key_codes` WRITE;
/*!40000 ALTER TABLE `api_key_codes` DISABLE KEYS */;
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (88,'gacha_test_011_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:52:10',NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 02:52:10');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (89,'gacha_test_012_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:59:18',NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 02:59:18');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (90,'gacha_test_013_1766285497',5.00,'ASSIGNED',2,'2025-12-21 03:00:56',NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 03:00:56');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (91,'gacha_test_014_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (92,'gacha_test_015_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (93,'gacha_test_016_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (94,'gacha_test_017_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (95,'gacha_test_018_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (96,'gacha_test_019_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (97,'gacha_test_020_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'扭蛋机','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (98,'scratch_test_011_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:52:25',NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 02:52:25');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (99,'scratch_test_012_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:59:09',NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 02:59:09');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (100,'scratch_test_013_1766285497',5.00,'ASSIGNED',2,'2025-12-21 03:00:59',NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 03:00:59');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (101,'scratch_test_014_1766285497',5.00,'ASSIGNED',2,'2025-12-21 03:05:38',NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 03:05:38');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (102,'scratch_test_015_1766285497',5.00,'ASSIGNED',2,'2025-12-21 03:05:40',NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 03:05:40');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (103,'scratch_test_016_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (104,'scratch_test_017_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (105,'scratch_test_018_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (106,'scratch_test_019_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (107,'scratch_test_020_1766285497',5.00,'AVAILABLE',NULL,NULL,NULL,NULL,'刮刮乐','2025-12-21 02:51:37','2025-12-21 10:51:37');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (108,'slot_test_011_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:52:28',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:52:28');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (109,'slot_test_012_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:53:47',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:53:47');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (110,'slot_test_013_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:53:54',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:53:54');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (111,'slot_test_014_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:54:04',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:54:04');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (112,'slot_test_015_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:54:35',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:54:35');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (113,'slot_test_016_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:55:05',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:55:05');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (114,'slot_test_017_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:57:46',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:57:46');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (115,'slot_test_018_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:57:57',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:57:57');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (116,'slot_test_019_1766285497',5.00,'ASSIGNED',2,'2025-12-21 02:58:09',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 02:58:09');
INSERT INTO `api_key_codes` (`id`, `code`, `quota`, `status`, `assigned_user_id`, `assigned_at`, `redeemed_at`, `expires_at`, `description`, `created_at`, `updated_at`) VALUES (117,'slot_test_020_1766285497',5.00,'ASSIGNED',2,'2025-12-21 03:01:03',NULL,NULL,'老虎机','2025-12-21 02:51:37','2025-12-21 03:01:03');
/*!40000 ALTER TABLE `api_key_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `badge_exchanges`
--

DROP TABLE IF EXISTS `badge_exchanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badge_exchanges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `achievement_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '兑换的成就/徽章key',
  `exchange_points` int NOT NULL COMMENT '兑换获得的积分',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_achievement` (`achievement_key`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `badge_exchanges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='徽章兑换积分记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badge_exchanges`
--

LOCK TABLES `badge_exchanges` WRITE;
/*!40000 ALTER TABLE `badge_exchanges` DISABLE KEYS */;
/*!40000 ALTER TABLE `badge_exchanges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cheer_stats`
--

DROP TABLE IF EXISTS `cheer_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cheer_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `registration_id` int NOT NULL COMMENT '关联报名ID',
  `cheer_count` int NOT NULL DEFAULT '0' COMMENT '普通打气数',
  `coffee_count` int NOT NULL DEFAULT '0' COMMENT '咖啡数',
  `energy_count` int NOT NULL DEFAULT '0' COMMENT '能量饮料数',
  `pizza_count` int NOT NULL DEFAULT '0' COMMENT '披萨数',
  `star_count` int NOT NULL DEFAULT '0' COMMENT '星星数',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '总打气数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cheer_stats_registration` (`registration_id`),
  CONSTRAINT `fk_cheer_stats_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打气统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cheer_stats`
--

LOCK TABLES `cheer_stats` WRITE;
/*!40000 ALTER TABLE `cheer_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `cheer_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cheers`
--

DROP TABLE IF EXISTS `cheers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cheers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `user_id` int NOT NULL COMMENT '打气用户ID',
  `registration_id` int NOT NULL COMMENT '被打气的报名ID',
  `cheer_type` enum('cheer','coffee','energy','pizza','star') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cheer' COMMENT '打气类型',
  `message` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '打气留言',
  PRIMARY KEY (`id`),
  KEY `ix_cheers_user` (`user_id`),
  KEY `ix_cheers_registration` (`registration_id`),
  KEY `ix_cheers_created` (`created_at`),
  CONSTRAINT `fk_cheers_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cheers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打气记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cheers`
--

LOCK TABLES `cheers` WRITE;
/*!40000 ALTER TABLE `cheers` DISABLE KEYS */;
/*!40000 ALTER TABLE `cheers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contests`
--

DROP TABLE IF EXISTS `contests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '比赛标题',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '比赛描述',
  `visibility` enum('draft','published','hidden') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'published' COMMENT 'Contest visibility',
  `banner_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Contest banner url',
  `rules_md` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Contest rules markdown',
  `prizes_md` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Contest prizes markdown',
  `review_rules_md` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Contest review rules markdown',
  `faq_md` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Contest faq markdown',
  `phase` enum('upcoming','signup','submission','voting','ended') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'upcoming' COMMENT '比赛阶段',
  `signup_start` datetime DEFAULT NULL COMMENT '报名开始时间',
  `signup_end` datetime DEFAULT NULL COMMENT '报名结束时间',
  `submit_start` datetime DEFAULT NULL COMMENT '提交开始时间',
  `submit_end` datetime DEFAULT NULL COMMENT '提交结束时间',
  `vote_start` datetime DEFAULT NULL COMMENT '投票开始时间',
  `vote_end` datetime DEFAULT NULL COMMENT '投票结束时间',
  `auto_phase_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Auto phase sync',
  PRIMARY KEY (`id`),
  KEY `ix_contests_phase` (`phase`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='比赛表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests`
--

LOCK TABLES `contests` WRITE;
/*!40000 ALTER TABLE `contests` DISABLE KEYS */;
INSERT INTO `contests` (`id`, `created_at`, `updated_at`, `title`, `description`, `phase`, `signup_start`, `signup_end`, `submit_start`, `submit_end`, `vote_start`, `vote_end`) VALUES (1,'2025-12-16 16:39:21.705059','2025-12-16 16:39:21.705059','第一届鸡王争霸赛','# ikuncode 开发者实战大赏\n\n这是一场面向所有开发者的创意编程比赛，展示你的技术实力，赢取丰厚奖品！','signup','2025-12-16 16:39:21','2026-01-15 16:39:21',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `contests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daily_signins`
--

DROP TABLE IF EXISTS `daily_signins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daily_signins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `signin_date` date NOT NULL COMMENT '签到日期',
  `points_earned` int NOT NULL DEFAULT '100' COMMENT '获得积分',
  `streak_day` int NOT NULL DEFAULT '1' COMMENT '连续签到天数',
  `bonus_points` int NOT NULL DEFAULT '0' COMMENT '连续签到奖励积分',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_date` (`user_id`,`signin_date`),
  KEY `idx_signin_date` (`signin_date`),
  CONSTRAINT `daily_signins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日签到记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daily_signins`
--

LOCK TABLES `daily_signins` WRITE;
/*!40000 ALTER TABLE `daily_signins` DISABLE KEYS */;
/*!40000 ALTER TABLE `daily_signins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `easter_egg_codes`
--

DROP TABLE IF EXISTS `easter_egg_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `easter_egg_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '兑换码（唯一）',
  `reward_type` enum('points','item','badge','api_key') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖励类型',
  `reward_value` json NOT NULL COMMENT '奖励值（JSON格式）',
  `status` enum('active','claimed','disabled','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT '状态',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '兑换码描述（仅管理员可见）',
  `hint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '提示语（兑换成功后显示）',
  `claimed_by` int DEFAULT NULL COMMENT '领取用户ID',
  `claimed_at` timestamp NULL DEFAULT NULL COMMENT '领取时间',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT '过期时间（可选）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_claimed_by` (`claimed_by`),
  KEY `idx_claimed_at` (`claimed_at` DESC),
  CONSTRAINT `easter_egg_codes_ibfk_1` FOREIGN KEY (`claimed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='彩蛋兑换码表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `easter_egg_codes`
--

LOCK TABLES `easter_egg_codes` WRITE;
/*!40000 ALTER TABLE `easter_egg_codes` DISABLE KEYS */;
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (1,'IKUN-EGG-2025-A1B2','points','{\"amount\": 500}','claimed','彩蛋码#1 - 500积分','恭喜你发现了隐藏彩蛋！获得500积分~',2,'2025-12-17 04:21:08',NULL,'2025-12-17 11:29:36','2025-12-17 04:21:08');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (2,'IKUN-EGG-2025-C3D4','points','{\"amount\": 300}','claimed','彩蛋码#2 - 300积分','你真是太厉害了！300积分到账~',2,'2025-12-17 04:48:32',NULL,'2025-12-17 11:29:36','2025-12-17 04:48:32');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (3,'IKUN-EGG-2025-E5F6','points','{\"amount\": 200}','claimed','彩蛋码#3 - 200积分','探索精神可嘉！200积分奖励~',2,'2025-12-17 05:00:45',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:45');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (4,'IKUN-EGG-2025-G7H8','points','{\"amount\": 100}','claimed','彩蛋码#4 - 100积分','小惊喜！100积分~',2,'2025-12-17 05:00:57',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:57');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (5,'IKUN-EGG-2025-I9J0','points','{\"amount\": 888}','claimed','彩蛋码#5 - 888积分','大吉大利！888积分发发发~',2,'2025-12-17 05:01:48',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:48');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (6,'IKUN-EGG-2025-K1L2','points','{\"amount\": 666}','claimed','彩蛋码#6 - 666积分','666！顺顺顺~',2,'2025-12-17 05:00:48',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:48');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (7,'IKUN-EGG-2025-M3N4','points','{\"amount\": 520}','claimed','彩蛋码#7 - 520积分','520积分，爱你哟~',2,'2025-12-17 05:01:14',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:14');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (8,'IKUN-EGG-2025-O5P6','points','{\"amount\": 250}','claimed','彩蛋码#8 - 250积分','不错不错，250积分~',2,'2025-12-17 05:00:08',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:08');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (9,'IKUN-EGG-2025-Q7R8','points','{\"amount\": 350}','claimed','彩蛋码#9 - 350积分','探险成功！350积分~',2,'2025-12-17 05:01:18',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:18');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (10,'IKUN-EGG-2025-S9T0','points','{\"amount\": 450}','claimed','彩蛋码#10 - 450积分','厉害了！450积分~',2,'2025-12-17 05:01:43',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:43');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (11,'IKUN-EGG-2025-U1V2','points','{\"amount\": 150}','claimed','彩蛋码#11 - 150积分','小奖励150积分~',2,'2025-12-17 04:42:44',NULL,'2025-12-17 11:29:36','2025-12-17 04:42:44');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (12,'IKUN-EGG-2025-W3X4','points','{\"amount\": 180}','claimed','彩蛋码#12 - 180积分','180积分收入囊中~',2,'2025-12-17 05:09:24',NULL,'2025-12-17 11:29:36','2025-12-17 05:09:24');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (13,'IKUN-EGG-2025-Y5Z6','points','{\"amount\": 220}','claimed','彩蛋码#13 - 220积分','220积分到手~',2,'2025-12-17 05:00:38',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:38');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (14,'IKUN-EGG-2025-A7B8','points','{\"amount\": 280}','claimed','彩蛋码#14 - 280积分','280积分奖励~',2,'2025-12-17 04:43:00',NULL,'2025-12-17 11:29:36','2025-12-17 04:43:00');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (15,'IKUN-EGG-2025-C9D0','points','{\"amount\": 320}','claimed','彩蛋码#15 - 320积分','320积分送上~',2,'2025-12-17 05:01:22',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:22');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (16,'IKUN-EGG-ITEM-E1F2','item','{\"amount\": 10, \"item_type\": \"cheer\"}','claimed','彩蛋码#16 - 10个爱心打气','获得10个爱心打气道具！快去给选手加油吧~',NULL,'2025-12-17 04:17:47',NULL,'2025-12-17 11:29:36','2025-12-17 04:17:47');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (17,'IKUN-EGG-ITEM-G3H4','item','{\"amount\": 5, \"item_type\": \"coffee\"}','claimed','彩蛋码#17 - 5杯咖啡','5杯咖啡给你续命~',2,'2025-12-17 04:47:58',NULL,'2025-12-17 11:29:36','2025-12-17 04:47:58');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (18,'IKUN-EGG-ITEM-I5J6','item','{\"amount\": 3, \"item_type\": \"energy\"}','claimed','彩蛋码#18 - 3瓶能量','能量补给站到了！',2,'2025-12-17 05:01:01',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:01');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (19,'IKUN-EGG-ITEM-K7L8','item','{\"amount\": 5, \"item_type\": \"pizza\"}','claimed','彩蛋码#19 - 5个披萨','披萨派对开始！',2,'2025-12-17 05:00:42',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:42');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (20,'IKUN-EGG-ITEM-M9N0','item','{\"amount\": 8, \"item_type\": \"star\"}','claimed','彩蛋码#20 - 8颗星星','你就是最闪亮的星~',2,'2025-12-17 05:00:00',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:00');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (21,'IKUN-EGG-ITEM-O1P2','item','{\"amount\": 20, \"item_type\": \"cheer\"}','claimed','彩蛋码#21 - 20个爱心打气','超大礼包！20个爱心打气~',2,'2025-12-17 04:59:24',NULL,'2025-12-17 11:29:36','2025-12-17 04:59:24');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (22,'IKUN-EGG-ITEM-Q3R4','item','{\"amount\": 10, \"item_type\": \"coffee\"}','claimed','彩蛋码#22 - 10杯咖啡','咖啡因狂欢！',2,'2025-12-17 04:19:15',NULL,'2025-12-17 11:29:36','2025-12-17 04:19:15');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (23,'IKUN-EGG-ITEM-S5T6','item','{\"amount\": 6, \"item_type\": \"energy\"}','claimed','彩蛋码#23 - 6瓶能量','能量爆棚！',2,'2025-12-17 05:09:33',NULL,'2025-12-17 11:29:36','2025-12-17 05:09:33');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (24,'IKUN-EGG-ITEM-U7V8','item','{\"amount\": 8, \"item_type\": \"pizza\"}','claimed','彩蛋码#24 - 8个披萨','披萨大餐！',2,'2025-12-17 05:06:33',NULL,'2025-12-17 11:29:36','2025-12-17 05:06:33');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (25,'IKUN-EGG-ITEM-W9X0','item','{\"amount\": 15, \"item_type\": \"star\"}','claimed','彩蛋码#25 - 15颗星星','满天星光都是你的！',2,'2025-12-17 04:42:53',NULL,'2025-12-17 11:29:36','2025-12-17 04:42:53');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (26,'IKUN-EGG-BADGE-Y1Z2','badge','{\"badge_key\": \"easter_hunter\", \"badge_name\": \"彩蛋猎人\"}','claimed','彩蛋码#26 - 彩蛋猎人徽章','恭喜获得「彩蛋猎人」专属徽章！',2,'2025-12-17 04:19:20',NULL,'2025-12-17 11:29:36','2025-12-17 04:19:20');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (27,'IKUN-EGG-BADGE-A3B4','badge','{\"badge_key\": \"secret_finder\", \"badge_name\": \"秘密发现者\"}','claimed','彩蛋码#27 - 秘密发现者徽章','你发现了秘密！获得「秘密发现者」徽章~',2,'2025-12-17 04:18:37',NULL,'2025-12-17 11:29:36','2025-12-17 04:18:37');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (28,'IKUN-EGG-BADGE-C5D6','badge','{\"badge_key\": \"treasure_hunter\", \"badge_name\": \"寻宝达人\"}','claimed','彩蛋码#28 - 寻宝达人徽章','寻宝成功！「寻宝达人」徽章到手~',2,'2025-12-17 05:00:53',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:53');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (29,'IKUN-EGG-BADGE-E7F8','badge','{\"badge_key\": \"lucky_star\", \"badge_name\": \"幸运之星\"}','claimed','彩蛋码#29 - 幸运之星徽章','幸运女神眷顾你！「幸运之星」徽章~',2,'2025-12-17 05:00:05',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:05');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (30,'IKUN-EGG-BADGE-G9H0','badge','{\"badge_key\": \"ikun_pioneer\", \"badge_name\": \"iKun先锋\"}','claimed','彩蛋码#30 - iKun先锋徽章','你是真正的iKun！「iKun先锋」徽章~',2,'2025-12-17 05:01:04',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:04');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (31,'TEST-POINTS-001','points','{\"amount\": 100}','claimed','测试积分码','获得100积分',2,'2025-12-17 18:42:58',NULL,'2025-12-18 01:25:02','2025-12-17 18:42:58');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (32,'TEST-POINTS-002','points','{\"amount\": 200}','claimed','测试积分码','获得200积分',2,'2025-12-17 17:25:18',NULL,'2025-12-18 01:25:02','2025-12-17 17:25:18');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (33,'TEST-BADGE-001','badge','{\"badge_key\": \"easter_hunter\", \"badge_name\": \"彩蛋猎人\"}','claimed','测试徽章码','获得彩蛋猎人徽章',2,'2025-12-17 18:43:03',NULL,'2025-12-18 01:25:02','2025-12-17 18:43:03');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (34,'TEST-ITEM-001','item','{\"amount\": 5, \"item_type\": \"coffee\"}','claimed','测试道具码','获得5个咖啡',2,'2025-12-17 18:42:45',NULL,'2025-12-18 01:25:02','2025-12-17 18:42:45');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (35,'GACHA-BADGE-001','badge','{\"badge_key\": \"gacha_beginner\", \"badge_name\": \"扭蛋新手\"}','active','扭蛋徽章#1','恭喜获得「扭蛋新手」徽章！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (36,'GACHA-BADGE-002','badge','{\"badge_key\": \"gacha_beginner\", \"badge_name\": \"扭蛋新手\"}','active','扭蛋徽章#2','恭喜获得「扭蛋新手」徽章！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (37,'GACHA-BADGE-003','badge','{\"badge_key\": \"lucky_egg\", \"badge_name\": \"幸运蛋\"}','active','扭蛋徽章#3','哇！你获得了「幸运蛋」徽章！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (38,'GACHA-BADGE-004','badge','{\"badge_key\": \"cheerleader\", \"badge_name\": \"啦啦队长\"}','active','扭蛋徽章#4','你是最棒的啦啦队长！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (39,'GACHA-BADGE-005','badge','{\"badge_key\": \"daily_warrior\", \"badge_name\": \"每日战士\"}','claimed','扭蛋徽章#5','战士降临！「每日战士」徽章到手~',2,'2025-12-17 19:01:56',NULL,'2025-12-18 02:56:12','2025-12-17 19:01:56');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (40,'GACHA-PTS-001','points','{\"amount\": 100}','active','扭蛋积分#1','100积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (41,'GACHA-PTS-002','points','{\"amount\": 150}','active','扭蛋积分#2','150积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (42,'GACHA-PTS-003','points','{\"amount\": 200}','active','扭蛋积分#3','200积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (43,'GACHA-PTS-004','points','{\"amount\": 250}','active','扭蛋积分#4','250积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (44,'GACHA-PTS-005','points','{\"amount\": 300}','active','扭蛋积分#5','300积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (45,'GACHA-PTS-006','points','{\"amount\": 500}','active','扭蛋积分#6','大奖！500积分~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (46,'GACHA-PTS-007','points','{\"amount\": 88}','active','扭蛋积分#7','发发发~88积分',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (47,'GACHA-PTS-008','points','{\"amount\": 168}','claimed','扭蛋积分#8','一路发~168积分',2,'2025-12-17 19:01:49',NULL,'2025-12-18 02:56:12','2025-12-17 19:01:49');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (48,'GACHA-PTS-009','points','{\"amount\": 66}','active','扭蛋积分#9','顺顺顺~66积分',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (49,'GACHA-PTS-010','points','{\"amount\": 188}','active','扭蛋积分#10','要发发~188积分',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (50,'GACHA-ITEM-001','item','{\"amount\": 5, \"item_type\": \"cheer\"}','active','扭蛋道具#1','5个爱心打气~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (51,'GACHA-ITEM-002','item','{\"amount\": 3, \"item_type\": \"coffee\"}','active','扭蛋道具#2','3杯咖啡~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (52,'GACHA-ITEM-003','item','{\"amount\": 5, \"item_type\": \"star\"}','active','扭蛋道具#3','5颗星星~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (53,'GACHA-ITEM-004','item','{\"amount\": 2, \"item_type\": \"energy\"}','active','扭蛋道具#4','2瓶能量~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` (`id`, `code`, `reward_type`, `reward_value`, `status`, `description`, `hint`, `claimed_by`, `claimed_at`, `expires_at`, `created_at`, `updated_at`) VALUES (54,'GACHA-ITEM-005','item','{\"amount\": 3, \"item_type\": \"pizza\"}','claimed','扭蛋道具#5','3个披萨~',2,'2025-12-17 19:01:43',NULL,'2025-12-18 02:56:12','2025-12-17 19:01:43');
/*!40000 ALTER TABLE `easter_egg_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `easter_egg_redemptions`
--

DROP TABLE IF EXISTS `easter_egg_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `easter_egg_redemptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code_id` int NOT NULL COMMENT '兑换码ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `reward_type` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖励类型',
  `reward_value` json NOT NULL COMMENT '奖励值',
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '兑换时IP',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User Agent',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_code_id` (`code_id`),
  KEY `idx_created_at` (`created_at` DESC),
  CONSTRAINT `easter_egg_redemptions_ibfk_1` FOREIGN KEY (`code_id`) REFERENCES `easter_egg_codes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `easter_egg_redemptions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='彩蛋兑换记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `easter_egg_redemptions`
--

LOCK TABLES `easter_egg_redemptions` WRITE;
/*!40000 ALTER TABLE `easter_egg_redemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `easter_egg_redemptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange_items`
--

DROP TABLE IF EXISTS `exchange_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exchange_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品名称',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品描述',
  `item_type` enum('LOTTERY_TICKET','SCRATCH_TICKET','GACHA_TICKET','SLOT_TICKET','API_KEY','ITEM') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_value` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品值（如道具类型）',
  `cost_points` int NOT NULL COMMENT '所需积分',
  `stock` int DEFAULT NULL COMMENT '库存（NULL为无限）',
  `daily_limit` int DEFAULT NULL COMMENT '每人每日限购',
  `total_limit` int DEFAULT NULL COMMENT '每人总限购',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否上架',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `icon` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标名称',
  `is_hot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否热门',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active_sort` (`is_active`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分兑换商品配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange_items`
--

LOCK TABLES `exchange_items` WRITE;
/*!40000 ALTER TABLE `exchange_items` DISABLE KEYS */;
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (5,'幸运抽奖券','免费参与一次大转盘抽奖','LOTTERY_TICKET',NULL,20,NULL,5,NULL,1,10,'ticket',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (6,'刮刮乐券','免费获得一张刮刮乐卡','SCRATCH_TICKET',NULL,30,NULL,5,NULL,1,20,'card',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (7,'扭蛋机券','免费扭一次扭蛋机','GACHA_TICKET',NULL,50,NULL,5,NULL,1,30,'gift',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (8,'老虎机券','免费玩一次老虎机','SLOT_TICKET',NULL,30,NULL,5,NULL,1,40,'star',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (9,'API Key $5','价值 $5 的 API 额度兑换码','API_KEY','5',3000,NULL,1,1,1,100,'key',0,'2025-12-21 11:10:50','2025-12-21 11:23:27');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (10,'API Key $10','价值 $10 的 API 额度兑换码','API_KEY','10',5000,NULL,1,1,1,110,'key',0,'2025-12-21 11:10:50','2025-12-21 11:23:27');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (11,'API Key $20','价值 $20 的 API 额度兑换码','API_KEY','20',9000,NULL,1,1,1,120,'key',0,'2025-12-21 11:21:08','2025-12-21 11:23:27');
INSERT INTO `exchange_items` (`id`, `name`, `description`, `item_type`, `item_value`, `cost_points`, `stock`, `daily_limit`, `total_limit`, `is_active`, `sort_order`, `icon`, `is_hot`, `created_at`, `updated_at`) VALUES (12,'API Key $50','价值 $50 的 API 额度兑换码','API_KEY','50',20000,NULL,1,1,1,130,'key',0,'2025-12-21 11:21:08','2025-12-21 11:23:27');
/*!40000 ALTER TABLE `exchange_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exchange_records`
--

DROP TABLE IF EXISTS `exchange_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exchange_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品名称快照',
  `item_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '商品类型快照',
  `cost_points` int NOT NULL COMMENT '消费积分',
  `quantity` int NOT NULL DEFAULT '1' COMMENT '兑换数量',
  `reward_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '发放的奖励值',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_item` (`user_id`,`item_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `exchange_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exchange_records_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `exchange_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分兑换记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exchange_records`
--

LOCK TABLES `exchange_records` WRITE;
/*!40000 ALTER TABLE `exchange_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `exchange_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gacha_configs`
--

DROP TABLE IF EXISTS `gacha_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gacha_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '幸运扭蛋机' COMMENT '配置名称',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `cost_points` int NOT NULL DEFAULT '50' COMMENT '每次消耗积分',
  `daily_limit` int DEFAULT '30' COMMENT '每日限制次数(NULL为不限)',
  `created_by` int DEFAULT NULL COMMENT '创建者',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `gacha_configs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gacha_configs`
--

LOCK TABLES `gacha_configs` WRITE;
/*!40000 ALTER TABLE `gacha_configs` DISABLE KEYS */;
INSERT INTO `gacha_configs` (`id`, `name`, `is_active`, `cost_points`, `daily_limit`, `created_by`, `created_at`, `updated_at`) VALUES (1,'幸运扭蛋机',1,50,30,NULL,'2025-12-20 02:33:28','2025-12-20 02:33:28');
/*!40000 ALTER TABLE `gacha_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gacha_draws`
--

DROP TABLE IF EXISTS `gacha_draws`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gacha_draws` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `prize_id` int NOT NULL,
  `cost_points` int NOT NULL DEFAULT '0' COMMENT '消耗积分',
  `prize_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prize_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prize_value` json DEFAULT NULL COMMENT '奖品详情',
  `is_rare` tinyint(1) NOT NULL DEFAULT '0',
  `used_ticket` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否使用了扭蛋券',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '幂等请求ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `config_id` (`config_id`),
  KEY `idx_user_date` (`user_id`,`created_at`),
  CONSTRAINT `gacha_draws_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gacha_draws_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `gacha_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gacha_draws`
--

LOCK TABLES `gacha_draws` WRITE;
/*!40000 ALTER TABLE `gacha_draws` DISABLE KEYS */;
/*!40000 ALTER TABLE `gacha_draws` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gacha_prizes`
--

DROP TABLE IF EXISTS `gacha_prizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gacha_prizes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL COMMENT '所属配置',
  `prize_type` enum('points','item','badge','api_key') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖品类型',
  `prize_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖品名称',
  `prize_value` json DEFAULT NULL COMMENT '奖品值(JSON格式)',
  `weight` decimal(10,2) NOT NULL DEFAULT '1.00' COMMENT '权重(越大概率越高)',
  `stock` int DEFAULT NULL COMMENT '库存(NULL为无限)',
  `is_rare` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否稀有',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config_enabled` (`config_id`,`is_enabled`),
  CONSTRAINT `gacha_prizes_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `gacha_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gacha_prizes`
--

LOCK TABLES `gacha_prizes` WRITE;
/*!40000 ALTER TABLE `gacha_prizes` DISABLE KEYS */;
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (1,1,'points','10积分','{\"amount\": 10}',24.80,NULL,0,1,1,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (2,1,'points','30积分','{\"amount\": 30}',20.00,NULL,0,1,2,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (3,1,'points','50积分','{\"amount\": 50}',12.00,NULL,0,1,3,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (4,1,'points','100积分','{\"amount\": 100}',5.00,NULL,1,1,4,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (5,1,'points','200积分','{\"amount\": 200}',2.00,NULL,1,1,5,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (6,1,'points','500积分','{\"amount\": 500}',1.00,NULL,1,1,6,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (7,1,'api_key','神秘兑换码','{\"usage_type\": \"扭蛋机\"}',0.20,NULL,1,1,7,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (8,1,'item','爱心x1','{\"amount\": 1, \"item_type\": \"cheer\"}',8.00,NULL,0,1,8,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (9,1,'item','咖啡x1','{\"amount\": 1, \"item_type\": \"coffee\"}',5.00,NULL,0,1,9,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (10,1,'item','能量x1','{\"amount\": 1, \"item_type\": \"energy\"}',3.00,NULL,0,1,10,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (11,1,'item','披萨x1','{\"amount\": 1, \"item_type\": \"pizza\"}',2.00,NULL,1,1,11,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (12,1,'item','星星x1','{\"amount\": 1, \"item_type\": \"star\"}',1.00,NULL,1,1,12,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (13,1,'badge','幸运铜蛋','{\"tier\": \"bronze\", \"achievement_key\": \"gacha_lucky_bronze\", \"fallback_points\": 50}',10.00,NULL,0,1,13,'2025-12-20 02:33:28','2025-12-19 19:37:47');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (14,1,'badge','幸运银蛋','{\"tier\": \"silver\", \"achievement_key\": \"gacha_lucky_silver\", \"fallback_points\": 100}',8.00,NULL,0,1,14,'2025-12-20 02:33:28','2025-12-19 19:37:51');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (15,1,'badge','幸运金蛋','{\"tier\": \"gold\", \"achievement_key\": \"gacha_lucky_gold\", \"fallback_points\": 200}',6.00,NULL,1,1,15,'2025-12-20 02:33:28','2025-12-19 19:37:55');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (16,1,'badge','幸运钻蛋','{\"tier\": \"diamond\", \"achievement_key\": \"gacha_lucky_diamond\", \"fallback_points\": 500}',4.00,NULL,1,1,16,'2025-12-20 02:33:28','2025-12-19 19:38:01');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (17,1,'badge','幸运星耀','{\"tier\": \"star\", \"achievement_key\": \"gacha_lucky_star\", \"fallback_points\": 1000}',2.00,NULL,1,1,17,'2025-12-20 02:33:28','2025-12-19 19:37:20');
INSERT INTO `gacha_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `sort_order`, `created_at`, `updated_at`) VALUES (18,1,'badge','幸运王者','{\"tier\": \"king\", \"achievement_key\": \"gacha_lucky_king\", \"fallback_points\": 2000}',1.00,NULL,1,1,18,'2025-12-20 02:33:28','2025-12-19 19:37:16');
/*!40000 ALTER TABLE `gacha_prizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `github_stats`
--

DROP TABLE IF EXISTS `github_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `github_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `registration_id` int NOT NULL COMMENT '关联报名ID',
  `stat_date` date NOT NULL COMMENT '统计日期',
  `repo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '仓库地址',
  `repo_owner` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '仓库所有者',
  `repo_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '仓库名称',
  `commits_count` int NOT NULL DEFAULT '0' COMMENT '当日提交次数',
  `additions` int NOT NULL DEFAULT '0' COMMENT '当日新增行数',
  `deletions` int NOT NULL DEFAULT '0' COMMENT '当日删除行数',
  `files_changed` int NOT NULL DEFAULT '0' COMMENT '当日修改文件数',
  `total_commits` int NOT NULL DEFAULT '0' COMMENT '累计提交次数',
  `total_additions` int NOT NULL DEFAULT '0' COMMENT '累计新增行数',
  `total_deletions` int NOT NULL DEFAULT '0' COMMENT '累计删除行数',
  `commits_detail` json DEFAULT NULL COMMENT '当日提交详情',
  `hourly_activity` json DEFAULT NULL COMMENT '按小时统计',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_github_stats_reg_date` (`registration_id`,`stat_date`),
  KEY `ix_github_stats_date` (`stat_date`),
  KEY `ix_github_stats_registration` (`registration_id`),
  CONSTRAINT `fk_github_stats_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GitHub每日统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `github_stats`
--

LOCK TABLES `github_stats` WRITE;
/*!40000 ALTER TABLE `github_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `github_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `github_sync_logs`
--

DROP TABLE IF EXISTS `github_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `github_sync_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `registration_id` int NOT NULL COMMENT '关联报名ID',
  `sync_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '同步类型: hourly/daily/manual',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '状态: success/failed/skipped',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `api_calls_used` int NOT NULL DEFAULT '0' COMMENT '消耗的API调用次数',
  `rate_limit_remaining` int DEFAULT NULL COMMENT '剩余API限额',
  PRIMARY KEY (`id`),
  KEY `ix_github_sync_log_registration` (`registration_id`),
  KEY `ix_github_sync_log_created` (`created_at`),
  CONSTRAINT `fk_github_sync_logs_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=530 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GitHub同步日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `github_sync_logs`
--

LOCK TABLES `github_sync_logs` WRITE;
/*!40000 ALTER TABLE `github_sync_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `github_sync_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lottery_configs`
--

DROP TABLE IF EXISTS `lottery_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lottery_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '抽奖活动名称',
  `cost_points` int NOT NULL DEFAULT '20' COMMENT '每次抽奖消耗积分',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `daily_limit` int DEFAULT NULL COMMENT '每日抽奖次数限制',
  `starts_at` timestamp NULL DEFAULT NULL,
  `ends_at` timestamp NULL DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `lottery_configs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖活动配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_configs`
--

LOCK TABLES `lottery_configs` WRITE;
/*!40000 ALTER TABLE `lottery_configs` DISABLE KEYS */;
INSERT INTO `lottery_configs` (`id`, `name`, `cost_points`, `is_active`, `daily_limit`, `starts_at`, `ends_at`, `created_by`, `created_at`, `updated_at`) VALUES (1,'鸡王幸运转盘',20,1,50,NULL,NULL,NULL,'2025-12-17 05:12:34','2025-12-17 05:12:34');
INSERT INTO `lottery_configs` (`id`, `name`, `cost_points`, `is_active`, `daily_limit`, `starts_at`, `ends_at`, `created_by`, `created_at`, `updated_at`) VALUES (2,'神秘刮刮乐',30,1,5,NULL,NULL,NULL,'2025-12-17 13:01:57','2025-12-17 13:01:57');
/*!40000 ALTER TABLE `lottery_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lottery_draws`
--

DROP TABLE IF EXISTS `lottery_draws`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lottery_draws` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `cost_points` int NOT NULL COMMENT '消耗积分',
  `prize_id` int NOT NULL COMMENT '中奖奖品ID',
  `prize_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖品类型',
  `prize_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖品名称',
  `prize_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '奖品值',
  `is_rare` tinyint(1) NOT NULL DEFAULT '0',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '幂等请求ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_request_id` (`request_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_config_id` (`config_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `lottery_draws_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lottery_draws_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `lottery_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=464 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_draws`
--

LOCK TABLES `lottery_draws` WRITE;
/*!40000 ALTER TABLE `lottery_draws` DISABLE KEYS */;
/*!40000 ALTER TABLE `lottery_draws` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lottery_prizes`
--

DROP TABLE IF EXISTS `lottery_prizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lottery_prizes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL,
  `prize_type` enum('ITEM','API_KEY','POINTS','EMPTY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖品类型',
  `prize_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '奖品名称',
  `prize_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '奖品值（道具类型/积分数量等）',
  `weight` int NOT NULL DEFAULT '100' COMMENT '权重',
  `stock` int DEFAULT NULL COMMENT '库存数量，NULL为无限',
  `is_rare` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否稀有奖品',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config_id` (`config_id`),
  CONSTRAINT `lottery_prizes_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `lottery_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖奖品配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lottery_prizes`
--

LOCK TABLES `lottery_prizes` WRITE;
/*!40000 ALTER TABLE `lottery_prizes` DISABLE KEYS */;
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (1,1,'ITEM','爱心打气','cheer',200,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (2,1,'ITEM','咖啡打气','coffee',180,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (3,1,'ITEM','能量打气','energy',150,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (4,1,'ITEM','披萨打气','pizza',120,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (5,1,'ITEM','星星打气','star',100,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (6,1,'POINTS','安慰奖 5积分','5',100,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (7,1,'POINTS','幸运奖 20积分','20',30,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (8,1,'POINTS','大奖 50积分','50',10,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (9,1,'API_KEY','API Key兑换码',NULL,100,NULL,1,1,'2025-12-17 05:12:34','2025-12-20 04:38:46');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (10,1,'EMPTY','谢谢参与',NULL,10,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (14,2,'API_KEY','神秘兑换码',NULL,5,NULL,1,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (15,2,'POINTS','幸运积分 +50','50',20,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (16,2,'POINTS','小额积分 +20','20',30,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (17,2,'POINTS','微量积分 +10','10',35,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` (`id`, `config_id`, `prize_type`, `prize_name`, `prize_value`, `weight`, `stock`, `is_rare`, `is_enabled`, `created_at`, `updated_at`) VALUES (18,2,'EMPTY','谢谢参与',NULL,10,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
/*!40000 ALTER TABLE `lottery_prizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `points_ledger`
--

DROP TABLE IF EXISTS `points_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `points_ledger` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` int NOT NULL COMMENT '变动金额，正数为收入，负数为支出',
  `balance_after` int NOT NULL COMMENT '变动后余额',
  `reason` enum('REGISTER_BONUS','SIGNIN_DAILY','SIGNIN_STREAK_BONUS','CHEER_GIVE','CHEER_RECEIVE','LOTTERY_SPEND','LOTTERY_WIN','BET_STAKE','BET_PAYOUT','BET_REFUND','ADMIN_GRANT','ADMIN_DEDUCT','ACHIEVEMENT_CLAIM','EASTER_EGG_REDEEM','GACHA_SPEND','GACHA_WIN','EXCHANGE_SPEND','TASK_REWARD','TASK_CHAIN_BONUS','BADGE_EXCHANGE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ref_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型',
  `ref_id` int DEFAULT NULL COMMENT '关联ID',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '幂等请求ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_request_id` (`request_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ref` (`ref_type`,`ref_id`),
  CONSTRAINT `points_ledger_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1296 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分流水表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `points_ledger`
--

LOCK TABLES `points_ledger` WRITE;
/*!40000 ALTER TABLE `points_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `points_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prediction_bets`
--

DROP TABLE IF EXISTS `prediction_bets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prediction_bets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `market_id` int NOT NULL,
  `option_id` int NOT NULL,
  `user_id` int NOT NULL,
  `stake_points` int NOT NULL COMMENT '下注积分',
  `status` enum('PLACED','WON','LOST','REFUNDED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLACED',
  `payout_points` int DEFAULT NULL COMMENT '获得积分（中奖后填入）',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '幂等请求ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_request_id` (`request_id`),
  KEY `idx_market_id` (`market_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_option_id` (`option_id`),
  CONSTRAINT `prediction_bets_ibfk_1` FOREIGN KEY (`market_id`) REFERENCES `prediction_markets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prediction_bets_ibfk_2` FOREIGN KEY (`option_id`) REFERENCES `prediction_options` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prediction_bets_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞猜下注记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prediction_bets`
--

LOCK TABLES `prediction_bets` WRITE;
/*!40000 ALTER TABLE `prediction_bets` DISABLE KEYS */;
/*!40000 ALTER TABLE `prediction_bets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prediction_markets`
--

DROP TABLE IF EXISTS `prediction_markets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prediction_markets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '竞猜标题',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '详细说明',
  `status` enum('DRAFT','OPEN','CLOSED','SETTLED','CANCELED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `opens_at` timestamp NULL DEFAULT NULL COMMENT '开始下注时间',
  `closes_at` timestamp NULL DEFAULT NULL COMMENT '截止下注时间',
  `settled_at` timestamp NULL DEFAULT NULL COMMENT '结算时间',
  `fee_rate` decimal(5,4) NOT NULL DEFAULT '0.0500' COMMENT '平台抽成比例（5%）',
  `min_bet` int NOT NULL DEFAULT '10' COMMENT '最小下注积分',
  `max_bet` int DEFAULT NULL COMMENT '最大下注积分',
  `total_pool` int NOT NULL DEFAULT '0' COMMENT '总奖池',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_closes_at` (`closes_at`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `prediction_markets_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞猜市场表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prediction_markets`
--

LOCK TABLES `prediction_markets` WRITE;
/*!40000 ALTER TABLE `prediction_markets` DISABLE KEYS */;
INSERT INTO `prediction_markets` (`id`, `title`, `description`, `status`, `opens_at`, `closes_at`, `settled_at`, `fee_rate`, `min_bet`, `max_bet`, `total_pool`, `created_by`, `created_at`, `updated_at`) VALUES (1,'鸡王争霸赛最终冠军预测','预测本届鸡王争霸赛的最终冠军归属！根据当前人气榜和项目质量，谁将问鼎鸡王宝座？','OPEN',NULL,'2025-12-24 09:16:48',NULL,0.0500,10,1000,0,NULL,'2025-12-17 09:16:48','2025-12-17 09:16:48');
INSERT INTO `prediction_markets` (`id`, `title`, `description`, `status`, `opens_at`, `closes_at`, `settled_at`, `fee_rate`, `min_bet`, `max_bet`, `total_pool`, `created_by`, `created_at`, `updated_at`) VALUES (2,'本周最佳项目花落谁家','根据代码质量、创新性、实用性综合评判，本周哪个项目将获得最佳项目称号？','OPEN',NULL,'2025-12-20 09:16:48',NULL,0.0500,5,500,500,NULL,'2025-12-17 09:16:48','2025-12-17 18:39:24');
INSERT INTO `prediction_markets` (`id`, `title`, `description`, `status`, `opens_at`, `closes_at`, `settled_at`, `fee_rate`, `min_bet`, `max_bet`, `total_pool`, `created_by`, `created_at`, `updated_at`) VALUES (3,'本届参赛人数最终预测','截止报名结束，本届鸡王争霸赛将有多少人成功提交作品？','OPEN',NULL,'2025-12-22 09:16:48',NULL,0.0500,10,800,0,NULL,'2025-12-17 09:16:48','2025-12-17 09:16:48');
/*!40000 ALTER TABLE `prediction_markets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prediction_options`
--

DROP TABLE IF EXISTS `prediction_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prediction_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `market_id` int NOT NULL,
  `label` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '选项名称',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ref_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型（如 registration）',
  `ref_id` int DEFAULT NULL COMMENT '关联ID',
  `total_stake` int NOT NULL DEFAULT '0' COMMENT '该选项总下注积分',
  `is_winner` tinyint(1) DEFAULT NULL COMMENT '是否为赢家，NULL=未结算',
  `odds` decimal(10,2) DEFAULT NULL COMMENT '当前赔率（动态计算）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_market_id` (`market_id`),
  CONSTRAINT `prediction_options_ibfk_1` FOREIGN KEY (`market_id`) REFERENCES `prediction_markets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='竞猜选项表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prediction_options`
--

LOCK TABLES `prediction_options` WRITE;
/*!40000 ALTER TABLE `prediction_options` DISABLE KEYS */;
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (1,1,'代码小王子','目前人气榜第一，项目完成度高',NULL,NULL,0,NULL,2.50,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (2,1,'算法大神','AI 项目极具创新性，潜力巨大',NULL,NULL,0,NULL,3.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (3,1,'全栈小能手','技术全面，前后端一把抓',NULL,NULL,0,NULL,4.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (4,1,'黑马选手','低调实力派，可能爆冷',NULL,NULL,0,NULL,6.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (5,2,'AI 智能助手','基于大模型的智能对话系统',NULL,NULL,500,NULL,0.95,'2025-12-17 09:16:48','2025-12-18 02:39:24');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (6,2,'区块链溯源平台','去中心化的供应链追踪方案',NULL,NULL,0,NULL,NULL,'2025-12-17 09:16:48','2025-12-18 02:39:24');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (7,2,'物联网监控系统','实时数据采集与可视化',NULL,NULL,0,NULL,NULL,'2025-12-17 09:16:48','2025-12-18 02:39:24');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (8,3,'30人以下','参与热情一般',NULL,NULL,0,NULL,5.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (9,3,'30-50人','中等规模参与',NULL,NULL,0,NULL,2.50,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (10,3,'50-80人','热情高涨',NULL,NULL,0,NULL,2.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (11,3,'80-100人','火爆程度超预期',NULL,NULL,0,NULL,3.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` (`id`, `market_id`, `label`, `description`, `ref_type`, `ref_id`, `total_stake`, `is_winner`, `odds`, `created_at`, `updated_at`) VALUES (12,3,'100人以上','盛况空前',NULL,NULL,0,NULL,4.50,'2025-12-17 09:16:48','2025-12-17 17:16:48');
/*!40000 ALTER TABLE `prediction_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `puzzle_progress`
--

DROP TABLE IF EXISTS `puzzle_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `puzzle_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total_solved` int NOT NULL DEFAULT '0' COMMENT '已完成关卡总数',
  `total_time` int NOT NULL DEFAULT '0' COMMENT '总用时（秒）',
  `total_errors` int NOT NULL DEFAULT '0' COMMENT '总错误次数',
  `solved_levels` json DEFAULT NULL COMMENT '已完成关卡ID列表',
  `level_times` json DEFAULT NULL COMMENT '各关卡用时记录',
  `level_errors` json DEFAULT NULL COMMENT '各关卡错误次数',
  `last_solved_at` datetime DEFAULT NULL COMMENT '最后答题时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_total_solved` (`total_solved` DESC),
  KEY `idx_last_solved` (`last_solved_at` DESC),
  CONSTRAINT `fk_puzzle_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='码神挑战进度表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `puzzle_progress`
--

LOCK TABLES `puzzle_progress` WRITE;
/*!40000 ALTER TABLE `puzzle_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `puzzle_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registrations`
--

DROP TABLE IF EXISTS `registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `contest_id` int NOT NULL COMMENT '关联比赛ID',
  `user_id` int NOT NULL COMMENT '关联用户ID',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '项目名称',
  `summary` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '一句话简介',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '项目详细介绍',
  `plan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '实现计划/里程碑',
  `tech_stack` json NOT NULL COMMENT '技术栈（JSON格式）',
  `repo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'GitHub 仓库地址',
  `api_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API Key（用于额度消耗排行榜）',
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系邮箱',
  `contact_wechat` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信号（可选）',
  `contact_phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号（可选）',
  `status` enum('draft','submitted','approved','rejected','withdrawn') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'submitted' COMMENT '报名状态',
  `submitted_at` datetime DEFAULT NULL COMMENT '提交时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_registration_contest_user` (`contest_id`,`user_id`),
  UNIQUE KEY `uq_registration_api_key` (`api_key`),
  KEY `ix_registration_contest_status` (`contest_id`,`status`),
  KEY `ix_registration_user` (`user_id`),
  CONSTRAINT `fk_registrations_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registrations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报名表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registrations`
--

LOCK TABLES `registrations` WRITE;
/*!40000 ALTER TABLE `registrations` DISABLE KEYS */;
INSERT INTO `registrations` (`id`, `created_at`, `updated_at`, `contest_id`, `user_id`, `title`, `summary`, `description`, `plan`, `tech_stack`, `repo_url`, `api_key`, `contact_email`, `contact_wechat`, `contact_phone`, `status`, `submitted_at`) VALUES (13,'2025-12-22 02:46:13.491530','2025-12-22 11:22:15.364584',1,23,'API Key Tool - 令牌查询工具','一个优雅的API令牌查询工具，支持查看令牌余额、使用明细等信息。','🔍 令牌查询 - 支持查询API令牌的余额和使用情况\n📊 使用明细 - 详细记录每次调用的模型、时间、花费等信息\n💰 余额展示 - 实时显示令牌的总额、剩余额度和已用额度\n⚙️ 界面配置 - 可在界面上直接修改配置，无需重启\n📦 一键部署 - 支持Docker一键部署\n🎨 美观界面 - 基于Semi UI的现代化界面设计\n📈 流量监控 - 集成Vercel Analytics流量统计和Speed Insights性能监控（生产环境自动启用）','- [ ] 部署测试\n- [ ] 完成docker','{\"content\": \"前端框架: React 18\\nUI组件库: Semi UI\\nHTTP客户端: Axios\\n表格导出: PapaParse\\n通知组件: React Toastify\\n流量统计: Vercel Analytics\\n性能监控: Vercel Speed Insights\\n构建工具: React Scripts (Create React App)\\nWeb服务器: Nginx (生产环境)\\n容器化: Docker + Docker Compose\\n支持平台: OrbStack (推荐) / Docker Desktop\"}','https://github.com/deijing/api-key-tool','sk-sM4Y6jxek8Je6oJ2BCZNgCc4meAWOYbUchfHTEtl7anew3Uf','beijing@linux.do','anning2005',NULL,'approved','2025-12-22 02:46:13');
/*!40000 ALTER TABLE `registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_logs`
--

DROP TABLE IF EXISTS `request_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `method` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'HTTP 方法: GET, POST, PUT, DELETE 等',
  `path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '请求路径',
  `query_params` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '查询参数 (JSON)',
  `user_id` int DEFAULT NULL COMMENT '用户ID (如果已认证)',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名 (冗余字段，方便查询)',
  `ip_address` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客户端IP',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `status_code` int NOT NULL COMMENT 'HTTP 响应状态码',
  `response_time_ms` int NOT NULL COMMENT '响应时间(毫秒)',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` timestamp(3) NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '请求时间(毫秒精度)',
  PRIMARY KEY (`id`),
  KEY `idx_method` (`method`),
  KEY `idx_path` (`path`(100)),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status_code` (`status_code`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ip_address` (`ip_address`),
  KEY `idx_time_status` (`created_at`,`status_code`),
  KEY `idx_user_time` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 请求日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_logs`
--

LOCK TABLES `request_logs` WRITE;
/*!40000 ALTER TABLE `request_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `request_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scratch_cards`
--

DROP TABLE IF EXISTS `scratch_cards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scratch_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `cost_points` int NOT NULL COMMENT '购买花费积分',
  `prize_id` int NOT NULL COMMENT '预定奖品ID',
  `prize_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prize_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prize_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_rare` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('PURCHASED','REVEALED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PURCHASED',
  `revealed_at` datetime DEFAULT NULL COMMENT '刮开时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `config_id` (`config_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `scratch_cards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scratch_cards_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `lottery_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刮刮乐卡片';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scratch_cards`
--

LOCK TABLES `scratch_cards` WRITE;
/*!40000 ALTER TABLE `scratch_cards` DISABLE KEYS */;
/*!40000 ALTER TABLE `scratch_cards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `signin_milestones`
--

DROP TABLE IF EXISTS `signin_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `signin_milestones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `day` int NOT NULL COMMENT '连续天数',
  `bonus_points` int NOT NULL COMMENT '奖励积分',
  `description` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `day` (`day`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='签到里程碑配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `signin_milestones`
--

LOCK TABLES `signin_milestones` WRITE;
/*!40000 ALTER TABLE `signin_milestones` DISABLE KEYS */;
INSERT INTO `signin_milestones` (`id`, `day`, `bonus_points`, `description`, `created_at`, `updated_at`) VALUES (1,3,50,'连续签到3天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
INSERT INTO `signin_milestones` (`id`, `day`, `bonus_points`, `description`, `created_at`, `updated_at`) VALUES (2,7,150,'连续签到7天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
INSERT INTO `signin_milestones` (`id`, `day`, `bonus_points`, `description`, `created_at`, `updated_at`) VALUES (3,14,300,'连续签到14天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
INSERT INTO `signin_milestones` (`id`, `day`, `bonus_points`, `description`, `created_at`, `updated_at`) VALUES (4,30,500,'连续签到30天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
/*!40000 ALTER TABLE `signin_milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slot_machine_configs`
--

DROP TABLE IF EXISTS `slot_machine_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slot_machine_configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '幸运老虎机' COMMENT '配置名称',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `cost_points` int NOT NULL DEFAULT '30' COMMENT '每次消耗积分',
  `reels` int NOT NULL DEFAULT '3' COMMENT '滚轴数量',
  `two_kind_multiplier` decimal(6,2) NOT NULL DEFAULT '1.50' COMMENT '两连奖励倍数',
  `jackpot_symbol_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'seven' COMMENT '大奖符号key',
  `daily_limit` int DEFAULT '20',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `slot_machine_configs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='老虎机配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slot_machine_configs`
--

LOCK TABLES `slot_machine_configs` WRITE;
/*!40000 ALTER TABLE `slot_machine_configs` DISABLE KEYS */;
INSERT INTO `slot_machine_configs` (`id`, `name`, `is_active`, `cost_points`, `reels`, `two_kind_multiplier`, `jackpot_symbol_key`, `daily_limit`, `created_by`, `created_at`, `updated_at`) VALUES (1,'iKun转转乐',1,30,4,1.50,'m',20,NULL,'2025-12-18 10:27:19','2025-12-20 10:41:45');
/*!40000 ALTER TABLE `slot_machine_configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slot_machine_draws`
--

DROP TABLE IF EXISTS `slot_machine_draws`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slot_machine_draws` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `config_id` int NOT NULL,
  `cost_points` int NOT NULL COMMENT '消费积分',
  `reel_1` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '第一个滚轴结果',
  `reel_2` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '第二个滚轴结果',
  `reel_3` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '第三个滚轴结果',
  `win_type` enum('none','two','three') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none' COMMENT '中奖类型',
  `multiplier` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '倍率',
  `payout_points` int NOT NULL DEFAULT '0' COMMENT '获得积分',
  `is_jackpot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否大奖',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '幂等请求ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_config` (`config_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `slot_machine_draws_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `slot_machine_draws_ibfk_2` FOREIGN KEY (`config_id`) REFERENCES `slot_machine_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='老虎机抽奖记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slot_machine_draws`
--

LOCK TABLES `slot_machine_draws` WRITE;
/*!40000 ALTER TABLE `slot_machine_draws` DISABLE KEYS */;
/*!40000 ALTER TABLE `slot_machine_draws` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slot_machine_rules`
--

DROP TABLE IF EXISTS `slot_machine_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slot_machine_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL COMMENT '所属配置',
  `rule_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则唯一标识',
  `rule_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则名称',
  `rule_type` enum('three_same','two_same','special_combo','penalty','bonus') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '规则类型',
  `pattern` json DEFAULT NULL COMMENT '匹配模式(如["kun","kun","kun"]或位置条件)',
  `multiplier` decimal(10,2) NOT NULL DEFAULT '1.00' COMMENT '倍率(负数表示惩罚)',
  `fixed_points` int DEFAULT NULL COMMENT '固定奖励/惩罚积分',
  `probability` decimal(5,4) DEFAULT NULL COMMENT '触发概率(用于随机规则)',
  `min_amount` int DEFAULT NULL COMMENT '最小金额(用于随机范围)',
  `max_amount` int DEFAULT NULL COMMENT '最大金额(用于随机范围)',
  `priority` int NOT NULL DEFAULT '0' COMMENT '优先级(越大越先匹配)',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规则描述',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config_enabled` (`config_id`,`is_enabled`),
  KEY `idx_priority` (`config_id`,`priority` DESC),
  CONSTRAINT `slot_machine_rules_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `slot_machine_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slot_machine_rules`
--

LOCK TABLES `slot_machine_rules` WRITE;
/*!40000 ALTER TABLE `slot_machine_rules` DISABLE KEYS */;
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (21,1,'jntm_order','姬霓太美','special_combo','[\"j\", \"n\", \"t\", \"m\"]',100.00,NULL,NULL,NULL,NULL,100,1,'j→n→t→m 顺序出现，超级大奖','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (22,1,'4kun','4坤','three_same','[\"m\", \"m\", \"m\", \"m\"]',80.00,NULL,NULL,NULL,NULL,95,1,'4个坤符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (23,1,'4same','4🐔','three_same',NULL,50.00,NULL,NULL,NULL,NULL,90,1,'任意4个相同符号（排除律师函）','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (24,1,'jntm_any','鸡你不太美','special_combo','[\"j\", \"n\", \"t\", \"m\"]',15.00,NULL,NULL,NULL,NULL,85,1,'包含j,n,t,m四个符号（顺序不限）','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (25,1,'3kun','3坤','three_same','[\"m\"]',8.00,NULL,NULL,NULL,NULL,80,1,'3个坤符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (26,1,'any_three','普通3🐔','three_same',NULL,4.00,NULL,NULL,NULL,NULL,70,1,'任意3个相同符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (27,1,'2kun','2坤','two_same','[\"m\"]',3.00,NULL,NULL,NULL,NULL,60,1,'2个坤符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (28,1,'any_two','普通双🐔','two_same',NULL,1.50,NULL,NULL,NULL,NULL,50,1,'任意2个相同符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (29,1,'lsh_penalty','律师函惩罚','penalty','[\"lsh\"]',-0.50,NULL,0.3000,15,60,40,1,'出现律师函有30%概率触发惩罚','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` (`id`, `config_id`, `rule_key`, `rule_name`, `rule_type`, `pattern`, `multiplier`, `fixed_points`, `probability`, `min_amount`, `max_amount`, `priority`, `is_enabled`, `description`, `created_at`, `updated_at`) VALUES (30,1,'man_bonus','Man!护体','bonus','[\"man\"]',2.00,NULL,0.4000,30,100,45,1,'出现Man符号有40%概率获得额外奖励','2025-12-20 02:42:11','2025-12-20 02:42:11');
/*!40000 ALTER TABLE `slot_machine_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slot_machine_symbols`
--

DROP TABLE IF EXISTS `slot_machine_symbols`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slot_machine_symbols` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_id` int NOT NULL,
  `symbol_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '符号唯一key',
  `emoji` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '展示emoji',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '名称',
  `multiplier` int NOT NULL DEFAULT '1' COMMENT '三连倍率',
  `weight` int NOT NULL DEFAULT '1' COMMENT '权重（越大出现概率越高）',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `is_jackpot` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否大奖符号',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_config_symbol` (`config_id`,`symbol_key`),
  KEY `idx_config` (`config_id`),
  CONSTRAINT `slot_machine_symbols_ibfk_1` FOREIGN KEY (`config_id`) REFERENCES `slot_machine_configs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='老虎机符号配置';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slot_machine_symbols`
--

LOCK TABLES `slot_machine_symbols` WRITE;
/*!40000 ALTER TABLE `slot_machine_symbols` DISABLE KEYS */;
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (17,1,'j','🐔','鸡',30,10,1,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (18,1,'n','❓','你干嘛',20,12,2,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (19,1,'t','🏔️','铁山靠',15,12,3,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (20,1,'m','👨','坤',50,8,4,1,1,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (21,1,'bj','🎬','背景',10,15,5,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (22,1,'bdk','👖','背带裤',20,12,6,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (23,1,'lsh','📜','律师函',0,8,7,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` (`id`, `config_id`, `symbol_key`, `emoji`, `name`, `multiplier`, `weight`, `sort_order`, `is_enabled`, `is_jackpot`, `created_at`, `updated_at`) VALUES (24,1,'man','🕺','Man!',30,6,8,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
/*!40000 ALTER TABLE `slot_machine_symbols` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `submission_attachments`
--

DROP TABLE IF EXISTS `submission_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submission_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `submission_id` int NOT NULL COMMENT '关联作品提交ID',
  `type` enum('demo_video','api_screenshot','api_log','doc_file','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '附件类型: demo_video=演示视频, api_screenshot=API调用截图, api_log=API调用日志, doc_file=文档文件, other=其他',
  `storage_provider` enum('local','minio','s3','oss','cos') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local' COMMENT '存储提供方',
  `storage_key` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存储Key（本地相对路径或对象存储Key）',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文件名',
  `content_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MIME类型',
  `size_bytes` bigint unsigned DEFAULT NULL COMMENT '文件大小（字节）',
  `sha256` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SHA256校验和',
  `duration_seconds` int unsigned DEFAULT NULL COMMENT '视频/音频时长（秒）',
  `width` int unsigned DEFAULT NULL COMMENT '图片/视频宽度（像素）',
  `height` int unsigned DEFAULT NULL COMMENT '图片/视频高度（像素）',
  `is_uploaded` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已完成上传',
  `uploaded_at` datetime DEFAULT NULL COMMENT '上传完成时间',
  `is_valid` tinyint(1) DEFAULT NULL COMMENT '是否通过校验（NULL=未校验）',
  `validation_error` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '校验错误信息',
  PRIMARY KEY (`id`),
  KEY `ix_submission_attachments_submission` (`submission_id`),
  KEY `ix_submission_attachments_type` (`submission_id`,`type`),
  KEY `ix_submission_attachments_uploaded` (`submission_id`,`is_uploaded`),
  CONSTRAINT `fk_submission_attachments_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品提交附件表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submission_attachments`
--

LOCK TABLES `submission_attachments` WRITE;
/*!40000 ALTER TABLE `submission_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `submission_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `submission_reviews`
--

DROP TABLE IF EXISTS `submission_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submission_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `submission_id` int NOT NULL COMMENT '作品ID',
  `reviewer_id` int NOT NULL COMMENT '评审员用户ID',
  `score` tinyint unsigned NOT NULL COMMENT '评分(1-100)',
  `comment` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '评审意见(可选)',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_submission_reviewer` (`submission_id`,`reviewer_id`),
  KEY `idx_submission_id` (`submission_id`),
  KEY `idx_reviewer_id` (`reviewer_id`),
  CONSTRAINT `fk_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_submission` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_score_range` CHECK ((`score` between 1 and 100))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评审员评分明细表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submission_reviews`
--

LOCK TABLES `submission_reviews` WRITE;
/*!40000 ALTER TABLE `submission_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `submission_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `submissions`
--

DROP TABLE IF EXISTS `submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `user_id` int NOT NULL COMMENT '提交者ID',
  `contest_id` int NOT NULL COMMENT '关联比赛ID',
  `registration_id` int DEFAULT NULL COMMENT '关联报名ID（可选）',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作品标题',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '作品描述',
  `repo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '代码仓库URL',
  `demo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '演示地址',
  `video_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '演示视频URL',
  `project_doc_md` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '项目文档（Markdown格式，包含安装步骤、使用说明、技术架构）',
  `validation_summary` json DEFAULT NULL COMMENT '最近一次校验结果摘要（JSON）',
  `validated_at` datetime DEFAULT NULL COMMENT '最近一次校验时间',
  `submitted_at` datetime DEFAULT NULL COMMENT '最终提交时间',
  `status` enum('draft','validating','submitted','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '提交状态: draft=草稿, validating=校验中, submitted=已提交待审, approved=已通过, rejected=已拒绝',
  `vote_count` int NOT NULL DEFAULT '0' COMMENT '票数',
  `reviewer_id` int DEFAULT NULL COMMENT '审核人ID',
  `review_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '审核意见',
  `reviewed_at` datetime DEFAULT NULL COMMENT '审核时间',
  `final_score` decimal(5,2) DEFAULT NULL COMMENT '最终得分(去掉最高最低后平均)',
  `review_count` int unsigned NOT NULL DEFAULT '0' COMMENT '评分数量',
  `score_updated_at` datetime DEFAULT NULL COMMENT '评分统计更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_submissions_contest_user` (`contest_id`,`user_id`),
  KEY `ix_submissions_user` (`user_id`),
  KEY `ix_submissions_contest` (`contest_id`),
  KEY `ix_submissions_status` (`status`),
  KEY `ix_submissions_vote_count` (`vote_count` DESC),
  KEY `ix_submissions_registration` (`registration_id`),
  KEY `ix_submissions_reviewer` (`reviewer_id`),
  KEY `idx_final_score` (`final_score` DESC),
  CONSTRAINT `fk_submissions_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submissions_registration_id` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submissions_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_submissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品提交表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `submissions`
--

LOCK TABLES `submissions` WRITE;
/*!40000 ALTER TABLE `submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型: LOGIN, LOGOUT, REGISTER, SIGNIN, LOTTERY, BET, SUBMIT, VOTE, ADMIN, CHEER',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '操作描述',
  `ip_address` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `extra_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '额外数据(JSON)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_action` (`action`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `system_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_logs`
--

LOCK TABLES `system_logs` WRITE;
/*!40000 ALTER TABLE `system_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_definitions`
--

DROP TABLE IF EXISTS `task_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_definitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务唯一key（用于前端/配置）',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务名称',
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务描述',
  `schedule` enum('DAILY','WEEKLY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务周期',
  `task_type` enum('SIGNIN','BROWSE_PROJECT','CHEER','VOTE','COMMENT','PREDICTION','LOTTERY','GACHA','EXCHANGE','CHAIN_BONUS') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务类型',
  `target_value` int NOT NULL DEFAULT '1' COMMENT '目标次数',
  `reward_points` int NOT NULL DEFAULT '0' COMMENT '奖励积分',
  `reward_payload` json DEFAULT NULL COMMENT '扩展奖励（道具等）',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `auto_claim` tinyint(1) NOT NULL DEFAULT '1' COMMENT '完成后是否自动发放奖励',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序（越小越靠前）',
  `starts_at` datetime DEFAULT NULL COMMENT '开始时间',
  `ends_at` datetime DEFAULT NULL COMMENT '结束时间',
  `chain_group_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务分组key（用于任务链条件）',
  `chain_requires_group_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务链依赖分组key（CHAIN_BONUS专用）',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_key` (`task_key`),
  KEY `idx_active_schedule_sort` (`is_active`,`schedule`,`sort_order`),
  KEY `idx_type_schedule` (`task_type`,`schedule`),
  KEY `idx_chain_group` (`chain_group_key`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `task_definitions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务定义（每日/每周）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_definitions`
--

LOCK TABLES `task_definitions` WRITE;
/*!40000 ALTER TABLE `task_definitions` DISABLE KEYS */;
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (1,'daily_signin','每日签到','完成每日签到','DAILY','SIGNIN',1,20,NULL,1,1,10,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (2,'daily_browse_3','浏览项目','浏览3个项目详情页','DAILY','BROWSE_PROJECT',3,15,NULL,1,1,20,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (3,'daily_cheer_1','给选手打气','为任意选手打气1次','DAILY','CHEER',1,20,NULL,1,1,30,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (4,'daily_vote_1','投票支持','为喜欢的作品投票1次','DAILY','VOTE',1,15,NULL,1,1,40,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (5,'daily_prediction','参与竞猜','参与一次竞猜下注','DAILY','PREDICTION',1,20,NULL,1,1,50,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (6,'daily_lottery','幸运抽奖','参与一次抽奖活动','DAILY','LOTTERY',1,10,NULL,1,1,60,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (7,'daily_all_complete','今日全勤','完成所有每日任务后额外奖励','DAILY','CHAIN_BONUS',1,100,NULL,1,1,999,NULL,NULL,NULL,'daily_core',NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (8,'weekly_signin_5','周签到达人','本周累计签到5天','WEEKLY','SIGNIN',5,100,NULL,1,1,10,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (9,'weekly_cheer_10','应援达人','本周累计打气10次','WEEKLY','CHEER',10,80,NULL,1,1,20,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (10,'weekly_vote_5','投票达人','本周累计投票5次','WEEKLY','VOTE',5,60,NULL,1,1,30,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (11,'weekly_lottery_7','幸运七连抽','本周累计抽奖7次','WEEKLY','LOTTERY',7,50,NULL,1,1,40,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (12,'weekly_all_complete','周全勤王','完成所有每周任务后额外奖励','WEEKLY','CHAIN_BONUS',1,200,NULL,1,1,999,NULL,NULL,NULL,'weekly_core',NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (13,'daily_gacha','每日扭蛋','使用扭蛋机1次','DAILY','GACHA',1,30,NULL,1,1,55,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (14,'daily_exchange','积分商城','在商城兑换1件商品','DAILY','EXCHANGE',1,15,NULL,1,1,65,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (15,'weekly_gacha_5','扭蛋达人','本周累计扭蛋5次','WEEKLY','GACHA',5,100,NULL,1,1,35,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
INSERT INTO `task_definitions` (`id`, `task_key`, `name`, `description`, `schedule`, `task_type`, `target_value`, `reward_points`, `reward_payload`, `is_active`, `auto_claim`, `sort_order`, `starts_at`, `ends_at`, `chain_group_key`, `chain_requires_group_key`, `created_by`, `created_at`, `updated_at`) VALUES (16,'weekly_exchange_3','购物狂人','本周累计兑换3次','WEEKLY','EXCHANGE',3,60,NULL,1,1,45,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
/*!40000 ALTER TABLE `task_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_achievements`
--

DROP TABLE IF EXISTS `user_achievements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_achievements` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `achievement_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'locked' COMMENT 'locked/unlocked/claimed',
  `progress_value` int NOT NULL DEFAULT '0' COMMENT '当前进度值',
  `progress_data` json DEFAULT NULL COMMENT '额外进度数据(如连续天数记录)',
  `unlocked_at` timestamp NULL DEFAULT NULL,
  `claimed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_achievement` (`user_id`,`achievement_key`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_achievement_status` (`achievement_key`,`status`),
  CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户成就记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_achievements`
--

LOCK TABLES `user_achievements` WRITE;
/*!40000 ALTER TABLE `user_achievements` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_achievements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_badge_showcase`
--

DROP TABLE IF EXISTS `user_badge_showcase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_badge_showcase` (
  `user_id` int NOT NULL,
  `slot` tinyint unsigned NOT NULL COMMENT '槽位1-3',
  `achievement_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `pinned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`slot`),
  KEY `idx_achievement` (`achievement_key`),
  CONSTRAINT `fk_ubs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户徽章展示表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_badge_showcase`
--

LOCK TABLES `user_badge_showcase` WRITE;
/*!40000 ALTER TABLE `user_badge_showcase` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_badge_showcase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_exchange_quotas`
--

DROP TABLE IF EXISTS `user_exchange_quotas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_exchange_quotas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `quota_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '额度类型',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '剩余数量',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_quota_type` (`user_id`,`quota_type`),
  CONSTRAINT `user_exchange_quotas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户兑换券额度';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_exchange_quotas`
--

LOCK TABLES `user_exchange_quotas` WRITE;
/*!40000 ALTER TABLE `user_exchange_quotas` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_exchange_quotas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_item_purchase_counts`
--

DROP TABLE IF EXISTS `user_item_purchase_counts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_item_purchase_counts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `purchase_date` date NOT NULL COMMENT '购买日期（用于每日限购）',
  `daily_count` int NOT NULL DEFAULT '0' COMMENT '当日购买数量',
  `total_count` int NOT NULL DEFAULT '0' COMMENT '累计购买数量',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_item` (`user_id`,`item_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `user_item_purchase_counts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_item_purchase_counts_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `exchange_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户商品限购计数表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_item_purchase_counts`
--

LOCK TABLES `user_item_purchase_counts` WRITE;
/*!40000 ALTER TABLE `user_item_purchase_counts` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_item_purchase_counts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_items`
--

DROP TABLE IF EXISTS `user_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '道具类型',
  `quantity` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_item` (`user_id`,`item_type`),
  CONSTRAINT `user_items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=389 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户道具背包表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_items`
--

LOCK TABLES `user_items` WRITE;
/*!40000 ALTER TABLE `user_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_points`
--

DROP TABLE IF EXISTS `user_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_points` (
  `user_id` int NOT NULL,
  `balance` int NOT NULL DEFAULT '0' COMMENT '当前积分余额',
  `total_earned` int NOT NULL DEFAULT '0' COMMENT '累计获得积分',
  `total_spent` int NOT NULL DEFAULT '0' COMMENT '累计消费积分',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_points_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户积分表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_points`
--

LOCK TABLES `user_points` WRITE;
/*!40000 ALTER TABLE `user_points` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_points` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_stats`
--

DROP TABLE IF EXISTS `user_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_stats` (
  `user_id` int NOT NULL,
  `total_cheers_given` int NOT NULL DEFAULT '0' COMMENT '总打气次数',
  `total_cheers_with_message` int NOT NULL DEFAULT '0' COMMENT '带留言打气次数',
  `cheer_types_used` json DEFAULT NULL COMMENT '使用过的打气类型',
  `consecutive_days` int NOT NULL DEFAULT '0' COMMENT '当前连续打气天数',
  `max_consecutive_days` int NOT NULL DEFAULT '0' COMMENT '最大连续打气天数',
  `last_cheer_date` date DEFAULT NULL COMMENT '上次打气日期',
  `total_gacha_count` int NOT NULL DEFAULT '0',
  `gacha_rare_count` int NOT NULL DEFAULT '0',
  `prediction_total` int NOT NULL DEFAULT '0',
  `prediction_correct` int NOT NULL DEFAULT '0',
  `daily_task_streak` int NOT NULL DEFAULT '0',
  `max_daily_task_streak` int NOT NULL DEFAULT '0',
  `weekly_tasks_completed` int NOT NULL DEFAULT '0',
  `last_task_date` date DEFAULT NULL,
  `total_points` int NOT NULL DEFAULT '0' COMMENT '累计成就积分',
  `achievements_unlocked` int NOT NULL DEFAULT '0' COMMENT '已解锁成就数',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_stats`
--

LOCK TABLES `user_stats` WRITE;
/*!40000 ALTER TABLE `user_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_task_claims`
--

DROP TABLE IF EXISTS `user_task_claims`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_task_claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `task_id` int NOT NULL,
  `period_start` date NOT NULL COMMENT '周期开始日期',
  `reward_points` int NOT NULL DEFAULT '0' COMMENT '奖励积分快照',
  `reward_payload` json DEFAULT NULL COMMENT '扩展奖励快照（JSON）',
  `request_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '幂等请求ID（用于防重复领取/跨系统幂等）',
  `claimed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  UNIQUE KEY `uq_user_task_claim` (`user_id`,`task_id`,`period_start`),
  KEY `idx_user_claimed_at` (`user_id`,`claimed_at`),
  KEY `task_id` (`task_id`),
  CONSTRAINT `user_task_claims_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_task_claims_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `task_definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户任务领取记录';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_task_claims`
--

LOCK TABLES `user_task_claims` WRITE;
/*!40000 ALTER TABLE `user_task_claims` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_task_claims` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_task_events`
--

DROP TABLE IF EXISTS `user_task_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_task_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `schedule` enum('DAILY','WEEKLY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `period_start` date NOT NULL,
  `task_type` enum('SIGNIN','BROWSE_PROJECT','CHEER','VOTE','COMMENT','PREDICTION','LOTTERY','GACHA','EXCHANGE','CHAIN_BONUS') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_key` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '事件幂等key（如 cheer:123 / signin:2025-01-01）',
  `ref_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型',
  `ref_id` int DEFAULT NULL COMMENT '关联ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_period_event` (`user_id`,`schedule`,`period_start`,`event_key`),
  KEY `idx_user_type_period` (`user_id`,`task_type`,`schedule`,`period_start`),
  CONSTRAINT `user_task_events_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1265 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务事件去重';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_task_events`
--

LOCK TABLES `user_task_events` WRITE;
/*!40000 ALTER TABLE `user_task_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_task_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_task_progress`
--

DROP TABLE IF EXISTS `user_task_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_task_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `task_id` int NOT NULL,
  `period_start` date NOT NULL COMMENT '周期开始日期（DAILY为当天，WEEKLY为周一）',
  `period_end` date NOT NULL COMMENT '周期结束日期',
  `progress_value` int NOT NULL DEFAULT '0' COMMENT '当前进度',
  `target_value` int NOT NULL DEFAULT '1' COMMENT '目标快照（防止配置变更影响已有进度）',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `claimed_at` datetime DEFAULT NULL COMMENT '领取/发放时间',
  `last_event_at` datetime DEFAULT NULL COMMENT '最近一次进度更新事件时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_task_period` (`user_id`,`task_id`,`period_start`),
  KEY `idx_user_period` (`user_id`,`period_start`),
  KEY `idx_task_period` (`task_id`,`period_start`),
  KEY `idx_completed` (`user_id`,`completed_at`),
  CONSTRAINT `user_task_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_task_progress_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `task_definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1254 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户任务进度';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_task_progress`
--

LOCK TABLES `user_task_progress` WRITE;
/*!40000 ALTER TABLE `user_task_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_task_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱地址',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `hashed_password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '密码哈希（OAuth用户为空）',
  `role` enum('admin','reviewer','contestant','spectator') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'spectator' COMMENT '用户角色: admin=管理员, reviewer=评审员, contestant=参赛者, spectator=吃瓜用户',
  `original_role` enum('admin','reviewer','contestant','spectator') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_selected` tinyint(1) NOT NULL DEFAULT '0',
  `role_selected_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否激活',
  `avatar_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
  `linux_do_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Linux.do 用户ID',
  `linux_do_username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Linux.do 用户名',
  `display_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '显示名称',
  `linux_do_avatar_template` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Linux.do 头像模板',
  `github_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_avatar_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `github_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trust_level` int DEFAULT NULL COMMENT 'Linux.do 信任等级',
  `is_silenced` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否被禁言',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_linux_do_id` (`linux_do_id`),
  UNIQUE KEY `uq_users_github_id` (`github_id`),
  KEY `ix_users_role` (`role`),
  KEY `ix_users_is_active` (`is_active`),
  KEY `idx_users_github_username` (`github_username`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `created_at`, `updated_at`, `email`, `username`, `hashed_password`, `role`, `original_role`, `role_selected`, `role_selected_at`, `is_active`, `avatar_url`, `linux_do_id`, `linux_do_username`, `display_name`, `linux_do_avatar_template`, `github_id`, `github_username`, `github_avatar_url`, `github_email`, `trust_level`, `is_silenced`) VALUES (23,'2025-12-22 02:43:29.759403','2025-12-22 02:49:41.085273',NULL,'user841',NULL,'contestant','admin',1,'2025-12-22 02:43:38',1,'https://linux.do/user_avatar/linux.do/user841/288/401259_2.png','88275','user841','枫枫 北','https://linux.do/user_avatar/linux.do/user841/288/401259_2.png',NULL,NULL,NULL,NULL,3,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `votes`
--

DROP TABLE IF EXISTS `votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `votes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `user_id` int NOT NULL COMMENT '投票用户ID',
  `submission_id` int NOT NULL COMMENT '被投作品ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vote_user_submission` (`user_id`,`submission_id`),
  KEY `ix_votes_submission` (`submission_id`),
  CONSTRAINT `fk_votes_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_votes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `votes`
--

LOCK TABLES `votes` WRITE;
/*!40000 ALTER TABLE `votes` DISABLE KEYS */;
/*!40000 ALTER TABLE `votes` ENABLE KEYS */;
UNLOCK TABLES;
 
--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `contest_id` int NOT NULL COMMENT '关联比赛ID',
  `user_id` int NOT NULL COMMENT '创建者ID',
  `title` varchar(200) NOT NULL COMMENT '作品名称',
  `summary` varchar(500) DEFAULT NULL COMMENT '作品简介',
  `description` text COMMENT '作品详情',
  `repo_url` varchar(500) DEFAULT NULL COMMENT '开源仓库地址',
  `cover_image_url` varchar(500) DEFAULT NULL COMMENT '封面图',
  `screenshot_urls` json DEFAULT NULL COMMENT '截图列表',
  `readme_url` varchar(500) DEFAULT NULL COMMENT 'README 链接',
  `demo_url` varchar(500) DEFAULT NULL COMMENT '演示地址',
  `status` enum('draft','submitted','online','offline') NOT NULL DEFAULT 'draft' COMMENT '作品状态',
  `current_submission_id` int DEFAULT NULL COMMENT '当前线上 submission_id',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_contest_user` (`contest_id`,`user_id`),
  KEY `ix_projects_contest` (`contest_id`),
  KEY `ix_projects_user` (`user_id`),
  KEY `ix_projects_status` (`status`),
  CONSTRAINT `fk_projects_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_projects_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_submissions`
--

DROP TABLE IF EXISTS `project_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `project_id` int NOT NULL COMMENT '关联作品ID',
  `contest_id` int NOT NULL COMMENT '关联比赛ID',
  `user_id` int NOT NULL COMMENT '提交者ID',
  `image_ref` varchar(500) NOT NULL COMMENT '镜像引用（含 digest）',
  `image_registry` varchar(100) DEFAULT NULL COMMENT '镜像仓库域名',
  `image_repo` varchar(300) DEFAULT NULL COMMENT '镜像仓库路径',
  `image_digest` varchar(128) DEFAULT NULL COMMENT '镜像 digest',
  `status` enum('created','queued','pulling','deploying','healthchecking','online','failed','stopped') NOT NULL DEFAULT 'created' COMMENT '提交状态',
  `status_message` varchar(500) DEFAULT NULL COMMENT '状态说明',
  `error_code` varchar(100) DEFAULT NULL COMMENT '错误码',
  `log` longtext COMMENT '部署日志',
  `domain` varchar(255) DEFAULT NULL COMMENT '访问域名',
  `status_history` json DEFAULT NULL COMMENT '状态历史',
  `submitted_at` datetime(6) DEFAULT NULL COMMENT '提交时间',
  `online_at` datetime(6) DEFAULT NULL COMMENT '上线时间',
  `failed_at` datetime(6) DEFAULT NULL COMMENT '失败时间',
  PRIMARY KEY (`id`),
  KEY `ix_project_submissions_project` (`project_id`),
  KEY `ix_project_submissions_contest` (`contest_id`),
  KEY `ix_project_submissions_user` (`user_id`),
  KEY `ix_project_submissions_status` (`status`),
  KEY `ix_project_submissions_submitted` (`submitted_at`),
  CONSTRAINT `fk_project_submissions_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_submissions_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_submissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品部署提交表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_submissions`
--

LOCK TABLES `project_submissions` WRITE;
/*!40000 ALTER TABLE `project_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_review_assignments`
--

DROP TABLE IF EXISTS `project_review_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_review_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `project_id` int NOT NULL COMMENT '关联作品ID',
  `reviewer_id` int NOT NULL COMMENT '评审员用户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_review_assignment` (`project_id`,`reviewer_id`),
  KEY `ix_project_review_assignments_project` (`project_id`),
  KEY `ix_project_review_assignments_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_project_review_assignments_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_review_assignments_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品评审分配表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_review_assignments`
--

LOCK TABLES `project_review_assignments` WRITE;
/*!40000 ALTER TABLE `project_review_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_review_assignments` ENABLE KEYS */;
UNLOCK TABLES;
 
--
-- Table structure for table `project_reviews`
--

DROP TABLE IF EXISTS `project_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `project_id` int NOT NULL COMMENT '关联作品ID',
  `reviewer_id` int NOT NULL COMMENT '评审员用户ID',
  `score` smallint NOT NULL COMMENT '评分(1-100)',
  `comment` varchar(2000) DEFAULT NULL COMMENT '评审意见(可选)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_reviewer` (`project_id`,`reviewer_id`),
  KEY `ix_project_reviews_project` (`project_id`),
  KEY `ix_project_reviews_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_project_reviews_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_reviews_reviewer_id` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品评审评分表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_reviews`
--

LOCK TABLES `project_reviews` WRITE;
/*!40000 ALTER TABLE `project_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_likes`
--

DROP TABLE IF EXISTS `project_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `project_id` int NOT NULL COMMENT '关联作品ID',
  `user_id` int NOT NULL COMMENT '点赞用户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_like` (`project_id`,`user_id`),
  KEY `ix_project_likes_project` (`project_id`),
  KEY `ix_project_likes_user` (`user_id`),
  CONSTRAINT `fk_project_likes_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_likes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品点赞表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_likes`
--

LOCK TABLES `project_likes` WRITE;
/*!40000 ALTER TABLE `project_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_favorites`
--

DROP TABLE IF EXISTS `project_favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_favorites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `project_id` int NOT NULL COMMENT '关联作品ID',
  `user_id` int NOT NULL COMMENT '收藏用户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_favorite` (`project_id`,`user_id`),
  KEY `ix_project_favorites_project` (`project_id`),
  KEY `ix_project_favorites_user` (`user_id`),
  CONSTRAINT `fk_project_favorites_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_favorites_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品收藏表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_favorites`
--

LOCK TABLES `project_favorites` WRITE;
/*!40000 ALTER TABLE `project_favorites` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_favorites` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-22 11:24:52
