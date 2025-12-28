-- 生产环境配置数据
-- 生成时间: 2025-12-22 10:20:25


-- 表: contests
INSERT INTO `contests` (`id`, `created_at`, `updated_at`, `title`, `description`, `phase`, `signup_start`, `signup_end`, `submit_start`, `submit_end`, `vote_start`, `vote_end`) VALUES (1,'2025-12-16 16:39:21.705059','2025-12-16 16:39:21.705059','第一届鸡王争霸赛','# ikuncode 开发者实战大赏\n\n这是一场面向所有开发者的创意编程比赛，展示你的技术实力，赢取丰厚奖品！','signup','2025-12-16 16:39:21','2026-01-15 16:39:21',NULL,NULL,NULL,NULL);


-- 表: achievement_definitions
INSERT INTO `achievement_definitions` VALUES (1,'cheer_first','初次打气','送出你的第一份应援','cheers','heart','bronze',5,1,1,100,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (2,'cheer_10','小小应援','累计打气 10 次','cheers','heart','bronze',10,10,1,101,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (3,'cheer_50','应援达人','累计打气 50 次','cheers','heart','silver',25,50,1,102,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (4,'cheer_100','超级粉丝','累计打气 100 次','cheers','heart','gold',50,100,1,103,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (5,'cheer_all_types','全套礼物','使用过所有5种打气类型','cheers','gift','silver',30,5,1,110,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (6,'message_first','有话要说','第一次带留言打气','social','message','bronze',5,1,1,200,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (7,'message_10','话痨出道','带留言打气 10 次','social','message','silver',20,10,1,201,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (8,'message_50','金牌嘴替','带留言打气 50 次','social','message','gold',40,50,1,202,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (9,'streak_3','三天不断','连续 3 天打气','retention','fire','bronze',15,3,1,300,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (10,'streak_7','一周坚守','连续 7 天打气','retention','fire','silver',35,7,1,301,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (11,'streak_14','两周狂热','连续 14 天打气','retention','fire','gold',70,14,1,302,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (12,'explore_all_projects','全场巡视','给至少 5 个不同项目打过气','explorer','compass','silver',25,5,1,400,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (13,'early_supporter','先锋观众','在比赛开始 3 天内打气','explorer','rocket','bronze',20,1,1,401,'2025-12-17 04:07:30','2025-12-17 04:07:30');
INSERT INTO `achievement_definitions` VALUES (14,'easter_hunter','彩蛋猎人','成功发现并兑换了隐藏彩蛋','easter_egg','egg','bronze',500,1,1,100,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` VALUES (15,'secret_finder','秘密发现者','发现了网站中隐藏的秘密','easter_egg','search','silver',500,1,1,101,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` VALUES (16,'treasure_hunter','寻宝达人','在寻宝活动中展现了非凡的能力','easter_egg','gem','gold',500,1,1,102,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` VALUES (17,'lucky_star','幸运之星','被幸运女神眷顾的玩家','easter_egg','star','gold',500,1,1,103,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` VALUES (18,'ikun_pioneer','iKun先锋','鸡王争霸赛的先锋参与者','easter_egg','crown','diamond',500,1,1,104,'2025-12-17 12:22:28','2025-12-17 12:28:28');
INSERT INTO `achievement_definitions` VALUES (19,'gacha_beginner','扭蛋新手','首次使用扭蛋机','gacha','gift','bronze',100,1,1,200,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (20,'gacha_addict','扭蛋狂人','累计扭蛋10次','gacha','gift','silver',300,10,1,201,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (21,'gacha_master','扭蛋大师','累计扭蛋50次','gacha','gift','gold',800,50,1,202,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (22,'lucky_egg','幸运蛋','扭蛋获得稀有奖励','gacha','star','gold',500,1,1,210,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (23,'golden_touch','点金手','连续3次扭蛋获得高价值奖励','gacha','crown','diamond',1000,1,1,211,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (24,'daily_warrior','每日战士','连续7天完成所有每日任务','activity','flame','gold',500,7,1,220,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (25,'weekly_champion','周冠军','连续4周完成所有每周任务','activity','trophy','diamond',1000,4,1,221,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (26,'cheerleader','啦啦队长','累计为选手打气100次','social','heart','gold',500,100,1,230,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (27,'prediction_king','预言家','竞猜准确率超过80%','social','zap','diamond',800,1,1,231,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `achievement_definitions` VALUES (28,'gacha_lucky_bronze','幸运铜蛋','扭蛋机获得的幸运徽章','explorer','egg','bronze',0,1,1,100,'2025-12-18 04:57:22','2025-12-18 04:57:22');
INSERT INTO `achievement_definitions` VALUES (29,'gacha_lucky_silver','幸运银蛋','扭蛋机获得的稀有徽章','explorer','egg','silver',0,1,1,101,'2025-12-18 04:57:22','2025-12-18 04:57:22');
INSERT INTO `achievement_definitions` VALUES (30,'gacha_lucky_gold','幸运金蛋','扭蛋机获得的珍贵徽章','explorer','egg','gold',0,1,1,102,'2025-12-18 04:57:22','2025-12-18 04:57:22');
INSERT INTO `achievement_definitions` VALUES (31,'gacha_lucky_diamond','幸运钻蛋','扭蛋机获得的璀璨徽章','explorer','gem','diamond',0,1,1,103,'2025-12-18 05:07:26','2025-12-18 05:07:26');
INSERT INTO `achievement_definitions` VALUES (32,'gacha_lucky_star','幸运星耀','扭蛋机获得的闪耀徽章','explorer','sparkles','star',0,1,1,104,'2025-12-18 05:07:26','2025-12-18 05:07:26');
INSERT INTO `achievement_definitions` VALUES (33,'gacha_lucky_king','幸运王者','扭蛋机获得的传说徽章','explorer','crown','king',0,1,1,105,'2025-12-18 05:07:26','2025-12-18 05:07:26');


-- 表: task_definitions
INSERT INTO `task_definitions` VALUES (1,'daily_signin','每日签到','完成每日签到','DAILY','SIGNIN',1,20,NULL,1,1,10,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (2,'daily_browse_3','浏览项目','浏览3个项目详情页','DAILY','BROWSE_PROJECT',3,15,NULL,1,1,20,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (3,'daily_cheer_1','给选手打气','为任意选手打气1次','DAILY','CHEER',1,20,NULL,1,1,30,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (4,'daily_vote_1','投票支持','为喜欢的作品投票1次','DAILY','VOTE',1,15,NULL,1,1,40,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (5,'daily_prediction','参与竞猜','参与一次竞猜下注','DAILY','PREDICTION',1,20,NULL,1,1,50,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (6,'daily_lottery','幸运抽奖','参与一次抽奖活动','DAILY','LOTTERY',1,10,NULL,1,1,60,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (7,'daily_all_complete','今日全勤','完成所有每日任务后额外奖励','DAILY','CHAIN_BONUS',1,100,NULL,1,1,999,NULL,NULL,NULL,'daily_core',NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (8,'weekly_signin_5','周签到达人','本周累计签到5天','WEEKLY','SIGNIN',5,100,NULL,1,1,10,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (9,'weekly_cheer_10','应援达人','本周累计打气10次','WEEKLY','CHEER',10,80,NULL,1,1,20,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (10,'weekly_vote_5','投票达人','本周累计投票5次','WEEKLY','VOTE',5,60,NULL,1,1,30,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (11,'weekly_lottery_7','幸运七连抽','本周累计抽奖7次','WEEKLY','LOTTERY',7,50,NULL,1,1,40,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (12,'weekly_all_complete','周全勤王','完成所有每周任务后额外奖励','WEEKLY','CHAIN_BONUS',1,200,NULL,1,1,999,NULL,NULL,NULL,'weekly_core',NULL,'2025-12-18 10:20:41','2025-12-18 10:20:41');
INSERT INTO `task_definitions` VALUES (13,'daily_gacha','每日扭蛋','使用扭蛋机1次','DAILY','GACHA',1,30,NULL,1,1,55,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
INSERT INTO `task_definitions` VALUES (14,'daily_exchange','积分商城','在商城兑换1件商品','DAILY','EXCHANGE',1,15,NULL,1,1,65,NULL,NULL,'daily_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
INSERT INTO `task_definitions` VALUES (15,'weekly_gacha_5','扭蛋达人','本周累计扭蛋5次','WEEKLY','GACHA',5,100,NULL,1,1,35,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');
INSERT INTO `task_definitions` VALUES (16,'weekly_exchange_3','购物狂人','本周累计兑换3次','WEEKLY','EXCHANGE',3,60,NULL,1,1,45,NULL,NULL,'weekly_core',NULL,NULL,'2025-12-18 10:56:12','2025-12-18 10:56:12');


-- 表: signin_milestones
INSERT INTO `signin_milestones` VALUES (1,3,50,'连续签到3天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
INSERT INTO `signin_milestones` VALUES (2,7,150,'连续签到7天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
INSERT INTO `signin_milestones` VALUES (3,14,300,'连续签到14天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');
INSERT INTO `signin_milestones` VALUES (4,30,500,'连续签到30天奖励','2025-12-17 05:12:34','2025-12-17 13:13:23');


-- 表: lottery_configs
INSERT INTO `lottery_configs` VALUES (1,'鸡王幸运转盘',20,1,50,NULL,NULL,NULL,'2025-12-17 05:12:34','2025-12-17 05:12:34');
INSERT INTO `lottery_configs` VALUES (2,'神秘刮刮乐',30,1,5,NULL,NULL,NULL,'2025-12-17 13:01:57','2025-12-17 13:01:57');


-- 表: lottery_prizes
INSERT INTO `lottery_prizes` VALUES (1,1,'ITEM','爱心打气','cheer',200,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (2,1,'ITEM','咖啡打气','coffee',180,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (3,1,'ITEM','能量打气','energy',150,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (4,1,'ITEM','披萨打气','pizza',120,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (5,1,'ITEM','星星打气','star',100,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (6,1,'POINTS','安慰奖 5积分','5',100,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (7,1,'POINTS','幸运奖 20积分','20',30,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (8,1,'POINTS','大奖 50积分','50',10,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (9,1,'API_KEY','API Key兑换码',NULL,100,NULL,1,1,'2025-12-17 05:12:34','2025-12-20 04:38:46');
INSERT INTO `lottery_prizes` VALUES (10,1,'EMPTY','谢谢参与',NULL,10,NULL,0,1,'2025-12-17 05:12:34','2025-12-17 13:13:03');
INSERT INTO `lottery_prizes` VALUES (14,2,'API_KEY','神秘兑换码',NULL,5,NULL,1,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` VALUES (15,2,'POINTS','幸运积分 +50','50',20,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` VALUES (16,2,'POINTS','小额积分 +20','20',30,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` VALUES (17,2,'POINTS','微量积分 +10','10',35,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');
INSERT INTO `lottery_prizes` VALUES (18,2,'EMPTY','谢谢参与',NULL,10,NULL,0,1,'2025-12-17 13:01:57','2025-12-17 21:01:57');


-- 表: gacha_configs
INSERT INTO `gacha_configs` VALUES (1,'幸运扭蛋机',1,50,30,NULL,'2025-12-20 02:33:28','2025-12-20 02:33:28');


-- 表: gacha_prizes
INSERT INTO `gacha_prizes` VALUES (1,1,'points','10积分','{\"amount\": 10}',24.80,NULL,0,1,1,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (2,1,'points','30积分','{\"amount\": 30}',20.00,NULL,0,1,2,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (3,1,'points','50积分','{\"amount\": 50}',12.00,NULL,0,1,3,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (4,1,'points','100积分','{\"amount\": 100}',5.00,NULL,1,1,4,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (5,1,'points','200积分','{\"amount\": 200}',2.00,NULL,1,1,5,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (6,1,'points','500积分','{\"amount\": 500}',1.00,NULL,1,1,6,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (7,1,'api_key','神秘兑换码','{\"usage_type\": \"扭蛋机\"}',0.20,NULL,1,1,7,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (8,1,'item','爱心x1','{\"amount\": 1, \"item_type\": \"cheer\"}',8.00,NULL,0,1,8,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (9,1,'item','咖啡x1','{\"amount\": 1, \"item_type\": \"coffee\"}',5.00,NULL,0,1,9,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (10,1,'item','能量x1','{\"amount\": 1, \"item_type\": \"energy\"}',3.00,NULL,0,1,10,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (11,1,'item','披萨x1','{\"amount\": 1, \"item_type\": \"pizza\"}',2.00,NULL,1,1,11,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (12,1,'item','星星x1','{\"amount\": 1, \"item_type\": \"star\"}',1.00,NULL,1,1,12,'2025-12-20 02:33:28','2025-12-20 02:33:28');
INSERT INTO `gacha_prizes` VALUES (13,1,'badge','幸运铜蛋','{\"tier\": \"bronze\", \"achievement_key\": \"gacha_lucky_bronze\", \"fallback_points\": 50}',10.00,NULL,0,1,13,'2025-12-20 02:33:28','2025-12-19 19:37:47');
INSERT INTO `gacha_prizes` VALUES (14,1,'badge','幸运银蛋','{\"tier\": \"silver\", \"achievement_key\": \"gacha_lucky_silver\", \"fallback_points\": 100}',8.00,NULL,0,1,14,'2025-12-20 02:33:28','2025-12-19 19:37:51');
INSERT INTO `gacha_prizes` VALUES (15,1,'badge','幸运金蛋','{\"tier\": \"gold\", \"achievement_key\": \"gacha_lucky_gold\", \"fallback_points\": 200}',6.00,NULL,1,1,15,'2025-12-20 02:33:28','2025-12-19 19:37:55');
INSERT INTO `gacha_prizes` VALUES (16,1,'badge','幸运钻蛋','{\"tier\": \"diamond\", \"achievement_key\": \"gacha_lucky_diamond\", \"fallback_points\": 500}',4.00,NULL,1,1,16,'2025-12-20 02:33:28','2025-12-19 19:38:01');
INSERT INTO `gacha_prizes` VALUES (17,1,'badge','幸运星耀','{\"tier\": \"star\", \"achievement_key\": \"gacha_lucky_star\", \"fallback_points\": 1000}',2.00,NULL,1,1,17,'2025-12-20 02:33:28','2025-12-19 19:37:20');
INSERT INTO `gacha_prizes` VALUES (18,1,'badge','幸运王者','{\"tier\": \"king\", \"achievement_key\": \"gacha_lucky_king\", \"fallback_points\": 2000}',1.00,NULL,1,1,18,'2025-12-20 02:33:28','2025-12-19 19:37:16');


-- 表: slot_machine_configs
INSERT INTO `slot_machine_configs` VALUES (1,'iKun转转乐',1,30,4,1.50,'m',20,NULL,'2025-12-18 10:27:19','2025-12-20 10:41:45');


-- 表: slot_machine_rules
INSERT INTO `slot_machine_rules` VALUES (21,1,'jntm_order','姬霓太美','special_combo','[\"j\", \"n\", \"t\", \"m\"]',100.00,NULL,NULL,NULL,NULL,100,1,'j→n→t→m 顺序出现，超级大奖','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (22,1,'4kun','4坤','three_same','[\"m\", \"m\", \"m\", \"m\"]',80.00,NULL,NULL,NULL,NULL,95,1,'4个坤符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (23,1,'4same','4🐔','three_same',NULL,50.00,NULL,NULL,NULL,NULL,90,1,'任意4个相同符号（排除律师函）','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (24,1,'jntm_any','鸡你不太美','special_combo','[\"j\", \"n\", \"t\", \"m\"]',15.00,NULL,NULL,NULL,NULL,85,1,'包含j,n,t,m四个符号（顺序不限）','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (25,1,'3kun','3坤','three_same','[\"m\"]',8.00,NULL,NULL,NULL,NULL,80,1,'3个坤符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (26,1,'any_three','普通3🐔','three_same',NULL,4.00,NULL,NULL,NULL,NULL,70,1,'任意3个相同符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (27,1,'2kun','2坤','two_same','[\"m\"]',3.00,NULL,NULL,NULL,NULL,60,1,'2个坤符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (28,1,'any_two','普通双🐔','two_same',NULL,1.50,NULL,NULL,NULL,NULL,50,1,'任意2个相同符号','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (29,1,'lsh_penalty','律师函惩罚','penalty','[\"lsh\"]',-0.50,NULL,0.3000,15,60,40,1,'出现律师函有30%概率触发惩罚','2025-12-20 02:42:11','2025-12-20 02:42:11');
INSERT INTO `slot_machine_rules` VALUES (30,1,'man_bonus','Man!护体','bonus','[\"man\"]',2.00,NULL,0.4000,30,100,45,1,'出现Man符号有40%概率获得额外奖励','2025-12-20 02:42:11','2025-12-20 02:42:11');


-- 表: slot_machine_symbols
INSERT INTO `slot_machine_symbols` VALUES (17,1,'j','🐔','鸡',30,10,1,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (18,1,'n','❓','你干嘛',20,12,2,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (19,1,'t','🏔️','铁山靠',15,12,3,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (20,1,'m','👨','坤',50,8,4,1,1,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (21,1,'bj','🎬','背景',10,15,5,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (22,1,'bdk','👖','背带裤',20,12,6,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (23,1,'lsh','📜','律师函',0,8,7,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');
INSERT INTO `slot_machine_symbols` VALUES (24,1,'man','🕺','Man!',30,6,8,1,0,'2025-12-20 10:41:45','2025-12-20 10:41:45');


-- 表: exchange_items
INSERT INTO `exchange_items` VALUES (5,'幸运抽奖券','免费参与一次大转盘抽奖','LOTTERY_TICKET',NULL,20,NULL,5,NULL,1,10,'ticket',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` VALUES (6,'刮刮乐券','免费获得一张刮刮乐卡','SCRATCH_TICKET',NULL,30,NULL,5,NULL,1,20,'card',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` VALUES (7,'扭蛋机券','免费扭一次扭蛋机','GACHA_TICKET',NULL,50,NULL,5,NULL,1,30,'gift',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` VALUES (8,'老虎机券','免费玩一次老虎机','SLOT_TICKET',NULL,30,NULL,5,NULL,1,40,'star',1,'2025-12-21 11:10:50','2025-12-21 11:10:50');
INSERT INTO `exchange_items` VALUES (9,'API Key $5','价值 $5 的 API 额度兑换码','API_KEY','5',3000,NULL,1,1,1,100,'key',0,'2025-12-21 11:10:50','2025-12-21 11:23:27');
INSERT INTO `exchange_items` VALUES (10,'API Key $10','价值 $10 的 API 额度兑换码','API_KEY','10',5000,NULL,1,1,1,110,'key',0,'2025-12-21 11:10:50','2025-12-21 11:23:27');
INSERT INTO `exchange_items` VALUES (11,'API Key $20','价值 $20 的 API 额度兑换码','API_KEY','20',9000,NULL,1,1,1,120,'key',0,'2025-12-21 11:21:08','2025-12-21 11:23:27');
INSERT INTO `exchange_items` VALUES (12,'API Key $50','价值 $50 的 API 额度兑换码','API_KEY','50',20000,NULL,1,1,1,130,'key',0,'2025-12-21 11:21:08','2025-12-21 11:23:27');


-- 表: prediction_markets
INSERT INTO `prediction_markets` VALUES (1,'鸡王争霸赛最终冠军预测','预测本届鸡王争霸赛的最终冠军归属！根据当前人气榜和项目质量，谁将问鼎鸡王宝座？','OPEN',NULL,'2025-12-24 09:16:48',NULL,0.0500,10,1000,0,NULL,'2025-12-17 09:16:48','2025-12-17 09:16:48');
INSERT INTO `prediction_markets` VALUES (2,'本周最佳项目花落谁家','根据代码质量、创新性、实用性综合评判，本周哪个项目将获得最佳项目称号？','OPEN',NULL,'2025-12-20 09:16:48',NULL,0.0500,5,500,500,NULL,'2025-12-17 09:16:48','2025-12-17 18:39:24');
INSERT INTO `prediction_markets` VALUES (3,'本届参赛人数最终预测','截止报名结束，本届鸡王争霸赛将有多少人成功提交作品？','OPEN',NULL,'2025-12-22 09:16:48',NULL,0.0500,10,800,0,NULL,'2025-12-17 09:16:48','2025-12-17 09:16:48');


-- 表: prediction_options
INSERT INTO `prediction_options` VALUES (1,1,'代码小王子','目前人气榜第一，项目完成度高',NULL,NULL,0,NULL,2.50,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (2,1,'算法大神','AI 项目极具创新性，潜力巨大',NULL,NULL,0,NULL,3.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (3,1,'全栈小能手','技术全面，前后端一把抓',NULL,NULL,0,NULL,4.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (4,1,'黑马选手','低调实力派，可能爆冷',NULL,NULL,0,NULL,6.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (5,2,'AI 智能助手','基于大模型的智能对话系统',NULL,NULL,500,NULL,0.95,'2025-12-17 09:16:48','2025-12-18 02:39:24');
INSERT INTO `prediction_options` VALUES (6,2,'区块链溯源平台','去中心化的供应链追踪方案',NULL,NULL,0,NULL,NULL,'2025-12-17 09:16:48','2025-12-18 02:39:24');
INSERT INTO `prediction_options` VALUES (7,2,'物联网监控系统','实时数据采集与可视化',NULL,NULL,0,NULL,NULL,'2025-12-17 09:16:48','2025-12-18 02:39:24');
INSERT INTO `prediction_options` VALUES (8,3,'30人以下','参与热情一般',NULL,NULL,0,NULL,5.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (9,3,'30-50人','中等规模参与',NULL,NULL,0,NULL,2.50,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (10,3,'50-80人','热情高涨',NULL,NULL,0,NULL,2.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (11,3,'80-100人','火爆程度超预期',NULL,NULL,0,NULL,3.00,'2025-12-17 09:16:48','2025-12-17 17:16:48');
INSERT INTO `prediction_options` VALUES (12,3,'100人以上','盛况空前',NULL,NULL,0,NULL,4.50,'2025-12-17 09:16:48','2025-12-17 17:16:48');


-- 表: announcements
INSERT INTO `announcements` VALUES (3,'测试公告','测试一下','info',1,1,2,0,'2025-12-17 18:29:38',NULL,'2025-12-17 10:29:38','2025-12-17 10:44:25');
INSERT INTO `announcements` VALUES (4,'测试项目','1111','warning',1,1,2,0,'2025-12-17 18:43:56',NULL,'2025-12-17 10:43:56','2025-12-17 10:43:56');


-- 表: easter_egg_codes
INSERT INTO `easter_egg_codes` VALUES (1,'IKUN-EGG-2025-A1B2','points','{\"amount\": 500}','claimed','彩蛋码#1 - 500积分','恭喜你发现了隐藏彩蛋！获得500积分~',2,'2025-12-17 04:21:08',NULL,'2025-12-17 11:29:36','2025-12-17 04:21:08');
INSERT INTO `easter_egg_codes` VALUES (2,'IKUN-EGG-2025-C3D4','points','{\"amount\": 300}','claimed','彩蛋码#2 - 300积分','你真是太厉害了！300积分到账~',2,'2025-12-17 04:48:32',NULL,'2025-12-17 11:29:36','2025-12-17 04:48:32');
INSERT INTO `easter_egg_codes` VALUES (3,'IKUN-EGG-2025-E5F6','points','{\"amount\": 200}','claimed','彩蛋码#3 - 200积分','探索精神可嘉！200积分奖励~',2,'2025-12-17 05:00:45',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:45');
INSERT INTO `easter_egg_codes` VALUES (4,'IKUN-EGG-2025-G7H8','points','{\"amount\": 100}','claimed','彩蛋码#4 - 100积分','小惊喜！100积分~',2,'2025-12-17 05:00:57',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:57');
INSERT INTO `easter_egg_codes` VALUES (5,'IKUN-EGG-2025-I9J0','points','{\"amount\": 888}','claimed','彩蛋码#5 - 888积分','大吉大利！888积分发发发~',2,'2025-12-17 05:01:48',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:48');
INSERT INTO `easter_egg_codes` VALUES (6,'IKUN-EGG-2025-K1L2','points','{\"amount\": 666}','claimed','彩蛋码#6 - 666积分','666！顺顺顺~',2,'2025-12-17 05:00:48',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:48');
INSERT INTO `easter_egg_codes` VALUES (7,'IKUN-EGG-2025-M3N4','points','{\"amount\": 520}','claimed','彩蛋码#7 - 520积分','520积分，爱你哟~',2,'2025-12-17 05:01:14',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:14');
INSERT INTO `easter_egg_codes` VALUES (8,'IKUN-EGG-2025-O5P6','points','{\"amount\": 250}','claimed','彩蛋码#8 - 250积分','不错不错，250积分~',2,'2025-12-17 05:00:08',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:08');
INSERT INTO `easter_egg_codes` VALUES (9,'IKUN-EGG-2025-Q7R8','points','{\"amount\": 350}','claimed','彩蛋码#9 - 350积分','探险成功！350积分~',2,'2025-12-17 05:01:18',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:18');
INSERT INTO `easter_egg_codes` VALUES (10,'IKUN-EGG-2025-S9T0','points','{\"amount\": 450}','claimed','彩蛋码#10 - 450积分','厉害了！450积分~',2,'2025-12-17 05:01:43',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:43');
INSERT INTO `easter_egg_codes` VALUES (11,'IKUN-EGG-2025-U1V2','points','{\"amount\": 150}','claimed','彩蛋码#11 - 150积分','小奖励150积分~',2,'2025-12-17 04:42:44',NULL,'2025-12-17 11:29:36','2025-12-17 04:42:44');
INSERT INTO `easter_egg_codes` VALUES (12,'IKUN-EGG-2025-W3X4','points','{\"amount\": 180}','claimed','彩蛋码#12 - 180积分','180积分收入囊中~',2,'2025-12-17 05:09:24',NULL,'2025-12-17 11:29:36','2025-12-17 05:09:24');
INSERT INTO `easter_egg_codes` VALUES (13,'IKUN-EGG-2025-Y5Z6','points','{\"amount\": 220}','claimed','彩蛋码#13 - 220积分','220积分到手~',2,'2025-12-17 05:00:38',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:38');
INSERT INTO `easter_egg_codes` VALUES (14,'IKUN-EGG-2025-A7B8','points','{\"amount\": 280}','claimed','彩蛋码#14 - 280积分','280积分奖励~',2,'2025-12-17 04:43:00',NULL,'2025-12-17 11:29:36','2025-12-17 04:43:00');
INSERT INTO `easter_egg_codes` VALUES (15,'IKUN-EGG-2025-C9D0','points','{\"amount\": 320}','claimed','彩蛋码#15 - 320积分','320积分送上~',2,'2025-12-17 05:01:22',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:22');
INSERT INTO `easter_egg_codes` VALUES (16,'IKUN-EGG-ITEM-E1F2','item','{\"amount\": 10, \"item_type\": \"cheer\"}','claimed','彩蛋码#16 - 10个爱心打气','获得10个爱心打气道具！快去给选手加油吧~',NULL,'2025-12-17 04:17:47',NULL,'2025-12-17 11:29:36','2025-12-17 04:17:47');
INSERT INTO `easter_egg_codes` VALUES (17,'IKUN-EGG-ITEM-G3H4','item','{\"amount\": 5, \"item_type\": \"coffee\"}','claimed','彩蛋码#17 - 5杯咖啡','5杯咖啡给你续命~',2,'2025-12-17 04:47:58',NULL,'2025-12-17 11:29:36','2025-12-17 04:47:58');
INSERT INTO `easter_egg_codes` VALUES (18,'IKUN-EGG-ITEM-I5J6','item','{\"amount\": 3, \"item_type\": \"energy\"}','claimed','彩蛋码#18 - 3瓶能量','能量补给站到了！',2,'2025-12-17 05:01:01',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:01');
INSERT INTO `easter_egg_codes` VALUES (19,'IKUN-EGG-ITEM-K7L8','item','{\"amount\": 5, \"item_type\": \"pizza\"}','claimed','彩蛋码#19 - 5个披萨','披萨派对开始！',2,'2025-12-17 05:00:42',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:42');
INSERT INTO `easter_egg_codes` VALUES (20,'IKUN-EGG-ITEM-M9N0','item','{\"amount\": 8, \"item_type\": \"star\"}','claimed','彩蛋码#20 - 8颗星星','你就是最闪亮的星~',2,'2025-12-17 05:00:00',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:00');
INSERT INTO `easter_egg_codes` VALUES (21,'IKUN-EGG-ITEM-O1P2','item','{\"amount\": 20, \"item_type\": \"cheer\"}','claimed','彩蛋码#21 - 20个爱心打气','超大礼包！20个爱心打气~',2,'2025-12-17 04:59:24',NULL,'2025-12-17 11:29:36','2025-12-17 04:59:24');
INSERT INTO `easter_egg_codes` VALUES (22,'IKUN-EGG-ITEM-Q3R4','item','{\"amount\": 10, \"item_type\": \"coffee\"}','claimed','彩蛋码#22 - 10杯咖啡','咖啡因狂欢！',2,'2025-12-17 04:19:15',NULL,'2025-12-17 11:29:36','2025-12-17 04:19:15');
INSERT INTO `easter_egg_codes` VALUES (23,'IKUN-EGG-ITEM-S5T6','item','{\"amount\": 6, \"item_type\": \"energy\"}','claimed','彩蛋码#23 - 6瓶能量','能量爆棚！',2,'2025-12-17 05:09:33',NULL,'2025-12-17 11:29:36','2025-12-17 05:09:33');
INSERT INTO `easter_egg_codes` VALUES (24,'IKUN-EGG-ITEM-U7V8','item','{\"amount\": 8, \"item_type\": \"pizza\"}','claimed','彩蛋码#24 - 8个披萨','披萨大餐！',2,'2025-12-17 05:06:33',NULL,'2025-12-17 11:29:36','2025-12-17 05:06:33');
INSERT INTO `easter_egg_codes` VALUES (25,'IKUN-EGG-ITEM-W9X0','item','{\"amount\": 15, \"item_type\": \"star\"}','claimed','彩蛋码#25 - 15颗星星','满天星光都是你的！',2,'2025-12-17 04:42:53',NULL,'2025-12-17 11:29:36','2025-12-17 04:42:53');
INSERT INTO `easter_egg_codes` VALUES (26,'IKUN-EGG-BADGE-Y1Z2','badge','{\"badge_key\": \"easter_hunter\", \"badge_name\": \"彩蛋猎人\"}','claimed','彩蛋码#26 - 彩蛋猎人徽章','恭喜获得「彩蛋猎人」专属徽章！',2,'2025-12-17 04:19:20',NULL,'2025-12-17 11:29:36','2025-12-17 04:19:20');
INSERT INTO `easter_egg_codes` VALUES (27,'IKUN-EGG-BADGE-A3B4','badge','{\"badge_key\": \"secret_finder\", \"badge_name\": \"秘密发现者\"}','claimed','彩蛋码#27 - 秘密发现者徽章','你发现了秘密！获得「秘密发现者」徽章~',2,'2025-12-17 04:18:37',NULL,'2025-12-17 11:29:36','2025-12-17 04:18:37');
INSERT INTO `easter_egg_codes` VALUES (28,'IKUN-EGG-BADGE-C5D6','badge','{\"badge_key\": \"treasure_hunter\", \"badge_name\": \"寻宝达人\"}','claimed','彩蛋码#28 - 寻宝达人徽章','寻宝成功！「寻宝达人」徽章到手~',2,'2025-12-17 05:00:53',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:53');
INSERT INTO `easter_egg_codes` VALUES (29,'IKUN-EGG-BADGE-E7F8','badge','{\"badge_key\": \"lucky_star\", \"badge_name\": \"幸运之星\"}','claimed','彩蛋码#29 - 幸运之星徽章','幸运女神眷顾你！「幸运之星」徽章~',2,'2025-12-17 05:00:05',NULL,'2025-12-17 11:29:36','2025-12-17 05:00:05');
INSERT INTO `easter_egg_codes` VALUES (30,'IKUN-EGG-BADGE-G9H0','badge','{\"badge_key\": \"ikun_pioneer\", \"badge_name\": \"iKun先锋\"}','claimed','彩蛋码#30 - iKun先锋徽章','你是真正的iKun！「iKun先锋」徽章~',2,'2025-12-17 05:01:04',NULL,'2025-12-17 11:29:36','2025-12-17 05:01:04');
INSERT INTO `easter_egg_codes` VALUES (31,'TEST-POINTS-001','points','{\"amount\": 100}','claimed','测试积分码','获得100积分',2,'2025-12-17 18:42:58',NULL,'2025-12-18 01:25:02','2025-12-17 18:42:58');
INSERT INTO `easter_egg_codes` VALUES (32,'TEST-POINTS-002','points','{\"amount\": 200}','claimed','测试积分码','获得200积分',2,'2025-12-17 17:25:18',NULL,'2025-12-18 01:25:02','2025-12-17 17:25:18');
INSERT INTO `easter_egg_codes` VALUES (33,'TEST-BADGE-001','badge','{\"badge_key\": \"easter_hunter\", \"badge_name\": \"彩蛋猎人\"}','claimed','测试徽章码','获得彩蛋猎人徽章',2,'2025-12-17 18:43:03',NULL,'2025-12-18 01:25:02','2025-12-17 18:43:03');
INSERT INTO `easter_egg_codes` VALUES (34,'TEST-ITEM-001','item','{\"amount\": 5, \"item_type\": \"coffee\"}','claimed','测试道具码','获得5个咖啡',2,'2025-12-17 18:42:45',NULL,'2025-12-18 01:25:02','2025-12-17 18:42:45');
INSERT INTO `easter_egg_codes` VALUES (35,'GACHA-BADGE-001','badge','{\"badge_key\": \"gacha_beginner\", \"badge_name\": \"扭蛋新手\"}','active','扭蛋徽章#1','恭喜获得「扭蛋新手」徽章！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (36,'GACHA-BADGE-002','badge','{\"badge_key\": \"gacha_beginner\", \"badge_name\": \"扭蛋新手\"}','active','扭蛋徽章#2','恭喜获得「扭蛋新手」徽章！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (37,'GACHA-BADGE-003','badge','{\"badge_key\": \"lucky_egg\", \"badge_name\": \"幸运蛋\"}','active','扭蛋徽章#3','哇！你获得了「幸运蛋」徽章！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (38,'GACHA-BADGE-004','badge','{\"badge_key\": \"cheerleader\", \"badge_name\": \"啦啦队长\"}','active','扭蛋徽章#4','你是最棒的啦啦队长！',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (39,'GACHA-BADGE-005','badge','{\"badge_key\": \"daily_warrior\", \"badge_name\": \"每日战士\"}','claimed','扭蛋徽章#5','战士降临！「每日战士」徽章到手~',2,'2025-12-17 19:01:56',NULL,'2025-12-18 02:56:12','2025-12-17 19:01:56');
INSERT INTO `easter_egg_codes` VALUES (40,'GACHA-PTS-001','points','{\"amount\": 100}','active','扭蛋积分#1','100积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (41,'GACHA-PTS-002','points','{\"amount\": 150}','active','扭蛋积分#2','150积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (42,'GACHA-PTS-003','points','{\"amount\": 200}','active','扭蛋积分#3','200积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (43,'GACHA-PTS-004','points','{\"amount\": 250}','active','扭蛋积分#4','250积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (44,'GACHA-PTS-005','points','{\"amount\": 300}','active','扭蛋积分#5','300积分入账~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (45,'GACHA-PTS-006','points','{\"amount\": 500}','active','扭蛋积分#6','大奖！500积分~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (46,'GACHA-PTS-007','points','{\"amount\": 88}','active','扭蛋积分#7','发发发~88积分',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (47,'GACHA-PTS-008','points','{\"amount\": 168}','claimed','扭蛋积分#8','一路发~168积分',2,'2025-12-17 19:01:49',NULL,'2025-12-18 02:56:12','2025-12-17 19:01:49');
INSERT INTO `easter_egg_codes` VALUES (48,'GACHA-PTS-009','points','{\"amount\": 66}','active','扭蛋积分#9','顺顺顺~66积分',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (49,'GACHA-PTS-010','points','{\"amount\": 188}','active','扭蛋积分#10','要发发~188积分',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (50,'GACHA-ITEM-001','item','{\"amount\": 5, \"item_type\": \"cheer\"}','active','扭蛋道具#1','5个爱心打气~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (51,'GACHA-ITEM-002','item','{\"amount\": 3, \"item_type\": \"coffee\"}','active','扭蛋道具#2','3杯咖啡~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (52,'GACHA-ITEM-003','item','{\"amount\": 5, \"item_type\": \"star\"}','active','扭蛋道具#3','5颗星星~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (53,'GACHA-ITEM-004','item','{\"amount\": 2, \"item_type\": \"energy\"}','active','扭蛋道具#4','2瓶能量~',NULL,NULL,NULL,'2025-12-18 02:56:12','2025-12-18 02:56:12');
INSERT INTO `easter_egg_codes` VALUES (54,'GACHA-ITEM-005','item','{\"amount\": 3, \"item_type\": \"pizza\"}','claimed','扭蛋道具#5','3个披萨~',2,'2025-12-17 19:01:43',NULL,'2025-12-18 02:56:12','2025-12-17 19:01:43');

