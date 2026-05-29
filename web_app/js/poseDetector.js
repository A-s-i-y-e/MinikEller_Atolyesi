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
            // Get nose landmark (index 0)
            const nose = results.poseLandmarks[0];
            const width = this.app.canvasManager.canvas.width;
            const height = this.app.canvasManager.canvas.height;
            
            const x = nose.x * width;
            const y = nose.y * height;
            
            // Let the game know where the nose is
            if (this.app.gamePose) {
                this.app.gamePose.updateNosePosition(x, y);
            }
        } else {
            if (this.app.gamePose) {
                this.app.gamePose.clearNoseActive();
            }
        }
    }
}
