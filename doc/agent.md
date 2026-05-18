# BMAD AI Agent 最高指揮官命令書 (agent.md)

## 🚨 [CRITICAL] AI Agent 運作最高準則
1. **優先讀取**：本檔案為本專案最高權限規則。任何 Agent (@BMM, @TEA, @GDS, @OPS, @QAS) 在接收到使用者指令時，必須第一步掃描本檔案，並無條件遵守以下自動化工作流。
2. **極致省 Token 模式**：嚴禁完整重寫或大量輸出整支原始碼檔案（如 script.js, style.css）。必須採用「微差量 (Diff) 修改模式」，僅輸出受影響的程式碼行數與修改片段，其餘未變動代碼一律用 `// ... (其餘維持不變)` 帶過。

## 🔄 自動化運作工作流 (Autonomous Workflow)
當使用者下達開發或優化指令時，Agent 必須自動執行以下循環，不需使用者反覆提示：
1. **讀取現狀**：自動掃描 `frontend/` 與 `backend/` 的現有代碼。
2. **任務拆解**：在背景自動建立任務排程，依序調度對應專家（如修改資料庫找 @TEA，寫網頁找 @GDS）。
3. **自動開發**：執行程式碼修改（嚴格遵守 Diff 規範）。
4. **自動日誌化 (去喝咖啡吧)**：任務完成後，**必須自動在 `_bmad-output/planning-artifacts/walkthrough.md` 寫下最詳細的開發紀錄（Changelog）**，說明你剛剛動了哪些檔案、改了什麼邏輯，好讓人類主人睡覺醒來能一目了然。

## 🎯 當前專案範疇 (Project Scope)
- **技術棧**：Ubuntu 24.04 + Nginx 1.24 + PHP 8.4 + MariaDB 10.11。
- **現有功能**：
  - 前端：媲美 sudoku.com 的介面、首頁 RWD 漢堡選單、滑動藥丸選單（含微型滾動條）、[復原 | 清除 | 全部清除] 工具列、數獨求解器（已修復全選清除後的死鎖 Bug，手打深藍色，解答翡翠綠）。
  - 後端：Session 驗證機制（db_connect, login, register, logout, check_session），具備防作弊 `system_logs`（is_suspicious=1）自動審計。