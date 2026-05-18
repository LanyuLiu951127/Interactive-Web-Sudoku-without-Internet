# 🕹️ Interactive Web Sudoku (全端極致響應式數獨)

[![PHP Version](https://img.shields.io/badge/PHP-8.4-777BB4.svg?style=flat-square&logo=php)](https://www.php.net/)
[![MariaDB Version](https://img.shields.io/badge/MariaDB-10.11-003545.svg?style=flat-square&logo=mariadb)](https://mariadb.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

本專案是一個具備頂級 UI/UX 視覺美感與強健安全防護的**全端響應式網頁數獨遊戲**。採用極致現代化設計（磨砂玻璃高斯模糊、動態 HSL 漸層角色徽章、手機端橫向滑動藥丸標籤列、微型滾動條、璀璨星芒 `✦` 列表），並在後端實作 **100% 參數化預處理陳述式 (Prepared Statements)** 與 **反作弊安全日誌審計**，同時支援完美離線遊玩與自動存檔。

---

## 🎨 核心亮點功能 (Core Features)

### 1. 🟢 數獨智慧求解器 (Sudoku Solver)
*   **即時衝突檢查 (Constraint Validation)**：在輸入模式下即時比對行、列、宮格。一旦發現重複數字，該格子發出紅色呼吸高亮（`.cell.conflict`），頂部顯示淡入警告看板，並**自動禁用「求解」按鈕**阻斷崩潰。
*   **使用者與解答視覺區隔 (Color Coding)**：求解成功後，您自己填寫的數字保持原色（深藍粗體），而演算法自動算出的答案數字呈現**翡翠綠（`.cell.solver-solved`）與淡雅綠底背景**。
*   **一鍵全部清除與狀態解鎖**：工具列包含 `[復原 | 清除 | 全部清除]` 按鈕。點擊「全部清除」後，盤面瞬間洗牌歸零，並**徹底解鎖 `isGameWon = false` 與唯讀限制**，恢復自由輸入狀態。

### 2. 👤 磨砂玻璃驗證彈窗與 HSL 角色徽章 (Premium Auth UI)
*   **Glassmorphic UI**：極具未來質感的磨砂玻璃高斯模糊註冊與登入彈窗，內置非同步防重複點按提交機制。
*   **動態 HSL 漸層 Badge**：根據登入帳號的角色身份（users.role），在右上角與側邊欄渲染尊貴的視覺徽章：
    *   `standard` (普通玩家)：清新綠色漸層 🟢
    *   `power` (資深玩家)：尊爵藍色漸層，特權解鎖「介面主題切換」與「個人詳細解題平均用時統計」🔵
    *   `admin` (管理員)：奢華金色漸層，特權解鎖「管理員日誌審計與使用者狀態管理後台」🟡
*   **會話持久化 (Session Keep-Alive)**：異步連線 `check_session.php`，確保玩家 F5 重新整理網頁時，登入狀態完美保留！

### 3. 📱 iPhone 12 Pro 移動端 UX 極致響應式優化 (Mobile RWD)
*   **手機側邊漢堡選單 (Mobile Sidebar)**：在小螢幕下完美收納選單。
*   **橫向滑動藥丸標籤列 (Mobile TOC Pills)**：規則面板（Rules Modal）在行動端自動轉換為**扁平化藥丸形狀的橫向滑動標籤列**，選取時呈現高對比藍底白字，極具原生 App 質感。
*   **微型滾動條指示器 (Micro Scrollbar)**：提供高度僅 `4px`、圓潤的淡灰色滑動條，給予手機用戶明確的手勢滑動視覺指引，且與標籤保有安全間距。
*   **規則星芒列表 (✦ Star Bullets)**：去除傳統粗糙圓點，全面使用 HSL 主色調的 **星芒 `✦` 符號** 並增加行高至 `1.7`，解決小螢幕的視覺壓迫。

### 4. 🔒 後端 100% SQL 注入防護與反作弊日誌
*   **無懈可擊的安全**：後端所有與 MariaDB 的互動 **100% 採用 PHP 8.4 mysqli 預處理陳述式 (Prepared Statements)**，杜絕任何 SQL Injection 威脅。
*   **防作弊安全日誌審計**：後端針對暴力破解登入、異常權限變更或異常極短用時通關進行自動檢測，並寫入 `system_logs` 將 `is_suspicious` 設為 `1` 以供後台審查。

---

## 📂 專案目錄結構 (Project Directory)

```text
Interactive-Web-Sudoku/
├── frontend/               # 前端靜態資源與 UI/UX 目錄
│   ├── index.html          # 主入口網頁 (整合 Auth Modals, Rules Panel, Grid)
│   ├── style.css           # 視覺設計、HSL 配色、RWD 滑動藥丸與微型滾動條樣式
│   └── script.js           # 數獨演算法引擎、狀態歷史棧、UI 重繪與非同步 API 串接
├── backend/                # 後端安全 PHP 業務邏輯目錄
│   ├── db_connect.php      # 強制 UTF-8 與異常處理連線配置
│   ├── register.php        # 註冊 API (密碼 Bcrypt 雜湊加密 + 註冊日誌)
│   ├── login.php           # 登入 API (PHP Session 啟動 + 暴力防禦安全日誌)
│   ├── check_session.php   # Session 會話同步 API (提供 F5 狀態保留)
│   ├── logout.php          # 登出 API (銷毀 Session)
│   └── init_db.sql         # 相容 MariaDB 10.11 個人預配專屬同名資料庫之建表腳本
└── doc/                    # 專案文件 (單一事實來源)
    ├── REQ.md              # 需求規格說明書
    ├── SA.md               # 系統架構說明書
    ├── SD.md               # 系統設計說明書
    └── spec.md             # 開發與部署規範書
```

---

## 🚀 快速啟動與開發指引 (Quick Start)

### 1. 本地環境需求
*   Web 伺服器 (如 Apache 或 Nginx)
*   PHP 8.4+ (必須包含 `mysqli` 與 `session` 模組)
*   MariaDB 10.11+ (或 MySQL)

### 2. 資料庫初始化
1.  開啟 `phpMyAdmin` 或任何 SQL 客戶端，登入您的資料庫伺服器。
2.  選中您分配到的個人專屬資料庫（例如 `st111534105` 或 `sudoku_db`）。
3.  導入並執行 `backend/init_db.sql` 腳本，以建立 `users`、`game_records`、`friends` 及 `system_logs` 資料表。
4.  腳本會自動為您插入預設的測試帳號：
    *   **一般玩家帳號**：`liu123` / 密碼 `123456`
    *   **管理員帳號**：`admin_liu` / 密碼 `123456`

### 3. 設定資料庫連線
打開 [backend/db_connect.php](file:///d:/democase/1/數獨/backend/db_connect.php)，將連線帳號密碼修改為您的伺服器配置：
```php
$conn = new mysqli("localhost", "您的帳號", "您的密碼", "您的資料庫");
```

---

## 🚢 FTP 運維部署與規範 (FileZilla Deployment)

上傳部署至伺服器前，必須遵循 [doc/spec.md](file:///d:/democase/1/數獨/doc/spec.md) 規範：
1.  **英文命名高壓線**：所有上傳至伺服器的檔案與資料夾 **嚴禁使用任何中文名稱**，避免 FileZilla UTF-8 解碼失敗損毀檔案！
2.  **FileZilla 字元集**：於站台管理員的字元集設定分頁中，勾選 **「強制使用 UTF-8」**。
3.  **上傳目錄對應**：
    *   將本地 `frontend/` 資料夾內所有檔案，上傳至遠端 `/public_html/frontend/`。
    *   將本地 `backend/` 資料夾內所有檔案，上傳至遠端 `/public_html/backend/`。

---

## 📝 授權許可 (License)
本專案基於 **MIT 授權許可** 開源。歡迎在此基礎上學習、二次開發與提交 Pull Request！

# 忽略系統檔案
.DS_Store
Thumbs.db

