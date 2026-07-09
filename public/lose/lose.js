// =========================================================================
// HIER KANNST DU DIE WAHRSCHEINLICHKEITEN GANZ EINFACH ÄNDERN!
// Trage einfach die Prozentwerte ein, die du haben möchtest.
// Die Summe aller Werte bestimmt die Gesamt-Gewinnchance. Der Rest ist Niete.
// =========================================================================
const GEWINN_CHANCEN = {
0.25: 10, // 10% Chance auf 0.25x Gewinn
0.5: 25, // 25% Chance auf 0.5x Gewinn
1: 15, // 15% Chance auf 1x Gewinn
1.5: 10, // 10% Chance auf 1.5x Gewinn
2: 8, // 8% Chance auf 2x Gewinn
3: 5, // 5% Chance auf 3x Gewinn
5: 3, // 3% Chance auf 5x Gewinn
10: 2 // 2% Chance auf 10x Gewinn
};
// Gesamt-Gewinnchance hierbei: 10+25+15+10+8+5+3+2 = 78%. Die restlichen 22% sind Nieten!
// =========================================================================

let isMuted = false;
let balance = 0;
let currentTicket = [];
let gameActive = false;
let currentBet = 100;
let isMouseDown = false;
let clearedCells = Array(9).fill(false);

// socket wird initialisiert und sobald er server update balance schick, wird das gemacht.
const socket = io(`http://${IP}:3000`, {
    withCredentials: true,
    transports: ["websocket"]
});

socket.on("updateBalance", (newBalance) => {
    balance = newBalance;
    updateBalanceDisplay();
});

// Holt die Multiplikatoren dynamisch aus deiner Konfiguration
const pool = Object.keys(GEWINN_CHANCEN).map(Number).sort((a,b) => a-b);

window.addEventListener("mousedown", () => { isMouseDown = true; });
window.addEventListener("mouseup", () => { isMouseDown = false; });
window.addEventListener("touchstart", () => { isMouseDown = true; });
window.addEventListener("touchend", () => { isMouseDown = false; });

function updateBalanceDisplay() {
document.getElementById("balance").innerText =
`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function toggleMute() {
isMuted = !isMuted;
document.getElementById("mute-btn").innerText = isMuted ? "🔇 MUTED" : "🔊 SOUND ON";
}

function playTone(freq, type, duration, vol) {
if (isMuted) return;
try {
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = type;
osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
gain.gain.setValueAtTime(vol, audioCtx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
osc.connect(gain);
gain.connect(audioCtx.destination);
osc.start();
osc.stop(audioCtx.currentTime + duration);
} catch (e) {}
}

const sounds = {
scratch: () => playTone(120 + Math.random() * 60, "triangle", 0.03, 0.02),
win: () => {
playTone(523.25, "sine", 0.15, 0.08);
setTimeout(() => playTone(659.25, "sine", 0.15, 0.08), 100);
setTimeout(() => playTone(783.99, "sine", 0.3, 0.08), 200);
},
lose: () => {
playTone(220, "sawtooth", 0.2, 0.04);
setTimeout(() => playTone(180, "sawtooth", 0.3, 0.04), 150);
}
};

// Baut die Gewinnübersichtstabelle rechts automatisch auf Basis deiner Einstellungen auf
function renderPaytable() {
const oddsList = document.getElementById("odds-list");
oddsList.innerHTML = "";

let gesamtGewinnChance = 0;

// Zeige die Gewinn-Multiplikatoren an (von hoch nach tief sortiert)
[...pool].reverse().forEach(mult => {
const pct = GEWINN_CHANCEN[mult];
gesamtGewinnChance += pct;

const row = document.createElement("div");
row.className = "odds-row";
row.innerHTML = `<span class="odds-mult">${mult}x Gewinn</span><span class="odds-pct">${pct}%</span>`;
oddsList.appendChild(row);
});

// Berechne automatisch die verbleibende Nieten-Chance
const nietenChance = Math.max(0, 100 - gesamtGewinnChance);
const row = document.createElement("div");
row.className = "odds-row";
row.style.borderTop = "1px dashed #333";
row.innerHTML = `<span class="odds-mult" style="color:var(--text-dim)">Niete</span><span class="odds-pct" style="color:#ef4444">${nietenChance}%</span>`;
oddsList.appendChild(row);
}

function setBet(amt) {
if (gameActive) return;
document.getElementById("bet-input").value = amt;
}

function initBoardDecor() {
const board = document.getElementById("scratch-board");
board.innerHTML = "";
for (let i = 0; i < 9; i++) {
const cell = document.createElement("div");
cell.className = "scratch-cell";
cell.innerHTML = `<span class="value-text" style="color:#1e293b">FDC</span>`;
board.appendChild(cell);
}
}

function buyTicket() {
currentBet = parseFloat(document.getElementById("bet-input").value);
if (currentBet > balance || currentBet <= 0 || isNaN(currentBet)) {
alert("Ungültiger Einsatz oder zu wenig Guthaben!");
return;
}

socket.emit("updateBalance", (-currentBet));

gameActive = true;
clearedCells = Array(9).fill(false);
document.getElementById("buy-btn").disabled = true;
document.getElementById("bet-input").disabled = true;

generateTicketLogic();
renderSafeTicket();
}

function generateTicketLogic() {
currentTicket = [];

// Gewinner ermitteln basierend auf den Prozenten
const rand = Math.random() * 100;
let currentSum = 0;
let winningMultiplier = null;

for (const mult of pool) {
currentSum += GEWINN_CHANCEN[mult];
if (rand <= currentSum) {
winningMultiplier = mult;
break;
}
}

if (winningMultiplier !== null) {
// GEWINNLOS: Packe 3-mal das Gewinnsymbol drauf
for (let i = 0; i < 3; i++) currentTicket.push(winningMultiplier);

// Fülle den Rest so auf, dass kein anderes Triplet entsteht
while (currentTicket.length < 9) {
const randomMult = pool[Math.floor(Math.random() * pool.length)];
const count = currentTicket.filter(x => x === randomMult).length;
if (count < 2 && randomMult !== winningMultiplier) {
currentTicket.push(randomMult);
}
}
} else {
// NIETENLOS: Fülle das Feld komplett ohne 3er-Kombinationen
while (currentTicket.length < 9) {
const randomMult = pool[Math.floor(Math.random() * pool.length)];
const count = currentTicket.filter(x => x === randomMult).length;
if (count < 2) {
currentTicket.push(randomMult);
}
}
}

// Los kräftig mischen
currentTicket.sort(() => Math.random() - 0.5);
}

function renderSafeTicket() {
const board = document.getElementById("scratch-board");
board.innerHTML = "";

currentTicket.forEach((value, cellIdx) => {
const cell = document.createElement("div");
cell.className = "scratch-cell";
cell.id = `cell-${cellIdx}`;

const textSpan = document.createElement("span");
textSpan.className = "value-text";
textSpan.innerText = `${value}x`;

if (value >= 3) textSpan.style.color = "var(--primary-green)";
else if (value >= 1) textSpan.style.color = "#ffffff";
else textSpan.style.color = "#475569";

const coatLayer = document.createElement("div");
coatLayer.className = "coat-layer";

let scratchedPixelsInCell = 0;

for (let p = 0; p < 9; p++) {
const pixel = document.createElement("div");
pixel.className = "coat-pixel";

function handleScratch() {
if (!gameActive || pixel.classList.contains("scratched")) return;

pixel.classList.add("scratched");
if (Math.random() < 0.4) sounds.scratch();

scratchedPixelsInCell++;

if (scratchedPixelsInCell >= 5 && !clearedCells[cellIdx]) {
clearedCells[cellIdx] = true;
coatLayer.style.display = "none";

if (clearedCells.every(status => status === true)) {
evaluateGame();
}
}
}

pixel.addEventListener("mousedown", handleScratch);
pixel.addEventListener("mouseenter", () => { if (isMouseDown) handleScratch(); });
pixel.addEventListener("touchstart", handleScratch);
pixel.addEventListener("touchmove", (e) => { if (isMouseDown) handleScratch(); });

coatLayer.appendChild(pixel);
}

cell.appendChild(textSpan);
cell.appendChild(coatLayer);
board.appendChild(cell);
});
}

function evaluateGame() {
gameActive = false;
document.getElementById("buy-btn").disabled = false;
document.getElementById("bet-input").disabled = false;

let winningMultiplier = 0;

for (let i = 0; i < pool.length; i++) {
const m = pool[i];
const count = currentTicket.filter(x => x === m).length;
if (count >= 3) {
winningMultiplier = m;
break;
}
}

const winAmount = currentBet * winningMultiplier;

socket.emit("updateBalance", (winAmount));

if (winningMultiplier > 0) {
sounds.win();
currentTicket.forEach((val, idx) => {
if (val === winningMultiplier) {
document.getElementById(`cell-${idx}`).classList.add("winner");
}
});
} else {
sounds.lose();
}

const item = document.createElement("div");
item.className = "history-item";
const color = winningMultiplier >= 1.5 ? "#53fc18" : winningMultiplier === 1 ? "#fff" : "#475569";

if (winningMultiplier > 0) {
item.innerHTML = `<span>${winningMultiplier}x Gewinn</span><span style="color:${color}">+$${winAmount.toFixed(2)}</span>`;
} else {
item.innerHTML = `<span>Niete</span><span style="color:#ef4444">-$${currentBet.toFixed(2)}</span>`;
}

const history = document.getElementById("history");
history.prepend(item);
if (history.children.length > 10) history.removeChild(history.lastChild);
}

// Initialisierung beim Seitenstart
renderPaytable();
initBoardDecor();