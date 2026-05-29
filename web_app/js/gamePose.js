class GamePose {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.apples = [];
        this.score = 0;
        this.time = 60;
        this.isRunning = false;
        
        this.noseX = 0;
        this.noseY = 0;
        
        this.lastSpawn = 0;
        this.spawnInterval = 2000;
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
    }
    
    start() {
        this.isRunning = true;
        this.score = 0;
        this.time = 60;
        this.apples = [];
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
        this.ctx.fillStyle = '#00ff66';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("SÜRE BİTTİ!", this.canvas.width/2, this.canvas.height/2 - 40);
        
        this.ctx.font = '600 40px Outfit';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Skor: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
        
        setTimeout(() => {
            if (this.app.state === 'pose') this.app.setState('menu');
        }, 4000);
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        this.hudTime.innerText = this.time;
    }
    
    updateNosePosition(x, y) {
        this.noseX = x;
        this.noseY = y;
        this.noseActive = true;
        this.lastNoseTime = Date.now();
        this.checkCollision();
    }
    
    clearNoseActive() {
        this.noseActive = false;
    }
    
    spawnApple() {
        const r = 35;
        this.apples.push({
            x: Math.random() * (this.canvas.width - r*2) + r,
            y: -r,
            r: r,
            speed: Math.random() * 3 + 3
        });
    }
    
    checkCollision() {
        if (!this.isRunning || this.time <= 0) return;
        
        for (let i = this.apples.length - 1; i >= 0; i--) {
            const a = this.apples[i];
            const dist = Math.hypot(a.x - this.noseX, a.y - this.noseY);
            
            // Nose radius is about 20px
            if (dist < a.r + 30) {
                this.score += 2;
                this.updateHUD();
                
                // VFX
                this.app.particleSystem.emit(a.x, a.y, '#ff0000', 15, 1.5);
                this.app.particleSystem.emit(a.x, a.y, '#00ff00', 5, 2);
                
                this.apples.splice(i, 1);
            }
        }
    }
    
    loop() {
        if (!this.isRunning) return;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw nose crosshair if active (updated within last 200ms)
        if (this.noseActive && (Date.now() - this.lastNoseTime < 200)) {
            this.drawCrosshair(this.noseX, this.noseY);
        }
        
        const now = Date.now();
        if (now - this.lastSpawn > this.spawnInterval) {
            this.spawnApple();
            this.lastSpawn = now;
        }
        
        for (let i = this.apples.length - 1; i >= 0; i--) {
            const a = this.apples[i];
            a.y += a.speed; // Fall down
            
            // Draw Apple
            this.ctx.beginPath();
            this.ctx.arc(a.x, a.y, a.r, 0, Math.PI*2);
            this.ctx.fillStyle = '#ff0040';
            this.ctx.fill();
            
            // Highlight
            this.ctx.beginPath();
            this.ctx.arc(a.x - a.r*0.3, a.y - a.r*0.3, a.r*0.3, 0, Math.PI*2);
            this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
            this.ctx.fill();
            
            // Leaf
            this.ctx.beginPath();
            this.ctx.ellipse(a.x + a.r*0.2, a.y - a.r*0.9, a.r*0.4, a.r*0.2, -Math.PI/4, 0, Math.PI*2);
            this.ctx.fillStyle = '#00ff66';
            this.ctx.fill();
            
            if (a.y - a.r > this.canvas.height) {
                this.apples.splice(i, 1);
            }
        }
        
        requestAnimationFrame(() => this.loop());
    }
    
    drawCrosshair(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#00ff66';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ff66';
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x - 30, y); this.ctx.lineTo(x + 30, y);
        this.ctx.moveTo(x, y - 30); this.ctx.lineTo(x, y + 30);
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
    }
}
