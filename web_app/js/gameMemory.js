class GameMemory {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.score = 0;
        this.moves = 0;
        this.level = 1; // Level 1 starts with 4 cards, Level 9 reaches 20 cards
        this.isRunning = false;
        
        this.cards = [];
        this.selectedCards = [];
        this.isChecking = false;
        this.victory = false;
        this.victoryTime = 0;
        this.lastPinchingState = false;
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
    }
    
    start() {
        this.isRunning = true;
        this.score = 0;
        this.moves = 0;
        this.level = 1;
        this.selectedCards = [];
        this.isChecking = false;
        this.victory = false;
        this.lastPinchingState = false;
        
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
            timePanelVal.innerText = `Seviye: ${this.level} / Hamle: ${this.moves}`;
        }
    }
    
    setupCards() {
        const allEmojis = ['🦁', '🐵', '🐼', '🐸', '🐶', '🐱', '🐻', '🐰', '🦊', '🐨'];
        
        // Define levels configurations (from 4 to 20 cards)
        const configs = {
            4: { cols: 2, rows: 2, cardW: 160, cardH: 200 },
            6: { cols: 3, rows: 2, cardW: 155, cardH: 195 },
            8: { cols: 4, rows: 2, cardW: 145, cardH: 185 },
            10: { cols: 5, rows: 2, cardW: 140, cardH: 180 },
            12: { cols: 4, rows: 3, cardW: 130, cardH: 145 },
            14: { cols: 7, rows: 2, cardW: 125, cardH: 165 },
            16: { cols: 4, rows: 4, cardW: 110, cardH: 115 },
            18: { cols: 6, rows: 3, cardW: 115, cardH: 135 },
            20: { cols: 5, rows: 4, cardW: 110, cardH: 110 }
        };
        
        const numCards = 4 + (this.level - 1) * 2;
        const config = configs[numCards] || configs[8];
        const cols = config.cols;
        const rows = config.rows;
        const cardW = config.cardW;
        const cardH = config.cardH;
        
        const spacingX = cols > 5 ? 15 : 25;
        const spacingY = rows > 3 ? 12 : 25;
        
        const totalW = cols * cardW + (cols - 1) * spacingX;
        const totalH = rows * cardH + (rows - 1) * spacingY;
        
        const startX = (this.canvas.width - totalW) / 2;
        // Dynamically shift startY upwards if grid height is large
        const startY = 220 + (410 - totalH) / 2;
        
        // Pick dynamic emojis for pairs
        const shuffledList = [...allEmojis].sort(() => Math.random() - 0.5);
        const selected = shuffledList.slice(0, numCards / 2);
        const deck = [...selected, ...selected].sort(() => Math.random() - 0.5);
        
        const colors = ['#00f3ff', '#ff007f', '#00ff66', '#ffff00', '#9d00ff', '#ff9900'];
        const emojiColorMap = {};
        selected.forEach((emoji, idx) => {
            emojiColorMap[emoji] = colors[idx % colors.length];
        });
        
        this.cards = [];
        for (let i = 0; i < numCards; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
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
                flipAnim: 0
            });
        }
    }
    
    checkHit(x, y) {
        if (!this.isRunning || this.isChecking || this.victory) return;
        
        for (const card of this.cards) {
            if (card.isFlipped || card.isMatched) continue;
            
            const halfW = card.w / 2;
            const halfH = card.h / 2;
            
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
                        // Match
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
                            
                            // Check Level Complete
                            if (this.cards.every(c => c.isMatched)) {
                                this.victory = true;
                                this.victoryTime = Date.now();
                            }
                        }, 600);
                    } else {
                        // Fail - close back
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
        
        // Edge-triggered pinch click handler: card only flips ON PINCH START
        if (this.app.uiManager && this.app.uiManager.rawHandX !== undefined) {
            const isCurrentlyPinching = this.app.uiManager.isPinching;
            if (isCurrentlyPinching && !this.lastPinchingState) {
                this.checkHit(this.app.uiManager.rawHandX, this.app.uiManager.rawHandY);
            }
            this.lastPinchingState = isCurrentlyPinching;
        } else {
            this.lastPinchingState = false;
        }
        
        // 1. Victory Level Celebration Screen
        if (this.victory) {
            this.ctx.fillStyle = 'rgba(5, 5, 8, 0.85)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawUnmirroredText("TEBRİKLER!", this.canvas.width / 2, this.canvas.height / 2 - 40, '800 64px Outfit', '#00ff66');
            this.drawUnmirroredText(`Seviye ${this.level} tamamlandı!`, this.canvas.width / 2, this.canvas.height / 2 + 20, '600 28px Outfit', '#ffffff');
            this.drawUnmirroredText("Sonraki seviye yükleniyor...", this.canvas.width / 2, this.canvas.height / 2 + 85, '600 20px Outfit', '#aaa');
            
            if (Date.now() - this.victoryTime > 3000) {
                this.level++;
                if (this.level > 9) { // Restart cycle after level 9 (20 cards)
                    this.level = 1;
                }
                this.setupCards();
                this.victory = false;
                this.score = 0;
                this.moves = 0;
                this.updateHUD();
            }
            
            requestAnimationFrame(() => this.loop());
            return;
        }
        
        // 2. Info titles
        this.drawUnmirroredText(
            "Hafıza Oyunu", 
            this.canvas.width / 2, 
            135, 
            '800 48px Outfit', 
            '#ffffff'
        );
        this.drawUnmirroredText(
            "Hayvan eşlerini bulmak için kartlara KISTIRMA (pinch) yaparak dokun!", 
            this.canvas.width / 2, 
            180, 
            '600 20px Outfit', 
            '#9d00ff'
        );
        
        // 3. Draw cards
        for (const card of this.cards) {
            const targetVal = (card.isFlipped || card.isMatched) ? 1 : 0;
            card.flipAnim += (targetVal - card.flipAnim) * 0.15;
            
            const rotationRad = card.flipAnim * Math.PI;
            const currentW = card.w * Math.abs(Math.cos(rotationRad));
            
            const isHovered = !card.isFlipped && !card.isMatched && !this.isChecking &&
                (this.app.uiManager.rawHandX !== undefined &&
                 this.app.uiManager.rawHandX >= card.x - card.w/2 &&
                 this.app.uiManager.rawHandX <= card.x + card.w/2 &&
                 this.app.uiManager.rawHandY >= card.y - card.h/2 &&
                 this.app.uiManager.rawHandY <= card.y + card.h/2);
                 
            const displayScale = isHovered ? 1.05 : 1.0;
            const finalW = currentW * displayScale;
            const finalH = card.h * displayScale;
            
            // Dynamic text sizes depending on current card height to prevent overflow
            const emojiFontSize = Math.floor(finalH * 0.45);
            const questionFontSize = Math.floor(finalH * 0.45);
            
            this.ctx.save();
            
            if (card.flipAnim > 0.5) {
                // Face Up card styling
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
                
                // Draw Animal Emoji
                this.ctx.save();
                this.ctx.font = `${emojiFontSize}px Outfit`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                if (card.isMatched) {
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#00ff66';
                }
                
                this.ctx.scale(-1 * (finalW / card.w), 1);
                this.ctx.fillText(card.emoji, -card.x * (card.w / finalW), card.y);
                this.ctx.restore();
            } else {
                // Face Down card styling
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
                
                // Draw Glowing "?" mark
                this.ctx.save();
                this.ctx.font = `800 ${questionFontSize}px Outfit`;
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
