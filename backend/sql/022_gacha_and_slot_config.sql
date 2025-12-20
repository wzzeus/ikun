-- =============================================
-- 扭蛋机配置表 + 老虎机规则配置表
-- 实现后台完全可控的游戏配置
-- =============================================

-- 1. 扭蛋机配置表
CREATE TABLE IF NOT EXISTS gacha_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT '幸运扭蛋机' COMMENT '配置名称',
    is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    cost_points INT NOT NULL DEFAULT 50 COMMENT '每次消耗积分',
    daily_limit INT DEFAULT 30 COMMENT '每日限制次数(NULL为不限)',
    created_by INT COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 扭蛋机奖品配置表
CREATE TABLE IF NOT EXISTS gacha_prizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL COMMENT '所属配置',
    prize_type ENUM('points', 'item', 'badge', 'api_key') NOT NULL COMMENT '奖品类型',
    prize_name VARCHAR(100) NOT NULL COMMENT '奖品名称',
    prize_value JSON COMMENT '奖品值(JSON格式)',
    weight DECIMAL(10,2) NOT NULL DEFAULT 1.00 COMMENT '权重(越大概率越高)',
    stock INT DEFAULT NULL COMMENT '库存(NULL为无限)',
    is_rare BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否稀有',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES gacha_configs(id) ON DELETE CASCADE,
    INDEX idx_config_enabled (config_id, is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 扭蛋机抽奖记录表
CREATE TABLE IF NOT EXISTS gacha_draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    config_id INT NOT NULL,
    prize_id INT NOT NULL,
    cost_points INT NOT NULL DEFAULT 0 COMMENT '消耗积分',
    prize_type VARCHAR(20) NOT NULL,
    prize_name VARCHAR(100) NOT NULL,
    prize_value JSON COMMENT '奖品详情',
    is_rare BOOLEAN NOT NULL DEFAULT FALSE,
    used_ticket BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否使用了扭蛋券',
    request_id VARCHAR(64) UNIQUE COMMENT '幂等请求ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES gacha_configs(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 老虎机中奖规则表
CREATE TABLE IF NOT EXISTS slot_machine_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL COMMENT '所属配置',
    rule_key VARCHAR(50) NOT NULL COMMENT '规则唯一标识',
    rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
    rule_type ENUM('three_same', 'two_same', 'special_combo', 'penalty', 'bonus') NOT NULL COMMENT '规则类型',
    pattern JSON COMMENT '匹配模式(如["kun","kun","kun"]或位置条件)',
    multiplier DECIMAL(10,2) NOT NULL DEFAULT 1.00 COMMENT '倍率(负数表示惩罚)',
    fixed_points INT DEFAULT NULL COMMENT '固定奖励/惩罚积分',
    probability DECIMAL(5,4) DEFAULT NULL COMMENT '触发概率(用于随机规则)',
    min_amount INT DEFAULT NULL COMMENT '最小金额(用于随机范围)',
    max_amount INT DEFAULT NULL COMMENT '最大金额(用于随机范围)',
    priority INT NOT NULL DEFAULT 0 COMMENT '优先级(越大越先匹配)',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否启用',
    description VARCHAR(500) COMMENT '规则描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES slot_machine_configs(id) ON DELETE CASCADE,
    INDEX idx_config_enabled (config_id, is_enabled),
    INDEX idx_priority (config_id, priority DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 初始化默认扭蛋机配置
INSERT INTO gacha_configs (name, is_active, cost_points, daily_limit) VALUES
('幸运扭蛋机', TRUE, 50, 30);

-- 6. 初始化默认扭蛋机奖池
INSERT INTO gacha_prizes (config_id, prize_type, prize_name, prize_value, weight, is_rare, sort_order) VALUES
-- 积分奖励 (64.8%)
(1, 'points', '10积分', '{"amount": 10}', 24.80, FALSE, 1),
(1, 'points', '30积分', '{"amount": 30}', 20.00, FALSE, 2),
(1, 'points', '50积分', '{"amount": 50}', 12.00, FALSE, 3),
(1, 'points', '100积分', '{"amount": 100}', 5.00, TRUE, 4),
(1, 'points', '200积分', '{"amount": 200}', 2.00, TRUE, 5),
(1, 'points', '500积分', '{"amount": 500}', 1.00, TRUE, 6),
-- API Key 兑换码 (0.2%)
(1, 'api_key', '神秘兑换码', '{"usage_type": "扭蛋机"}', 0.20, TRUE, 7),
-- 道具奖励 (19%)
(1, 'item', '爱心x1', '{"item_type": "cheer", "amount": 1}', 8.00, FALSE, 8),
(1, 'item', '咖啡x1', '{"item_type": "coffee", "amount": 1}', 5.00, FALSE, 9),
(1, 'item', '能量x1', '{"item_type": "energy", "amount": 1}', 3.00, FALSE, 10),
(1, 'item', '披萨x1', '{"item_type": "pizza", "amount": 1}', 2.00, TRUE, 11),
(1, 'item', '星星x1', '{"item_type": "star", "amount": 1}', 1.00, TRUE, 12),
-- 徽章奖励 (16%)
(1, 'badge', '幸运铜蛋', '{"achievement_key": "gacha_lucky_bronze", "tier": "bronze", "fallback_points": 50}', 4.00, FALSE, 13),
(1, 'badge', '幸运银蛋', '{"achievement_key": "gacha_lucky_silver", "tier": "silver", "fallback_points": 100}', 2.00, FALSE, 14),
(1, 'badge', '幸运金蛋', '{"achievement_key": "gacha_lucky_gold", "tier": "gold", "fallback_points": 200}', 1.50, TRUE, 15),
(1, 'badge', '幸运钻蛋', '{"achievement_key": "gacha_lucky_diamond", "tier": "diamond", "fallback_points": 500}', 0.50, TRUE, 16),
(1, 'badge', '幸运星耀', '{"achievement_key": "gacha_lucky_star", "tier": "star", "fallback_points": 1000}', 5.00, TRUE, 17),
(1, 'badge', '幸运王者', '{"achievement_key": "gacha_lucky_king", "tier": "king", "fallback_points": 2000}', 3.00, TRUE, 18);

-- 7. 初始化老虎机中奖规则（如果存在老虎机配置）
-- 先检查是否有老虎机配置
INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'jntm_three' as rule_key,
    '姬霓太美' as rule_name,
    'three_same' as rule_type,
    '["j","n","t"]' as pattern,
    100.00 as multiplier,
    100 as priority,
    '三个特定符号按顺序出现(J+N+T)，超级大奖！'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'kun_three' as rule_key,
    '坤坤三连' as rule_name,
    'three_same' as rule_type,
    '["kun","kun","kun"]' as pattern,
    50.00 as multiplier,
    90 as priority,
    '三个坤坤符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'ji_three' as rule_key,
    '鸡你太美' as rule_name,
    'three_same' as rule_type,
    '["ji","ji","ji"]' as pattern,
    30.00 as multiplier,
    80 as priority,
    '三个鸡符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'bdk_three' as rule_key,
    '背带裤三连' as rule_name,
    'three_same' as rule_type,
    '["bdk","bdk","bdk"]' as pattern,
    20.00 as multiplier,
    70 as priority,
    '三个背带裤符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'tsk_three' as rule_key,
    '铁山靠三连' as rule_name,
    'three_same' as rule_type,
    '["tsk","tsk","tsk"]' as pattern,
    15.00 as multiplier,
    60 as priority,
    '三个铁山靠符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'ngm_three' as rule_key,
    '你干嘛三连' as rule_name,
    'three_same' as rule_type,
    '["ngm","ngm","ngm"]' as pattern,
    10.00 as multiplier,
    50 as priority,
    '三个你干嘛符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'any_three' as rule_key,
    '任意三连' as rule_name,
    'three_same' as rule_type,
    NULL as pattern,
    5.00 as multiplier,
    40 as priority,
    '任意三个相同符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, multiplier, priority, description)
SELECT
    id as config_id,
    'any_two' as rule_key,
    '任意两连' as rule_name,
    'two_same' as rule_type,
    NULL as pattern,
    1.50 as multiplier,
    30 as priority,
    '任意两个相同符号'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

-- 律师函惩罚规则
INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, probability, min_amount, max_amount, priority, description)
SELECT
    id as config_id,
    'lsh_penalty' as rule_key,
    '律师函惩罚' as rule_name,
    'penalty' as rule_type,
    '["lsh"]' as pattern,
    0.30 as probability,
    50 as min_amount,
    200 as max_amount,
    20 as priority,
    '出现律师函符号有30%概率触发惩罚，扣除50-200积分'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

-- Man符号奖励规则
INSERT INTO slot_machine_rules (config_id, rule_key, rule_name, rule_type, pattern, probability, min_amount, max_amount, priority, description)
SELECT
    id as config_id,
    'man_bonus' as rule_key,
    'Man护体' as rule_name,
    'bonus' as rule_type,
    '["man"]' as pattern,
    0.40 as probability,
    30 as min_amount,
    100 as max_amount,
    10 as priority,
    '出现Man符号有40%概率获得30-100积分奖励，且可抵消律师函惩罚'
FROM slot_machine_configs WHERE id = 1
ON DUPLICATE KEY UPDATE rule_name = rule_name;

-- 8. 为刮刮乐添加独立配置标识
-- 注意：如果lottery_type列已存在会报错，可以忽略
-- ALTER TABLE lottery_configs ADD COLUMN lottery_type ENUM('lottery', 'scratch') NOT NULL DEFAULT 'lottery' COMMENT '抽奖类型' AFTER name;
-- UPDATE lottery_configs SET lottery_type = 'scratch' WHERE name LIKE '%刮刮乐%';
