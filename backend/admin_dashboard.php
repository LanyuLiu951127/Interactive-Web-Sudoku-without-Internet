<?php
/**
 * 數獨專案 - 管理者後台控制面板 API 2.0 (PHP 8.4)
 * 嚴格執行 Role-Based Access Control (RBAC)，僅限 role = 'admin' 可調用
 * 提供系統統計、安全審計日誌讀取、使用者狀態控管（啟用/停用/封鎖）、密碼重設與一鍵維護模式
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
require_once 'db_connect.php';

// 🔒 RBAC 安全高壓線：嚴防越權訪問 (Privilege Escalation)
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    
    // 審計記錄：有人嘗試越權訪問敏感 API！
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    $logAction = 'privilege_escalation_attempt';
    $logDetails = json_encode([
        'attempted_user_id' => $_SESSION['user_id'] ?? null,
        'attempted_username' => $_SESSION['username'] ?? 'anonymous',
        'api' => 'admin_dashboard.php'
    ], JSON_UNESCAPED_UNICODE);
    
    $isSuspicious = 1;
    $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, is_suspicious, user_agent) VALUES (?, ?, ?, ?, ?, ?)");
    $logStmt->bind_param("isssis", $_SESSION['user_id'], $logAction, $logDetails, $ipAddress, $isSuspicious, $userAgent);
    $logStmt->execute();
    $logStmt->close();

    echo json_encode(['success' => false, 'message' => '存取被拒：您沒有存取管理後台的權限！'], JSON_UNESCAPED_UNICODE);
    exit();
}

// 取得動作請求
$inputJSON = json_decode(file_get_contents('php://input'), true);
$action = trim($inputJSON['action'] ?? $_GET['action'] ?? '');

try {
    if ($action === 'get_data') {
        // 1. 取得統計摘要
        // 總註冊用戶數
        $res = $conn->query("SELECT COUNT(*) as total FROM users");
        $totalUsers = $res->fetch_assoc()['total'];
        
        // 總遊戲場次
        $res = $conn->query("SELECT COUNT(*) as total FROM game_records");
        $totalGames = $res->fetch_assoc()['total'];

        // 偵測到的異常事件數 (反作弊紀錄)
        $res = $conn->query("SELECT COUNT(*) as total FROM system_logs WHERE is_suspicious = 1");
        $totalCheats = $res->fetch_assoc()['total'];

        // 取得維護模式狀態
        $cfgRes = $conn->query("SELECT config_value FROM system_config WHERE config_key = 'maintenance_mode'");
        $maintenanceMode = $cfgRes ? $cfgRes->fetch_assoc()['config_value'] : '0';

        // 2. 取得用戶列表 (排除敏感密碼)
        $userList = [];
        $res = $conn->query("SELECT id, username, role, status, created_at FROM users ORDER BY id ASC");
        while ($row = $res->fetch_assoc()) {
            $userList[] = $row;
        }

        // 3. 取得系統審計日誌 (最近 200 筆)
        $logList = [];
        $res = $conn->query("
            SELECT l.id, l.user_id, u.username, l.action, l.details, l.ip_address, l.is_suspicious, l.created_at 
            FROM system_logs l 
            LEFT JOIN users u ON l.user_id = u.id 
            ORDER BY l.created_at DESC 
            LIMIT 200
        ");
        while ($row = $res->fetch_assoc()) {
            $logList[] = $row;
        }

        echo json_encode([
            'success' => true,
            'stats' => [
                'total_users' => $totalUsers,
                'total_games' => $totalGames,
                'total_cheats' => $totalCheats
            ],
            'maintenance_mode' => intval($maintenanceMode),
            'users' => $userList,
            'logs' => $logList
        ], JSON_UNESCAPED_UNICODE);
        exit();

    } elseif ($action === 'update_role') {
        // 動態角色變更
        $targetUserId = intval($inputJSON['target_user_id'] ?? 0);
        $newRole = trim($inputJSON['new_role'] ?? '');

        if ($targetUserId <= 0 || !in_array($newRole, ['standard', 'power', 'admin'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '無效的參數請求。'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // 防止管理員自我降權，維護系統安全
        if ($targetUserId === intval($_SESSION['user_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '安全限制：管理員無法變更自己的角色權限！'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // 更新權限
        $stmt = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
        $stmt->bind_param("si", $newRole, $targetUserId);
        $stmt->execute();
        $stmt->close();

        // 記錄權限變更日誌
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $logAction = 'role_change';
        $logDetails = json_encode([
            'admin_username' => $_SESSION['username'],
            'target_user_id' => $targetUserId,
            'new_role' => $newRole
        ], JSON_UNESCAPED_UNICODE);
        
        $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
        $logStmt->bind_param("issss", $_SESSION['user_id'], $logAction, $logDetails, $ipAddress, $userAgent);
        $logStmt->execute();
        $logStmt->close();

        echo json_encode(['success' => true, 'message' => '使用者角色已成功更新！'], JSON_UNESCAPED_UNICODE);
        exit();

    } elseif ($action === 'update_status') {
        // 變更用戶啟用/停用狀態
        $targetUserId = intval($inputJSON['target_user_id'] ?? 0);
        $newStatus = trim($inputJSON['new_status'] ?? '');

        if ($targetUserId <= 0 || !in_array($newStatus, ['active', 'suspended', 'blocked'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '無效的狀態參數。'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        // 防止管理員自我停用
        if ($targetUserId === intval($_SESSION['user_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '安全限制：管理員無法停用自己的帳戶！'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $stmt = $conn->prepare("UPDATE users SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $newStatus, $targetUserId);
        $stmt->execute();
        $stmt->close();

        // 記錄帳號狀態變更日誌
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $logAction = 'user_status_change';
        $logDetails = json_encode([
            'admin_username' => $_SESSION['username'],
            'target_user_id' => $targetUserId,
            'new_status' => $newStatus
        ], JSON_UNESCAPED_UNICODE);
        
        $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
        $logStmt->bind_param("issss", $_SESSION['user_id'], $logAction, $logDetails, $ipAddress, $userAgent);
        $logStmt->execute();
        $logStmt->close();

        echo json_encode(['success' => true, 'message' => '帳戶狀態已成功變更！'], JSON_UNESCAPED_UNICODE);
        exit();

    } elseif ($action === 'reset_password') {
        // 重設密碼
        $targetUserId = intval($inputJSON['target_user_id'] ?? 0);
        $newPassword = trim($inputJSON['new_password'] ?? '');

        if ($targetUserId <= 0 || strlen($newPassword) < 4) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '無效的參數或密碼長度過短（最少 4 字元）。'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
        $stmt->bind_param("si", $hashedPassword, $targetUserId);
        $stmt->execute();
        $stmt->close();

        // 記錄密碼變更日誌
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $logAction = 'user_password_reset_by_admin';
        $logDetails = json_encode([
            'admin_username' => $_SESSION['username'],
            'target_user_id' => $targetUserId
        ], JSON_UNESCAPED_UNICODE);
        
        $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
        $logStmt->bind_param("issss", $_SESSION['user_id'], $logAction, $logDetails, $ipAddress, $userAgent);
        $logStmt->execute();
        $logStmt->close();

        echo json_encode(['success' => true, 'message' => '用戶密碼已成功重新設定！'], JSON_UNESCAPED_UNICODE);
        exit();

    } elseif ($action === 'toggle_maintenance') {
        // 切換系統維護模式
        $mode = intval($inputJSON['maintenance'] ?? 0);
        $modeStr = strval($mode === 1 ? '1' : '0');

        $stmt = $conn->prepare("UPDATE system_config SET config_value = ? WHERE config_key = 'maintenance_mode'");
        $stmt->bind_param("s", $modeStr);
        $stmt->execute();
        $stmt->close();

        // 記錄維護模式切換日誌
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        $logAction = 'maintenance_mode_toggle';
        $logDetails = json_encode([
            'admin_username' => $_SESSION['username'],
            'maintenance_mode' => $mode
        ], JSON_UNESCAPED_UNICODE);
        
        $logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
        $logStmt->bind_param("issss", $_SESSION['user_id'], $logAction, $logDetails, $ipAddress, $userAgent);
        $logStmt->execute();
        $logStmt->close();

        echo json_encode(['success' => true, 'message' => '系統維護模式狀態已更新為 ' . ($mode === 1 ? '開啟' : '關閉')], JSON_UNESCAPED_UNICODE);
        exit();

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '未知的操作請求。'], JSON_UNESCAPED_UNICODE);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '後台 API 執行異常，請聯繫開發工程師：' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
