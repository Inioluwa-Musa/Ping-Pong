const canvas = document.getElementById('pingpongCanvas');
const c = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;
canvas.style.background = "#000";

const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const ballRadius = 10;
const winningScore = 7;
let start = false;
let gameIsOver = false;
let gameMode = null; 
let difficulty = null;

// --- GLOBAL STATE & CUSTOMIZATION ---
let isPaused = false; 
let player1DisplayName = "Player 1";
let player1PaddleColor = "white";
let player1PaddleTColor = "white";

// --- CURRENCY AND CUSTOMIZATION STATE ---
let coins = 0;
let currentPaddlePattern = 'none';
let currentBallPattern = 'default';
let currentPaddleTrail = 'none';

// Only true "no effect" defaults are unlocked initially.
let ownedPaddlePatterns = ['none']; 
let ownedBallPatterns = ['default']; 
let ownedPaddleTrails = ['none']; 

let paddleTrail = []; 

// Prices for all cosmetic items, including the entry-level ones.
const ITEM_PRICES = {
    // Basic Cosmetics (Now Locked)
    'stripes_pat': 10, 
    'dot_pat': 10, 
    'basic_trail': 10, 
    
    // Tier 1 Paid Cosmetics
    'dots_pat': 50,
    'chevrons': 100,
    // Tier 2 Paid Cosmetics
    'grid_pattern': 75,
    'ring_pattern': 125,
    'wavy_trail': 150,
    'fire_trail': 75
};

const ITEM_DISPLAY_NAMES = {
    // True Defaults (No effect, free/unlocked)
    'none': 'None (Plain)', 
    'default': 'Default (White Ball)', 
    
    // Basic Cosmetic Items (Now Locked, must be purchased)
    'stripes_pat': 'Stripes',
    'dot_pat': 'Dots Pattern',
    'basic_trail': 'Basic Trail',

    // Paid Cosmetics
    'dots_pat': 'Small Dots Pattern',
    'chevrons': 'Chevrons Pattern',
    'grid_pattern': 'Grid Pattern',
    'ring_pattern': 'Ring Pattern',
    'fire_trail': 'Fire Trail',
    'wavy_trail': 'Wavy Trail'
};


// Tournament state variables
let tournamentPlayers = [];
let tournamentMatches = []; 
let currentMatchIndex = -1;

// AI Movement Speed Configuration
const AI_SPEEDS = {
    'easy': 2,
    'medium': 4,
    'hard': 5.5
};

// --- Game Object Definitions (Unchanged) ---
const player1 = {
    x: 10,
    y: canvas.height / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0,
    score: 0,
    color: 'white',
    isStriking: false,
    name: "Player 1",
    paddleTC: "white",
};

const player2 = {
    x: canvas.width - 10 - PADDLE_WIDTH,
    y: canvas.height / 2 - PADDLE_HEIGHT / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    dy: 0,
    score: 0,
    color: 'white',
    name: 'Player 2/AI'
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: ballRadius,
    speedX: 0,
    speedY: 0,
    color: 'white',
    owner: 'default' 
};

// =================================================================
// --- MUSIC PLAYER & PLAYLIST LOGIC (UPDATED) ---
// =================================================================
const musicPlayer = document.getElementById('gameMusic');
const playlist = [
    'music_track1.mp3', // Naruto track
    'music_track2.mp3'  // Tay K track
];
let currentTrackIndex = 0;

function setupMusicPlayer() {
    if (!musicPlayer) return;

    musicPlayer.src = playlist[currentTrackIndex];
    musicPlayer.volume = 0.5; 
    musicPlayer.muted = false; // Ensure it's not muted
    musicPlayer.load(); // Explicitly load the track
    
    // Attaching the event listener for when a song ends
    musicPlayer.addEventListener('ended', playNextTrack);

    // Attempt to play immediately (will likely be blocked until first user interaction)
    musicPlayer.play().catch(error => {
        // This catch handles browser security (Autoplay blocking)
        console.log("Music Autoplay prevented. Music will start once user interacts with the page (e.g., clicks a menu button).");
    });
}

function playNextTrack() {
    if (!musicPlayer) return;
    
    currentTrackIndex++;
    
    // Check if we reached the end of the playlist, if so, loop back to the start (track 1)
    if (currentTrackIndex >= playlist.length) {
        currentTrackIndex = 0; 
    }
    
    musicPlayer.src = playlist[currentTrackIndex];
    musicPlayer.load(); // Load new track source
    musicPlayer.play().catch(error => {
        console.log("Failed to play next track, possibly due to a brief interruption or focus change.");
    });
}
// =================================================================

// =================================================================
// --- CORE GAME UTILITY FUNCTIONS ---
// =================================================================

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2);
    ball.speedY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 2);
    ball.owner = 'default';
    start = true; 
}

function drawBall(x, y, radius, color, pattern) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fill();
    c.closePath();

    c.fillStyle = 'rgba(0, 0, 0, 0.5)';

    switch (pattern) {
        case 'dot_pat':
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    c.beginPath();
                    c.arc(x + (i - 1) * 5, y + (j - 1) * 5, 0.8, 0, Math.PI * 2);
                    c.fill();
                    c.closePath();
                }
            }
            break;
        case 'grid_pattern':
            c.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(x - 5, y); c.lineTo(x + 5, y);
            c.moveTo(x, y - 5); c.lineTo(x, y + 5);
            c.stroke();
            break;
        case 'ring_pattern':
            c.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            c.lineWidth = 1;
            c.beginPath();
            c.arc(x, y, 3, 0, Math.PI * 2);
            c.stroke();
            c.beginPath();
            c.arc(x, y, 6, 0, Math.PI * 2);
            c.stroke();
            break;
        case 'default':
        case 'none':
            break;
    }
}

function drawPaddle(x, y, w, h, color, name, pattern) {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
    
    if (name === player1DisplayName && pattern !== 'none') {
        c.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        switch (pattern) {
            case 'stripes_pat':
                for (let i = 0; i < h; i += 15) {
                    c.fillRect(x, y + i, w, 5);
                }
                break;
            case 'dots_pat':
                for (let i = 1; i < w / 3; i++) {
                    for (let j = 1; j < h / 3; j++) {
                        c.beginPath();
                        c.arc(x + i * 3, y + j * 3, 1, 0, Math.PI * 2);
                        c.fill();
                        c.closePath();
                    }
                }
                break;
            case 'chevrons':
                c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                c.lineWidth = 1;
                for (let i = 0; i < h; i += 10) {
                    c.beginPath();
                    c.moveTo(x + w, y + i);
                    c.lineTo(x, y + i + 5);
                    c.lineTo(x + w, y + i + 10);
                    c.stroke();
                }
                break;
        }
    }
    
    c.fillStyle = 'white';
    c.font = '16px sans-serif';
    c.textAlign = 'center';

    // --- TEXT WRAPPING LOGIC ---
    if (name.length > 5 && name.includes(' ')) {
        const parts = name.split(' ');
        const line1 = parts[0];
        const line2 = parts.slice(1).join(' ');
        c.fillText(line1, x + w / 2, y - 20); // Move first line up
        c.fillText(line2, x + w / 2, y - 5);  // Draw second line closer to paddle
    } else if (name.length > 5) {
        // If long but no space, wrap after 10 chars
        const line1 = name.substring(0, 5);
        const line2 = name.substring(5);
        c.fillText(line1, x + w / 2, y - 20);
        c.fillText(line2, x + w / 2, y - 5);
    } 
    else {
        // Default: Draw single line above paddle
        c.fillText(name, x + w / 2, y - 10);
    }
    // -------------------------
    
    c.textAlign = 'left'; 
}

function drawNet() {
    c.beginPath();
    c.setLineDash([10, 5]);
    c.moveTo(canvas.width / 2, 0);
    c.lineTo(canvas.width / 2, canvas.height);
    c.strokeStyle = 'white';
    c.stroke();
    c.setLineDash([]);
    c.closePath();
}

function drawScore() {
    c.fillStyle = 'white';
    c.font = '32px sans-serif';
    c.fillText(player1.score, canvas.width / 4, 50);
    c.fillText(player2.score, 3 * canvas.width / 4, 50);
}

function drawPaddleTrail(color) {
    if (currentPaddleTrail === 'none') return;

    for (let i = 0; i < paddleTrail.length; i++) {
        const p = paddleTrail[i];
        let alpha = 1 - (i / paddleTrail.length); 
        let width = PADDLE_WIDTH * alpha * 0.8;
        let height = PADDLE_HEIGHT * alpha * 0.8;
        
        // Base X position (center of the paddle history point)
        let drawX = p.x; 
        let drawY = p.y;
        
        c.beginPath();
        
        if (currentPaddleTrail === 'basic_trail') {
            c.fillStyle = color;
        } else if (currentPaddleTrail === 'wavy_trail') {
            // *** CORRECTED WAVY TRAIL LOGIC ***
            // 1. Calculate the wave offset. Use a slightly higher amplitude for visibility.
            // i / 3 for frequency, 8 * alpha for amplitude (max 8px offset when fresh).
            let waveOffset = Math.sin(i / 3) * (8 * alpha); 
            drawX += waveOffset;
            c.fillStyle = color;
            // *** END WAVY LOGIC ***
            
        } else if (currentPaddleTrail === 'fire_trail') {
            const color = i < 5 ? 'orange' : 'red'; 
            c.fillStyle = `rgba(${color === 'orange' ? '255,165,0' : '255,0,0'}, ${alpha * 0.8})`; 
        }
        
        // --- FINAL DRAWING ADJUSTMENT ---
        // This centers the trail element regardless of pattern.
        // It subtracts half the trail element's width and half its height from the (potentially wiggled) center point.
        let rectX = drawX - width / 2;
        let rectY = drawY - height / 2;

        c.fillRect(rectX, rectY, width, height);
        c.closePath();
    }
}


// --- DOM Element References (Unchanged) ---
const btnsDiv = document.getElementById('btns');
const difficultyBtnsDiv = document.getElementById('difficultyBtns');
const customiseMenuDiv = document.getElementById('customiseMenu');
const tournamentMenuDiv = document.getElementById('tournamentMenu');
const messageDiv = document.getElementById('message');

const backBtn = document.getElementById('backBtn');
const pauseBtn = document.getElementById('pauseBtn');

const onePlayerBtn = document.getElementById('onePlayerBtn');
const twoPlayerBtn = document.getElementById('twoPlayerBtn');
const customiseBtn = document.getElementById('customiseBtn');
const tournamentBtn = document.getElementById('tournamentBtn');
const tutorialBtn = document.getElementById('tutorialBtn');
const easyBtn = document.getElementById('easyBtn');
const mediumBtn = document.getElementById('mediumBtn');
const hardBtn = document.getElementById('hardBtn');
const backFromDifficultyBtn = document.getElementById('backFromDifficultyBtn');
const usernameInput = document.getElementById('usernameInput');
const paddleColorInput = document.getElementById('paddleColorInput');
const paddleTColorInput = document.getElementById('paddleTColorInput');
const saveCustomisationBtn = document.getElementById('saveCustomisationBtn');
const backFromCustomiseBtn = document.getElementById('backFromCustomiseBtn');
const startTournament4Btn = document.getElementById('startTournament4Btn');
const startTournament8Btn = document.getElementById('startTournament8Btn');
const backFromTournamentBtn = document.getElementById('backFromTournamentBtn');

const infoShopMenuDiv = document.getElementById('infoShopMenu');
const infoUsername = document.getElementById('infoUsername');
const infoCoins = document.getElementById('infoCoins');
const infoPaddlePatternsList = document.getElementById('infoPaddlePatternsList'); 
const infoBallPatternsList = document.getElementById('infoBallPatternsList'); 
const infoPaddleTrailsList = document.getElementById('infoPaddleTrailsList'); 
const infoBackBtn = document.getElementById('infoBackBtn');


// --- Local Storage Functions (Unchanged) ---

function saveGameState() {
    localStorage.setItem('username', player1DisplayName);
    localStorage.setItem('paddleColor', player1PaddleColor);
    localStorage.setItem('paddleTColor', player1PaddleTColor);
    localStorage.setItem('coins', coins);
    
    localStorage.setItem('currentPaddlePattern', currentPaddlePattern);
    localStorage.setItem('currentBallPattern', currentBallPattern);
    localStorage.setItem('currentPaddleTrail', currentPaddleTrail);

    localStorage.setItem('ownedPaddlePatterns', JSON.stringify(ownedPaddlePatterns));
    localStorage.setItem('ownedBallPatterns', JSON.stringify(ownedBallPatterns));
    localStorage.setItem('ownedPaddleTrails', JSON.stringify(ownedPaddleTrails));
}

function loadGameState() {
    const savedName = localStorage.getItem('username');
    const savedColor = localStorage.getItem('paddleColor');
    const savedTColor = localStorage.getItem('paddleTColor');
    const savedCoins = localStorage.getItem('coins');
    
    const savedCurrentPP = localStorage.getItem('currentPaddlePattern');
    const savedCurrentBP = localStorage.getItem('currentBallPattern');
    const savedCurrentPT = localStorage.getItem('currentPaddleTrail');

    const savedOwnedPP = localStorage.getItem('ownedPaddlePatterns');
    const savedOwnedBP = localStorage.getItem('ownedBallPatterns');
    const savedOwnedPT = localStorage.getItem('ownedPaddleTrails');

    if (savedName) {
        player1DisplayName = savedName;
        player1.name = savedName;
        document.getElementById('usernameInput').value = savedName;
    }
    if (savedColor) {
        player1PaddleColor = savedColor;
        document.getElementById('paddleColorInput').value = savedColor;
    }
    if (savedTColor) {
        player1PaddleTColor = savedTColor;
        document.getElementById('paddleTColorInput').value = savedTColor;
    }
    if (savedCoins !== null) coins = parseInt(savedCoins);
    
    if (savedCurrentPP) currentPaddlePattern = savedCurrentPP;
    if (savedCurrentBP) currentBallPattern = savedCurrentBP;
    if (savedCurrentPT) currentPaddleTrail = savedCurrentPT;
    
    if (savedOwnedPP) {
        ownedPaddlePatterns = JSON.parse(savedOwnedPP);
    }
    if (!ownedPaddlePatterns.includes('none')) ownedPaddlePatterns.unshift('none');

    if (savedOwnedBP) {
        ownedBallPatterns = JSON.parse(savedOwnedBP);
    }
    if (!ownedBallPatterns.includes('default')) ownedBallPatterns.unshift('default');

    if (savedOwnedPT) {
        ownedPaddleTrails = JSON.parse(savedOwnedPT);
    }
    if (!ownedPaddleTrails.includes('none')) ownedPaddleTrails.unshift('none');

    // Apply loaded settings
    player1.color = player1PaddleColor;
    player1.paddleTC = savedTColor;
    player1.name = player1DisplayName;
}

function saveCustomisation() {
    const newName = document.getElementById('usernameInput').value || "Player 1";
    const newColor = document.getElementById('paddleColorInput').value || "#FFFFFF";
    const newTColor = document.getElementById('paddleTColorInput').value || "#FFFFFF";

    player1DisplayName = newName;
    player1.name = newName; 
    player1PaddleColor = newColor;
    player1.color = newColor;
    player1PaddleTColor = newTColor;
    player1.paddleTC = newTColor;
    
    saveGameState();
    showMessage("Customisation Saved!", 1500);
}

// --- Information Panel/Shop Logic (Unchanged) ---

function showInfoShopMenu() {
    showMenu(infoShopMenuDiv);
    updateInfoPanel();
}

function updateInfoPanel() {
    infoUsername.textContent = player1DisplayName;
    infoCoins.textContent = coins;

    infoPaddlePatternsList.innerHTML = '';
    buildShopList(infoPaddlePatternsList, ownedPaddlePatterns, 'paddlePattern', currentPaddlePattern);

    infoBallPatternsList.innerHTML = '';
    buildShopList(infoBallPatternsList, ownedBallPatterns, 'ballPattern', currentBallPattern);
    
    infoPaddleTrailsList.innerHTML = '';
    buildShopList(infoPaddleTrailsList, ownedPaddleTrails, 'paddleTrail', currentPaddleTrail);
}

function buildShopList(ulElement, ownedItems, type, currentItem) {
    let allItems = [];
    
    if (type === 'paddlePattern') {
        allItems = ['none', 'stripes_pat', 'dots_pat', 'chevrons'];
    } else if (type === 'ballPattern') {
        allItems = ['default', 'dot_pat', 'grid_pattern', 'ring_pattern'];
    } else if (type === 'paddleTrail') {
        allItems = ['none', 'basic_trail', 'fire_trail', 'wavy_trail'];
    }
    
    allItems.forEach(itemKey => {
        const li = document.createElement('li');
        const displayName = ITEM_DISPLAY_NAMES[itemKey] || itemKey;
        const isOwned = ownedItems.includes(itemKey);
        const isEquipped = itemKey === currentItem;
        
        const isTrueDefault = (itemKey === 'none' || itemKey === 'default');

        if (isOwned || isTrueDefault) {
            li.textContent = `${displayName} ${isEquipped ? ' (EQUIPPED)' : ''}`;
            
            const equipBtn = document.createElement('button');
            equipBtn.textContent = isEquipped ? '✓' : 'Equip';
            equipBtn.disabled = isEquipped;
            equipBtn.onclick = () => equipItem(itemKey, type);
            li.appendChild(equipBtn);

        } else {
            const price = ITEM_PRICES[itemKey];
            li.textContent = `${displayName} - ${price} Coins`;
            
            const buyBtn = document.createElement('button');
            buyBtn.textContent = 'Buy';
            buyBtn.disabled = coins < price;
            buyBtn.onclick = () => buyItem(itemKey, type, price);
            li.appendChild(buyBtn);
        }
        ulElement.appendChild(li);
    });
}

function equipItem(itemKey, type) {
    if (type === 'paddlePattern') {
        currentPaddlePattern = itemKey;
    } else if (type === 'ballPattern') {
        currentBallPattern = itemKey;
    } else if (type === 'paddleTrail') {
        currentPaddleTrail = itemKey;
    }
    saveGameState();
    updateInfoPanel();
    showMessage(`${ITEM_DISPLAY_NAMES[itemKey]} equipped!`, 1500);
}

function buyItem(itemKey, type, price) {
    if (coins >= price) {
        coins -= price;
        
        let ownedList;
        let currentItem;

        if (type === 'paddlePattern') {
            ownedList = ownedPaddlePatterns;
            currentItem = 'currentPaddlePattern';
        } else if (type === 'ballPattern') {
            ownedList = ownedBallPatterns;
            currentItem = 'currentBallPattern';
        } else if (type === 'paddleTrail') {
            ownedList = ownedPaddleTrails;
            currentItem = 'currentPaddleTrail';
        }

        ownedList.push(itemKey);
        // Note: Using eval here is generally discouraged but kept for consistency with original structure
        eval(`${currentItem} = '${itemKey}'`); 
        
        saveGameState();
        updateInfoPanel();
        showMessage(`Purchased ${ITEM_DISPLAY_NAMES[itemKey]}!`, 2000);
    } else {
        showMessage("Not enough coins!", 1500);
    }
}


// --- Game Flow Functions (Unchanged) ---

function showMessage(text, duration = 3000) {
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    if (duration > 0) {
        setTimeout(() => {
            if (!gameIsOver && !isPaused) { 
                 messageDiv.style.display = 'none';
            }
        }, duration);
    }
}

function showMenu(menuDiv) {
    btnsDiv.style.display = 'none';
    difficultyBtnsDiv.style.display = 'none';
    customiseMenuDiv.style.display = 'none';
    tournamentMenuDiv.style.display = 'none';
    infoShopMenuDiv.style.display = 'none'; 
    messageDiv.style.display = 'none';
    canvas.style.display = 'none'; 
    backBtn.style.display = 'none';
    pauseBtn.style.display = 'none';
    isPaused = false; 

    if (menuDiv) {
        menuDiv.style.display = 'flex';
    } else {
        btnsDiv.style.display = 'flex'; 
    }
}

function resetGameVariables() {
    player1.score = 0;
    player2.score = 0;
    player1.dy = 0;
    player2.dy = 0;
    
    player1.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    player2.y = canvas.height / 2 - PADDLE_HEIGHT / 2;

    resetBall(); 
    paddleTrail = []; 
    gameIsOver = false;
    start = false; 
    gameMode = null;
    difficulty = null;
    currentMatchIndex = -1;
    tournamentMatches = [];
    tournamentPlayers = [];
    isPaused = false; 
    
    player1.color = player1PaddleColor; 
    player1.name = player1DisplayName; 
    player2.color = 'white';
    player2.name = 'Player 2/AI';
}

function startGame(mode, selectedDifficulty = null) {
    resetGameVariables(); 

    gameMode = mode;
    difficulty = selectedDifficulty;

    if (mode === '1player') {
        player2.name = `AI (${difficulty.toUpperCase()})`;
        player2.color = 'red';
    } else if (mode === '2player') {
        player2.name = 'Player 2';
        player2.color = 'blue';
    } else if (mode === 'tutorial') {
        player2.name = 'AI Tutor';
        player2.color = 'green';
    }

    btnsDiv.style.display = 'none'; 
    difficultyBtnsDiv.style.display = 'none';
    customiseMenuDiv.style.display = 'none';
    tournamentMenuDiv.style.display = 'none';
    infoShopMenuDiv.style.display = 'none';
    messageDiv.style.display = 'none'; 
    
    canvas.style.display = 'block'; 
    
    backBtn.style.display = 'block';
    pauseBtn.style.display = 'block';
    
    start = true;
    resetBall();
}

function handleBackToMenu() {
    start = false;
    gameIsOver = true;
    isPaused = false;
    
    if (gameMode === 'tournament') {
        showMessage("Tournament terminated.", 2000);
    } else {
        showMessage("Match terminated.", 2000);
    }

    setTimeout(() => {
        showMenu(null); 
        resetGameVariables();
    }, 2000);
}

function togglePause() {
    if (!start || gameIsOver) return;

    isPaused = !isPaused;
    
    if (isPaused) {
        pauseBtn.textContent = '▶️ (p)';
        showMessage("PAUSED", 0); 
    } else {
        pauseBtn.textContent = '⏸️ (p)';
        messageDiv.style.display = 'none'; 
    }
}


// --- Tournament Logic (Unchanged) ---

function setupTournament(numPlayers) {
    tournamentPlayers = [player1DisplayName]; 
    for (let i = 1; i < numPlayers; i++) {
        tournamentPlayers.push(`AI ${i + 1}`);
    }
    
    tournamentMatches = [];
    for (let i = 0; i < numPlayers / 2; i++) {
        const isFinal = numPlayers === 2;
        tournamentMatches.push({
            p1Index: i * 2,
            p2Index: i * 2 + 1,
            winnerIndex: -1,
            isFinal: isFinal 
        });
    }

    currentMatchIndex = 0;
    
    startTournamentMatch(currentMatchIndex); 
}

function startTournamentMatch(matchIndex) {
    if (matchIndex >= tournamentMatches.length) {
        endTournament(); 
        return;
    }

    currentMatchIndex = matchIndex;
    const match = tournamentMatches[currentMatchIndex];
    const p1Name = tournamentPlayers[match.p1Index];
    const p2Name = tournamentPlayers[match.p2Index];

    const p1IsUser = (p1Name === player1DisplayName);
    const p2IsUser = (p2Name === player1DisplayName);
    
    difficulty = match.isFinal ? 'hard' : 'medium'; 
    
    if (!p1IsUser && !p2IsUser) {
        showMessage(`Simulating Match ${matchIndex + 1}: ${p1Name} vs ${p2Name}...`, 2000); 
        backBtn.style.display = 'none';
        pauseBtn.style.display = 'none';

        setTimeout(() => {
            const winnerIndex = Math.random() < 0.5 ? match.p1Index : match.p2Index;
            const winnerName = tournamentPlayers[winnerIndex];
            match.winnerIndex = winnerIndex;
            showMessage(`${winnerName} wins Match ${matchIndex + 1} by simulation!`, 2000);
            setTimeout(() => {
                advanceTournament(); 
            }, 2500);
        }, 2000); 

        return; 
    }
    
    player1.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    player2.y = canvas.height / 2 - PADDLE_HEIGHT / 2;
    player1.score = 0;
    player2.score = 0;

    player1.color = player1PaddleColor;
    player1.name = player1DisplayName;
    player2.color = 'red'; 
    player2.name = p2Name;

    showMessage(`Match ${matchIndex + 1} (${difficulty.toUpperCase()}): ${p1Name} vs ${p2Name}! First to ${winningScore}.`, 3000);
    
    gameMode = 'tournament';
    
    btnsDiv.style.display = 'none'; 
    difficultyBtnsDiv.style.display = 'none';
    customiseMenuDiv.style.display = 'none';
    tournamentMenuDiv.style.display = 'none';
    infoShopMenuDiv.style.display = 'none';
    messageDiv.style.display = 'none'; 

    canvas.style.display = 'block';
    
    backBtn.style.display = 'block';
    pauseBtn.style.display = 'block';

    gameIsOver = false;
    start = true;
    resetBall();
}

function resolveTournamentMatch(winningPaddle) {
    const match = tournamentMatches[currentMatchIndex];
    let winnerName;
    let winnerIndex;
    let reward = 0;

    if (winningPaddle === player1) {
        winnerIndex = match.p1Index;
        winnerName = player1.name;
        
        if (match.isFinal) {
            reward = 50; 
        } else {
            reward = 10; 
        }
        coins += reward;
        saveGameState();

    } else {
        winnerIndex = match.p2Index;
        winnerName = player2.name;
        reward = 5; 
        coins += reward;
        saveGameState();
    }

    match.winnerIndex = winnerIndex;
    
    start = false;
    gameIsOver = true;
    showMessage(`${winnerName} wins Match ${currentMatchIndex + 1}! (+${reward} Coins)`);

    backBtn.style.display = 'none';
    pauseBtn.style.display = 'none';

    setTimeout(() => {
        advanceTournament(); 
    }, 3500);
}

function advanceTournament() {
    const match = tournamentMatches[currentMatchIndex];

    if (match.isFinal || tournamentMatches.length === 1) {
        endTournament(tournamentPlayers[match.winnerIndex]);
        return;
    }

    if (currentMatchIndex < tournamentMatches.length - 1) {
        currentMatchIndex++;
        startTournamentMatch(currentMatchIndex); 
    } else {
        const winners = tournamentMatches.map(m => m.winnerIndex);
        const numWinners = winners.length;

        if (numWinners === 1) {
            endTournament(tournamentPlayers[winners[0]]);
            return;
        }

        const nextRoundMatches = [];
        for (let i = 0; i < numWinners / 2; i++) {
            const isFinal = numWinners === 2;
            nextRoundMatches.push({
                p1Index: winners[i * 2],
                p2Index: winners[i * 2 + 1],
                winnerIndex: -1,
                isFinal: isFinal 
            });
        }

        tournamentMatches = nextRoundMatches;
        currentMatchIndex = 0;
        showMessage(`Starting Next Round! ${numWinners / 2} Matches remaining.`, 3000);
        setTimeout(() => {
            startTournamentMatch(currentMatchIndex);
        }, 3500);
    }
}


function endTournament(winnerName = null) {
    c.clearRect(0, 0, canvas.width, canvas.height);
    
    if (winnerName) {
        showMessage(`${winnerName} is the Tournament Champion! 🏆 (Saved ${coins} Coins Total)`, 5000);
    } else {
        showMessage("Tournament Ended.", 3000);
    }
    
    backBtn.style.display = 'none';
    pauseBtn.style.display = 'none';

    setTimeout(() => {
        showMenu(null); 
        resetGameVariables();
    }, 5000); 
}

// --- Game Logic functions (Update/Draw) (Unchanged) ---

function checkWin() {
    if (player1.score >= winningScore || player2.score >= winningScore) {
        backBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
    }
    
    if (player1.score >= winningScore) {
        if (gameMode === 'tournament') {
            resolveTournamentMatch(player1);
        } else {
            endGame(`${player1DisplayName} Wins!`);
        }
    } else if (player2.score >= winningScore) {
        if (gameMode === 'tournament') {
            resolveTournamentMatch(player2);
        } else if (gameMode === '1player') {
            endGame("AI Wins!");
        } else {
            endGame("Player 2 Wins!");
        }
    }
}

function endGame(message) {
    start = false;
    gameIsOver = true;
    isPaused = false; 
    showMessage(message);
    
    backBtn.style.display = 'none';
    pauseBtn.style.display = 'none';

    setTimeout(() => {
        c.clearRect(0, 0, canvas.width, canvas.height);
        showMenu(null); 
        resetGameVariables();
    }, 3000);
}

function update() {
    if (!start || isPaused) return; 

    if (currentPaddleTrail !== 'none') {
        paddleTrail.push({ 
            x: player1.x + PADDLE_WIDTH / 2, 
            y: player1.y + PADDLE_HEIGHT / 2 
        });
        if (paddleTrail.length > 40) { // <-- CHANGED TO 40
            paddleTrail.shift();
        }
    }

    ball.x += ball.speedX;
    ball.y += ball.speedY;

    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.speedY *= -1;
    }

    let aiSpeed = AI_SPEEDS[difficulty] || AI_SPEEDS['medium'];
    
    const p1IsUser = (player1.name === player1DisplayName && gameMode !== 'tutorial'); 
    const p2IsUser = (gameMode === '2player');
    
    if (p1IsUser) {
        player1.y += player1.dy;
    } else {
        if (gameMode === 'tutorial') {
             const p1Center = player1.y + PADDLE_HEIGHT / 2;
             if (ball.y < p1Center - 10) { player1.y -= aiSpeed; } 
             else if (ball.y > p1Center + 10) { player1.y += aiSpeed; }
        }
    }

    if (p2IsUser) {
        player2.y += player2.dy;
    } else if (gameMode === 'tutorial') {
        player2.y = ball.y - PADDLE_HEIGHT / 2;
    } else {
        const p2Center = player2.y + PADDLE_HEIGHT / 2;
        if (ball.y < p2Center - 10) { player2.y -= aiSpeed; } 
        else if (ball.y > p2Center + 10) { player2.y += aiSpeed; }
    }

    player1.y = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, player1.y));
    player2.y = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, player2.y));

    if (ball.x - ball.radius < player1.x + player1.width && ball.y > player1.y && ball.y < player1.y + player1.height) {
        let collidePoint = ball.y - (player1.y + player1.height / 2);
        collidePoint /= (player1.height / 2);
        let angle = collidePoint * Math.PI / 3;
        let currentSpeed = Math.sqrt(ball.speedX**2 + ball.speedY**2);
        ball.speedX = Math.abs(currentSpeed) * Math.cos(angle); 
        ball.speedY = currentSpeed * Math.sin(angle); 
        
        ball.owner = 'player1';

        if (player1.isStriking) {
            ball.speedX *= 1.15;
            ball.speedY *= 1.15;
            player1.isStriking = false;
        }
    }

    if (ball.x + ball.radius > player2.x && ball.y > player2.y && ball.y < player2.y + player2.height) {
        let collidePoint = ball.y - (player2.y + player2.height / 2);
        collidePoint /= (player2.height / 2);
        let angle = collidePoint * Math.PI / 3;
        let currentSpeed = Math.sqrt(ball.speedX**2 + ball.speedY**2);
        ball.speedX = -Math.abs(currentSpeed) * Math.cos(angle); 
        ball.speedY = currentSpeed * Math.sin(angle); 
        
        ball.owner = 'default';
        
        if (player2.isStriking) {
            ball.speedX *= 1.15;
            ball.speedY *= 1.15;
            player2.isStriking = false;
        }
    }

    if (ball.x - ball.radius < 0) {
        player2.score++;
        checkWin(); 
        if (!gameIsOver) {
            start = false; 
            showMessage("Player 2/AI scores!", 1000); 
            setTimeout(() => {
                resetBall(); 
            }, 1500); 
        }
    } else if (ball.x + ball.radius > canvas.width) {
        player1.score++;
        checkWin();
        if (!gameIsOver) {
            start = false; 
            showMessage("Player 1 scores!", 1000); 
            setTimeout(() => {
                resetBall(); 
            }, 1500); 
        }
    }
}

function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#000';
    c.fillRect(0, 0, canvas.width, canvas.height);
    
    if (canvas.style.display === 'block') {
        drawNet();
        drawScore();
        
        drawPaddleTrail(player1.paddleTC);
        
        drawPaddle(player1.x, player1.y, player1.width, player1.height, player1.color, player1.name, currentPaddlePattern);
        drawPaddle(player2.x, player2.y, player2.width, player2.height, player2.color, player2.name, 'none'); 

        const ballColor = ball.owner === 'player1' ? player1PaddleColor : 'white';
        const ballPattern = ball.owner === 'player1' ? currentBallPattern : 'default';

        drawBall(ball.x, ball.y, ball.radius, ballColor, ballPattern);
    }
}

function gameLoop() {
    if (start && !gameIsOver && !isPaused) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}


// --- Event Listeners (Keybindings are here) ---

document.addEventListener('keydown', e => {
    if (!start || gameIsOver) return;

    // Universal Pause (P) and Back-to-Menu (Escape) Keybinds
    if (e.key === 'p' || e.key === 'P') { 
        togglePause();
        // Crucial: Attempt to resume playback if paused and music was blocked
        if (!isPaused && musicPlayer) {
             musicPlayer.play().catch(error => {
                // Ignore silent failure, means it's playing or still blocked
            });
        }
        return; 
    }
    
    if (e.key === 'Escape') { 
        handleBackToMenu();
        return;
    }
    // ------------------------------------------
    
    if (isPaused) return; // Ignore movement if paused

    const isP1User = (player1.name === player1DisplayName && gameMode !== 'tutorial');

    switch (e.key) {
        case 'w':
            if (isP1User) { player1.dy = -3.3; }
            break;
        case 's':
            if (isP1User) { player1.dy = 3.3; }
            break;
        case 'e': 
            if (isP1User && Math.abs(ball.x - (player1.x + player1.width)) < 50) { player1.isStriking = true; } 
            break;
        case 'ArrowUp':
            if (gameMode === '2player') { player2.dy = -3.3; }
            break;
        case 'ArrowDown':
            if (gameMode === '2player') { player2.dy = 3.3; }
            break;
        case '/':
            if (gameMode === '2player' && Math.abs(ball.x - player2.x) < 50) { player2.isStriking = true; } 
            break;
    }
});

document.addEventListener('keyup', e => {
    if (!start || gameIsOver || isPaused) return; 

    const isP1User = (player1.name === player1DisplayName && gameMode !== 'tutorial');

    switch (e.key) {
        case 'w':
        case 's':
            if (isP1User) { player1.dy = 0; }
            break;
        case 'ArrowUp':
        case 'ArrowDown':
            if (gameMode === '2player') { player2.dy = 0; }
            break;
    }
});


// --- Menu Button Listeners (Modified to force play on interaction) ---
const menuButtons = [
    onePlayerBtn, twoPlayerBtn, tournamentBtn, customiseBtn, tutorialBtn,
    easyBtn, mediumBtn, hardBtn, backFromDifficultyBtn, 
    saveCustomisationBtn, backFromCustomiseBtn, 
    startTournament4Btn, startTournament8Btn, backFromTournamentBtn,
    infoBackBtn
];

menuButtons.forEach(button => {
    button.addEventListener('click', () => {
        if(musicPlayer && musicPlayer.paused) {
            musicPlayer.play().catch(error => {
                // Ignore silent failure
            });
        }
    });
});

onePlayerBtn.addEventListener('click', () => showMenu(difficultyBtnsDiv));
twoPlayerBtn.addEventListener('click', () => startGame('2player'));
tournamentBtn.addEventListener('click', () => showMenu(tournamentMenuDiv));
customiseBtn.addEventListener('click', () => {
    loadGameState(); 
    showMenu(customiseMenuDiv);
});
tutorialBtn.addEventListener('click', showInfoShopMenu);

easyBtn.addEventListener('click', () => startGame('1player', 'easy'));
mediumBtn.addEventListener('click', () => startGame('1player', 'medium'));
hardBtn.addEventListener('click', () => startGame('1player', 'hard'));
backFromDifficultyBtn.addEventListener('click', () => showMenu(null));

saveCustomisationBtn.addEventListener('click', () => {
    saveCustomisation();
    showMenu(null);
});
backFromCustomiseBtn.addEventListener('click', () => showMenu(null));

startTournament4Btn.addEventListener('click', () => {
    btnsDiv.style.display = 'none'; 
    tournamentMenuDiv.style.display = 'none';
    setupTournament(4);
});
startTournament8Btn.addEventListener('click', () => {
    btnsDiv.style.display = 'none'; 
    tournamentMenuDiv.style.display = 'none';
    setupTournament(8);
});
backFromTournamentBtn.addEventListener('click', () => showMenu(null));

infoBackBtn.addEventListener('click', () => showMenu(null));

backBtn.addEventListener('click', handleBackToMenu);
pauseBtn.addEventListener('click', togglePause);


// Start the game loop
loadGameState();
setupMusicPlayer(); 
showMenu(null);
gameLoop();