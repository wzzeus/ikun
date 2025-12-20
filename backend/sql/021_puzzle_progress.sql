-- 码神挑战进度表
-- 记录用户的答题进度，用于排行榜展示

CREATE TABLE IF NOT EXISTS puzzle_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_solved INT NOT NULL DEFAULT 0 COMMENT '已完成关卡总数',
    total_time INT NOT NULL DEFAULT 0 COMMENT '总用时（秒）',
    total_errors INT NOT NULL DEFAULT 0 COMMENT '总错误次数',
    solved_levels JSON COMMENT '已完成关卡ID列表',
    level_times JSON COMMENT '各关卡用时记录',
    level_errors JSON COMMENT '各关卡错误次数',
    last_solved_at DATETIME COMMENT '最后答题时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_user_id (user_id),
    INDEX idx_total_solved (total_solved DESC),
    INDEX idx_last_solved (last_solved_at DESC),

    CONSTRAINT fk_puzzle_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='码神挑战进度表';

-- 添加一些示例数据用于测试
-- INSERT INTO puzzle_progress (user_id, total_solved, total_time, total_errors, solved_levels, level_times, last_solved_at)
-- SELECT id, 0, 0, 0, '[]', '{}', NULL FROM users LIMIT 10;
