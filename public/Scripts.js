let board = [];
let currentPlayer = 'X'; 
let gameActive = false;
let stats = JSON.parse(localStorage.getItem('gomokuStats')) || {X: 0, O: 0};

/**
 * SCREEN NAVIGATOR 
 * Handles smooth transitions between Splash -> Menu -> Game
 */
function navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    
    // Fade out current screens
    screens.forEach(s => {
        s.style.opacity = '0';
        // Wait for fade animation (300ms) before hiding
        setTimeout(() => s.classList.add('hidden'), 300);
    });

    // Fade in target screen
    setTimeout(() => {
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.remove('hidden');
            // Small delay to trigger CSS transition
            setTimeout(() => {
                target.style.opacity = '1';
            }, 50);
        }
    }, 350);
}

window.onload = () => {
    // Show splash screen opacity immediately
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.opacity = '1';

    // 3s Splash sequence
    setTimeout(() => {
        navigateTo('main-menu');
    }, 3000);

    setupListeners();
};

function setupListeners() {
    // Play Button
    document.getElementById('play-btn').onclick = () => {
        navigateTo('game-screen');
        initGame();
    };

    // --- FIXED STATS BUTTON (No more alert) ---
    document.getElementById('stats-btn').onclick = () => {
        document.getElementById('stat-p1').textContent = stats.X;
        document.getElementById('stat-p2').textContent = stats.O;
        document.getElementById('stats-overlay').classList.remove('hidden');
    };

    document.getElementById('close-stats').onclick = () => {
        document.getElementById('stats-overlay').classList.add('hidden');
    };

    // --- FIXED THEME BUTTON ---
    document.getElementById('theme-btn').onclick = () => {
        const body = document.body;
        if (body.classList.contains('dark-theme')) {
            body.classList.replace('dark-theme', 'light-theme');
            document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #f0f0f0 0%, #c9d6ff 100%)');
            document.documentElement.style.setProperty('--bg-dark', '#ffffff');
        } else {
            body.classList.replace('light-theme', 'dark-theme');
            document.documentElement.style.setProperty('--bg-gradient', 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)');
            document.documentElement.style.setProperty('--bg-dark', '#1a1a2e');
        }
    };

    // In-Game Buttons (Pause Button Listener Removed)
    document.getElementById('ingame-home-btn').onclick = () => navigateTo('main-menu');
    document.getElementById('ingame-restart-btn').onclick = initGame;
    
    // Victory Buttons
    document.getElementById('vic-home').onclick = () => {
        document.getElementById('victory-overlay').classList.add('hidden');
        navigateTo('main-menu');
    };

    document.getElementById('vic-play-again').onclick = () => {
        document.getElementById('victory-overlay').classList.add('hidden');
        initGame();
    };
}

function initGame() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    board = Array(15).fill(null).map(() => Array(15).fill(null));
    currentPlayer = 'X';
    gameActive = true;
    
    const isAi = document.getElementById('game-mode').value === 'ai';
    document.getElementById('p2-name').textContent = isAi ? "COMPUTER" : "PLAYER 2";
    document.getElementById('victory-overlay').classList.add('hidden');

    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => handleMove(r, c);
            cell.id = `cell-${r}-${c}`;
            boardEl.appendChild(cell);
        }
    }
    updateActivePanel();
}

function handleMove(r, c) {
    if (!gameActive || board[r][c]) return;

    // Mobile Haptic Feedback
    if (window.navigator.vibrate) window.navigator.vibrate(30);

    placeStone(r, c, currentPlayer);

    if (checkWin(r, c, currentPlayer)) {
        showVictory(currentPlayer);
        return;
    }

    currentPlayer = (currentPlayer === 'X') ? 'O' : 'X';
    updateActivePanel();

    if (document.getElementById('game-mode').value === 'ai' && currentPlayer === 'O') {
        setTimeout(aiMove, 600);
    }
}

function placeStone(r, c, p) {
    board[r][c] = p;
    const cell = document.getElementById(`cell-${r}-${c}`);
    cell.innerHTML = `<div class="stone ${p === 'X' ? 'black-stone' : 'white-stone'}"></div>`;
}

function updateActivePanel() {
    const p1 = document.getElementById('p1-panel');
    const p2 = document.getElementById('p2-panel');
    
    p1.classList.toggle('active', currentPlayer === 'X');
    p2.classList.toggle('active', currentPlayer === 'O');
    
    // Set text indicator
    p1.querySelector('.turn-indicator').textContent = currentPlayer === 'X' ? "YOUR TURN" : "WAITING...";
    p2.querySelector('.turn-indicator').textContent = currentPlayer === 'O' ? "YOUR TURN" : "WAITING...";
}

function showVictory(winner) {
    gameActive = false;
    const isAi = document.getElementById('game-mode').value === 'ai';
    
    const winName = winner === 'X' ? 'Player 1' : (isAi ? 'Computer' : 'Player 2');
    const loseName = winner === 'X' ? (isAi ? 'Computer' : 'Player 2') : 'Player 1';

    document.getElementById('winner-score').textContent = winName;
    document.getElementById('loser-score').textContent = loseName;
    document.getElementById('victory-overlay').classList.remove('hidden');

    stats[winner]++;
    localStorage.setItem('gomokuStats', JSON.stringify(stats));
}

function checkWin(r, c, p) {
    const directions = [[1,0], [0,1], [1,1], [1,-1]];
    for (let [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 5; i++) if (board[r+i*dr]?.[c+i*dc] === p) count++; else break;
        for (let i = 1; i < 5; i++) if (board[r-i*dr]?.[c-i*dc] === p) count++; else break;
        if (count >= 5) return true;
    }
    return false;
}

function aiMove() {
    if (!gameActive) return;

    let bestScore = -1;
    let move = { r: 7, c: 7 }; // Default to center if board is empty

    const difficulty = document.getElementById('ai-difficulty').value;

    // Scan every cell to find the highest value move
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            if (!board[r][c]) {
                // Score this spot for AI ('O') and for blocking Human ('X')
                let score = evaluateSpot(r, c);
                
                if (score > bestScore) {
                    bestScore = score;
                    move = { r, c };
                }
            }
        }
    }

    handleMove(move.r, move.c);
}

function evaluateSpot(r, c) {
    let totalScore = 0;
    
    // Check potential for AI to win (O)
    totalScore += getLineScore(r, c, 'O') * 1.5; 
    
    // Check potential for Human to win (X) - Block them!
    totalScore += getLineScore(r, c, 'X');

    return totalScore;
}

function getLineScore(r, c, p) {
    const directions = [[1,0], [0,1], [1,1], [1,-1]];
    let maxLine = 0;

    for (let [dr, dc] of directions) {
        let count = 1;
        // Count consecutive stones in both directions
        for (let i = 1; i < 5; i++) if (board[r + i * dr]?.[c + i * dc] === p) count++; else break;
        for (let i = 1; i < 5; i++) if (board[r - i * dr]?.[c - i * dc] === p) count++; else break;
        
        // Weighting: 5-in-a-row is huge, 4-in-a-row is critical
        if (count >= 5) maxLine += 10000;
        else if (count === 4) maxLine += 1000;
        else if (count === 3) maxLine += 100;
        else if (count === 2) maxLine += 10;
    }
    return maxLine;
}