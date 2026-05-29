class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.startLoop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    emit(x, y, color, count = 5, speedFactor = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 5 + 2) * speedFactor;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: Math.random() * 0.05 + 0.02,
                color: color,
                size: Math.random() * 6 + 2
            });
        }
    }

    updateAndDraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'lighter';

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Draw
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
            
            // Add Glow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;

            // Physics update
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // Gravity
            p.life -= p.decay;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Draw premium holographic contactless pointer if coordinates are present
        if (window.app && window.app.uiManager && window.app.uiManager.rawHandX !== undefined) {
            const ui = window.app.uiManager;
            const hx = ui.rawHandX;
            const hy = ui.rawHandY;
            const progress = ui.dwellProgress || 0;
            const isPinching = ui.isPinching || false;
            
            // Outer spinning brackets / hologram feel
            const time = Date.now() * 0.003;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = isPinching ? '#ff007f' : '#00f3ff';
            
            this.ctx.strokeStyle = isPinching ? 'rgba(255, 0, 127, 0.8)' : 'rgba(0, 243, 255, 0.8)';
            this.ctx.lineWidth = 3;
            
            // Draw rotating bracket ticks
            for (let angleOffset = 0; angleOffset < Math.PI * 2; angleOffset += Math.PI / 2) {
                this.ctx.beginPath();
                this.ctx.arc(hx, hy, 22, time + angleOffset, time + angleOffset + 0.4);
                this.ctx.stroke();
            }
            
            // Dwell clicking progress ring
            if (progress > 0) {
                this.ctx.beginPath();
                this.ctx.arc(hx, hy, 28, -Math.PI / 2, -Math.PI / 2 + (progress / 100) * Math.PI * 2);
                this.ctx.strokeStyle = '#00ff66';
                this.ctx.lineWidth = 5;
                this.ctx.shadowColor = '#00ff66';
                this.ctx.stroke();
            }
            
            // Inner core pointer
            this.ctx.beginPath();
            this.ctx.arc(hx, hy, isPinching ? 5 : 8, 0, Math.PI * 2);
            this.ctx.fillStyle = isPinching ? '#ff007f' : '#00f3ff';
            this.ctx.shadowColor = this.ctx.fillStyle;
            this.ctx.fill();
        }
        
        this.ctx.shadowBlur = 0;
        this.ctx.globalCompositeOperation = 'source-over';
    }

    startLoop() {
        const loop = () => {
            this.updateAndDraw();
            requestAnimationFrame(loop);
        };
        loop();
    }
}
