class GameCoding {
    constructor(app) {
        this.app = app;
        this.canvas = this.app.canvasManager.canvas;
        this.ctx = this.app.canvasManager.ctx;
        
        this.score = 0;
        this.levelIndex = 0;
        this.isRunning = false;
        
        // Commands queue
        this.commands = [];
        this.isExecuting = false;
        this.executionStep = 0;
        
        // Character grid position
        this.charPos = {x: 0, y: 0};
        
        // Setup levels
        this.levels = [
            {
                grid: [
                    ['S', '.', 'W', '.', '.'],
                    ['.', '.', 'W', '.', 'T'],
                    ['.', 'W', 'W', '.', '.'],
                    ['.', '.', '.', '.', '.'],
                    ['.', '.', '.', '.', '.']
                ],
                start: {x: 0, y: 0},
                target: {x: 4, y: 1}
            },
            {
                grid: [
                    ['S', '.', '.', '.', 'W'],
                    ['W', 'W', 'W', '.', 'W'],
                    ['.', '.', '.', '.', '.'],
                    ['.', 'W', 'W', 'W', 'W'],
                    ['.', '.', '.', '.', 'T']
                ],
                start: {x: 0, y: 0},
                target: {x: 4, y: 4}
            },
            {
                grid: [
                    ['S', 'W', '.', '.', '.'],
                    ['.', 'W', '.', 'W', '.'],
                    ['.', '.', '.', 'W', 'T'],
                    ['W', 'W', 'W', 'W', '.'],
                    ['.', '.', '.', '.', '.']
                ],
                start: {x: 0, y: 0},
                target: {x: 4, y: 2}
            }
        ];
        
        // UI Cache
        this.codingPanel = document.getElementById('coding-panel');
        this.codingQueue = document.getElementById('coding-queue');
        this.codingQueueContainer = document.getElementById('coding-queue-container');
        
        this.hudScore = document.getElementById('hud-score');
        this.hudTime = document.getElementById('hud-time');
        
        this.setupButtons();
    }
    
    setupButtons() {
        // Wire up sidebar coding buttons
        const addBtnCmd = (id, direction, symbol) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (this.isExecuting || !this.isRunning) return;
                    this.pushCommand(direction, symbol);
                });
            }
        };
        
        addBtnCmd('btn-code-up', 'up', '⬆️');
        addBtnCmd('btn-code-down', 'down', '⬇️');
        addBtnCmd('btn-code-left', 'left', '⬅️');
        addBtnCmd('btn-code-right', 'right', '➡️');
        
        const btnRun = document.getElementById('btn-code-run');
        if (btnRun) {
            btnRun.addEventListener('click', () => {
                if (this.isExecuting || !this.isRunning) return;
                this.runProgram();
            });
        }
        
        const btnUndo = document.getElementById('btn-code-undo');
        if (btnUndo) {
            btnUndo.addEventListener('click', () => {
                if (this.isExecuting || !this.isRunning) return;
                this.undoLastCommand();
            });
        }
        
        const btnClear = document.getElementById('btn-code-clear');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                if (this.isExecuting || !this.isRunning) return;
                this.clearCommands();
            });
        }
        
        const btnReset = document.getElementById('btn-code-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (this.isExecuting || !this.isRunning) return;
                this.resetLevel();
            });
        }
    }
    
    start() {
        this.isRunning = true;
        this.levelIndex = 0;
        this.score = 0;
        
        // Update HUD display labels (Score panel is reused, Time is used for Level name)
        this.updateHUD();
        
        // Show HTML Panels
        this.codingPanel.style.display = 'flex';
        this.codingQueueContainer.style.display = 'block';
        
        this.loadLevel();
        this.loop();
    }
    
    stop() {
        this.isRunning = false;
        this.isExecuting = false;
        
        // Hide HTML Panels
        this.codingPanel.style.display = 'none';
        this.codingQueueContainer.style.display = 'none';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    loadLevel() {
        const lvl = this.levels[this.levelIndex];
        this.charPos = { ...lvl.start };
        this.clearCommands();
        this.updateHUD();
        
        if (this.app.soundSynth) {
            this.app.soundSynth.playSuccess();
        }
    }
    
    resetLevel() {
        const lvl = this.levels[this.levelIndex];
        this.charPos = { ...lvl.start };
        this.isExecuting = false;
        this.updateHUD();
    }
    
    pushCommand(dir, symbol) {
        this.commands.push({ dir, symbol });
        this.renderQueue();
    }
    
    clearCommands() {
        this.commands = [];
        this.renderQueue();
    }
    
    undoLastCommand() {
        this.commands.pop();
        this.renderQueue();
    }
    
    renderQueue() {
        if (this.commands.length === 0) {
            this.codingQueue.innerHTML = '<span style="color: #666; font-style: italic; line-height: 50px;">Komut eklemek için oklara bas...</span>';
            return;
        }
        
        this.codingQueue.innerHTML = this.commands.map((cmd, index) => {
            const activeClass = (this.isExecuting && this.executionStep === index) ? 'active' : '';
            return `<div class="queue-card ${activeClass}" style="display: flex; align-items: center; justify-content: center; width: 45px; height: 45px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; font-size: 1.4rem; box-shadow: 0 0 10px rgba(0,243,255,0.15); transition: all 0.3s ease;">${cmd.symbol}</div>`;
        }).join('');
    }
    
    updateHUD() {
        this.hudScore.innerText = this.score;
        
        // Replace time panel with Level Number text dynamically
        const timePanelVal = document.getElementById('hud-time');
        if (timePanelVal) {
            timePanelVal.innerText = `${this.levelIndex + 1} / 3`;
        }
    }
    
    runProgram() {
        if (this.commands.length === 0) return;
        
        this.isExecuting = true;
        this.executionStep = 0;
        this.renderQueue();
        
        this.executeNextStep();
    }
    
    executeNextStep() {
        if (!this.isRunning || !this.isExecuting) return;
        
        if (this.executionStep >= this.commands.length) {
            // Execution finished without hitting target
            this.isExecuting = false;
            this.renderQueue();
            this.checkLevelOutcome(true); // check if target reached, if not warn
            return;
        }
        
        const cmd = this.commands[this.executionStep];
        let nextPos = { ...this.charPos };
        
        if (cmd.dir === 'up') nextPos.y--;
        else if (cmd.dir === 'down') nextPos.y++;
        else if (cmd.dir === 'left') nextPos.x++; // Mirror correction: left on screen increases canvas x index
        else if (cmd.dir === 'right') nextPos.x--; // Mirror correction: right on screen decreases canvas x index
        
        // Validate next position
        const grid = this.levels[this.levelIndex].grid;
        const outOfBounds = nextPos.y < 0 || nextPos.y >= grid.length || nextPos.x < 0 || nextPos.x >= grid[0].length;
        
        if (outOfBounds || (grid[nextPos.y] && grid[nextPos.y][nextPos.x] === 'W')) {
            // Crash!
            if (this.app.soundSynth) this.app.soundSynth.playBlink();
            if (this.app.particleSystem) {
                // Spawn particles on character
                const cellW = 80;
                const canvasW = this.canvas.width;
                const canvasH = this.canvas.height;
                const startX = canvasW / 2 - 200;
                const startY = canvasH / 2 - 200;
                const visualX = startX + this.charPos.x * cellW + cellW / 2;
                const visualY = startY + this.charPos.y * cellW + cellW / 2;
                this.app.particleSystem.emit(visualX, visualY, '#ff007f', 25, 2);
            }
            
            this.isExecuting = false;
            this.renderQueue();
            setTimeout(() => this.resetLevel(), 1000);
            return;
        }
        
        // Play step sound
        if (this.app.soundSynth) this.app.soundSynth.playPop();
        
        // Move character
        this.charPos = nextPos;
        this.executionStep++;
        this.renderQueue();
        
        // Check if hit target immediately at this step
        if (grid[this.charPos.y][this.charPos.x] === 'T') {
            this.isExecuting = false;
            this.checkLevelOutcome(false);
            return;
        }
        
        // Continue execution after delay
        setTimeout(() => this.executeNextStep(), 600);
    }
    
    checkLevelOutcome(endedWithoutTarget) {
        const grid = this.levels[this.levelIndex].grid;
        if (grid[this.charPos.y][this.charPos.x] === 'T') {
            // Level Completed Success!
            this.score += 100;
            this.updateHUD();
            
            const cellW = 80;
            const canvasW = this.canvas.width;
            const canvasH = this.canvas.height;
            const startX = canvasW / 2 - 200;
            const startY = canvasH / 2 - 200;
            const targetVisualX = startX + this.charPos.x * cellW + cellW / 2;
            const targetVisualY = startY + this.charPos.y * cellW + cellW / 2;
            
            if (this.app.particleSystem) {
                this.app.particleSystem.emit(targetVisualX, targetVisualY, '#00ff66', 35, 3);
            }
            if (this.app.soundSynth) {
                this.app.soundSynth.playSuccess();
            }
            
            setTimeout(() => {
                this.levelIndex++;
                if (this.levelIndex >= this.levels.length) {
                    this.endGame(true);
                } else {
                    this.loadLevel();
                }
            }, 1500);
        } else if (endedWithoutTarget) {
            // Ran out of commands and target not reached
            if (this.app.soundSynth) this.app.soundSynth.playBlink();
            setTimeout(() => this.resetLevel(), 1000);
        }
    }
    
    endGame(win) {
        this.isExecuting = false;
        
        this.ctx.fillStyle = 'rgba(5,5,8,0.9)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (win) {
            this.drawUnmirroredText("TEBRİKLER!", this.canvas.width / 2, this.canvas.height / 2 - 40, '800 65px Outfit', '#00ff66');
            this.drawUnmirroredText("Harika Bir Kodlayıcısın! 🤖🚀", this.canvas.width / 2, this.canvas.height / 2 + 30, '600 35px Outfit', '#ffffff');
            this.drawUnmirroredText(`Skorun: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 100, '600 30px Outfit', '#00f3ff');
        }
        
        setTimeout(() => {
            if (this.app.state === 'coding') this.app.setState('menu');
        }, 4000);
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
        
        // Drawing Grid Maze
        const grid = this.levels[this.levelIndex].grid;
        const cellW = 80;
        const rows = grid.length;
        const cols = grid[0].length;
        
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        
        // Centered Maze Grid
        const startX = canvasW / 2 - 200;
        const startY = canvasH / 2 - 200;
        
        // 1. Draw Grid Cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellX = startX + c * cellW;
                const cellY = startY + r * cellW;
                const type = grid[r][c];
                
                // Draw Glassmorphism Grid Cell background
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(25, 25, 35, 0.45)';
                this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
                this.ctx.lineWidth = 2;
                
                // Rounded corner cells
                this.ctx.beginPath();
                this.ctx.roundRect(cellX + 4, cellY + 4, cellW - 8, cellW - 8, 12);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.restore();
                
                if (type === 'W') {
                    // Wall
                    this.ctx.save();
                    this.ctx.fillStyle = 'rgba(157, 0, 255, 0.15)';
                    this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.6)';
                    this.ctx.lineWidth = 3;
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = 'rgba(157, 0, 255, 0.5)';
                    
                    this.ctx.beginPath();
                    this.ctx.roundRect(cellX + 6, cellY + 6, cellW - 12, cellW - 12, 12);
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.restore();
                    
                    // Draw Wall Emoji (glowing)
                    this.drawUnmirroredText('🧱', cellX + cellW / 2, cellY + cellW / 2 + 15, '36px Outfit', '');
                } else if (type === 'T') {
                    // Target Star
                    this.ctx.save();
                    this.ctx.fillStyle = 'rgba(0, 255, 102, 0.08)';
                    this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.roundRect(cellX + 6, cellY + 6, cellW - 12, cellW - 12, 12);
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.restore();
                    
                    this.drawUnmirroredText('🏆', cellX + cellW / 2, cellY + cellW / 2 + 18, '42px Outfit', '');
                }
            }
        }
        
        // 2. Draw Start Cell label (Unmirrored text)
        const startCellX = startX + 0 * cellW + cellW / 2;
        const startCellY = startY + 0 * cellW + cellW / 2;
        this.drawUnmirroredText("GİRİŞ", startCellX, startCellY - 20, '800 12px Outfit', 'rgba(0,243,255,0.6)');
        
        // 3. Draw Character (Robot 🤖)
        const charCellX = startX + this.charPos.x * cellW + cellW / 2;
        const charCellY = startY + this.charPos.y * cellW + cellW / 2;
        this.ctx.save();
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00f3ff';
        this.drawUnmirroredText('🤖', charCellX, charCellY + 18, '44px Outfit', '');
        this.ctx.restore();
        
        requestAnimationFrame(() => this.loop());
    }
}
