function loadBalance(bal) {
            document.getElementById('balance-display').textContent =
                '$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2 });
        }
        
        const socket = io(`http://${IP}:3000`, {
            withCredentials: true,
            transports: ["websocket"]
        });

        socket.on("updateBalance", (newBalance) => {
            balance = newBalance;
            loadBalance(balance);
        });

        
        const TICKER_EVENTS = [
            { name: 'M***x', game: 'Plinko',       win: '+$420.00'   },
            { name: 'K***l', game: 'Ice Field',     win: '+$1,337.00' },
            { name: 'T***s', game: 'Chicken Game',  win: '+$850.00'   },
            { name: 'L***a', game: 'Cyber Dice',    win: '+$2,000.00' },
            { name: 'J***n', game: 'Snake & Stake', win: '+$175.50'   },
            { name: 'A***e', game: 'Rubellose',     win: '+$5,000.00' },
            { name: 'F***k', game: 'Münzwurf',      win: '+$600.00'   },
            { name: 'S***h', game: 'Plinko',        win: '+$3,200.00' },
        ];

        const ticker = document.getElementById('ticker');
        // 2× einfügen damit das CSS-Scroll nahtlos von vorne beginnen kann
        [0, 1].forEach(() => {
            TICKER_EVENTS.forEach(ev => {
                const el = document.createElement('div');
                el.className = 'ticker-item';
                el.innerHTML = `🏆 <span class="name">${ev.name}</span> hat <span class="win">${ev.win}</span> bei ${ev.game} gewonnen`;
                ticker.appendChild(el);
            });
        });