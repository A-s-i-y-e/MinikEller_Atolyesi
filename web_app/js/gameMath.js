class GameMath {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.score = 0;
        this.questionCount = 0;
        this.isRunning = false;
        
        // Active Question state
        this.numA = 0;
        this.numB = 0;
        this.operation = '+'; // '+' or '-'
        this.correctAnswer = 0;
        
        // Target visual item arrays
        this.bubbles = [];
        this.lastDwellTime = 0;
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
    }
    
    start() {
        this.isRunning = true;
        this.score = 0;
        this.questionCount = 0;
        this.updateHUD();
        this.generateQuestion();
        this.loop();
    }
    
    stop() {
        this.isRunning = false;
        this.bubbles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        const timePanelVal = document.getElementById('hud-time');
        if (timePanelVal) {
            timePanelVal.innerText = `Soru: ${this.questionCount + 1}`;
        }
    }
    
    generateQuestion() {
        this.questionCount++;
        this.updateHUD();
        
        // Randomly choose addition or subtraction
        this.operation = Math.random() > 0.5 ? '+' : '-';
        
        if (this.operation === '+') {
            // Keep sum <= 9 for 5-6 year olds
            this.numA = Math.floor(Math.random() * 5) + 1; // 1 to 5
            this.numB = Math.floor(Math.random() * 4) + 1; // 1 to 4
            this.correctAnswer = this.numA + this.numB;
        } else {
            // Keep subtraction positive
            this.numA = Math.floor(Math.random() * 5) + 4; // 4 to 8
            this.numB = Math.floor(Math.random() * (this.numA - 1)) + 1; // 1 to (A-1)
            this.correctAnswer = this.numA - this.numB;
        }
        
        // Generate floating answer choices
        const choices = [this.correctAnswer];
        while (choices.length < 3) {
            const wrong = Math.floor(Math.random() * 9) + 1; // 1 to 9
            if (!choices.includes(wrong)) {
                choices.push(wrong);
            }
        }
        
        // Shuffle choices
        choices.sort(() => Math.random() - 0.5);
        
        // Create bubbles
        this.bubbles = [];
        const positions = [
            { x: this.canvas.width * 0.25, y: this.canvas.height * 0.65 },
            { x: this.canvas.width * 0.5, y: this.canvas.height * 0.7 },
            { x: this.canvas.width * 0.75, y: this.canvas.height * 0.65 }
        ];
        
        // Shuffle positions slightly to avoid overlapping
        positions.sort(() => Math.random() - 0.5);
        
        const colors = ['#00f3ff', '#ff007f', '#00ff66'];
        
        for (let i = 0; i < 3; i++) {
            this.bubbles.push({
                x: positions[i].x,
                y: positions[i].y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.0,
                r: 65,
                value: choices[i],
                color: colors[i],
                isCorrect: choices[i] === this.correctAnswer
            });
        }
    }
    
    // Check if hand pointer pops a bubble (pinch/dwell click or simple hit)
    checkHit(x, y) {
        if (!this.isRunning || this.isTransitioning) return;
        
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];
            const dist = Math.hypot(b.x - x, b.y - y);
            
            if (dist < b.r * 1.25) { // Pop collision
                if (b.isCorrect) {
                    this.score += 20;
                    this.updateHUD();
                    
                    if (this.app.soundSynth) this.app.soundSynth.playSuccess();
                    if (this.app.particleSystem) {
                        this.app.particleSystem.emit(b.x, b.y, '#00ff66', 30, 2);
                    }
                    
                    this.isTransitioning = true;
                    this.bubbles = []; // Clear choices
                    
                    setTimeout(() => {
                        this.isTransitioning = false;
                        this.generateQuestion();
                    }, 1200);
                } else {
                    // Wrong choice: bounce it away and play blink
                    if (this.app.soundSynth) this.app.soundSynth.playBlink();
                    if (this.app.particleSystem) {
                        this.app.particleSystem.emit(b.x, b.y, '#ff007f', 10, 1.2);
                    }
                    // Reverse speed vector to push it away
                    b.vx = -b.vx * 1.5;
                    b.vy = -b.vy * 1.5;
                }
                break;
            }
        }
    }
    
    drawUnmirroredText(text, x, y, font, color) {
        this.ctx.save();
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        
        this.ctx.scale(-1, 1);
        this.ctx.fillText(text, -x, y);
        
        this.ctx.restore();
    }
    
    loop() {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Retrieve hand pointer coordinates to check for pops automatically
        if (this.app.uiManager && this.app.uiManager.rawHandX !== undefined) {
            this.checkHit(this.app.uiManager.rawHandX, this.app.uiManager.rawHandY);
        }
        
        // 1. Draw Math Equation Box (at top)
        const eqY = 150;
        this.drawUnmirroredText(
            `${this.numA} ${this.operation} ${this.numB} = ?`, 
            this.canvas.width / 2, 
            eqY, 
            '800 64px Outfit', 
            '#ffffff'
        );
        
        // 2. Draw Visual counting items (Preschool pedagogic aid)
        const cellW = 75;
        const iconA = '🍎'; // Fruits for A
        const iconB = '🍌'; // Fruits for B
        
        // Draw A items
        const startX_A = this.canvas.width / 2 - 250;
        const startY = 240;
        for (let i = 0; i < this.numA; i++) {
            const visualX = startX_A + i * cellW;
            this.drawUnmirroredText(iconA, visualX, startY, '48px Outfit', '');
        }
        
        // Draw sign
        this.drawUnmirroredText(
            this.operation, 
            this.canvas.width / 2, 
            startY - 5, 
            '800 48px Outfit', 
            this.operation === '+' ? '#00ff66' : '#ff007f'
        );
        
        // Draw B items
        const startX_B = this.canvas.width / 2 + 100;
        
        if (this.operation === '+') {
            // Draw additive items normally
            for (let i = 0; i < this.numB; i++) {
                const visualX = startX_B + i * cellW;
                this.drawUnmirroredText(iconB, visualX, startY, '48px Outfit', '');
            }
        } else {
            // Visual Subtraction: Draw crossed-out apples on the original A set!
            // We draw red 'X' over the last B apples of group A to show subtraction visually
            for (let i = this.numA - this.numB; i < this.numA; i++) {
                const visualX = startX_A + i * cellW;
                this.drawUnmirroredText('❌', visualX, startY + 5, '36px Outfit', '');
            }
            
            // Draw hint text for subtraction
            this.drawUnmirroredText(
                "❌ Olmayan elmaları say!", 
                this.canvas.width / 2, 
                startY + 65, 
                '600 20px Outfit', 
                '#aaa'
            );
        }
        
        // 3. Draw & Move floating choice bubbles
        for (const b of this.bubbles) {
            // Move physics
            b.x += b.vx;
            b.y += b.vy;
            
            // Bounce bounds check
            if (b.x - b.r < 10 || b.x + b.r > this.canvas.width - 10) {
                b.vx = -b.vx;
                b.x = b.x < this.canvas.width / 2 ? b.r + 10 : this.canvas.width - b.r - 10;
            }
            if (b.y - b.r < 320 || b.y + b.r > this.canvas.height - 120) {
                b.vy = -b.vy;
                b.y = b.y < this.canvas.height / 2 ? 320 + b.r : this.canvas.height - 120 - b.r;
            }
            
            // Draw glass bubble backing
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(25, 25, 35, 0.45)';
            this.ctx.strokeStyle = b.color;
            this.ctx.lineWidth = 4;
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = b.color;
            
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
            
            // Draw highlight overlay
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.35, b.r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.restore();
            
            // Draw choice number inside bubble
            this.drawUnmirroredText(
                b.value.toString(), 
                b.x, 
                b.y + 15, 
                '800 48px Outfit', 
                '#ffffff'
            );
        }
        
        requestAnimationFrame(() => this.loop());
    }
}
