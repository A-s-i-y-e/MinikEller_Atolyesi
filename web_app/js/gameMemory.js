class GameMemory {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.score = 0;
        this.moves = 0;
        this.isRunning = false;
        
        this.cards = [];
        this.selectedCards = [];
        this.isChecking = false;
        this.victory = false;
        this.victoryTime = 0;
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
    }
    
    start() {
        this.isRunning = true;
        this.score = 0;
        this.moves = 0;
        this.selectedCards = [];
        this.isChecking = false;
        this.victory = false;
        
        this.updateHUD();
        this.setupCards();
        this.loop();
    }
    
    stop() {
        this.isRunning = false;
        this.selectedCards = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        const timePanelVal = document.getElementById('hud-time');
        if (timePanelVal) {
            timePanelVal.innerText = `Hamle: ${this.moves}`;
        }
    }
    
    setupCards() {
        const allEmojis = ['🦁', '🐵', '🐼', '🐸', '🐶', '🐱', '🐻', '🐰', '🦊', '🐨'];
        // Pick 4 random emojis
        const shuffledList = [...allEmojis].sort(() => Math.random() - 0.5);
        const selected = shuffledList.slice(0, 4);
        
        // Double it to make 4 pairs
        const deck = [...selected, ...selected].sort(() => Math.random() - 0.5);
        
        const cardW = 145;
        const cardH = 185;
        const spacingX = 25;
        const spacingY = 25;
        
        const totalW = 4 * cardW + 3 * spacingX;
        const startX = (this.canvas.width - totalW) / 2;
        const startY = 230;
        
        const colors = ['#00f3ff', '#ff007f', '#00ff66', '#ffff00'];
        const emojiColorMap = {};
        selected.forEach((emoji, idx) => {
            emojiColorMap[emoji] = colors[idx % colors.length];
        });
        
        this.cards = [];
        for (let i = 0; i < 8; i++) {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const cx = startX + col * (cardW + spacingX) + cardW / 2;
            const cy = startY + row * (cardH + spacingY) + cardH / 2;
            
            this.cards.push({
                id: i,
                x: cx,
                y: cy,
                w: cardW,
                h: cardH,
                emoji: deck[i],
                color: emojiColorMap[deck[i]],
                isFlipped: false,
                isMatched: false,
                flipAnim: 0 // 0 to 1 anim progress
            });
        }
    }
    
    checkHit(x, y) {
        if (!this.isRunning || this.isChecking || this.victory) return;
        
        for (const card of this.cards) {
            if (card.isFlipped || card.isMatched) continue;
            
            const halfW = card.w / 2;
            const halfH = card.h / 2;
            
            // Check bounding box intersection
            if (x >= card.x - halfW && x <= card.x + halfW && y >= card.y - halfH && y <= card.y + halfH) {
                card.isFlipped = true;
                if (this.app.soundSynth) this.app.soundSynth.playPop();
                this.selectedCards.push(card);
                
                if (this.selectedCards.length === 2) {
                    this.isChecking = true;
                    this.moves++;
                    this.updateHUD();
                    
                    const [card1, card2] = this.selectedCards;
                    if (card1.emoji === card2.emoji) {
                        // Match!
                        setTimeout(() => {
                            card1.isMatched = true;
                            card2.isMatched = true;
                            this.score += 25;
                            this.updateHUD();
                            
                            if (this.app.soundSynth) this.app.soundSynth.playSuccess();
                            if (this.app.particleSystem) {
                                this.app.particleSystem.emit(card1.x, card1.y, card1.color, 15, 1.5);
                                this.app.particleSystem.emit(card2.x, card2.y, card2.color, 15, 1.5);
                            }
                            
                            this.selectedCards = [];
                            this.isChecking = false;
                            
                            // Check win
                            if (this.cards.every(c => c.isMatched)) {
                                this.victory = true;
                                this.victoryTime = Date.now();
                            }
                        }, 600);
                    } else {
                        // Fail - flip back
                        setTimeout(() => {
                            card1.isFlipped = false;
                            card2.isFlipped = false;
                            if (this.app.soundSynth) this.app.soundSynth.playBlink();
                            this.selectedCards = [];
                            this.isChecking = false;
                        }, 1200);
                    }
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
        
        // Process hand pointer coordinates automatically
        if (this.app.uiManager && this.app.uiManager.rawHandX !== undefined) {
            this.checkHit(this.app.uiManager.rawHandX, this.app.uiManager.rawHandY);
        }
        
        // 1. Victory state
        if (this.victory) {
            this.ctx.fillStyle = 'rgba(5, 5, 8, 0.85)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawUnmirroredText("TEBRİKLER!", this.canvas.width / 2, this.canvas.height / 2 - 40, '800 64px Outfit', '#00ff66');
            this.drawUnmirroredText(`${this.moves} hamlede tamamladın!`, this.canvas.width / 2, this.canvas.height / 2 + 20, '600 28px Outfit', '#ffffff');
            this.drawUnmirroredText("Yeni oyun kuruluyor...", this.canvas.width / 2, this.canvas.height / 2 + 85, '600 20px Outfit', '#aaa');
            
            if (Date.now() - this.victoryTime > 4000) {
                this.setupCards();
                this.victory = false;
                this.score = 0;
                this.moves = 0;
                this.updateHUD();
            }
            
            requestAnimationFrame(() => this.loop());
            return;
        }
        
        // 2. Header and info text
        this.drawUnmirroredText(
            "Hafıza Oyunu", 
            this.canvas.width / 2, 
            135, 
            '800 48px Outfit', 
            '#ffffff'
        );
        this.drawUnmirroredText(
            "Hayvan eşlerini bulmak için kartlara dokun!", 
            this.canvas.width / 2, 
            180, 
            '600 20px Outfit', 
            '#9d00ff'
        );
        
        // 3. Draw Cards
        for (const card of this.cards) {
            // Update flip animation progress LERP
            const targetVal = (card.isFlipped || card.isMatched) ? 1 : 0;
            card.flipAnim += (targetVal - card.flipAnim) * 0.15;
            
            const rotationRad = card.flipAnim * Math.PI;
            const currentW = card.w * Math.abs(Math.cos(rotationRad));
            
            // Check hand hover focus
            const isHovered = !card.isFlipped && !card.isMatched && !this.isChecking &&
                (this.app.uiManager.rawHandX !== undefined &&
                 this.app.uiManager.rawHandX >= card.x - card.w/2 &&
                 this.app.uiManager.rawHandX <= card.x + card.w/2 &&
                 this.app.uiManager.rawHandY >= card.y - card.h/2 &&
                 this.app.uiManager.rawHandY <= card.y + card.h/2);
                 
            const displayScale = isHovered ? 1.05 : 1.0;
            const finalW = currentW * displayScale;
            const finalH = card.h * displayScale;
            
            this.ctx.save();
            
            if (card.flipAnim > 0.5) {
                // Draw Face Up card
                this.ctx.fillStyle = 'rgba(20, 20, 30, 0.75)';
                this.ctx.strokeStyle = card.isMatched ? '#00ff66' : card.color;
                this.ctx.lineWidth = 4;
                this.ctx.shadowBlur = isHovered ? 25 : 15;
                this.ctx.shadowColor = card.isMatched ? '#00ff66' : card.color;
                
                this.ctx.beginPath();
                this.ctx.roundRect(card.x - finalW / 2, card.y - finalH / 2, finalW, finalH, 16);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
                
                // Draw Emoji
                this.ctx.save();
                this.ctx.font = '64px Outfit';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                if (card.isMatched) {
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#00ff66';
                }
                
                // Horizontal scale mirroring trick for unmirrored scale
                this.ctx.scale(-1 * (finalW / card.w), 1);
                this.ctx.fillText(card.emoji, -card.x * (card.w / finalW), card.y);
                this.ctx.restore();
            } else {
                // Draw Face Down card
                this.ctx.fillStyle = 'rgba(15, 15, 25, 0.85)';
                this.ctx.strokeStyle = isHovered ? '#ffffff' : '#9d00ff';
                this.ctx.lineWidth = 4;
                this.ctx.shadowBlur = isHovered ? 25 : 12;
                this.ctx.shadowColor = isHovered ? '#ffffff' : '#9d00ff';
                
                this.ctx.beginPath();
                this.ctx.roundRect(card.x - finalW / 2, card.y - finalH / 2, finalW, finalH, 16);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
                
                // Draw Glowing "?"
                this.ctx.save();
                this.ctx.font = '800 64px Outfit';
                this.ctx.fillStyle = isHovered ? '#ffffff' : '#ff007f';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = isHovered ? '#ffffff' : '#ff007f';
                
                this.ctx.scale(-1 * (finalW / card.w), 1);
                this.ctx.fillText('?', -card.x * (card.w / finalW), card.y);
                this.ctx.restore();
            }
        }
        
        requestAnimationFrame(() => this.loop());
    }
}
