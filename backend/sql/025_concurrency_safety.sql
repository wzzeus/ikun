-- 025_concurrency_safety.sql
-- 并发安全修复：添加必要的唯一约束和计数表防止重复领取/超限兑换

-- 1. 防止同一用户重复领取同类型码神挑战奖励
-- 注意：只对已分配的 key 添加唯一约束，AVAILABLE 状态的 key 不受影响
-- MySQL 中 NULL 不参与唯一约束检查，所以：
-- - 未分配时 assigned_user_id = NULL，不会冲突
-- - 分配后 assigned_user_id = user_id，同一用户同类型只能有一条

-- 先检查是否已存在该约束
SET @constraint_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'api_key_codes'
    AND CONSTRAINT_NAME = 'uk_api_key_user_reward_type'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE api_key_codes ADD CONSTRAINT uk_api_key_user_reward_type UNIQUE (assigned_user_id, description)',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 兑换记录表：用于高并发限购校验的辅助索引
-- 添加 (user_id, item_id, created_at) 联合索引以加速限购查询
SET @index_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exchange_records'
    AND INDEX_NAME = 'idx_exchange_user_item_date'
);

SET @sql2 = IF(@index_exists = 0,
    'ALTER TABLE exchange_records ADD INDEX idx_exchange_user_item_date (user_id, item_id, created_at)',
    'SELECT 1'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. 用户商品限购计数表（用于并发安全的限购检查）
-- 使用行锁防止并发绕过
CREATE TABLE IF NOT EXISTS user_item_purchase_counts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    purchase_date DATE NOT NULL COMMENT '购买日期（用于每日限购）',
    daily_count INT NOT NULL DEFAULT 0 COMMENT '当日购买数量',
    total_count INT NOT NULL DEFAULT 0 COMMENT '累计购买数量',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_item_date (user_id, item_id, purchase_date),
    INDEX idx_user_item (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES exchange_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户商品限购计数表';

SELECT 'Concurrency safety constraints added successfully' AS result;
