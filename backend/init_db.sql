-- =================================================================
-- 數獨專案資料表初始化腳本 (相容學校/虛擬主機限制版)
-- =================================================================
-- 說明：在學校或共用主機環境中，您通常無法自行建立資料庫 (CREATE DATABASE)。
-- 請在 phpMyAdmin 左側點擊您被分配到的資料庫（例如 `st111534105`），
-- 然後在該資料庫的「SQL」分頁中執行以下指令。
-- =================================================================
-- 1. 使用者資料表 (users)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '帳號',
    `password` VARCHAR(255) NOT NULL COMMENT '密碼(Hash)',
    `role` ENUM('standard', 'power', 'admin') DEFAULT 'standard' COMMENT '角色權限',
    `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '帳號狀態 (active, suspended, blocked)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 2. 遊戲紀錄表 (game_records)
CREATE TABLE IF NOT EXISTS `game_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `difficulty` ENUM('easy', 'medium', 'hard') NOT NULL,
    `time_elapsed` INT NOT NULL COMMENT '用時(秒)',
    `mistakes` INT DEFAULT 0 COMMENT '錯誤次數',
    `board_state` TEXT COMMENT '結束時的盤面狀態(JSON)',
    `status` ENUM('win', 'fail', 'quit') NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 3. 好友系統表 (friends)
CREATE TABLE IF NOT EXISTS `friends` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `friend_id` INT NOT NULL,
    `status` ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `friendship` (`user_id`, `friend_id`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- 4. 系統日誌與反作弊分析表 (system_logs)
CREATE TABLE IF NOT EXISTS `system_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL COMMENT '操作名稱 (如: login, solve_puzzle)',
    `details` TEXT COMMENT '詳細描述或 JSON 數據',
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `is_suspicious` TINYINT(1) DEFAULT 0 COMMENT '是否為可疑操作 (反作弊標記)',
    `user_agent` TEXT COMMENT '瀏覽器環境資訊',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE
    SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 5. 系統組態設定表 (system_config)
CREATE TABLE IF NOT EXISTS `system_config` (
    `config_key` VARCHAR(50) NOT NULL,
    `config_value` VARCHAR(255) NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`config_key`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 預載維護模式設定為關閉 (0 = 關閉, 1 = 開啟)
INSERT INTO `system_config` (`config_key`, `config_value`) 
VALUES ('maintenance_mode', '0')
ON DUPLICATE KEY UPDATE `config_value` = '0';

-- 6. 插入預設測試帳號
-- 密碼預設為 123456 的安全 Hash 值 ($2y$10$...)，方便您登入測試
INSERT INTO `users` (`username`, `password`, `role`)
VALUES (
        'admin_liu',
        '$2y$10$8CgDk1S5HkyL01x9v.FqeuZt26R8c2e.X.h39Mh6hO2y/mS3pE9yK',
        'admin'
    ),
    (
        'power_tester',
        '$2y$10$8CgDk1S5HkyL01x9v.FqeuZt26R8c2e.X.h39Mh6hO2y/mS3pE9yK',
        'power'
    ),
    (
        'standard_player',
        '$2y$10$8CgDk1S5HkyL01x9v.FqeuZt26R8c2e.X.h39Mh6hO2y/mS3pE9yK',
        'standard'
    ) ON DUPLICATE KEY
UPDATE `username` = `username`;