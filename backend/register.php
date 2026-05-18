<?php
/**
 * 數獨專案 - 使用者註冊 API (PHP 8.4)
 * 採用預處理陳述式防止 SQL 注入，支援 JSON 與 Form POST
 */

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

// 取得傳入資料 (相容 application/json 與 application/x-www-form-urlencoded)
$inputJSON = json_decode(file_get_contents('php://input'), true);
$username = trim($inputJSON['username'] ?? $_POST['username'] ?? '');
$password = $inputJSON['password'] ?? $_POST['password'] ?? '';

// 基礎欄位驗證
if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '帳號或密碼不能為空。'], JSON_UNESCAPED_UNICODE);
    exit();
}

// 帳號格式驗證 (只允許英數字及底線，長度 3 - 30 字元)
if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $username)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '帳號格式不符 (僅限 3-30 字元之英數字與底線)。'], JSON_UNESCAPED_UNICODE);
    exit();
}

// 密碼長度驗證
if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => '密碼長度必須大於或等於 6 個字元。'], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    // 步驟 1：檢查帳號是否已被註冊 (使用預處理陳述式)
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $checkStmt->bind_param("s", $username);
    $checkStmt->execute();
    $result = $checkStmt->get_result();

    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => '此帳號已被註冊。'], JSON_UNESCAPED_UNICODE);
        $checkStmt->close();
        exit();
    }
    $checkStmt->close();

    // 步驟 2：安全雜湊加密密碼 (採用 Bcrypt)
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $defaultRole = 'standard';

    // 步驟 3：寫入新使用者
    $insertStmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    $insertStmt->bind_param("sss", $username, $passwordHash, $defaultRole);
    $insertStmt->execute();
    
    $newUserId = $insertStmt->insert_id;
    $insertStmt->close();

    // 步驟 4：寫入系統日誌
    $logAction = 'register';
    $logDetails = json_encode(['username' => $username, 'status' => 'success'], JSON_UNESCAPED_UNICODE);
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

    $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
    $logStmt->bind_param("issss", $newUserId, $logAction, $logDetails, $ipAddress, $userAgent);
    $logStmt->execute();
    $logStmt->close();

    // 註冊成功回傳
    echo json_encode([
        'success' => true,
        'message' => '註冊成功！您現在可以進行登入。'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '系統處理失敗，請稍後再試。'
    ], JSON_UNESCAPED_UNICODE);
}
?>
