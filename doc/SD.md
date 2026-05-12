# 系統設計 (SD.md)

## 1. 系統架構
本系統採用 **前端驅動架構 (Client-Side Driven)**，核心邏輯（生成、求解、驗證）皆運行於瀏覽器，以達成最佳的離線支援。
前端程式碼已模組化拆分，確保高維護性：
*   `index.html`: 負責骨架與 UI 結構。
*   `style.css`: 負責所有樣式與響應式設計 (RWD)。
*   `script.js`: 負責核心演算法、遊戲狀態與前端互動邏輯。

## 2. 模組設計
*   **SudokuEngine**: 負責底層的數獨生成與求解演算法。
*   **SolverController**: 專門處理「數獨求解器模式」的切換、介面隱藏與後端 API 通訊。
*   **GameController**: 處理遊戲狀態邏輯（開始、暫停、重置、計時）。
*   **UI Components**:
    *   `Board`: 呈現 9x9 棋盤。
    *   `Cell`: 單個格子，處理點擊與數字呈現。
    *   `Numpad`: 數字輸入面板。
    *   `Dashboard`: 顯示難度、時間與功能按鈕（撤銷、筆記、提示）。
    *   `Action Bar`: 包含 復原 (Undo)、清除 (Erase)、筆記 (Notes Toggle)、教學提示 (Guided Hint)。
    *   `Solver Actions`: 在求解模式下顯示的「求解」與「退出」功能按鈕。
    *   `Tutorial Panel`: 互動式引導提示的底部控制面板與說明區。
    *   `Pause Overlay`: 當暫停時蓋住棋盤的遮罩，防止作弊。
    *   `Settings Modal`: 提供玩家開關各種視覺輔助功能的設定介面。
    *   `Rules Modal`: 包含目錄與內容顯示的數獨規則與解題技巧全域彈窗。
    *   `Sidebar Menu`: 左側滑出的漢堡選單，收納「設定」、「規則」與「數獨求解器」入口。

## 3. 使用者介面 (UI/UX)
*   **視覺風格**: 簡潔現代感，使用高對比度的色彩標記選中的行、列與宮格。
*   **響應式佈局 (Responsive Layout)**: 
    *   桌機版/平板版：棋盤在左，控制區（難度、計時、按鈕、數字鍵）在右側，呈現並排佈局。
    *   手機版：由上到下垂直排列（狀態、棋盤、功能列、數字鍵）。
*   **互動反饋**:
    *   點擊數字時，棋盤上所有相同的數字會高亮顯示。
    *   輸入錯誤時，數字顏色變為紅色並有輕微震動效果（手機端）。

## 4. 技術棧 (Tech Stack)
*   **前端框架**: React (或 Vue 3)。
*   **樣式**: Vanilla CSS (CSS Variables) 實現主題切換。
*   **離線**: PWA (Vite PWA Plugin)。
*   **狀態管理**: React Context 或 Pinia。
