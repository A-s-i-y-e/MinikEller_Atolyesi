class HandDetectorJS {
    constructor(app) {
        this.app = app;
        this.videoElement = app.videoElement;
        this.canvasManager = app.canvasManager;
        
        // Settings for drawing
        this.pinchThresholdStart = 0.055; // Distance to start drawing (strict)
        this.pinchThresholdActive = 0.09; // Distance to keep drawing (lax)
        this.isPinchingState = false;
        this.nonPinchFrames = 0; // Frame counter for debounce
        
        this.initMediaPipe();
    }
    
    async process(video) {
        await this.hands.send({image: video});
    }
    
    initMediaPipe() {
        this.hands = new Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});
        
        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults(this.onResults.bind(this));
    }
    
    onResults(results) {
        const width = this.canvasManager.canvas.width;
        const height = this.canvasManager.canvas.height;
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0]; // Process first hand
            
            // Get index finger tip (landmark 8)
            const indexTip = landmarks[8];
            // Get thumb tip (landmark 4)
            const thumbTip = landmarks[4];
            
            // Map relative coordinates (0-1) to canvas size
            const x = indexTip.x * width;
            const y = indexTip.y * height;
            // Calculate distance between thumb and index tip for button clicks (pinch gesture)
            const distance = Math.sqrt(
                Math.pow(indexTip.x - thumbTip.x, 2) + 
                Math.pow(indexTip.y - thumbTip.y, 2)
            );
            const isPinching = distance < 0.06;
            
            // Calculate pointing gesture (index finger extended, middle finger folded)
            const dist2D = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const wrist = landmarks[0];
            const indexMcp = landmarks[5];
            const middleTip = landmarks[12];
            const middleMcp = landmarks[9];
            
            const indexOpen = dist2D(indexTip, wrist) > dist2D(indexMcp, wrist) * 1.10;
            const middleOpen = dist2D(middleTip, wrist) > dist2D(middleMcp, wrist) * 1.10;
            
            const isPointing = indexOpen && !middleOpen;
            
            // Debounce pointing state to prevent line flicker
            if (!this.nonPointingFrames) this.nonPointingFrames = 0;
            if (!this.isPointingState) this.isPointingState = false;
            
            if (isPointing) {
                this.isPointingState = true;
                this.nonPointingFrames = 0;
            } else {
                this.nonPointingFrames++;
                if (this.nonPointingFrames >= 3) { // Stop drawing after 3 consecutive non-pointing frames
                    this.isPointingState = false;
                }
            }
            
            const activeDrawing = this.isPointingState;
            
            // Update UI Manager with hand position and click/pinch state
            if (this.app.uiManager) {
                this.app.uiManager.updateHandPointer(x, y, isPinching);
            }
            
            if (this.app.state === 'draw') {
                if (activeDrawing) {
                    if (!this.canvasManager.isDrawing) {
                        this.canvasManager.startStroke(x, y);
                    } else {
                        this.canvasManager.continueStroke(x, y);
                    }
                } else {
                    if (this.canvasManager.isDrawing) {
                        this.canvasManager.endStroke();
                    }
                }
            } else if (this.app.state === 'balloon') {
                if (this.app.gameBalloon) {
                    this.app.gameBalloon.checkHit(x, y);
                }
            }
        } else {
            // No hands
            if (this.app.uiManager) {
                this.app.uiManager.clearHandPointer();
            }
            if (this.canvasManager.isDrawing) {
                this.canvasManager.endStroke();
            }
        }
    }
}
