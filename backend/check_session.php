<?php
/**
 * 數獨專案 - 檢查會話狀態 API (PHP 8.4)
 * 供前端頁面載入時即時檢查使用者是否已登入，以決定渲染何種角色介面
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'logged_in' => true,
        'username'  => $_SESSION['username'],
        'role'      => $_SESSION['role'],
        'user_id'   => $_SESSION['user_id']
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'logged_in' => false,
        'message'   => '未登入或會話已過期。'
    ], JSON_UNESCAPED_UNICODE);
}
?>
