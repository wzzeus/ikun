-- =====================================================
-- 039_slot_machine_config.sql
-- 老虎机配置（符号/倍率/权重）- 支持管理员控制胜率
-- =====================================================

CREATE TABLE IF NOT EXISTS slot_machine_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT '幸运老虎机' COMMENT '配置名称',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    cost_points INT NOT NULL DEFAULT 30 COMMENT '每次消耗积分',
    reels INT NOT NULL DEFAULT 3 COMMENT '滚轴数量',
    two_kind_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.50 COMMENT '两连奖励倍数',
    jackpot_symbol_key VARCHAR(50) NOT NULL DEFAULT 'seven' COMMENT '大奖符号key',
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='老虎机配置';

CREATE TABLE IF NOT EXISTS slot_machine_symbols (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    symbol_key VARCHAR(50) NOT NULL COMMENT '符号唯一key',
    emoji VARCHAR(32) NOT NULL COMMENT '展示emoji',
    name VARCHAR(50) NOT NULL COMMENT '名称',
    multiplier INT NOT NULL DEFAULT 1 COMMENT '三连倍率',
    weight INT NOT NULL DEFAULT 1 COMMENT '权重（越大出现概率越高）',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    is_jackpot TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否大奖符号',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_config_symbol (config_id, symbol_key),
    INDEX idx_config (config_id),
    FOREIGN KEY (config_id) REFERENCES slot_machine_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='老虎机符号配置';

-- 老虎机抽奖记录
CREATE TABLE IF NOT EXISTS slot_machine_draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    config_id INT NOT NULL,
    cost_points INT NOT NULL COMMENT '消费积分',
    reel_1 VARCHAR(50) NOT NULL COMMENT '第一个滚轴结果',
    reel_2 VARCHAR(50) NOT NULL COMMENT '第二个滚轴结果',
    reel_3 VARCHAR(50) NOT NULL COMMENT '第三个滚轴结果',
    win_type ENUM('none', 'two', 'three') NOT NULL DEFAULT 'none' COMMENT '中奖类型',
    multiplier DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '倍率',
    payout_points INT NOT NULL DEFAULT 0 COMMENT '获得积分',
    is_jackpot TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否大奖',
    request_id VARCHAR(64) DEFAULT NULL UNIQUE COMMENT '幂等请求ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_config (config_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES slot_machine_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='老虎机抽奖记录';

-- 初始化默认配置（对齐当前前端 SYMBOLS 与大致权重）
INSERT INTO slot_machine_configs (id, name, is_active, cost_points, reels, two_kind_multiplier, jackpot_symbol_key)
VALUES (1, '幸运老虎机', 1, 30, 3, 1.50, 'seven')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  is_active=VALUES(is_active),
  cost_points=VALUES(cost_points),
  reels=VALUES(reels),
  two_kind_multiplier=VALUES(two_kind_multiplier),
  jackpot_symbol_key=VALUES(jackpot_symbol_key);

-- 初始化默认符号（权重值越小，出现概率越低 -> 高倍率符号权重低）
INSERT INTO slot_machine_symbols (config_id, symbol_key, emoji, name, multiplier, weight, sort_order, is_enabled, is_jackpot) VALUES
(1, 'seven', '7️⃣', '幸运7', 100, 1, 10, 1, 1),
(1, 'cherry', '🍒', '樱桃', 50, 2, 20, 1, 0),
(1, 'bell', '🔔', '铃铛', 20, 4, 30, 1, 0),
(1, 'lemon', '🍋', '柠檬', 10, 6, 40, 1, 0),
(1, 'grape', '🍇', '葡萄', 5, 8, 50, 1, 0),
(1, 'watermelon', '🍉', '西瓜', 3, 10, 60, 1, 0),
(1, 'star', '⭐', '星星', 2, 12, 70, 1, 0),
(1, 'bar', '🎰', 'BAR', 1, 15, 80, 1, 0)
ON DUPLICATE KEY UPDATE
  emoji=VALUES(emoji),
  name=VALUES(name),
  multiplier=VALUES(multiplier),
  weight=VALUES(weight),
  sort_order=VALUES(sort_order),
  is_enabled=VALUES(is_enabled),
  is_jackpot=VALUES(is_jackpot);
