(function () {
    function init() {
        const canvas = document.getElementById('fdc-particle-canvas');
        const bgGlow = document.getElementById('fdc-bg-glow');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const particles = Array.from({ length: 90 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 2.8 + 0.8,
            speed: Math.random() * 0.25 + 0.08,
            opacity: Math.random() * 0.45 + 0.5,
            drift: (Math.random() - 0.5) * 0.2
        }));

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.y -= p.speed;
                p.x += p.drift;
                if (p.y < -5) {
                    p.y = canvas.height + 5;
                    p.x = Math.random() * canvas.width;
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(83,252,24,${p.opacity})`;
                ctx.fill();
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();

        if (bgGlow) {
            document.addEventListener('mousemove', e => {
                const x = e.clientX / window.innerWidth * 100;
                const y = e.clientY / window.innerHeight * 100;
                bgGlow.style.background = `
                    radial-gradient(ellipse 55% 45% at ${x}% ${y}%, rgba(83,252,24,0.07) 0%, transparent 70%)
                `;
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();