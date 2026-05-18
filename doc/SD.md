# 系統設計說明書 (SD.md)

## 1. 模組與資料流設計 (System Design & Data Flow)
本系統以前端為核心展示與運算核心，後端作為安全的持久化與審計監控中心。

```text
+--------------------------------------------------------+
|                      前端瀏覽器                        |
|   +-------------------+        +-------------------+   |
|   |   UI 控制與渲染   | <----> |  SudokuGenerator  |   |
|   |    (script.js)    |        |   (客戶端回溯)    |   |
|   +---------+---------+        +-------------------+   |
+-------------|------------------------------------------+
              | 非同步 Fetch (JSON)
              v
+--------------------------------------------------------+
|                     後端 PHP 8.4                       |
|   +-------------------+        +-------------------+   |
|   |   身分驗證 / Session| <----> |  安全預處理 API   |   |
|   +---------+---------+        +---------+---------+   |
+-------------|----------------------------|-------------+
              |                            | 安全寫入
              v                            v
      +---------------+            +---------------+
      |  PHP Session  |            | MariaDB 10.11 |
      +---------------+            +---------------+
```

---

## 2. 後端 API 規格設計 (Backend API Endpoints)

所有後端 API 皆使用 `application/json` 格式進行通訊，確保前後端互動流暢：

### 2.1 註冊 API (`POST backend/register.php`)
*   **功能**: 安全註冊新使用者，將密碼以 Bcrypt 雜湊加密後寫入 `users` 表，並自動記錄一筆 `register` 的系統日誌。
*   **Request Payload (Body)**:
    ```json
    {
      "username": "player_name",
      "password": "secure_password"
    }
    ```
*   **Response (JSON)**:
    *   *成功*: `{"status": "success", "message": "註冊成功！"}`
    *   *失敗*: `{"status": "error", "message": "該帳號已被使用。"}`

### 2.2 登入 API (`POST backend/login.php`)
*   **功能**: 比對雜湊密碼，啟動 PHP Native Session 並回傳登入資料。若登入失敗，會將 `system_logs` 中該筆操作的 `is_suspicious` 設為 `1` (防暴力破解作弊)。
*   **Request Payload (Body)**:
    ```json
    {
      "username": "player_name",
      "password": "secure_password"
    }
    ```
*   **Response (JSON)**:
    *   *成功*: `{"status": "success", "user": {"id": 1, "username": "player_name", "role": "standard"}}`
    *   *失敗*: `{"status": "error", "message": "帳號或密碼錯誤。"}`

### 2.3 會話檢查 API (`GET backend/check_session.php`)
*   **功能**: 讓玩家按 F5 重新整理網頁時，非同步與伺服器同步驗證 Session 狀態，保持登入不中斷。
*   **Response (JSON)**:
    *   *已登入*: `{"status": "success", "user": {"username": "player_name", "role": "standard"}}`
    *   *未登入*: `{"status": "error", "message": "Not logged in"}`

### 2.4 登出 API (`POST/GET backend/logout.php`)
*   **功能**: 銷毀當前使用者的 PHP Session，徹底清理登入權限。
*   **Response (JSON)**: `{"status": "success", "message": "Logged out"}`

---

## 3. 前端 DOM 狀態與 CSS 樣式標記 (CSS Grid Dynamic States)

數獨網格（9x9 Cells）由 JavaScript 動態生成。格子的視覺變化由對應的 CSS 狀態類別（Class）決定，以提供流暢極致的視覺回饋：

| 狀態類別 (CSS Class) | 適用場景與作用描述 | 視覺表現 (Style Guide) |
| :--- | :--- | :--- |
| `.cell` | 所有數獨格子的基礎類別。 | 居中對齊、過渡動畫、字體比例大小適中。 |
| `.cell.initial` | 生成數獨時，題目自帶的原始數字格（不可點擊或修改）。 | 深灰色粗體字、防改唯讀底色。 |
| `.cell.user-input` | 玩家自己手動填寫的數字格，或求解器模式下使用者的原始輸入。 | 經典深藍色（`#1864ab`）字體。 |
| `.cell.conflict` | 求解器模式下，輸入發生行、列、宮格重複衝突的非法格。 | **粉紅色呼吸背景、紅色粗體**、閃爍呼吸特效（`pulse-conflict`）。 |
| `.cell.solver-solved` | **[NEW]** 求解器成功後，由回溯演算法**自動計算並填入的解答數字格**。 | **翡翠綠（Emerald Green）字體**、非常淡雅的綠色背景。 |
| `.cell.selected` | 玩家當前點選的焦點格子。 | 黃色/主題色高亮邊框（`box-shadow`）。 |
| `.cell.related` | 與焦點格子同行、同列或同宮的受影響區域格子。 | 極淡的藍色背景（`#f1f3f5`），輔助定位。 |
| `.cell.error` | 經典模式下，玩家填入與正確答案不符的數字格（若開啟輔助標錯）。 | 紅色字體、帶有輕微警告震動感。 |

---

### 2.5 後台管理核心 API (`POST backend/admin_dashboard.php`) [NEW]
*   **功能**: 全站最高管理員專用 API 控制器，提供多功能管理與安全維護設定。
*   **安全性需求**: 必須具備有效 Session，且 `$_SESSION['role'] === 'admin'`。若未通過，一律直接中斷並回傳 `403 Forbidden` 狀態碼。
*   **基本 Request Format (JSON Payload)**:
    ```json
    {
      "action": "get_data" | "update_role" | "update_status" | "reset_password" | "toggle_maintenance",
      ... 動作特定之參數 ...
    }
    ```
*   **四大核心 Action 操作規範**:
    1. **獲取全數據看板 (`action = "get_data"`)**:
       * **作用**: 拉取統計數據（註冊總數、總局數、安全日誌數）、用戶清單與最近 100 筆審計日誌。
       * **Response (JSON)**:
         ```json
         {
           "success": true,
           "stats": { "users": 12, "games": 89, "cheats": 3 },
           "users": [ { "id": 1, "username": "admin_liu", "role": "admin", "status": "active" }, ... ],
           "logs": [ { "created_at": "2026-05-18 16:30", "username": "power_tester", "action": "login_success", "ip_address": "127.0.0.1", "is_suspicious": 0, "details": "{}" }, ... ],
           "maintenance_mode": 0
         }
         ```
    2. **更新帳戶角色與狀態 (`action = "update_role"` / `"update_status"`)**:
       * **參數**: `target_id` (目標用戶 ID), `new_role` (目標新角色) 或 `new_status` (目標新狀態: `active` | `suspended` | `blocked`)。
       * **安全性防降權**: 當 `target_id` 等於 `$_SESSION['user_id']` 時，後端將主動拒絕執行（防範管理員自我封鎖或將自身改為普通玩家）。
       * **Response (JSON)**: `{"success": true, "message": "變更已安全儲存！"}`
    3. **強設用戶密碼 (`action = "reset_password"`)**:
       * **參數**: `target_id` (目標用戶 ID), `new_password` (新明文密碼，長度須大於等於 4 字元)。
       * **作用**: 後端以強健 Bcrypt 算法重新編譯密碼雜湊，強制覆寫資料庫。
       * **Response (JSON)**: `{"success": true, "message": "密碼重設成功！"}`
    4. **一鍵維護開關 (`action = "toggle_maintenance"`)**:
       * **參數**: `enable` (`1` 代表開啟，`0` 代表關閉)。
       * **作用**: 更新 `system_config` 表中 `maintenance_mode` 的值，並在系統日誌記錄 `maintenance_mode_toggle` 事件。
       * **Response (JSON)**: `{"success": true, "message": "維護狀態更新成功！"}`

### 2.6 前台登入/操作 API 之維護模式攔截機制 [NEW]
*   **核心安全攔截門 (Security Guard Gate)**:
    - 當全域維護模式開啟時，[login.php](file:///d:/democase/1/sudoku/backend/login.php) 與前台涉及資料持久化的 API 將在入口處讀取 `system_config` 表的維護值。
    - **攔截判定**: 若 `maintenance_mode == 1` 且當前嘗試呼叫的使用者 Session 角色 **不為 `admin`**，後端將立即執行：
      1. 發送 `HTTP/1.1 503 Service Unavailable` 標頭狀態碼。
      2. 終止後續商業邏輯，僅回傳如下 JSON 封包：
         ```json
         {
           "success": false,
           "message": "系統維護中，普通玩家暫時無法登入與儲存遊戲，請稍後再試。",
           "maintenance": true
         }
         ```
      3. 前端接收到此 503 回應且 `maintenance === true` 時，主動中斷常規 UI 互動，退回登入對話框並彈出專屬維護說明提示。

---

## 4. 手機版「數獨規則」橫向 pill 標籤切換與指示器設計
針對 iPhone 12 Pro 移動端的 RWD 規則面板，我們設計了創新的 UI 切換系統：
*   **容器佈局 (`.rules-toc`)**：
    *   `display: flex; flex-direction: row; overflow-x: auto;` 實作橫向單行無邊界排列。
    *   `padding-bottom: 14px;` 確保與下方的微型滾動條留出完美空白間隙。
*   **微型指示器設計**：
    *   針對 `::-webkit-scrollbar`，將滾動條高度限制為 `4px`，拇指顏色使用柔和的灰色（`#ced4da`），提供微妙滑動引導，極具現代科技美學。
*   **星芒標示器 (`li::before`)**：
    *   列表項設置 `position: relative; padding-left: 20px; list-style: none;`，並透過虛擬元素 `::before` 注入 `content: "✦"` 並渲染主題藍色，完美優化閱讀體驗。
