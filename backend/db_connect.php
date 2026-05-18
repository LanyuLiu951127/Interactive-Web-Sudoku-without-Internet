<?php
/**
 * 數獨專案 - 安全資料庫連線設定檔 (PHP 8.4)
 * 防止 SQL 注入與錯誤洩露的安全連線範本
 */

// 強制所有錯誤以 Exception 拋出，便於 try-catch 攔截，不洩露敏感伺服器資訊
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$host    = 'localhost';
$user    = 'st111534105';     // 您的資料庫帳號
$pass    = 'st111534105';          // 請在此處填入您在學校/本地資料庫的實際密碼
$db      = 'st111534105';     // 預設為與您的帳號同名的資料庫
$charset = 'utf8mb4';

try {
    // 建立 MySQLi 物件導向連線
    $conn = new mysqli($host, $user, $pass, $db);
    
    // 設定連線編碼為 utf8mb4 (FileZilla 及資料庫編碼必備)
    $conn->set_charset($charset);
} catch (mysqli_sql_exception $e) {
    // 阻斷敏感錯誤訊息，回傳通用 JSON 錯誤給前端，避免安全漏洞
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => '資料庫連線失敗，請檢查設定或聯繫管理員。'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}
?>
