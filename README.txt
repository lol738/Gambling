Um das alles uz nutzen braucht man node.js und die module, die alle in der serder.js datei am anfang aufgelistet sind. 
Zum instalieren der module macht man einfach npm install . zum ausführen von all dem node server.js 
im ordner Gambilng.

was noch fehltist dass eure spiele eingebunden werden, das ist recht simpel:
1. Macht euer spiel in einen Ordner mit dem namen eures spiels im ordner pubic. 
2. packt oben in den Head eurer HTML das folgende:

<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <script src="/IP.js"></script>

3. packt das am anfang in eure JS:

// socket wird initialisiert und sobald er server update balance schick, wird das gemacht.
const socket = io(`http://${IP}:3000`, {
    withCredentials: true,
    transports: ["websocket"]
});

socket.on("updateBalance", (newBalance) => {
    balance = newBalance;
    updateBalanceDisplay();
});

4. überall in eurer JS, wo ihr die balance verändert macht ihr statdessen das:

socket.emit("updateBalance", (Wert));

Wobei Wert durch den wert verändert wird, umden ihr sonst balance verändert hättet. (also negativ wenn abgezogen wird) Dann
müsst ihr auch die sonstige Operation an Balance löschen. (also wenn da z.B. balance -= wert steht, dann löscht ihr das, das 
wird schon bei socket.on("balanceUpdate") gemacht.

5. Damit alles ein einheitliches Design hat, macht bitte alle denselben header

<div id="fdc-bg-glow"></div>
<canvas id="fdc-particle-canvas"></canvas>
<header>
    <div>
        <div class="logo-mark" onclick="window.location.href='/main'">FD₵</div>
        <div class="logo-sub">Friedrich-Dessauer-Casino</div>
    </div>
    <button class="mute-toggle" onclick="toggleMute()" id="mute-btn">
        🔊 SOUND ON
    </button>
</header>

dafür müsst ihr auch die dateien fdc-theme.js und .css importieren

<link rel="stylesheet" href="/fdc-theme.css">

Und:

<script src="/fdc-theme.js"></script>

was geht yallah
STANNI???? STANNNIIIIIII????

