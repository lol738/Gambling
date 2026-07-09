const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const multDisplay = document.getElementById("multiplier");
const payoutDisplay = document.getElementById("payout");
const startBtn = document.getElementById("startBtn");

const tileCount = 10; // Updated to 10x10
const gridSize = canvas.width / tileCount;

let snake, food, exitNode, dx, dy, multiplier, gameLoop;
let gameSpeed = 300; 
let inputQueue = []; // The Command Queue for "un-eatable" inputs

// SPEED CONFIGURATION (Recalculated for 10x10)
const START_SPEED = 300;
const BREAK_EVEN_SPEED = 130;
const FRUITS_TO_BREAK_EVEN = 16; 
const SPEED_STEP = (START_SPEED - BREAK_EVEN_SPEED) / FRUITS_TO_BREAK_EVEN;

function initGame() {
    snake = [{ x: 5, y: 5 }]; // Start in middle of 10x10
    dx = 0; dy = 0;
    inputQueue = []; 
    multiplier = 0.2;
    gameSpeed = START_SPEED; 
    
    spawnFood();
    spawnExit();
    updateUI();
    
    if (gameLoop) clearTimeout(gameLoop);
    runGame();
}

function runGame() {
    gameLoop = setTimeout(() => {
        processInput(); // Execute the next move in the queue
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
    
    // Safety check: Prevent 180-degree turns
    if (nextMove.x !== -dx || nextMove.y !== -dy) {
        dx = nextMove.x;
        dy = nextMove.y;
    } else if (inputQueue.length > 0) {
        // If the first move in queue was a 180, try the next one immediately
        processInput();
    }
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    if (snake.some(part => part.x === food.x && part.y === food.y)) spawnFood();
}

function spawnExit() {
    const side = Math.floor(Math.random() * 4);
    const pos = Math.floor(Math.random() * tileCount);
    if (side === 0) exitNode = { x: pos, y: 0 };
    else if (side === 1) exitNode = { x: tileCount - 1, y: pos };
    else if (side === 2) exitNode = { x: pos, y: tileCount - 1 };
    else exitNode = { x: 0, y: pos };
}

function draw() {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Food (Neon Red)
    ctx.fillStyle = "#f87171";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#f87171";
    ctx.beginPath();
    ctx.arc((food.x + 0.5) * gridSize, (food.y + 0.5) * gridSize, gridSize / 3, 0, Math.PI * 2);
    ctx.fill();

    // Exit Node (Neon Gold)
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 20;
    ctx.fillRect(exitNode.x * gridSize + 4, exitNode.y * gridSize + 4, gridSize - 8, gridSize - 8);

    // Snake
    ctx.shadowBlur = 0;
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#4ade80" : "#166534";
        ctx.beginPath();
        ctx.roundRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2, 6);
        ctx.fill();
    });
}

function moveSnake() {
    if (dx === 0 && dy === 0) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        multiplier += 0.05;
        gameSpeed = Math.max(60, gameSpeed - SPEED_STEP); 
        spawnFood();
        spawnExit();
        updateUI();
    } else if (head.x === exitNode.x && head.y === exitNode.y) {
        if (dx !== 0 || dy !== 0) {
            alert(`CASHED OUT! You took $${(10 * multiplier).toFixed(2)}`);
            resetGame();
        }
    } else {
        snake.pop();
    }
}

function checkGameOver() {
    const head = snake[0];
    if (dx === 0 && dy === 0) return false;

    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || 
        snake.slice(1).some(p => p.x === head.x && p.y === head.y)) {
        alert("CRASHED! The house wins.");
        resetGame();
        return true;
    }
    return false;
}

function updateUI() {
    multDisplay.innerText = multiplier.toFixed(2);
    payoutDisplay.innerText = (10 * multiplier).toFixed(2);
    
    if (multiplier >= 1.0) {
        payoutDisplay.parentElement.classList.add("profit-glow");
    } else {
        payoutDisplay.parentElement.classList.remove("profit-glow");
    }
}

function resetGame() {
    clearTimeout(gameLoop);
    dx = 0; dy = 0;
    inputQueue = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("keydown", e => {
    const lastInput = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : { x: dx, y: dy };
    
    // Add moves to the queue, but prevent adding the same direction twice in a row
    if (e.key === "ArrowUp" && lastInput.y !== 1 && lastInput.y !== -1) inputQueue.push({ x: 0, y: -1 });
    if (e.key === "ArrowDown" && lastInput.y !== -1 && lastInput.y !== 1) inputQueue.push({ x: 0, y: 1 });
    if (e.key === "ArrowLeft" && lastInput.x !== 1 && lastInput.x !== -1) inputQueue.push({ x: -1, y: 0 });
    if (e.key === "ArrowRight" && lastInput.x !== -1 && lastInput.x !== 1) inputQueue.push({ x: 1, y: 0 });
});

startBtn.addEventListener("click", initGame);