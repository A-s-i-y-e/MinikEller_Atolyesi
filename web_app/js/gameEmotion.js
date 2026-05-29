class GameEmotion {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.score = 0;
        this.time = 60;
        this.isRunning = false;
        
        this.levels = [
            { name: 'GÜLÜMSE', target: 'smile', threshold: 0.25, color: '#00f3ff', prompt: 'Kameraya bak ve gülümse! 😊' },
            { name: 'ŞAŞIR', target: 'jawOpen', threshold: true, color: '#ff9900', prompt: 'Ağzını aç ve şaşır! 😮' },
            { name: 'SOL GÖZ KIRP', target: 'blinkLeft', threshold: true, color: '#9d00ff', prompt: 'Sol gözünü kırp! 😉' },
            { name: 'SAĞ GÖZ KIRP', target: 'blinkRight', threshold: true, color: '#00ff66', prompt: 'Sağ gözünü kırp! 😜' },
            { name: 'KOCAMAN GÜL', target: 'smile', threshold: 0.65, color: '#ff007f', prompt: 'Kocaman kahkaha at! 😃' },
            { name: 'GÖZLERİ KAPAT', target: 'blinkBoth', threshold: true, color: '#ffffff', prompt: 'İki gözünü de kapat! 😑' }
        ];
        
        this.currentLevelIdx = 0;
        this.isSuccess = false;
        this.successTime = 0;
        this.pulse = 0.0;
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
    }
    
    start() {
        this.isRunning = true;
        this.score = 0;
        this.time = 60;
        this.currentLevelIdx = 0;
        this.isSuccess = false;
        this.pulse = 0.0;
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
        
        this.ctx.font = '800 60px Outfit';
        this.ctx.fillStyle = '#ff007f';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("SÜRE BİTTİ!", this.canvas.width/2, this.canvas.height/2 - 40);
        
        this.ctx.font = '600 40px Outfit';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`Skor: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
        
        setTimeout(() => {
            if (this.app.state === 'emotion') this.app.setState('menu');
        }, 4000);
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        this.hudTime.innerText = this.time;
    }
    
    triggerSuccess() {
        if (!this.isSuccess) {
            this.isSuccess = true;
            this.successTime = Date.now();
            this.score += 20;
            this.pulse = 1.0;
            this.updateHUD();
            
            const level = this.levels[this.currentLevelIdx];
            
            // Sounds & VFX
            this.app.soundSynth.playSuccess();
            this.app.particleSystem.emit(this.canvas.width / 2, this.canvas.height / 2, level.color, 45, 1.8);
        }
    }
    
    update(faceData) {
        if (!this.isRunning || this.time <= 0) return;
        
        if (this.isSuccess) {
            this.pulse = Math.min(1.8, this.pulse + 0.05);
            if (Date.now() - this.successTime > 1500) {
                this.nextLevel();
            }
        } else {
            const level = this.levels[this.currentLevelIdx];
            
            if (level.target === 'smile') {
                if (faceData.smile > level.threshold) {
                    this.triggerSuccess();
                }
            } else if (level.target === 'jawOpen') {
                if (faceData.jawOpen) {
                    this.triggerSuccess();
                }
            } else if (level.target === 'blinkLeft') {
                if (faceData.blinkLeft && !faceData.blinkRight) {
                    this.triggerSuccess();
                }
            } else if (level.target === 'blinkRight') {
                if (faceData.blinkRight && !faceData.blinkLeft) {
                    this.triggerSuccess();
                }
            } else if (level.target === 'blinkBoth') {
                if (faceData.blinkLeft && faceData.blinkRight) {
                    this.triggerSuccess();
                }
            }
        }
    }
    
    nextLevel() {
        this.currentLevelIdx = (this.currentLevelIdx + 1) % this.levels.length;
        this.isSuccess = false;
        this.pulse = 0.0;
    }
    
    loop() {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const level = this.levels[this.currentLevelIdx];
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        // Draw centered glass background panel for the emoji
        const panelW = 400;
        const panelH = 400;
        
        this.ctx.beginPath();
        this.ctx.roundRect(cx - panelW/2, cy - panelH/2, panelW, panelH, 30);
        this.ctx.fillStyle = 'rgba(15, 15, 25, 0.45)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 2;
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw instruction prompt (Text)
        this.ctx.font = '800 36px Outfit';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = level.color;
        this.ctx.fillText(level.prompt, cx, cy - 250);
        this.ctx.shadowBlur = 0; // Reset glow
        
        // Draw vector representation of the emoji target expression
        const scale = 1.0 + (this.pulse * 0.15);
        const r = 110 * scale;
        this.drawTargetEmoji(level.name, cx, cy, r, level.color);
        
        // Draw level progress indicators (dots)
        const dotY = cy + 260;
        const totalLevels = this.levels.length;
        const spacing = 30;
        const startX = cx - ((totalLevels - 1) * spacing) / 2;
        
        for (let i = 0; i < totalLevels; i++) {
            this.ctx.beginPath();
            this.ctx.arc(startX + i * spacing, dotY, 7, 0, Math.PI * 2);
            if (i === this.currentLevelIdx) {
                this.ctx.fillStyle = level.color;
                this.ctx.shadowBlur = 12;
                this.ctx.shadowColor = level.color;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else if (i < this.currentLevelIdx) {
                this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
                this.ctx.fill();
            } else {
                this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
                this.ctx.fill();
            }
        }
        
        // Success Text Overlay
        if (this.isSuccess) {
            this.ctx.font = '800 48px Outfit';
            this.ctx.fillStyle = level.color;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = level.color;
            this.ctx.fillText("HARİKASIN! 🌟", cx, cy + 180);
            this.ctx.shadowBlur = 0;
        }
        
        requestAnimationFrame(() => this.loop());
    }
    
    drawTargetEmoji(name, cx, cy, r, color) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 7;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        
        // 1. Draw Face Circle
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.stroke();
        
        const eyeOffset = r * 0.35;
        const eyeY = cy - r * 0.15;
        const eyeR = r * 0.12;
        
        this.ctx.fillStyle = color;
        
        // 2. Draw Eyes depending on level
        if (name === 'GÖZLERİ KAPAT') {
            // Left eye closed (line)
            this.ctx.beginPath();
            this.ctx.moveTo(cx - eyeOffset - eyeR, eyeY);
            this.ctx.lineTo(cx - eyeOffset + eyeR, eyeY);
            this.ctx.stroke();
            
            // Right eye closed (line)
            this.ctx.beginPath();
            this.ctx.moveTo(cx + eyeOffset - eyeR, eyeY);
            this.ctx.lineTo(cx + eyeOffset + eyeR, eyeY);
            this.ctx.stroke();
            
        } else if (name === 'SOL GÖZ KIRP') {
            // Left eye closed (line)
            this.ctx.beginPath();
            this.ctx.moveTo(cx - eyeOffset - eyeR, eyeY);
            this.ctx.lineTo(cx - eyeOffset + eyeR, eyeY);
            this.ctx.stroke();
            
            // Right eye open (circle)
            this.ctx.beginPath();
            this.ctx.arc(cx + eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
            this.ctx.fill();
            
        } else if (name === 'SAĞ GÖZ KIRP') {
            // Left eye open (circle)
            this.ctx.beginPath();
            this.ctx.arc(cx - eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Right eye closed (line)
            this.ctx.beginPath();
            this.ctx.moveTo(cx + eyeOffset - eyeR, eyeY);
            this.ctx.lineTo(cx + eyeOffset + eyeR, eyeY);
            this.ctx.stroke();
            
        } else if (name === 'ŞAŞIR') {
            // Surprised Eyes (hollow circles)
            this.ctx.beginPath();
            this.ctx.arc(cx - eyeOffset, eyeY, eyeR * 1.2, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.arc(cx + eyeOffset, eyeY, eyeR * 1.2, 0, Math.PI * 2);
            this.ctx.stroke();
            
        } else {
            // Standard Open Eyes (filled circles)
            this.ctx.beginPath();
            this.ctx.arc(cx - eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(cx + eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // 3. Draw Mouth depending on level
        const mouthY = cy + r * 0.25;
        
        if (name === 'ŞAŞIR') {
            // Small open mouth (circle)
            this.ctx.beginPath();
            this.ctx.arc(cx, mouthY, r * 0.22, 0, Math.PI * 2);
            this.ctx.stroke();
            
        } else if (name === 'AĞZINI AÇ') {
            // Big open mouth (ellipse)
            this.ctx.beginPath();
            this.ctx.ellipse(cx, mouthY, r * 0.28, r * 0.4, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            
        } else if (name === 'GÜLÜMSE') {
            // Basic Smile Arc
            this.ctx.beginPath();
            this.ctx.arc(cx, cy + r * 0.1, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
            this.ctx.stroke();
            
        } else if (name === 'KOCAMAN GÜL') {
            // Wide Open Smile
            this.ctx.beginPath();
            this.ctx.arc(cx, cy + r * 0.1, r * 0.55, 0.1 * Math.PI, 0.9 * Math.PI);
            this.ctx.lineTo(cx - r * 0.52, cy + r * 0.27);
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.fill();
            
        } else if (name === 'GÖZLERİ KAPAT') {
            // Neutral flat line mouth
            this.ctx.beginPath();
            this.ctx.moveTo(cx - r * 0.25, mouthY);
            this.ctx.lineTo(cx + r * 0.25, mouthY);
            this.ctx.stroke();
            
        } else {
            // Standard small smile
            this.ctx.beginPath();
            this.ctx.arc(cx, cy + r * 0.15, r * 0.4, 0.2 * Math.PI, 0.8 * Math.PI);
            this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0; // Reset
    }
}
