class HandDetectorJS {
    constructor(app) {
        this.app = app;
        this.videoElement = app.videoElement;
        this.canvasManager = app.canvasManager;
        
        // Settings for drawing
        this.pinchThreshold = 0.05; // Distance between thumb and index to consider a "click" or "draw"
        
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
            
            // Calculate distance between thumb and index tip
            const distance = Math.sqrt(
                Math.pow(indexTip.x - thumbTip.x, 2) + 
                Math.pow(indexTip.y - thumbTip.y, 2)
            );
            
            // Gesture logic
            const isPinching = distance < this.pinchThreshold;
            
            // Update UI Manager with hand position and click/pinch state
            if (this.app.uiManager) {
                this.app.uiManager.updateHandPointer(x, y, isPinching);
            }
            
            if (this.app.state === 'draw') {
                if (isPinching) {
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
                if (isPinching) {
                    if (this.app.gameBalloon) {
                        this.app.gameBalloon.checkHit(x, y);
                    }
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
