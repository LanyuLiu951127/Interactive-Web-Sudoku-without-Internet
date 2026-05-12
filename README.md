# Interactive-Web-Sudoku-without-Internet / 無需網路的互動式網頁數獨

本專案為開發練習功課，詳細規格請參考 docs 資料夾。一個基於 Python (Flask/FastAPI) 後端與原生 JavaScript 前端開發的互動式數獨遊戲，支援離線遊玩、自動存檔與智慧教學模式。

### 1. 專案說明書 (README.md)
這是您倉庫的首頁。它向其他人（或老師）介紹這個專案是什麼、怎麼跑、以及有哪些強大的功能。

**README 包含的重點內容：**
* **專案概述**：基於 Python 與原生 JS 開發的互動數獨。
* **核心功能**：特別強調了您文件中的 **F12 互動教學** 與 **F18 求解器**。
* **目錄結構**：清晰標示了 `backend/` 與 `frontend/` 的配置。
* **快速啟動**：提供了在 Antigravity 環境下啟動 Flask 的指令。

---

### 2. 忽略檔案清單 (.gitignore)
這是「雲端保險箱」最重要的守門員。它告訴 Git 哪些檔案是**不需要**上傳到雲端的（例如大型暫存檔、個人金鑰、或是 AI 的輸出檔案）。

**建議內容：**

# 忽略 Python 暫存與環境
__pycache__/
venv/
.env

# 忽略 AI 工具與編輯器暫存 (重要！)
_bmad/
_bmad-output/
.antigravity/
.vscode/sftp.json

# 忽略系統檔案
.DS_Store
Thumbs.db

