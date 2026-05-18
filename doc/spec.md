# 開發與部署規範規格書 (spec.md)

## 1. 檔案與目錄命名規範 (Naming & Encoding Rules)

為了防止與 FTP 伺服器、FileZilla 傳輸協定產生 UTF-8 編碼對應錯誤，導致伺服器檔案損毀或網頁路徑找不到（404 錯誤），所有開發人員必須遵守以下核心規範：

*   **檔名全英文命名 (Strict English Filenames)**:
    *   專案內的所有檔案、資料夾名稱 **必須 100% 使用英文小寫、數字與底線**（例如：`check_session.php`, `db_connect.php`）。
    *   **嚴禁使用中文字元** 作為任何上傳伺服器之檔案或目錄名稱。
*   **檔案編碼規格**: 
    *   所有 HTML, CSS, JS, PHP, SQL 檔案一律使用 **UTF-8（無 BOM）** 編碼保存。
*   **路徑引用規範**:
    *   在 HTML 與 JS 中引用的檔案路徑，一律使用相對路徑。
    *   因前端位於 `frontend/`，故呼叫後端 API 時，`fetch` 的路徑必須統一寫作相對路徑：`../backend/[API名稱].php`。

---

## 2. 安全防護編碼規範 (Prepared Statements Rule)

所有涉及 MariaDB 資料庫互動的 PHP 程式碼，**禁止以任何形式拼接 SQL 字串**。必須百分之百使用安全預處理（Prepared Statements）。

### ❌ 嚴重違規範例 (SQL 注入風險)
```php
// 嚴禁這樣寫！
$sql = "SELECT * FROM users WHERE username = '" . $username . "'";
$conn->query($sql);
```

###  安全規範寫法範本 (PHP 8.4 mysqli)
```php
// 1. 先準備預處理 SQL 模板 (以 ? 作為參數佔位符)
$stmt = $conn->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");

// 2. 綁定強類型參數 ("sss" 代表三個 string 類型參數)
$stmt->bind_param("sss", $username, $hashed_password, $role);

// 3. 執行並安全關閉
$stmt->execute();
$stmt->close();
```

---

## 3. FTP 運維部署與檢查清單 (FileZilla Deployment Checklist)

當專案完成本地測試，準備透過 **FileZilla** 上傳至 FTP 伺服器 `stftp.sweb.name`（學校個人空間）時，必須逐一落實以下步驟：

### 3.1 FileZilla 傳輸設定 (重要)
1.  **開啟 FileZilla**，於「站台管理員」建立新站台。
2.  **主機 (Host)**: 填入 `stftp.sweb.name` (或使用者分配之 FTP 主機)。
3.  **加密格式**: 選擇「如果可用，使用明開的 FTP over TLS」或符合學校要求的安全性設定。
4.  **登入類型**: 選擇「一般」，填入您的學號與專屬密碼：
    *   使用者 (User): `st111534105`
    *   密碼 (Password): `st111534105`
5.  **字元集設定 (Charset)**: 
    *   於「字元集」分頁中，勾選 **「強制使用 UTF-8」**，避免檔案上傳時發生檔名亂碼或傳輸失敗。

### 3.2 部署檔案對應清單與安全權限 (Directories Mapping & Chmod)
請將本地專案目錄與 FTP 遠端伺服器目錄進行以下精確對應上傳，並妥善設定權限以防主機安全漏洞：

| 本地專案檔案位置 | 遠端 FTP 伺服器上傳路徑 | 建議權限 (Chmod) | 作用與安全說明 |
| :--- | :--- | :--- | :--- |
| `frontend/` 資料夾內所有檔案 | `/public_html/frontend/` | 檔案：`644` / 目錄：`755` | 包含 `index.html`, `admin.html`, `style.css`, `script.js`, `admin.js`。必須為 644 以免瀏覽器載入失敗。 |
| `backend/` 資料夾內所有檔案 | `/public_html/backend/` | 檔案：`644` / 目錄：`755` | 包含所有 PHP API 設定檔。注意：`db_connect.php` 絕對不可對外透露資料庫密碼，其權限建議為 644，資料夾為 755。 |
| `backend/init_admin.php` | `/public_html/backend/init_admin.php` | 執行後立即 **【刪除】** | **【CRITICAL】** 此檔案為初始化最高管理員帳號與升級表結構之用。**遠端瀏覽器開啟執行後，必須立刻從 FTP 伺服器上刪除**，以防有心人士二次請求造成管理帳號被覆寫。 |
| **嚴禁上傳檔案** | *不要上傳至 FTP* | N/A | `doc/` 規格文件、`artifacts/`、`.git` 目錄及本地測試備份檔。 |

---

## 4. 上線前自我品質檢查清單 (Pre-Deployment QA Checklist)

在將程式碼丟上 FileZilla FTP 前，請在本地（Localhost）進行以下關鍵功能的最終自我測試，確保全系統在任何極端環境下皆運行無誤：

- [ ] **登入與狀態保留 (F5 刷新)**：登入成功後，重新整理網頁，右上角與手機側邊欄的 **👤 使用者 - [角色徽章]** 依然正常顯示，且身分徽章配色正確（Standard 為綠色、Admin 為金色）。
- [ ] **數獨求解器即時防錯**：在求解器填入重複數字（如同一列填兩個 1），格子立刻閃爍紅框呼吸燈，警告看板淡入顯示，且「求解」按鈕自動變為 `disabled` 灰色狀態。
- [ ] **求解器答案區分與清除**：求解成功後，解答以 **翡翠綠** 顯示。點選工具列上的 🔄 **「全部清除」** 後，棋盤完全清空，且所有格子恢復自由點選與輸入，死鎖狀態 100% 釋放。
- [ ] **手機版 RWD 體驗**：使用手機模擬器（寬度 412px）開啟「規則彈窗」，頂部藥丸標籤列可滑順左右橫向拖曳，標籤下方顯示極細的 `4px` 灰色滾動條，且列表項目呈優雅的星芒 `✦` 樣式。
- [ ] **管理者安全主控台 2.0 (獨立大版面)**：以 `admin_liu` 登入成功後，頂部 Navbar 與漢堡選單解鎖並能安全點擊 `🛡️ 後台管理`，在新分頁中完美開啟毛玻璃後台，且 Dashboard 數據圖卡、用戶表、審計日誌篩選功能全部連線成功。
- [ ] **RBAC 安全防越權與停用阻斷**：
  - [ ] 以普通玩家登入或未登入狀態，直接輸入 `admin.html` ➡️ 拋出安全越權警告並跳回首頁。
  - [ ] 後台將某用戶設為 **停用 (suspended)** ➡️ 該用戶在下次操作或重開網頁時，立刻被強制登出並阻斷。
  - [ ] 系統一鍵維護開關開啟 ➡️ 普通玩家登入或請求時立刻回傳 503 並引導至維護看板，管理員仍可自由登入調試。
