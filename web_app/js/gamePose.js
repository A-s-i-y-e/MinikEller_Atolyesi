class GamePose {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.apples = [];
        this.score = 0;
        this.time = 60;
        this.isRunning = false;
        
        this.landmarks = [];
        this.poseActive = false;
        this.lastPoseTime = 0;
        
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
        this.landmarks = [];
        this.poseActive = false;
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
        this.ctx.fillStyle = 'rgba(5,5,8,0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawUnmirroredText("SÜRE BİTTİ!", this.canvas.width / 2, this.canvas.height / 2 - 40, '800 60px Outfit', '#00ff66');
        this.drawUnmirroredText(`Skor: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40, '600 40px Outfit', '#ffffff');
        
        setTimeout(() => {
            if (this.app.state === 'pose') this.app.setState('menu');
        }, 4000);
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        this.hudTime.innerText = this.time;
    }
    
    updatePoseLandmarks(landmarks) {
        this.landmarks = landmarks;
        this.poseActive = true;
        this.lastPoseTime = Date.now();
        this.checkCollision();
    }
    
    clearPoseLandmarks() {
        this.poseActive = false;
        this.landmarks = [];
    }
    
    spawnApple() {
        const r = 35;
        this.apples.push({
            x: Math.random() * (this.canvas.width - r*2) + r,
            y: -r,
            r: r,
            speed: Math.random() * 4 + 3
        });
    }
    
    checkCollision() {
        if (!this.isRunning || this.time <= 0 || !this.landmarks || this.landmarks.length === 0) return;
        
        for (let i = this.apples.length - 1; i >= 0; i--) {
            const a = this.apples[i];
            let hit = false;
            
            // Check collision against all 33 pose landmarks
            for (let j = 0; j < this.landmarks.length; j++) {
                const lm = this.landmarks[j];
                // Ignore keypoints with low confidence/visibility
                if (lm.visibility !== undefined && lm.visibility < 0.5) continue;
                
                const dist = Math.hypot(a.x - lm.x, a.y - lm.y);
                if (dist < a.r + 35) { // 35px radius collision box covers body parts
                    hit = true;
                    break;
                }
            }
            
            if (hit) {
                this.score += 2;
                this.updateHUD();
                
                // VFX
                this.app.particleSystem.emit(a.x, a.y, '#ff0040', 15, 1.5);
                this.app.particleSystem.emit(a.x, a.y, '#00ff66', 5, 2);
                
                this.apples.splice(i, 1);
            }
        }
    }
    
    loop() {
        if (!this.isRunning) return;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw skeleton if active (updated within last 300ms)
        if (this.poseActive && (Date.now() - this.lastPoseTime < 300)) {
            this.drawSkeleton();
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
    
    drawSkeleton() {
        if (!this.landmarks || this.landmarks.length === 0) return;
        
        const ctx = this.ctx;
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ff66';
        
        // Define standard skeletal connection indices
        const connections = [
            [11, 12], // Shoulders
            [11, 13], [13, 15], // Left arm
            [12, 14], [14, 16], // Right arm
            [11, 23], [12, 24], [23, 24], // Torso
            [23, 25], [25, 27], // Left leg
            [24, 26], [26, 28]  // Right leg
        ];
        
        // Draw lines
        connections.forEach(([p1, p2]) => {
            const lm1 = this.landmarks[p1];
            const lm2 = this.landmarks[p2];
            if (lm1 && lm2 && (lm1.visibility === undefined || lm1.visibility > 0.5) && (lm2.visibility === undefined || lm2.visibility > 0.5)) {
                ctx.beginPath();
                ctx.moveTo(lm1.x, lm1.y);
                ctx.lineTo(lm2.x, lm2.y);
                ctx.stroke();
            }
        });
        
        // Draw joints
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 0]; // Joints + Nose (0)
        keyJoints.forEach(idx => {
            const lm = this.landmarks[idx];
            if (lm && (lm.visibility === undefined || lm.visibility > 0.5)) {
                ctx.beginPath();
                ctx.arc(lm.x, lm.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.shadowBlur = 0; // Reset
    }
    
    drawUnmirroredText(text, x, y, font, color) {
        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        
        // Flip coordinates horizontally to cancel out canvas mirror effect
        this.ctx.scale(-1, 1);
        this.ctx.fillText(text, -x, y);
        
        this.ctx.restore();
    }
}
