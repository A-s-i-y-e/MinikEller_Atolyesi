class UIManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.toolbar = document.getElementById('toolbar');
        this.loadingOverlay = document.getElementById('screen-loading');
        
        // Buttons
        this.btnDraw = document.getElementById('btn-draw');
        this.btnMagic = document.getElementById('btn-magic');
        this.btnErase = document.getElementById('btn-erase');
        this.btnClear = document.getElementById('btn-clear');
        this.btnSave = document.getElementById('btn-save');
        
        // Colors
        this.colorSwatches = document.querySelectorAll('.color-swatch');
        
        // Slider
        this.brushSlider = document.getElementById('brush-slider');
        this.brushSizeDisplay = document.getElementById('brush-size-display');
        
        this.setupEventListeners();
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
        this.toolbar.style.display = 'flex';
    }
    
    setupEventListeners() {
        // Tools
        this.btnDraw.addEventListener('click', () => {
            this.canvasManager.setTool('draw');
            this.canvasManager.magicMode = false;
            this.btnDraw.classList.add('active');
            this.btnMagic.classList.remove('active');
            this.btnErase.classList.remove('active');
        });
        
        this.btnMagic.addEventListener('click', () => {
            this.canvasManager.setTool('draw');
            this.canvasManager.magicMode = true;
            this.btnMagic.classList.add('active');
            this.btnDraw.classList.remove('active');
            this.btnErase.classList.remove('active');
        });
        
        this.btnErase.addEventListener('click', () => {
            this.canvasManager.setTool('erase');
            this.btnErase.classList.add('active');
            this.btnDraw.classList.remove('active');
            this.btnMagic.classList.remove('active');
        });
        
        this.btnClear.addEventListener('click', () => {
            this.canvasManager.clear();
        });
        
        this.btnSave.addEventListener('click', () => {
            this.canvasManager.save();
        });
        
        // Colors
        this.colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                // Remove active from all
                this.colorSwatches.forEach(s => s.classList.remove('active'));
                
                // Add active to clicked
                const target = e.target;
                target.classList.add('active');
                
                // Set color
                const color = target.getAttribute('data-color');
                this.canvasManager.setColor(color);
                
                // Switch to draw tool automatically (which also deactivates magic mode)
                this.btnDraw.click();
            });
        });
        
        // Brush size
        this.brushSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            this.brushSizeDisplay.innerText = size;
            this.canvasManager.setBrushSize(parseInt(size));
        });
    }
    
    // Update hand pointer coordinates and handle interactive UI elements (Hover/Dwell/Pinch click)
    updateHandPointer(x, y, isPinching) {
        // Save raw canvas coordinates for drawing on the mirrored vfx-canvas
        this.rawHandX = x;
        this.rawHandY = y;
        
        // Map mirrored canvas coordinate to physical screen coordinate
        const screenX = window.innerWidth - x;
        const screenY = y;
        
        this.handX = screenX;
        this.handY = screenY;
        this.isPinching = isPinching;
        
        // Find DOM element under the hand position
        const element = document.elementFromPoint(screenX, screenY);
        
        // Find closest interactive element
        let interactiveElement = null;
        if (element) {
            interactiveElement = element.closest('button, .menu-card, .color-swatch, input[type="range"]');
        }
        
        // Handle hover classes transition
        if (this.lastHoveredElement && this.lastHoveredElement !== interactiveElement) {
            this.lastHoveredElement.classList.remove('hand-hover');
            this.dwellStartTime = null;
            this.dwellProgress = 0;
        }
        
        if (interactiveElement) {
            if (!interactiveElement.classList.contains('hand-hover')) {
                interactiveElement.classList.add('hand-hover');
                this.dwellStartTime = Date.now();
                this.dwellProgress = 0;
                this.lastHoveredElement = interactiveElement;
            }
            
            // Dwell clicking (1 second hold to trigger)
            if (this.dwellStartTime) {
                const elapsed = Date.now() - this.dwellStartTime;
                this.dwellProgress = Math.min(100, (elapsed / 1000) * 100);
                
                if (elapsed >= 1000) {
                    interactiveElement.click();
                    this.dwellStartTime = null; // Prevent double-triggering
                    this.dwellProgress = 0;
                    if (window.app && window.app.soundSynth) {
                        window.app.soundSynth.playSuccess();
                    }
                }
            }
            
            // Pinch clicking (instant trigger when pinch starts)
            if (isPinching && !this.lastPinching) {
                interactiveElement.click();
                this.dwellStartTime = null; // Reset dwell timer
                this.dwellProgress = 0;
                if (window.app && window.app.soundSynth) {
                    window.app.soundSynth.playSuccess();
                }
            }
        } else {
            this.lastHoveredElement = null;
            this.dwellStartTime = null;
            this.dwellProgress = 0;
        }
        
        this.lastPinching = isPinching;
    }
    
    clearHandPointer() {
        if (this.lastHoveredElement) {
            this.lastHoveredElement.classList.remove('hand-hover');
        }
        this.rawHandX = undefined;
        this.rawHandY = undefined;
        this.handX = undefined;
        this.handY = undefined;
        this.isPinching = false;
        this.dwellProgress = 0;
        this.dwellStartTime = null;
        this.lastHoveredElement = null;
    }
}
