/**
 * SudokuLogic - 一個強大且獨立的數獨核心邏輯庫
 * 支援：生成唯一解題目、難度評估、快速求解、以及盤面合法性檢查。
 */

class SudokuLogic {
    constructor() {
        this.boardSize = 9;
        this.boxSize = 3;
    }

    /**
     * 檢查在指定位置填入數字是否合法
     * @param {number[][]} board 9x9 盤面
     * @param {number} row 行 (0-8)
     * @param {number} col 列 (0-8)
     * @param {number} num 數字 (1-9)
     * @returns {boolean}
     */
    isValid(board, row, col, num) {
        // 檢查橫列
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num) return false;
        }

        // 檢查直行
        for (let x = 0; x < 9; x++) {
            if (board[x][col] === num) return false;
        }

        // 檢查 3x3 九宮格
        const startRow = row - (row % 3);
        const startCol = col - (col % 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i + startRow][j + startCol] === num) return false;
            }
        }

        return true;
    }

    /**
     * 使用回溯演算法求解數獨
     * @param {number[][]} board 9x9 盤面 (會直接修改此陣列)
     * @param {boolean} shuffle 是否隨機嘗試數字 (用於生成題目)
     * @returns {boolean} 是否有解
     */
    solve(board, shuffle = false) {
        const emptyPos = this.findEmpty(board);
        if (!emptyPos) return true;

        const [row, col] = emptyPos;
        let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (shuffle) {
            nums.sort(() => Math.random() - 0.5);
        }

        for (let num of nums) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this.solve(board, shuffle)) return true;
                board[row][col] = 0;
            }
        }

        return false;
    }

    /**
     * 尋找下一個空格
     */
    findEmpty(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) return [r, c];
            }
        }
        return null;
    }

    /**
     * 計算盤面的解數量 (用於確保唯一解)
     * @param {number[][]} board 
     * @param {number} limit 限制搜尋數量
     * @returns {number} 解的總數
     */
    countSolutions(board, limit = 2) {
        let count = 0;
        const solveInternal = (b) => {
            if (count >= limit) return;
            
            const emptyPos = this.findEmpty(b);
            if (!emptyPos) {
                count++;
                return;
            }

            const [row, col] = emptyPos;
            for (let num = 1; num <= 9; num++) {
                if (this.isValid(b, row, col, num)) {
                    b[row][col] = num;
                    solveInternal(b);
                    b[row][col] = 0;
                }
            }
        };

        const boardCopy = board.map(row => [...row]);
        solveInternal(boardCopy);
        return count;
    }

    /**
     * 生成一個新的數獨題目
     * @param {string} difficulty 'easy' | 'medium' | 'hard'
     * @returns {{puzzle: number[][], solution: number[][]}}
     */
    generate(difficulty = 'easy') {
        // 1. 生成一個完整且合法的盤面
        let fullBoard = Array(9).fill().map(() => Array(9).fill(0));
        this.solve(fullBoard, true);
        const solution = fullBoard.map(row => [...row]);

        // 2. 挖洞策略
        let puzzle = fullBoard.map(row => [...row]);
        let attempts;
        let clues;

        switch (difficulty) {
            case 'easy':
                clues = Math.floor(Math.random() * 6) + 40; // 40-45 提示數
                break;
            case 'medium':
                clues = Math.floor(Math.random() * 6) + 30; // 30-35 提示數
                break;
            case 'hard':
                clues = Math.floor(Math.random() * 7) + 22; // 22-28 提示數
                break;
            default:
                clues = 40;
        }

        let cells = [];
        for (let i = 0; i < 81; i++) cells.push(i);
        cells.sort(() => Math.random() - 0.5);

        let removed = 0;
        let targetRemove = 81 - clues;

        for (let i = 0; i < 81 && removed < targetRemove; i++) {
            const row = Math.floor(cells[i] / 9);
            const col = cells[i] % 9;
            
            const backup = puzzle[row][col];
            puzzle[row][col] = 0;

            // 檢查是否仍為唯一解
            if (this.countSolutions(puzzle) === 1) {
                removed++;
            } else {
                // 如果不是唯一解，還原
                puzzle[row][col] = backup;
            }
        }

        return { puzzle, solution };
    }

    /**
     * 檢查當前盤面是否有衝突 (用於求解器模式)
     */
    hasConflict(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] !== 0) {
                    const val = board[r][c];
                    board[r][c] = 0; // 暫時移除以檢查衝突
                    if (!this.isValid(board, r, c, val)) {
                        board[r][c] = val; // 還原
                        return true;
                    }
                    board[r][c] = val; // 還原
                }
            }
        }
        return false;
    }
}

// 匯出供不同環境使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SudokuLogic };
} else if (typeof window !== 'undefined') {
    window.SudokuLogic = SudokuLogic;
}
