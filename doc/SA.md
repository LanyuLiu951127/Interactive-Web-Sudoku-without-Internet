# 系統分析 (SA.md)

## 1. 專案目錄結構規劃
為了確保開發的條理性，專案將分為前端 (Frontend) 與後端 (Backend) 兩個主要部分：

```text
數獨/
├── backend/                # Python 後端目錄
│   ├── main.py             # API 進入點 (FastAPI/Flask)
│   ├── generator.py        # 數獨生成與求解核心邏輯
│   └── requirements.txt    # 依賴套件清單
├── frontend/               # 前端網頁目錄
│   ├── index.html          # 主頁面
│   ├── css/
│   │   └── style.css       # 樣式表
│   ├── js/
│   │   ├── script.js       # 遊戲互動與狀態管理邏輯
│   │   └── api.js          # 負責與後端通訊的封裝
│   └── sw.js               # Service Worker (離線支援)
└── doc/                    # 專案文件
    ├── REQ.md
    ├── SA.md
    ├── SD.md
    └── spec.md
```

## 2. 單機運作架構 (Standalone Architecture)
本專案支援單機運作，後端負責繁重的題目生成運算，前端負責即時互動與進度保存。

### 2.1 後端 Python 矩陣回傳機制
後端採用輕量化 API 格式。Python 將生成的 9x9 數獨盤面轉換為 JSON 格式回傳給前端。

*   **資料格式**: 使用二維陣列（Nested List），`0` 表示空白格。
*   **Python 實作範例思路**:
    ```python
    # backend/main.py
    from fastapi import FastAPI
    import generator

    app = FastAPI()

    @app.get("/api/game")
    def get_game(difficulty: str = "easy"):
        # 呼叫生成邏輯得到 9x9 矩陣
        puzzle, solution = generator.generate(difficulty)
        return {
            "status": "success",
            "data": {
                "puzzle": puzzle,    # 例如: [[5,3,0,...], [6,0,0,...], ...]
                "solution": solution # 完整的正確解答
            }
        }

        @app.post("/api/solve")
        def solve_puzzle(data: dict):
        # 接收前端傳來的盤面，並回傳計算出的解答
        puzzle = data.get("puzzle")
        board_to_solve = [row[:] for row in puzzle]
        if generator.solve(board_to_solve):
            return {"status": "success", "data": {"solution": board_to_solve}}
        return {"status": "error", "message": "Unsolvable"}
        ```

        ### 2.2 前端 script.js 狀態儲存機制
        為實現離線遊玩與進度保存，前端需在玩家每次輸入或遊戲狀態改變時，將數據持久化。

        *   **儲存媒介**: 瀏覽器 `localStorage`。
        *   **儲存內容**: 包含目前的盤面 (Current Board)、原始題目 (Initial Puzzle)、解答 (Solution)、計時時間。
        *   **求解器模式 (Solver Mode)**: 透過一個全域變數 `isSolverMode` 來切換介面狀態。當處於此模式時，會隱藏計時器與錯誤標示，並將盤面初始化為空白。
        *   **儲存時機**: 每次填入數字、進行復原/清除、或是計時器每隔 5 秒鐘，都會觸發自動存檔機制。不需登入帳號。
        *   **script.js 實作邏輯**:
        ```javascript
        let isSolverMode = false; // 用於標記目前是否為「求解器模式」

        // 切換至求解器模式
        function startSolverMode() {
        isSolverMode = true;
        // ... 清除盤面與隱藏計時器 ...
        }

        // 呼叫後端求解 API
        async function solvePuzzle() {
        const response = await fetch('/api/solve', {
            method: 'POST',
            body: JSON.stringify({ puzzle: currentBoard })
        });
        // ... 處理回傳結果 ...
        }

        // 保存狀態
        function saveGameState() {
        if (isSolverMode) return; // 求解模式下不執行自動存檔，以免覆蓋正常遊戲
        const gameState = {
            currentBoard: board,       // 玩家填寫後的 9x9 陣列
            // ... 其餘狀態 ...
        };
        localStorage.setItem('sudoku_save_game', JSON.stringify(gameState));
        }
        ```
    // 載入狀態 (初始化時呼叫)
    function loadGameState() {
        const saved = localStorage.getItem('sudoku_save_game');
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    }
    
    // 設定保存與載入
    function updateSettings() {
        // 儲存玩家設定的輔助功能開關 (hideCompleted, highlightIdentical 等)
        localStorage.setItem('sudoku_settings', JSON.stringify(userSettings));
    }
    ```

## 3. 核心演算法分析

### 3.0 互動教學提示演算法 (Guided Hint State Machine)
*   當觸發提示時，計算目標格子的「同行、同列、同宮格」已存在的數字 (`rowNums`, `colNums`, `boxNums`)。
*   計算聯集 (`allPresent`) 並反向求出剩餘可能數字 (`possibleNums`)。
*   使用狀態機 (`tutorialState.step`) 推進 4 個教學步驟：
    1. 鎖定目標格子。
    2. 高亮關聯區域（行、列、宮格）。
    3. 紅色高亮關聯區域內已存在的數字。
    4. 顯示最終推導出的答案並提供填入功能。


### 3.1 數獨生成演算法
*   **完整盤面生成**: 使用「回溯法 (Backtracking)」從空盤面開始隨機填入數字，並確保符合數獨規則，直到生成一個完整的 9x9 盤面。
*   **合法性檢查**: 在填入每個數字時，檢查該數字在同行、同列、同 3x3 宮格內是否唯一。

### 3.2 挖洞邏輯 (難度控制)
*   從完整的盤面中隨機移除數字。
*   **唯一解驗證**: 每移除一個數字，需透過求解器 (Solver) 驗證該盤面是否仍只有唯一解。若出現多重解，則該數字不可移除。

## 4. 離線機制分析
*   **Service Worker**: 透過快取 HTML/JS/CSS 資源，實現離線開啟網頁。
*   **LocalStorage**: 確保在離線狀態下，玩家重整頁面後仍能繼續上次的盤面。
