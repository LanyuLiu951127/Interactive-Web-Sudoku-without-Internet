// Game State
        let currentBoard = [];
        let initialBoard = [];
        let solution = [];
        let notesBoard = [];
        let historyStack = [];

        let selectedCell = null;
        let isNoteMode = false;
        let mistakes = 0;
        let difficulty = 'easy';
        let isSolverMode = false;

        let userSettings = {
            hideCompleted: true,
            highlightIdentical: true,
            highlightRelated: true,
            showError: true,
            dontAskNewGame: false
        };

        let pendingDifficulty = null;
        let pendingDifficultySelectId = null;

        function requestNewGame(diff = null, selectId = null) {
            pendingDifficulty = diff;
            pendingDifficultySelectId = selectId;
            
            if (userSettings.dontAskNewGame) {
                confirmNewGame();
            } else {
                document.getElementById('dont-ask-checkbox').checked = false;
                document.getElementById('confirm-overlay').classList.add('show');
            }
        }

        function confirmNewGame() {
            const dontAsk = document.getElementById('dont-ask-checkbox').checked;
            if (dontAsk) {
                userSettings.dontAskNewGame = true;
                localStorage.setItem('sudoku_settings', JSON.stringify(userSettings));
            }
            document.getElementById('confirm-overlay').classList.remove('show');
            
            if (pendingDifficulty) {
                syncDifficulty(pendingDifficulty);
            }
            newGame();
        }

        function cancelNewGame() {
            document.getElementById('confirm-overlay').classList.remove('show');
            if (pendingDifficultySelectId) {
                const selectEl = document.getElementById(pendingDifficultySelectId);
                if (selectEl) {
                    selectEl.value = difficulty;
                }
            }
            pendingDifficulty = null;
            pendingDifficultySelectId = null;
        }

        // Timer & Pause State
        let timerInterval = null;
        let timeElapsed = 0;
        let isGameWon = false;
        let isPaused = false;

        // Tutorial State
        let tutorialState = { active: false, step: 0, target: null, rowNums: [], colNums: [], boxNums: [], allPresent: [], possibleNums: [] };

        const gridElement = document.getElementById('sudoku-grid');
        const messageElement = document.getElementById('message');
        const timerDesktop = document.getElementById('timer-desktop');
        const timerMobile = document.getElementById('timer-mobile');
        const mistakesDesktop = document.getElementById('mistakes-desktop');
        const mistakesMobile = document.getElementById('mistakes-mobile');

        const btnNotes = document.getElementById('btn-notes');
        const pauseOverlay = document.getElementById('pause-overlay');

        const tutorialPanel = document.getElementById('tutorial-panel');
        const tutorialOverlay = document.getElementById('tutorial-overlay');
        const tutorialBody = document.getElementById('tutorial-body');
        const btnPrevStep = document.getElementById('btn-prev-step');
        const btnNextStep = document.getElementById('btn-next-step');

        function syncDifficulty(val) {
            difficulty = val;
            document.getElementById('difficulty-desktop').value = val;
            document.getElementById('difficulty-mobile').value = val;
        }

        // --- Auto Save & Load ---
        function saveGameState() {
            if (isGameWon || initialBoard.length === 0) return;
            const state = {
                difficulty,
                initialBoard,
                currentBoard,
                solution,
                notesBoard: notesBoard.map(row => row.map(set => Array.from(set))),
                historyStack: historyStack.map(h => ({
                    board: h.board,
                    notes: h.notes.map(r => r.map(set => Array.from(set))),
                    mistakes: h.mistakes
                })),
                mistakes,
                timeElapsed
            };
            localStorage.setItem('sudoku_autosave', JSON.stringify(state));
        }

        function loadGameState() {
            const saved = localStorage.getItem('sudoku_autosave');
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    syncDifficulty(state.difficulty || 'easy');
                    initialBoard = state.initialBoard;
                    currentBoard = state.currentBoard;
                    solution = state.solution;
                    mistakes = state.mistakes;
                    timeElapsed = state.timeElapsed;

                    notesBoard = state.notesBoard.map(row => row.map(arr => new Set(arr)));
                    historyStack = state.historyStack.map(h => ({
                        board: h.board,
                        notes: h.notes.map(r => r.map(arr => new Set(arr))),
                        mistakes: h.mistakes
                    }));

                    updateMistakesDisplay();
                    updateTimerDisplay();
                    renderBoard();
                    startTimer();
                    return true;
                } catch (e) {
                    console.error("載入存檔失敗:", e);
                    return false;
                }
            }
            return false;
        }

        function clearGameState() {
            localStorage.removeItem('sudoku_autosave');
        }

        // --- Core Functions ---

        async function newGame() {
            messageElement.textContent = "載入中...";
            stopTimer();
            endTutorial();
            isPaused = false;
            pauseOverlay.classList.add('hidden');
            document.querySelectorAll('.pause-btn').forEach(btn => btn.innerText = '⏸');

            try {
                const response = await fetch(`http://127.0.0.1:5000/api/game?difficulty=${difficulty}`);
                const result = await response.json();

                if (result.status === "success") {
                    initialBoard = result.data.puzzle;
                    solution = result.data.solution;
                    currentBoard = JSON.parse(JSON.stringify(initialBoard));

                    notesBoard = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
                    historyStack = [];
                    mistakes = 0;
                    selectedCell = null;
                    isGameWon = false;
                    timeElapsed = 0;

                    updateMistakesDisplay();
                    updateTimerDisplay();
                    renderBoard();
                    startTimer();
                    messageElement.textContent = "";
                    saveGameState();
                }
            } catch (error) {
                messageElement.textContent = "無法連接到伺服器。";
            }
        }

        function renderBoard() {
            gridElement.innerHTML = '';

            const isTuto = tutorialState.active;
            if (isTuto) gridElement.classList.add('tutorial-active');
            else gridElement.classList.remove('tutorial-active');

            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';

                    if (c === 2 || c === 5) cell.classList.add('border-right');
                    if (r === 2 || r === 5) cell.classList.add('border-bottom');

                    const val = currentBoard[r][c];

                    if (val !== 0) {
                        cell.textContent = val;
                        if (initialBoard[r][c] !== 0) {
                            cell.classList.add('initial');
                        } else {
                            cell.classList.add('user-input');
                            if (!isSolverMode && val !== solution[r][c] && !isTuto && userSettings.showError) {
                                cell.classList.add('error');
                            }
                        }
                    } else if (notesBoard[r][c].size > 0 && !isTuto) {
                        const notesGrid = document.createElement('div');
                        notesGrid.className = 'notes-grid';
                        for (let i = 1; i <= 9; i++) {
                            const noteCell = document.createElement('div');
                            noteCell.className = 'note-num';
                            if (notesBoard[r][c].has(i)) noteCell.textContent = i;
                            notesGrid.appendChild(noteCell);
                        }
                        cell.appendChild(notesGrid);
                    }

                    if (isTuto) {
                        const tgt = tutorialState.target;
                        const step = tutorialState.step;
                        if (r === tgt.r && c === tgt.c) {
                            cell.classList.add('hint-target');
                            if (step === 3) { cell.textContent = tgt.val; cell.style.color = 'white'; }
                        } else if (step >= 1) {
                            const inBlock = (Math.floor(r / 3) === Math.floor(tgt.r / 3) && Math.floor(c / 3) === Math.floor(tgt.c / 3));
                            if (r === tgt.r || c === tgt.c || inBlock) {
                                if (step >= 2 && currentBoard[r][c] !== 0) cell.classList.add('hint-found');
                                else if (step === 1 || currentBoard[r][c] === 0) cell.classList.add('hint-related');
                            }
                        }
                    } else if (selectedCell && !isPaused) {
                        if (selectedCell.r === r && selectedCell.c === c) cell.classList.add('selected');
                        else if (userSettings.highlightRelated && (selectedCell.r === r || selectedCell.c === c ||
                            (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && Math.floor(selectedCell.c / 3) === Math.floor(c / 3)))) {
                            cell.classList.add('related');
                        }
                        if (userSettings.highlightIdentical && currentBoard[selectedCell.r][selectedCell.c] !== 0 &&
                            currentBoard[r][c] === currentBoard[selectedCell.r][selectedCell.c]) {
                            cell.classList.add('selected');
                        }
                    }

                    cell.onclick = () => { if (!isTuto && !isPaused) selectCell(r, c); };
                    gridElement.appendChild(cell);
                }
            }
            if (!isGameWon && !isTuto) checkWin();
            updateNumpad();
        }

        function updateNumpad() {
            const counts = Array(10).fill(0);
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    const val = currentBoard[r][c];
                    if (val !== 0 && val === solution[r][c]) {
                        counts[val]++;
                    }
                }
            }
            for (let i = 1; i <= 9; i++) {
                const btn = document.getElementById('numpad-btn-' + i);
                if (btn) {
                    if (userSettings.hideCompleted && counts[i] === 9) {
                        btn.classList.add('completed');
                    } else {
                        btn.classList.remove('completed');
                    }
                }
            }
        }

        function selectCell(r, c) {
            if (isGameWon || isPaused) return;
            selectedCell = { r, c };
            renderBoard();
        }

        // --- Action Functions ---

        function saveStateToHistory() {
            const boardCopy = JSON.parse(JSON.stringify(currentBoard));
            const notesCopy = notesBoard.map(row => row.map(set => new Set(set)));
            historyStack.push({ board: boardCopy, notes: notesCopy, mistakes: mistakes });
        }

        function toggleNotes() {
            if (tutorialState.active || isPaused) return;
            isNoteMode = !isNoteMode;
            btnNotes.classList.toggle('active', isNoteMode);
        }

        function erase() {
            if (tutorialState.active || isPaused) return;
            inputNumber(0);
        }

        function inputNumber(num) {
            if (!selectedCell || isGameWon || tutorialState.active || isPaused) return;
            const { r, c } = selectedCell;

            if (initialBoard[r][c] !== 0) return;

            // Prevent using completed numbers if setting is on
            if (num !== 0 && userSettings.hideCompleted) {
                const btn = document.getElementById('numpad-btn-' + num);
                if (btn && btn.classList.contains('completed')) return;
            }

            saveStateToHistory();

            if (num === 0) {
                currentBoard[r][c] = 0;
                notesBoard[r][c].clear();
            } else if (isNoteMode) {
                if (currentBoard[r][c] === 0) {
                    if (notesBoard[r][c].has(num)) notesBoard[r][c].delete(num);
                    else notesBoard[r][c].add(num);
                }
            } else {
                currentBoard[r][c] = num;
                notesBoard[r][c].clear();
                removeNotesFromRelated(r, c, num);

                if (!isSolverMode && num !== solution[r][c]) {
                    mistakes++;
                    updateMistakesDisplay();
                }
            }
            renderBoard();
            if (!isSolverMode) saveGameState();
        }

        function removeNotesFromRelated(row, col, num) {
            for (let i = 0; i < 9; i++) {
                notesBoard[row][i].delete(num);
                notesBoard[i][col].delete(num);
            }
            const startRow = Math.floor(row / 3) * 3;
            const startCol = Math.floor(col / 3) * 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    notesBoard[startRow + i][startCol + j].delete(num);
                }
            }
        }

        function undo() {
            if (historyStack.length === 0 || isGameWon || tutorialState.active || isPaused) return;
            const prevState = historyStack.pop();
            currentBoard = prevState.board;
            notesBoard = prevState.notes;
            mistakes = prevState.mistakes;
            updateMistakesDisplay();
            renderBoard();
            saveGameState();
        }

        // --- Interactive Guided Hint System ---

        function startTutorialHint() {
            if (!selectedCell || isGameWon || isPaused) {
                messageElement.textContent = "請先選取一個空格！";
                setTimeout(() => messageElement.textContent = "", 2000);
                return;
            }
            const { r, c } = selectedCell;
            if (currentBoard[r][c] !== 0) {
                messageElement.textContent = "這個格子已經有數字了！";
                setTimeout(() => messageElement.textContent = "", 2000);
                return;
            }

            let rowNums = new Set(), colNums = new Set(), boxNums = new Set();
            for (let i = 0; i < 9; i++) {
                if (currentBoard[r][i] !== 0) rowNums.add(currentBoard[r][i]);
                if (currentBoard[i][c] !== 0) colNums.add(currentBoard[i][c]);
            }
            const startRow = Math.floor(r / 3) * 3, startCol = Math.floor(c / 3) * 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    if (currentBoard[startRow + i][startCol + j] !== 0) boxNums.add(currentBoard[startRow + i][startCol + j]);
                }
            }

            let allPresent = new Set([...rowNums, ...colNums, ...boxNums]);
            let possibleNums = [];
            for (let i = 1; i <= 9; i++) if (!allPresent.has(i)) possibleNums.push(i);

            tutorialState = {
                active: true, step: 0, target: { r, c, val: solution[r][c] },
                rowNums: Array.from(rowNums).sort(), colNums: Array.from(colNums).sort(),
                boxNums: Array.from(boxNums).sort(), allPresent: Array.from(allPresent).sort(), possibleNums
            };

            tutorialOverlay.classList.add('show');
            tutorialPanel.classList.add('show');
            updateTutorialUI();
        }

        function endTutorial() {
            tutorialState.active = false;
            tutorialOverlay.classList.remove('show');
            tutorialPanel.classList.remove('show');
            if (currentBoard && currentBoard.length > 0) renderBoard();
        }

        function applyTutorialAnswer() {
            const { r, c, val } = tutorialState.target;
            endTutorial();
            selectedCell = { r, c };
            saveStateToHistory();
            currentBoard[r][c] = val;
            notesBoard[r][c].clear();
            removeNotesFromRelated(r, c, val);
            renderBoard();
            saveGameState();
        }

        function nextTutorialStep() {
            if (tutorialState.step < 3) { tutorialState.step++; updateTutorialUI(); }
            else applyTutorialAnswer();
        }

        function prevTutorialStep() {
            if (tutorialState.step > 0) { tutorialState.step--; updateTutorialUI(); }
        }

        function updateTutorialUI() {
            const s = tutorialState.step;
            const dots = document.getElementById('tutorial-dots').children;
            for (let i = 0; i < 4; i++) dots[i].className = i === s ? 'dot active' : 'dot';

            btnPrevStep.style.visibility = s === 0 ? 'hidden' : 'visible';
            btnNextStep.textContent = s === 3 ? '填入並結束' : '下一步';

            let text = "";
            switch (s) {
                case 0: text = `首先，讓我們鎖定您選擇的<span style="color:#51cf66; font-weight:bold;">目標格子</span>。<br><br>這是一個空的格子，我們的任務是找出唯一能填入這個格子的數字是什麼。`; break;
                case 1: text = `根據數獨的規則，每一行、每一列，以及它所在的 3x3 區域，數字都不能重複。<br><br>我們標記出了與它相關的<span style="color:#1864ab; font-weight:bold;">藍色影響區域</span>。`; break;
                case 2: text = `觀察藍色區域，我們發現已經填上了許多數字，我們將這些數字標記為<span style="color:#e03131; font-weight:bold;">紅色</span>。<br><br>因為不能重複，所以這些<span style="color:#e03131; font-weight:bold;">紅色數字 (${tutorialState.allPresent.join(', ')}) </span>都被排除了！`; break;
                case 3: text = `排除掉不可能的數字後，這個格子可能填入的數字只剩下：<span class="tutorial-highlight-text">${tutorialState.possibleNums.join(', ')}</span>。<br><br>根據整體盤面推導，正確答案是 <span class="tutorial-highlight-text" style="font-size:20px;">${tutorialState.target.val}</span>！`; break;
            }
            tutorialBody.innerHTML = text;
            renderBoard();
        }

        // --- Timer, Pause & Utilities ---

        function togglePause() {
            if (isGameWon || tutorialState.active) return;
            isPaused = !isPaused;
            if (isPaused) {
                stopTimer();
                pauseOverlay.classList.remove('hidden');
                document.querySelectorAll('.pause-btn').forEach(btn => btn.innerText = '▶');
            } else {
                startTimer();
                pauseOverlay.classList.add('hidden');
                document.querySelectorAll('.pause-btn').forEach(btn => btn.innerText = '⏸');
            }
            renderBoard();
        }

        function startTimer() {
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timeElapsed++;
                updateTimerDisplay();
                if (timeElapsed % 5 === 0) saveGameState(); // save every 5 seconds
            }, 1000);
        }

        function stopTimer() { clearInterval(timerInterval); }

        function updateTimerDisplay() {
            const mins = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
            const secs = String(timeElapsed % 60).padStart(2, '0');
            timerDesktop.textContent = `${mins}:${secs}`;
            timerMobile.textContent = `${mins}:${secs}`;
        }

        function updateMistakesDisplay() {
            const text = `錯誤: ${mistakes}/3`;
            mistakesDesktop.textContent = text;
            mistakesMobile.textContent = text;
            if (mistakes > 0) {
                mistakesDesktop.style.color = "var(--danger-color)";
                mistakesMobile.style.color = "var(--danger-color)";
            } else {
                mistakesDesktop.style.color = "var(--text-muted)";
                mistakesMobile.style.color = "var(--text-muted)";
            }
        }

        function checkWin() {
            let filled = true, correct = true;
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (currentBoard[r][c] === 0) filled = false;
                    if (currentBoard[r][c] !== 0 && currentBoard[r][c] !== solution[r][c]) correct = false;
                }
            }
            if (filled && correct) {
                isGameWon = true;
                stopTimer();
                messageElement.textContent = "🎉 恭喜獲勝！你太棒了！";
                selectedCell = null;
                renderBoard();
                clearGameState(); // Clear save on win
            }
        }

        document.addEventListener('keydown', (e) => {
            if (tutorialState.active) {
                if (e.key === 'ArrowRight' || e.key === 'Enter') nextTutorialStep();
                if (e.key === 'ArrowLeft') prevTutorialStep();
                if (e.key === 'Escape') endTutorial();
                return;
            }
            if (isPaused) return;
            if (e.key >= '1' && e.key <= '9') inputNumber(parseInt(e.key));
            if (e.key === 'Backspace' || e.key === '0' || e.key === 'Delete') erase();
            if (e.key.toLowerCase() === 'n') toggleNotes();
            if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) undo();
            if (e.key.toLowerCase() === 'p') togglePause();
        });

        // --- Settings System ---
        function loadSettings() {
            const s = localStorage.getItem('sudoku_settings');
            if (s) userSettings = { ...userSettings, ...JSON.parse(s) };
            document.getElementById('set-hide-completed').checked = userSettings.hideCompleted;
            document.getElementById('set-highlight-identical').checked = userSettings.highlightIdentical;
            document.getElementById('set-highlight-related').checked = userSettings.highlightRelated;
            document.getElementById('set-show-error').checked = userSettings.showError;
        }

        function updateSettings() {
            userSettings.hideCompleted = document.getElementById('set-hide-completed').checked;
            userSettings.highlightIdentical = document.getElementById('set-highlight-identical').checked;
            userSettings.highlightRelated = document.getElementById('set-highlight-related').checked;
            userSettings.showError = document.getElementById('set-show-error').checked;
            localStorage.setItem('sudoku_settings', JSON.stringify(userSettings));
            renderBoard();
        }

        function openSettings() { document.getElementById('settings-overlay').classList.add('show'); }
        function closeSettings() { document.getElementById('settings-overlay').classList.remove('show'); }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        }

        // --- Rules Modal Logic ---
        const sudokuRules = [
            {
                title: "數獨基本規則",
                content: `
                    <h4>數獨基本規則</h4>
                    <p>數獨是一款受歡迎的數字邏輯益智遊戲。規則很簡單，就連初學者都能掌握。</p>
                    <ul>
                        <li>數獨的網格由 9x9 的空格組成。</li>
                        <li>您只能使用從 1 到 9 的數字。</li>
                        <li>每個 3x3 的九宮格中只能含有數字 1 到 9，且每個數字只能使用一次。</li>
                        <li>每一行與每一列只能含有數字 1 到 9，且每個數字只能使用一次。</li>
                        <li>當整個數獨網格都正確填滿數字，且沒有任何重複衝突時，遊戲就會結束。</li>
                    </ul>
                `
            },
            {
                title: "最後的空格",
                content: `
                    <h4>最後的空格 (Last Free Cell)</h4>
                    <p>「最後的空格」是最基本的數獨解題技巧。</p>
                    <p>此技巧的基礎是數獨網格裡每個 3×3 的宮、直行和橫列必須包含 1 到 9 的數字，且不能重複。</p>
                    <p>因此若發現某個 3×3 的宮、直行或橫列裡「只有一個空格」，就要確認是少了 1 到 9 之中哪個數字，並直接填入該空格。</p>
                `
            },
            {
                title: "最後剩餘的格子",
                content: `
                    <h4>最後剩餘的格子 (Last Remaining Cell)</h4>
                    <p>這是另一種數獨基本策略。</p>
                    <p>若發現某個數字在某個 3×3 宮的其中幾行、列都已經被其他宮的相同數字佔用（因為同行同列不可重複），</p>
                    <p>導致該宮內只剩下「唯一一個格子」可以填入該數字時，那就是該數字的專屬位置。</p>
                `
            },
            {
                title: "最後可能的數字",
                content: `
                    <h4>最後可能的數字 (Last Possible Number)</h4>
                    <p>這是一個相當適合新手的策略。</p>
                    <p>想要找出某個格子該填什麼，請先看看該格子所在的 3x3 宮、直行、橫列裡，目前已經有哪些數字。</p>
                    <p>如果 1 到 9 之中，已經有 8 個數字出現在與該格相關的區域內，那麼該格就只能填入那唯一剩下的第 9 個數字。</p>
                `
            },
            {
                title: "數獨的註記功能",
                content: `
                    <h4>數獨的註記功能 (Notes)</h4>
                    <p>若在數獨網格上碰到難以突破的困境，找不到明顯的解決方法，請使用「註記 (筆記)」功能。</p>
                    <p>有了註記輔助，您便可專心思考數獨網格裡現有的數字，並在每個空格中暫時填入所有可能的候選數字。當線索變多時，再逐一刪除不可能的候選數。</p>
                `
            }
        ];

        let currentRuleIndex = 0;

        function openRulesModal() {
            document.getElementById('rules-overlay').classList.add('show');
            renderRulesTOC();
            showRule(0);
        }

        function closeRulesModal() {
            document.getElementById('rules-overlay').classList.remove('show');
        }

        function renderRulesTOC() {
            const toc = document.getElementById('rules-toc');
            toc.innerHTML = '';
            sudokuRules.forEach((rule, index) => {
                const item = document.createElement('div');
                item.className = 'toc-item';
                item.innerText = rule.title;
                item.onclick = () => showRule(index);
                toc.appendChild(item);
            });
        }

        function showRule(index) {
            currentRuleIndex = index;
            document.getElementById('rules-content').innerHTML = sudokuRules[index].content;
            const tocItems = document.querySelectorAll('.toc-item');
            tocItems.forEach((item, i) => {
                if (i === index) item.classList.add('active');
                else item.classList.remove('active');
            });
        }

        // --- Sudoku Solver Mode ---

        function startSolverMode() {
            isSolverMode = true;
            stopTimer();
            endTutorial();
            isPaused = false;
            isGameWon = false;
            mistakes = 0;
            selectedCell = null;
            messageElement.textContent = "數獨求解模式：請輸入數字，完成後點擊「求解」。";

            // Initialize blank board
            initialBoard = Array(9).fill().map(() => Array(9).fill(0));
            currentBoard = Array(9).fill().map(() => Array(9).fill(0));
            solution = [];
            notesBoard = Array(9).fill().map(() => Array(9).fill().map(() => new Set()));
            historyStack = [];

            // UI Adjustments
            document.querySelectorAll('.stats-header').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.difficulty-selector').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.new-game-btn').forEach(el => {
                if (!el.parentElement.id || el.parentElement.id !== 'solver-actions') {
                    el.classList.add('hidden');
                }
            });
            document.getElementById('solver-actions').classList.remove('hidden');
            document.getElementById('btn-notes').classList.add('hidden');
            document.querySelector('.action-btn[onclick="startTutorialHint()"]').classList.add('hidden');

            renderBoard();
        }

        function exitSolverMode() {
            isSolverMode = false;
            document.querySelectorAll('.stats-header').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.difficulty-selector').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.new-game-btn').forEach(el => el.classList.remove('hidden'));
            document.getElementById('solver-actions').classList.add('hidden');
            document.getElementById('btn-notes').classList.remove('hidden');
            document.querySelector('.action-btn[onclick="startTutorialHint()"]').classList.remove('hidden');
            
            newGame();
        }

        async function solvePuzzle() {
            messageElement.textContent = "正在計算中...";
            try {
                const response = await fetch('http://127.0.0.1:5000/api/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ puzzle: currentBoard })
                });
                const result = await response.json();
                if (result.status === "success") {
                    currentBoard = result.data.solution;
                    solution = result.data.solution;
                    messageElement.textContent = "解題完成！";
                    renderBoard();
                } else {
                    messageElement.textContent = "此盤面無解，請檢查輸入。";
                }
            } catch (error) {
                messageElement.textContent = "無法連接到伺服器。";
            }
        }

        // Start initialization
        window.onload = () => {
            loadSettings();
            if (!loadGameState()) {
                newGame();
            }
        };