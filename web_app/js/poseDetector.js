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
        
        if (results.poseLandmarks) {
            // Get nose landmark (index 0)
            const nose = results.poseLandmarks[0];
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            const x = nose.x * width;
            const y = nose.y * height;
            
            // Draw a crosshair on the nose via canvasManager
            const ctx = this.app.canvasManager.ctx;
            ctx.clearRect(0, 0, width, height); // Clear previous frame
            
            // Draw neon crosshair
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ff66';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x - 30, y); ctx.lineTo(x + 30, y);
            ctx.moveTo(x, y - 30); ctx.lineTo(x, y + 30);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            
            // Let the game know where the nose is
            if (this.app.gamePose) {
                this.app.gamePose.updateNosePosition(x, y);
            }
        }
    }
}
