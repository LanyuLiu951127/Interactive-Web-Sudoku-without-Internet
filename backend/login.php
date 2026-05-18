<?php
/**
 * 數獨專案 - 使用者登入 API (PHP 8.4)
 * 採用預處理陳述式防止 SQL 注入，比對 Bcrypt 雜湊，並啟動 Session 會話
 */

// 啟動 PHP Native Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

// 取得傳入資料 (相容 JSON 與 Form POST)
$inputJSON = json_decode(file_get_contents('php://input'), true);
$username = trim($inputJSON['username'] ?? $_POST['username'] ?? '');
$password = $inputJSON['password'] ?? $_POST['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '請輸入帳號與密碼。'], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    // 預處理查詢使用者
    $stmt = $conn->prepare("SELECT id, username, password, role, status FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        $stmt->close();

        // 驗證 Bcrypt 密碼雜湊
        if (password_verify($password, $user['password'])) {
            
            // 🔒 A. 檢查帳戶狀態是否正常
            if (isset($user['status']) && $user['status'] !== 'active') {
                $logAction = 'login_failed_suspended';
                $logDetails = json_encode(['username' => $username, 'reason' => 'account_suspended'], JSON_UNESCAPED_UNICODE);
                
                $isSuspicious = 1;
                $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, is_suspicious, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
                $logStmt->bind_param("isssis", $user['id'], $logAction, $logDetails, $ipAddress, $isSuspicious, $userAgent);
                $logStmt->execute();
                $logStmt->close();

                http_response_code(403);
                echo json_encode(['success' => false, 'message' => '您的帳戶已被停用或封鎖，請聯絡系統管理員。'], JSON_UNESCAPED_UNICODE);
                exit();
            }

            // 🔒 B. 檢查系統維護模式 (僅限管理員登入)
            $cfgRes = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'maintenance_mode'");
            $maintenance = $cfgRes ? $cfgRes->fetch_assoc()['config_value'] : '0';
            if ($maintenance === '1' && $user['role'] !== 'admin') {
                $logAction = 'login_failed_maintenance';
                $logDetails = json_encode(['username' => $username, 'reason' => 'system_under_maintenance'], JSON_UNESCAPED_UNICODE);
                
                $isSuspicious = 0;
                $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, is_suspicious, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
                $logStmt->bind_param("isssis", $user['id'], $logAction, $logDetails, $ipAddress, $isSuspicious, $userAgent);
                $logStmt->execute();
                $logStmt->close();

                http_response_code(503);
                echo json_encode(['success' => false, 'message' => '系統目前維護中，目前僅開放管理員登入。'], JSON_UNESCAPED_UNICODE);
                exit();
            }
            
            // 登入成功：寫入 Session
            $_SESSION['user_id']  = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role']     = $user['role'];

            // 寫入登入成功日誌
            $logAction = 'login_success';
            $logDetails = json_encode(['username' => $username, 'role' => $user['role']], JSON_UNESCAPED_UNICODE);
            
            $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
            $logStmt->bind_param("issss", $user['id'], $logAction, $logDetails, $ipAddress, $userAgent);
            $logStmt->execute();
            $logStmt->close();

            echo json_encode([
                'success'  => true,
                'message'  => '登入成功！歡迎回來，' . $user['username'] . '。',
                'username' => $user['username'],
                'role'     => $user['role']
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }
    } else {
        $stmt->close();
    }

    // 登入失敗：寫入失敗日誌 (可用於安全審計，防暴力破解)
    $logAction = 'login_failed';
    $logDetails = json_encode(['username' => $username, 'reason' => 'invalid_credentials'], JSON_UNESCAPED_UNICODE);
    
    // 因為登入失敗找不到 user_id，這裡綁定 NULL，is_suspicious 設為 1 (可疑操作)
    $nullUserId = null;
    $isSuspicious = 1;
    $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, is_suspicious, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
    $logStmt->bind_param("isssis", $nullUserId, $logAction, $logDetails, $ipAddress, $isSuspicious, $userAgent);
    $logStmt->execute();
    $logStmt->close();

    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => '帳號或密碼錯誤。'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '系統異常，請稍後再試。'
    ], JSON_UNESCAPED_UNICODE);
}
?>
