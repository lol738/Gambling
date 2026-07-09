let isMuted = false;
      let balance = 0;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // --- Collision Categories ---
      const COL_BALL = 0x0001;
      const COL_PIN = 0x0002;
      const COL_BUCKET = 0x0004;

// socket wird initialisiert und sobald er server update balance schick, wird das gemacht.
const socket = io(`http://${IP}:3000`, {
    withCredentials: true,
    transports: ["websocket"]
});

socket.on("updateBalance", (newBalance) => {
    balance = newBalance;
    updateBalanceDisplay();
    console.log("sadfasdf");
});

      const updateBalanceDisplay = () => {
        document.getElementById("balance").innerText =
          `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      };

      function toggleMute() {
        isMuted = !isMuted;
        document.getElementById("mute-btn").innerText = isMuted
          ? "🔇 MUTED"
          : "🔊 SOUND ON";
      }

      function playTone(freq, type, duration, vol) {
        if (isMuted) return;
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(vol, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioCtx.currentTime + duration,
          );
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        } catch (e) {}
      }

      const sounds = {
        node: () => playTone(500 + Math.random() * 200, "sine", 0.08, 0.03),
        win: () => {
          playTone(600, "sine", 0.2, 0.1);
          setTimeout(() => playTone(900, "sine", 0.3, 0.1), 80);
        },
        lose: () => playTone(180, "sine", 0.4, 0.05),
      };

      const config = {
        width: 600,
        height: 650,
        rows: 14,
        ballRadius: 7,
        multipliers: [6, 3, 1.5, 1, 0.5, 0.3, 0.2, 0.3, 0.5, 1, 1.5, 3, 6],
        gravity: 0.6,
        restitution: 0.6,
        friction: 0.1,
      };

      const { Engine, Render, Runner, Bodies, Composite, Events, Body } =
        Matter;
      const engine = Engine.create();
      engine.world.gravity.y = config.gravity;

      const render = Render.create({
        element: document.getElementById("plinko-board"),
        engine: engine,
        options: {
          width: config.width,
          height: config.height,
          wireframes: false,
          background: "transparent",
        },
      });

      const centerX = config.width / 2;
      const spacing = 38;

      for (let i = 0; i < config.rows; i++) {
        const rowPins = i + 3;
        const rowWidth = (rowPins - 1) * spacing;
        for (let j = 0; j < rowPins; j++) {
          const pin = Bodies.circle(
            centerX - rowWidth / 2 + j * spacing,
            60 + i * spacing,
            3.5,
            {
              isStatic: true,
              label: "pin",
              collisionFilter: { category: COL_PIN },
              render: { fillStyle: "#334155" },
            },
          );
          Composite.add(engine.world, pin);
        }
      }

      const bWidth = config.width / config.multipliers.length;
      config.multipliers.forEach((m, i) => {
        const bucket = Bodies.rectangle(
          i * bWidth + bWidth / 2,
          config.height - 25,
          bWidth - 6,
          40,
          {
            isStatic: true,
            isSensor: true,
            label: `m-${m}`,
            collisionFilter: { category: COL_BUCKET },
            render: { fillStyle: "#111" },
          },
        );
        Composite.add(engine.world, bucket);
      });

      Render.run(render);
      Runner.run(Runner.create(), engine);

      Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          const ball =
            bodyA.label === "ball"
              ? bodyA
              : bodyB.label === "ball"
                ? bodyB
                : null;
          const pin =
            bodyA.label === "pin"
              ? bodyA
              : bodyB.label === "pin"
                ? bodyB
                : null;
          const bucket = bodyA.label.startsWith("m-")
            ? bodyA
            : bodyB.label.startsWith("m-")
              ? bodyB
              : null;

          if (ball && pin) {
            sounds.node();

            if (Math.abs(ball.velocity.y) < 1.5) {
              Body.applyForce(ball, ball.position, {
                x: (Math.random() - 0.5) * 0.0025,
                y: 0.002,
              });
            }
          }

          if (ball && bucket && !ball.processed) {
            ball.processed = true;
            const mult = parseFloat(bucket.label.split("-")[1]);
            resolveGame(ball.customBet, mult);
            Composite.remove(engine.world, ball);
          }
        });
      });

      function setBet(amt) {
        document.getElementById("bet-input").value = amt;
      }

      function resolveGame(bet, mult) {
        const win = bet * mult;
        socket.emit("updateBalance", (win));
        mult >= 1 ? sounds.win() : sounds.lose();
        const item = document.createElement("div");
        item.className = "history-item";
        const color = mult >= 1.5 ? "#53fc18" : mult === 1 ? "#fff" : "#475569";
        item.innerHTML = `<span>${mult}x</span><span style="color:${color}">$${win.toFixed(2)}</span>`;
        const history = document.getElementById("history");
        history.prepend(item);
        if (history.children.length > 10)
          history.removeChild(history.lastChild);
      }

      document.getElementById("drop-btn").addEventListener("click", () => {
        if (audioCtx.state === "suspended") audioCtx.resume();
        const bet = parseFloat(document.getElementById("bet-input").value);
        if (bet > balance || bet <= 0 || isNaN(bet)) return;
        socket.emit("updateBalance", (-bet));
        
        const ball = Bodies.circle(
          centerX + (Math.random() * 8 - 4),
          20,
          config.ballRadius,
          {
            restitution: config.restitution,
            friction: config.friction,
            label: "ball",
            customBet: bet,
            collisionFilter: {
              category: COL_BALL,
              mask: COL_PIN | COL_BUCKET,
            },
            render: { fillStyle: "#53fc18" },
          },
        );
        Composite.add(engine.world, ball);
      });

      Events.on(render, "afterRender", () => {
        const ctx = render.context;
        ctx.font = "bold 12px Inter";
        ctx.textAlign = "center";
        config.multipliers.forEach((m, i) => {
          ctx.fillStyle = m >= 1.5 ? "#53fc18" : m === 1 ? "#fff" : "#444";
          ctx.fillText(`${m}x`, i * bWidth + bWidth / 2, config.height - 20);
        });
      });