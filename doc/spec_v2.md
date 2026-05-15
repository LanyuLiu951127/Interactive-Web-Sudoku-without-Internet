# 專案規格書 v2 (spec_v2.md) - 純前端架構版

## 1. 架構異動說明
原先設計的 Python (Flask) 後端 API 已被捨棄，所有核心邏輯（Generator & Solver）均已整合進 `script.js`。
這使得專案變為「純靜態網站」，可直接部署於 GitHub Pages、Firebase Hosting 或學校的學生網頁空間 (`st.sweb.name`)。

## 2. 核心模組定義 (Javascript)

### `SudokuGenerator` 類別
*   `isValid(board, row, col, num)`: 檢查數字是否符合行、列、宮格唯一規則。
*   `solve(board)`: 使用回溯演算法 (Backtracking) 尋找解答。
*   `generatePuzzle(difficulty)`: 先生成完整盤面，再根據難度挖洞。

### 邏輯對接
*   `newGame()`: 不再呼叫 `fetch`，改為呼叫 `generator.generatePuzzle(difficulty)`。
*   `solvePuzzle()`: 不再呼叫 `POST /api/solve`，改為直接呼叫 `generator.solve()`。

## 3. 難度邏輯 (同 v1)
| 難度 | 提示數 | 說明 |
| :--- | :--- | :--- |
| **簡單 (Easy)** | 40 - 45 | 解題路徑直觀。 |
| **中等 (Medium)** | 30 - 35 | 需要基礎推理。 |
| **困難 (Hard)** | 22 - 28 | 需要進階技巧。 |

## 4. 儲存規範 (LocalStorage)
*   `sudoku_autosave`: 儲存當前棋盤、原始題目、解答、時間與筆記。
*   `sudoku_settings`: 儲存使用者介面偏好。
