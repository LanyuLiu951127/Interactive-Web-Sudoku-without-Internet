<?php
/**
 * 數獨專案 - 測試帳號初始化、資料庫遷移與密碼修復腳本 (PHP 8.4)
 * 此腳本會自動檢測並執行資料庫 Migration，補齊 status 欄位與 system_config 表，
 * 並利用伺服器內建的 password_hash 函式，自動將測試帳號的密碼更新為「123456」，狀態設為「active」。
 * 安全提示：執行完畢後，請務必從伺服器上刪除此檔案！
 */

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

try {
    $migrationLogs = [];

    // 1. 執行資料庫遷移：嘗試為 users 資料表新增 status 欄位
    // 檢查 status 欄位是否存在
    $checkColumn = $conn->query("SHOW COLUMNS FROM `users` LIKE 'status'");
    if ($checkColumn && $checkColumn->num_rows == 0) {
        $conn->query("ALTER TABLE `users` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '帳號狀態' AFTER `role`");
        $migrationLogs[] = "資料庫遷移：成功為 users 資料表追加 'status' 欄位。";
    } else {
        $migrationLogs[] = "資料庫遷移：users 表的 'status' 欄位已存在，跳過。";
    }

    // 2. 執行資料庫遷移：嘗試建立 system_config 資料表
    $conn->query("
        CREATE TABLE IF NOT EXISTS `system_config` (
            `config_key` VARCHAR(50) NOT NULL,
            `config_value` VARCHAR(255) NOT NULL,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`config_key`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $migrationLogs[] = "資料庫遷移：確保 system_config 資料表已建立。";

    // 預載維護模式為關閉狀態
    $conn->query("
        INSERT INTO `system_config` (`config_key`, `config_value`) 
        VALUES ('maintenance_mode', '0')
        ON DUPLICATE KEY UPDATE `config_value` = `config_value`
    ");
    $migrationLogs[] = "資料庫遷移：確保維護模式配置 (maintenance_mode = 0) 已初始化。";


    // 3. 測試帳號初始化與密碼修復
    $defaultPassword = '123456';
    $hashedPassword = password_hash($defaultPassword, PASSWORD_BCRYPT);

    $testUsers = [
        ['username' => 'admin_liu', 'role' => 'admin'],
        ['username' => 'power_tester', 'role' => 'power'],
        ['username' => 'standard_player', 'role' => 'standard']
    ];

    $userResults = [];

    foreach ($testUsers as $user) {
        $username = $user['username'];
        $role = $user['role'];

        // 檢查使用者是否已存在
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $res = $stmt->get_result();
        
        if ($res->num_rows > 0) {
            // 使用者存在，重設密碼、角色、狀態為 active
            $stmt->close();
            $updateStmt = $conn->prepare("UPDATE users SET password = ?, role = ?, status = 'active' WHERE username = ?");
            $updateStmt->bind_param("sss", $hashedPassword, $role, $username);
            $updateStmt->execute();
            $updateStmt->close();
            $userResults[] = ["username" => $username, "status" => "updated", "message" => "密碼已重設為 123456，狀態設為 active"];
        } else {
            // 使用者不存在，新增使用者
            $stmt->close();
            $insertStmt = $conn->prepare("INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, 'active')");
            $insertStmt->bind_param("sss", $username, $hashedPassword, $role);
            $insertStmt->execute();
            $insertStmt->close();
            $userResults[] = ["username" => $username, "status" => "created", "message" => "帳號已建立，密碼為 123456，狀態設為 active"];
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "數獨全端平台 2.0 資料庫遷移與測試帳號初始化成功！",
        "migration" => $migrationLogs,
        "details" => $userResults
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "資料庫遷移或初始化失敗：" . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
