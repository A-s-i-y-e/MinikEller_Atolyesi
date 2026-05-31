class CanvasShape {
    constructor(type, x, y, size = 120, color = '#ff007f') {
        this.type = type; // 'star', 'circle', 'house', 'flower', 'heart', 'tree', 'cloud'
        this.x = x;
        this.y = y;
        this.width = size;
        this.height = size;
        this.color = color;
    }

    draw(ctx, isSelected) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color + '22'; // Translucent fill
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Neon glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        const w = this.width;
        const h = this.height;

        if (this.type === 'circle') {
            ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
        } else if (this.type === 'star') {
            const points = 5;
            const inset = 0.45;
            const rOuter = w / 2;
            const rInner = rOuter * inset;
            ctx.moveTo(0, -rOuter);
            for (let i = 0; i < points * 2; i++) {
                const angle = (i * Math.PI) / points - Math.PI / 2;
                const r = i % 2 === 0 ? rOuter : rInner;
                ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
            }
            ctx.closePath();
        } else if (this.type === 'house') {
            // Roof
            ctx.moveTo(-w / 2, h / 6);
            ctx.lineTo(0, -h / 2);
            ctx.lineTo(w / 2, h / 6);
            // House Base
            ctx.lineTo(w / 2, h / 2);
            ctx.lineTo(-w / 2, h / 2);
            ctx.closePath();
            // Door
            ctx.moveTo(-w / 6, h / 2);
            ctx.lineTo(-w / 6, h / 6);
            ctx.lineTo(w / 6, h / 6);
            ctx.lineTo(w / 6, h / 2);
        } else if (this.type === 'flower') {
            const petals = 6;
            const r = w / 4;
            for (let i = 0; i < petals; i++) {
                const angle = (i * Math.PI * 2) / petals;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                ctx.moveTo(px + r, py);
                ctx.arc(px, py, r, 0, Math.PI * 2);
            }
            // Center disc
            ctx.moveTo(r / 3, 0);
            ctx.arc(0, 0, r / 3, 0, Math.PI * 2);
        } else if (this.type === 'heart') {
            ctx.moveTo(0, -h / 4);
            ctx.bezierCurveTo(-w / 2, -h / 2, -w / 2, h / 6, 0, h / 2);
            ctx.bezierCurveTo(w / 2, h / 6, w / 2, -h / 2, 0, -h / 4);
            ctx.closePath();
        } else if (this.type === 'tree') {
            // Trunk
            ctx.rect(-w / 10, h / 4, w / 5, h / 4);
            // Pine leaves (3 tiers of triangles)
            ctx.moveTo(-w / 2, h / 4);
            ctx.lineTo(w / 2, h / 4);
            ctx.lineTo(0, -h / 6);
            ctx.closePath();
            
            ctx.moveTo(-w / 2.5 + 10, -h / 12);
            ctx.lineTo(w / 2.5 - 10, -h / 12);
            ctx.lineTo(0, -h / 3);
            ctx.closePath();
            
            ctx.moveTo(-w / 3.5 + 15, -h / 4);
            ctx.lineTo(w / 3.5 - 15, -h / 4);
            ctx.lineTo(0, -h / 2);
            ctx.closePath();
        } else if (this.type === 'cloud') {
            ctx.moveTo(-w / 3, h / 6);
            ctx.bezierCurveTo(-w / 2, h / 6, -w / 2, -h / 6, -w / 4, -h / 6);
            ctx.bezierCurveTo(-w / 4, -h / 2.2, w / 4, -h / 2.2, w / 4, -h / 6);
            ctx.bezierCurveTo(w / 2, -h / 6, w / 2, h / 6, w / 3, h / 6);
            ctx.closePath();
        }
        
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw bounding box and handles if selected
        if (isSelected) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(this.x - w / 2 - 10, this.y - h / 2 - 10, w + 20, h + 20);
            ctx.restore();

            // Resize handle at bottom-right corner
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + w / 2 + 10, this.y + h / 2 + 10, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff66';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ff66';
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    containsPoint(px, py) {
        // Genişletilmiş seçme alanı (hitbox) - Çocuklar için yakalamayı kolaylaştırır
        const padding = 35;
        return px >= this.x - this.width / 2 - padding &&
               px <= this.x + this.width / 2 + padding &&
               py >= this.y - this.height / 2 - padding &&
               py <= this.y + this.height / 2 + padding;
    }

    isNearResizeHandle(px, py) {
        const w = this.width;
        const h = this.height;
        const hx = this.x + w / 2 + 10;
        const hy = this.y + h / 2 + 10;
        const dist = Math.hypot(px - hx, py - hy);
        return dist <= 75; // Çocukların kolay tutabilmesi için alanı 75 piksele çıkardık
    }
}

class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Settings
        this.currentColor = '#ff007f';
        this.brushSize = 15;
        this.currentTool = 'draw'; // 'draw' or 'erase'
        
        // Paint layer (raster canvas)
        this.paintCanvas = null;
        this.paintCtx = null;
        
        // Shape manipulation state
        this.shapes = [];
        this.selectedShape = null;
        this.isDrawing = false;
        this.isDraggingShape = false;
        this.isResizingShape = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.lastX = 0;
        this.lastY = 0;
        
        // Gesture mode: 'pinch' or 'point'
        this.drawingGestureMode = 'pinch';
        
        // Resize canvas to fill window (also creates paintCanvas)
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start dynamic rendering loop
        this.startLoop();
    }
    
    resize() {
        const tempCanvas = document.createElement('canvas');
        const prevW = this.paintCanvas ? this.paintCanvas.width : this.canvas.width;
        const prevH = this.paintCanvas ? this.paintCanvas.height : this.canvas.height;
        
        tempCanvas.width = prevW > 0 ? prevW : window.innerWidth;
        tempCanvas.height = prevH > 0 ? prevH : window.innerHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (this.paintCanvas && this.paintCanvas.width > 0 && this.paintCanvas.height > 0) {
            tempCtx.drawImage(this.paintCanvas, 0, 0);
        } else if (this.canvas.width > 0 && this.canvas.height > 0) {
            tempCtx.drawImage(this.canvas, 0, 0);
        }
        
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        this.canvas.width = w;
        this.canvas.height = h;
        
        if (!this.paintCanvas) {
            this.paintCanvas = document.createElement('canvas');
            this.paintCtx = this.paintCanvas.getContext('2d');
        }
        this.paintCanvas.width = w;
        this.paintCanvas.height = h;
        
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            this.paintCtx.drawImage(tempCanvas, 0, 0);
        }
        
        this.paintCtx.lineJoin = 'round';
        this.paintCtx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
    }
    
    setColor(colorHex) {
        this.currentColor = colorHex;
        if (this.selectedShape) {
            this.selectedShape.color = colorHex;
        }
    }
    
    setBrushSize(size) {
        this.brushSize = size;
    }
    
    setTool(toolName) {
        this.currentTool = toolName;
    }
    
    addShape(type) {
        // Deselect the previous shape without baking it
        this.selectedShape = null;
        
        // Ekranın sağ tarafında (aynalı canvas üzerinde x = 250, sağ kenara yakın görünür) oluşturur
        const posX = 250;
        const posY = this.canvas.height / 2;
        const newShape = new CanvasShape(type, posX, posY, 120, this.currentColor);
        this.shapes.push(newShape);
        this.selectedShape = newShape; // Yeni eklenen şekli otomatik seç
        
        if (window.app && window.app.uiManager) {
            window.app.uiManager.showBakeButton(true);
        }
    }
    
    bakeShape(shape) {
        if (!shape) return;
        // Şekli kalıcı olarak arka plan resim katmanına (paintCtx) çiz
        shape.draw(this.paintCtx, false);
        // Aktif hareketli nesne listesinden kaldır
        const idx = this.shapes.indexOf(shape);
        if (idx > -1) {
            this.shapes.splice(idx, 1);
        }
        if (this.selectedShape === shape) {
            this.selectedShape = null;
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showBakeButton(false);
            }
        }
    }
    
    bakeSelectedShape() {
        if (this.selectedShape) {
            this.bakeShape(this.selectedShape);
        }
    }
    
    startStroke(x, y) {
        // 1. Check if we pinch the resize handle of the selected shape
        if (this.selectedShape && this.selectedShape.isNearResizeHandle(x, y)) {
            this.isResizingShape = true;
            this.isDrawing = true;
            return;
        }

        // 2. Check if we pinch inside any shape (iterate backwards for top-most first)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.shapes[i].containsPoint(x, y)) {
                this.selectedShape = this.shapes[i];
                this.isDraggingShape = true;
                this.isDrawing = true;
                this.dragOffsetX = x - this.shapes[i].x;
                this.dragOffsetY = y - this.shapes[i].y;
                if (window.app && window.app.uiManager) {
                    window.app.uiManager.showBakeButton(true);
                }
                return;
            }
        }

        // 3. Otherwise, click outside shape: deselect (do not bake) and start drawing freehand
        if (this.selectedShape) {
            this.selectedShape = null;
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showBakeButton(false);
            }
        }
        this.isDrawing = true;
        this.lastX = x;
        this.lastY = y;
        
        // Draw a starting dot on paintCanvas
        this.paintCtx.save();
        this.paintCtx.beginPath();
        this.paintCtx.arc(x, y, this.brushSize / 2, 0, 2 * Math.PI);
        
        if (this.currentTool === 'erase') {
            this.paintCtx.globalCompositeOperation = 'destination-out';
            this.paintCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            this.paintCtx.globalCompositeOperation = 'source-over';
            this.paintCtx.fillStyle = this.currentColor;
        }
        
        this.paintCtx.fill();
        this.paintCtx.restore();
    }
    
    continueStroke(x, y) {
        // Resize shape logic
        if (this.isResizingShape && this.selectedShape) {
            const newWidth = Math.max(40, Math.abs(x - this.selectedShape.x) * 2);
            const newHeight = Math.max(40, Math.abs(y - this.selectedShape.y) * 2);
            this.selectedShape.width = newWidth;
            this.selectedShape.height = newHeight;
            return;
        }

        // Drag shape logic
        if (this.isDraggingShape && this.selectedShape) {
            this.selectedShape.x = x - this.dragOffsetX;
            this.selectedShape.y = y - this.dragOffsetY;
            return;
        }

        // Draw freehand logic
        if (!this.isDrawing) return;
        
        this.paintCtx.save();
        this.paintCtx.beginPath();
        this.paintCtx.moveTo(this.lastX, this.lastY);
        this.paintCtx.lineTo(x, y);
        
        if (this.currentTool === 'erase') {
            this.paintCtx.globalCompositeOperation = 'destination-out';
            this.paintCtx.strokeStyle = 'rgba(0,0,0,1)';
            this.paintCtx.lineWidth = this.brushSize * 2;
        } else {
            this.paintCtx.globalCompositeOperation = 'source-over';
            
            if (this.magicMode) {
                const time = Date.now() * 0.002;
                this.paintCtx.strokeStyle = `hsl(${(time * 100) % 360}, 100%, 50%)`;
                if (Math.random() > 0.5 && window.app) {
                    window.app.particleSystem.emit(x, y, this.paintCtx.strokeStyle, 2, 0.5);
                }
            } else {
                this.paintCtx.strokeStyle = this.currentColor;
            }
            
            this.paintCtx.lineWidth = this.brushSize;
            this.paintCtx.shadowBlur = 15;
            this.paintCtx.shadowColor = this.paintCtx.strokeStyle;
        }
        
        this.paintCtx.stroke();
        this.paintCtx.restore();
        
        this.lastX = x;
        this.lastY = y;
    }
    
    endStroke() {
        this.isDrawing = false;
        this.isDraggingShape = false;
        this.isResizingShape = false;
    }
    
    clear() {
        // If a shape is selected, delete that shape instead of clearing canvas
        if (this.selectedShape) {
            const idx = this.shapes.indexOf(this.selectedShape);
            if (idx > -1) {
                this.shapes.splice(idx, 1);
            }
            this.selectedShape = null;
            if (window.app && window.app.uiManager) {
                window.app.uiManager.showBakeButton(false);
            }
            return;
        }

        // Clear freehand layer and all shapes
        if (this.paintCtx) {
            this.paintCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.shapes = [];
        this.selectedShape = null;
        if (window.app && window.app.uiManager) {
            window.app.uiManager.showBakeButton(false);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    render() {
        // Only render shapes and paint layer if we are in 'draw' state
        if (window.app && window.app.state !== 'draw') {
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Draw paint layer (freehand drawing)
        if (this.paintCanvas && this.paintCanvas.width > 0 && this.paintCanvas.height > 0) {
            this.ctx.drawImage(this.paintCanvas, 0, 0);
        }
        
        // 2. Draw all shapes (and bounding boxes if selected)
        for (const shape of this.shapes) {
            shape.draw(this.ctx, shape === this.selectedShape);
        }
    }
    
    startLoop() {
        const loop = () => {
            this.render();
            requestAnimationFrame(loop);
        };
        loop();
    }
    
    save() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw freehand layer
        if (this.paintCanvas) {
            tempCtx.drawImage(this.paintCanvas, 0, 0);
        }
        
        // Draw shapes (no editing borders)
        for (const shape of this.shapes) {
            shape.draw(tempCtx, false);
        }
        
        const link = document.createElement('a');
        link.download = `minik-eller-cizim-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }
}
