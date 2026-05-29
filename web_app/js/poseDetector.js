class PoseDetectorJS {
    constructor(app) {
        this.app = app;
        
        this.pose = new Pose({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }});
        
        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.pose.onResults(this.onResults.bind(this));
    }
    
    async process(video) {
        await this.pose.send({image: video});
    }
    
    onResults(results) {
        if (this.app.state !== 'pose') return;
        
        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            const width = this.app.canvasManager.canvas.width;
            const height = this.app.canvasManager.canvas.height;
            
            // Map relative coordinates to absolute canvas pixel dimensions
            const landmarks = results.poseLandmarks.map(lm => ({
                x: lm.x * width,
                y: lm.y * height,
                visibility: lm.visibility !== undefined ? lm.visibility : 1.0
            }));
            
            // Let the game know where all landmarks are
            if (this.app.gamePose) {
                this.app.gamePose.updatePoseLandmarks(landmarks);
            }
        } else {
            if (this.app.gamePose) {
                this.app.gamePose.clearPoseLandmarks();
            }
        }
    }
}
