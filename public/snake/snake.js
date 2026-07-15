// ================================================================
//  SNAKE & STAKE – Spiellogik
//
//  Wie die anderen FDC-Spiele: Balance läuft komplett über den
//  Socket.IO-Server. Wir speichern hier NICHTS lokal – wir warten
//  auf "updateBalance" vom Server und zeigen das an.
//
//  Einsatz ist jetzt variabel (Bet-Input + Quick-Bets), genau wie
//  bei Chicken Game / Ice Field, statt dem alten fixen $10.
// ================================================================

const canvas         = document.getElementById("gameCanvas");
const ctx             = canvas.getContext("2d");
const multDisplay     = document.getElementById("multiplier");
const payoutDisplay   = document.getElementById("payout");
const startBtn        = document.getElementById("startBtn");
const betInput        = document.getElementById("bet-input");
const balanceDisplay  = document.getElementById("balance");

const tileCount = 10; // 10x10 Grid
const gridSize  = canvas.width / tileCount;

let snake, food, exitNode, dx, dy, multiplier, gameLoop;
let gameSpeed  = 300;
let inputQueue = []; // Command-Queue für Eingaben (verhindert "verschluckte" Tastendrücke)

// ── Geschwindigkeits-Konfiguration ───────────────────────────────
const START_SPEED       = 300;
const BREAK_EVEN_SPEED  = 130;
const FRUITS_TO_BREAK_EVEN = 16;
const SPEED_STEP = (START_SPEED - BREAK_EVEN_SPEED) / FRUITS_TO_BREAK_EVEN;

// ── Spiel-/Wett-Zustand ───────────────────────────────────────────
let balance    = 0;      // Kommt ausschließlich vom Server (socket)
let currentBet = 100;    // Aktuell gesetzter Einsatz für die laufende Runde
let isMuted    = false;
let gameActive = false;  // Läuft gerade eine Runde? (verhindert Doppel-Start etc.)

// ================================================================
//  SOCKET.IO – Balance-Synchronisation mit dem Server
//  (Gleiches Muster wie bei Chicken Game / Ice Field)
// ================================================================
const socket = io(`http://${IP}:3000`, {
    withCredentials: true,
    transports: ["websocket"]
});

// Server schickt uns den neuen Kontostand → einfach übernehmen & anzeigen
socket.on("updateBalance", (newBalance) => {
    balance = newBalance;
    updateBalanceDisplay();
});

function updateBalanceDisplay() {
    balanceDisplay.innerText =
        `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

// ── Schnell-Einsatz Buttons ($10 / $50 / $100) ───────────────────
function setBet(amt) {
    if (gameActive) return; // Während laufender Runde nicht änderbar
    betInput.value = amt;
}

// ── Sound-Engine (gleicher Aufbau wie in den anderen Spielen) ────
function toggleMute() {
    isMuted = !isMuted;
    document.getElementById("mute-btn").innerText = isMuted ? "🔇 MUTED" : "🔊 SOUND ON";
}

function tone(freq, type, dur, vol) {
    if (isMuted) return;
    try {
        const a = new (window.AudioContext || window.webkitAudioContext)();
        const o = a.createOscillator(), g = a.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, a.currentTime);
        g.gain.setValueAtTime(vol, a.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
        o.connect(g); g.connect(a.destination);
        o.start(); o.stop(a.currentTime + dur);
    } catch (e) {}
}

const sounds = {
    eat:  () => tone(700, "sine", 0.08, 0.05),
    win:  () => { tone(523, "sine", 0.15, 0.08); setTimeout(() => tone(659, "sine", 0.15, 0.08), 100); setTimeout(() => tone(784, "sine", 0.3, 0.08), 200); },
    lose: () => { tone(200, "sawtooth", 0.35, 0.06); setTimeout(() => tone(120, "sawtooth", 0.3, 0.05), 150); }
};

// ================================================================
//  SPIELSTART
// ================================================================
function initGame() {
    // Einsatz validieren – genau wie bei den anderen Spielen
    currentBet = parseFloat(betInput.value);
    if (!currentBet || currentBet <= 0 || currentBet > balance) {
        alert("Ungültiger Einsatz!");
        return;
    }

    // Einsatz sofort abziehen (negativer Betrag an den Server senden)
    socket.emit("updateBalance", (-currentBet));

    // Spielfeld zurücksetzen
    snake      = [{ x: 5, y: 5 }]; // Start in der Mitte des 10x10 Grids
    dx = 0; dy = 0;
    inputQueue = [];
    multiplier = 0.2; // Start-Multiplikator (unter 1.0x, muss "erarbeitet" werden)
    gameSpeed  = START_SPEED;

    spawnFood();
    spawnExit();
    updateUI();

    // UI sperren solange die Runde läuft
    gameActive = true;
    startBtn.disabled = true;
    betInput.disabled = true;

    if (gameLoop) clearTimeout(gameLoop);
    runGame();
}

function runGame() {
    gameLoop = setTimeout(() => {
        processInput(); // Nächste Eingabe aus der Queue ausführen
        moveSnake();

        if (!checkGameOver()) {
            draw();
            runGame();
        }
    }, gameSpeed);
}

function processInput() {
    if (inputQueue.length === 0) return;

    const nextMove = inputQueue.shift();

    // Sicherheitscheck: 180°-Wende verhindern (sonst beißt sich Schlange selbst)
    if (nextMove.x !== -dx || nextMove.y !== -dy) {
        dx = nextMove.x;
        dy = nextMove.y;
    } else if (inputQueue.length > 0) {
        processInput(); // Nächsten Move in der Queue probieren
    }
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    // Nicht auf der Schlange spawnen
    if (snake.some(part => part.x === food.x && part.y === food.y)) spawnFood();
}

function spawnExit() {
    // Exit erscheint zufällig an einer der 4 Kanten
    const side = Math.floor(Math.random() * 4);
    const pos  = Math.floor(Math.random() * tileCount);
    if      (side === 0) exitNode = { x: pos, y: 0 };
    else if (side === 1) exitNode = { x: tileCount - 1, y: pos };
    else if (side === 2) exitNode = { x: pos, y: tileCount - 1 };
    else                 exitNode = { x: 0, y: pos };
}

function draw() {
    ctx.fillStyle = "#020202";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Food (Neon-Rot)
    ctx.fillStyle = "#f87171";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#f87171";
    ctx.beginPath();
    ctx.arc((food.x + 0.5) * gridSize, (food.y + 0.5) * gridSize, gridSize / 3, 0, Math.PI * 2);
    ctx.fill();

    // Exit Node (Gold)
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 20;
    ctx.fillRect(exitNode.x * gridSize + 4, exitNode.y * gridSize + 4, gridSize - 8, gridSize - 8);

    // Snake (FDC-Grün, Kopf heller als Körper)
    ctx.shadowBlur = 0;
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#53fc18" : "#1a6e08";
        ctx.beginPath();
        ctx.roundRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2, 6);
        ctx.fill();
    });
}

function moveSnake() {
    if (dx === 0 && dy === 0) return; // Noch keine Richtung gewählt

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        // Essen gefressen → Multiplikator steigt, Geschwindigkeit steigt
        multiplier += 0.05;
        gameSpeed = Math.max(60, gameSpeed - SPEED_STEP);
        sounds.eat();
        spawnFood();
        spawnExit(); // Exit bewegt sich bei jedem Fressen neu (Risiko bleibt konstant)
        updateUI();

    } else if (head.x === exitNode.x && head.y === exitNode.y) {
        // Golden Exit erreicht → auszahlen!
        if (dx !== 0 || dy !== 0) {
            cashOut();
        }
    } else {
        // Normaler Zug: Schwanz entfernen (Schlange bleibt gleich lang)
        snake.pop();
    }
}

function checkGameOver() {
    const head = snake[0];
    if (dx === 0 && dy === 0) return false; // Spiel hat noch nicht begonnen

    // Wand-Kollision ODER Selbst-Kollision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount ||
        snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
        crash();
        return true;
    }
    return false;
}

// ── Auszahlung wenn der goldene Exit erreicht wird ───────────────
function cashOut() {
    const winAmount = currentBet * multiplier;

    // Gewinn an den Server melden – updateBalance addiert das serverseitig
    socket.emit("updateBalance", (winAmount));
    sounds.win();

    addHistory(true, winAmount);
    resetGame();
}

// ── Absturz: Einsatz ist bereits abgezogen, nur UI/Sound/Historie ─
function crash() {
    sounds.lose();
    addHistory(false, currentBet);
    resetGame();
}

// ── Verlaufs-Eintrag hinzufügen (gleiches Muster wie andere Spiele)
function addHistory(won, amount) {
    const h = document.getElementById("history");
    const item = document.createElement("div");
    item.className = "history-item";

    if (won) {
        const c = multiplier >= 1 ? "var(--primary-green)" : "#fff";
        item.innerHTML = `<span>${multiplier.toFixed(2)}x Cash Out</span><span style="color:${c}">+$${amount.toFixed(2)}</span>`;
    } else {
        item.innerHTML = `<span>💥 Crash</span><span style="color:var(--primary-red)">-$${amount.toFixed(2)}</span>`;
    }

    h.prepend(item);
    if (h.children.length > 8) h.removeChild(h.lastChild);
}

function updateUI() {
    multDisplay.innerText  = multiplier.toFixed(2);
    payoutDisplay.innerText = (currentBet * multiplier).toFixed(2);

    // Potential-Box leuchtet sobald man im Plus wäre
    const payoutBox = document.getElementById("payout-box");
    if (multiplier >= 1.0) {
        payoutBox.classList.add("profit-glow");
    } else {
        payoutBox.classList.remove("profit-glow");
    }
}

// ── Runde beenden (nach Sieg oder Niederlage) ────────────────────
function resetGame() {
    clearTimeout(gameLoop);
    gameActive = false;
    dx = 0; dy = 0;
    inputQueue = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // UI für nächste Runde freigeben
    startBtn.disabled = false;
    betInput.disabled = false;
    multDisplay.innerText   = "1.00";
    payoutDisplay.innerText = "0.00";
    document.getElementById("payout-box").classList.remove("profit-glow");
}

// ── Tastatur-Steuerung ────────────────────────────────────────────
window.addEventListener("keydown", e => {
    if (!gameActive) return;

    const lastInput = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : { x: dx, y: dy };

    // Zur Queue hinzufügen, aber keine doppelte Richtung in Folge
    if (e.key === "ArrowUp"    && lastInput.y !== 1  && lastInput.y !== -1) inputQueue.push({ x: 0, y: -1 });
    if (e.key === "ArrowDown"  && lastInput.y !== -1 && lastInput.y !== 1)  inputQueue.push({ x: 0, y: 1 });
    if (e.key === "ArrowLeft"  && lastInput.x !== 1  && lastInput.x !== -1) inputQueue.push({ x: -1, y: 0 });
    if (e.key === "ArrowRight" && lastInput.x !== -1 && lastInput.x !== 1)  inputQueue.push({ x: 1, y: 0 });
});

startBtn.addEventListener("click", initGame);

// ── Initialisierung beim Seitenstart ─────────────────────────────
updateBalanceDisplay();
