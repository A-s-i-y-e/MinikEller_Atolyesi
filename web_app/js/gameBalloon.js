class GameBalloon {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.balloons = [];
        this.score = 0;
        this.time = 60;
        this.isRunning = false;
        
        this.lastSpawn = 0;
        this.spawnInterval = 1500; // ms
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
    }
    
    start() {
        this.isRunning = true;
        this.score = 0;
        this.time = 60;
        this.balloons = [];
        this.updateHUD();
        
        this.timerInterval = setInterval(() => {
            this.time--;
            this.updateHUD();
            if (this.time <= 0) this.endGame();
        }, 1000);
        
        this.loop();
    }
    
    stop() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    endGame() {
        this.stop();
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.font = '800 60px Outfit';
        this.ctx.fillStyle = '#00f3ff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("SÜRE BİTTİ!", this.canvas.width/2, this.canvas.height/2 - 40);
        
        this.ctx.font = '600 40px Outfit';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Skor: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
        
        // Return to menu after 3 seconds
        setTimeout(() => {
            if (this.app.state === 'balloon') this.app.setState('menu');
        }, 4000);
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        this.hudTime.innerText = this.time;
    }
    
    spawnBalloon() {
        const colors = ['#ff007f', '#00f3ff', '#00ff66', '#ffff00', '#9d00ff'];
        const r = Math.random() * 30 + 40;
        this.balloons.push({
            x: Math.random() * (this.canvas.width - r*2) + r,
            y: this.canvas.height + r,
            r: r,
            speed: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    // Called by HandDetector when pinch happens
    checkHit(x, y) {
        if (!this.isRunning || this.time <= 0) return;
        
        for (let i = this.balloons.length - 1; i >= 0; i--) {
            const b = this.balloons[i];
            const dist = Math.hypot(b.x - x, b.y - y);
            
            if (dist < b.r * 1.5) { // Hit
                this.score++;
                this.updateHUD();
                
                // Play sound & VFX
                this.app.soundSynth.playPop();
                this.app.particleSystem.emit(b.x, b.y, b.color, 20, 2);
                
                this.balloons.splice(i, 1);
                
                // Increase difficulty
                if (this.score % 5 === 0) {
                    this.spawnInterval = Math.max(500, this.spawnInterval - 100);
                }
                break;
            }
        }
    }
    
    loop() {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const now = Date.now();
        if (now - this.lastSpawn > this.spawnInterval) {
            this.spawnBalloon();
            this.lastSpawn = now;
        }
        
        // Draw & Update Balloons
        for (let i = this.balloons.length - 1; i >= 0; i--) {
            const b = this.balloons[i];
            b.y -= b.speed;
            
            // Draw string
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, b.y + b.r);
            this.ctx.lineTo(b.x, b.y + b.r + 40);
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw balloon
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            this.ctx.fillStyle = b.color;
            this.ctx.fill();
            
            // Draw highlight
            this.ctx.beginPath();
            this.ctx.ellipse(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.4, b.r*0.15, -Math.PI/4, 0, Math.PI*2);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            
            if (b.y + b.r < 0) {
                this.balloons.splice(i, 1);
            }
        }
        
        requestAnimationFrame(() => this.loop());
    }
}
