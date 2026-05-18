<?php
/**
 * 數獨專案 - 登出 API (PHP 8.4)
 * 清除會話狀態，刪除 Session Cookie，並記錄登出日誌
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

try {
    $userId = $_SESSION['user_id'] ?? null;
    
    if ($userId) {
        require_once 'db_connect.php';
        
        // 寫入登出日誌
        $logAction = 'logout';
        $logDetails = json_encode(['username' => $_SESSION['username'] ?? 'unknown'], JSON_UNESCAPED_UNICODE);
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;

        $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
        $logStmt->bind_param("issss", $userId, $logAction, $logDetails, $ipAddress, $userAgent);
        $logStmt->execute();
        $logStmt->close();
    }

    // 徹底清除所有 Session 變數
    $_SESSION = [];

    // 刪除用戶端的 Session Cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    // 銷毀伺服器端 Session
    session_destroy();

    echo json_encode([
        'success' => true,
        'message' => '您已成功登出。'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 即使日誌寫入失敗，依然強制清除前端
    $_SESSION = [];
    session_destroy();
    
    echo json_encode([
        'success' => true,
        'message' => '登出完成 (未寫入日誌)。'
    ], JSON_UNESCAPED_UNICODE);
}
?>
