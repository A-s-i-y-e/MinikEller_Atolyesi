class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Settings
        this.currentColor = '#ff0040';
        this.brushSize = 15;
        this.currentTool = 'draw'; // 'draw' or 'erase'
        
        // State
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        
        // Resize canvas to fill window
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        // Save current content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            tempCtx.drawImage(this.canvas, 0, 0);
        }
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Restore content
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        // Set canvas defaults
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
    }
    
    setColor(colorHex) {
        this.currentColor = colorHex;
    }
    
    setBrushSize(size) {
        this.brushSize = size;
    }
    
    setTool(toolName) {
        this.currentTool = toolName;
    }
    
    // Called by HandDetector when index finger is up
    drawPointer(x, y) {
        // Handled dynamically on vfx-canvas to avoid leaving trails on the drawing canvas
    }
    
    startStroke(x, y) {
        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;
        
        // Draw a dot on tap
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.brushSize / 2, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.currentTool === 'erase' ? '#0a0a14' : this.currentColor;
        this.ctx.fill();
    }
    
    continueStroke(x, y) {
        if (!this.isDrawing) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(x, y);
        
        if (this.currentTool === 'erase') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
            this.ctx.lineWidth = this.brushSize * 2;
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            
            if (this.magicMode) {
                // Rainbow color
                const time = Date.now() * 0.002;
                this.ctx.strokeStyle = `hsl(${(time * 100) % 360}, 100%, 50%)`;
                
                // Random sparks
                if (Math.random() > 0.5 && window.app) {
                    window.app.particleSystem.emit(x, y, this.ctx.strokeStyle, 2, 0.5);
                }
            } else {
                this.ctx.strokeStyle = this.currentColor;
            }
            
            this.ctx.lineWidth = this.brushSize;
            
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.ctx.strokeStyle;
        }
        
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0;
        this.ctx.globalCompositeOperation = 'source-over';
        
        this.lastX = x;
        this.lastY = y;
    }
    
    endStroke() {
        this.isDrawing = false;
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    save() {
        const link = document.createElement('a');
        link.download = `minik-eller-cizim-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}
