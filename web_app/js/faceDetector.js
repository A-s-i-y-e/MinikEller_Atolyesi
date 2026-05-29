class FaceDetectorJS {
    constructor(app) {
        this.app = app;
        this.smileProgress = 0;
        this.smileBar = document.getElementById('smile-bar-fill');
        this.lastBlinkLeft = false;
        this.lastBlinkRight = false;
        
        this.faceMesh = new FaceMesh({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }});
        
        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        this.faceMesh.onResults(this.onResults.bind(this));
        
        // Initial drawing of the neutral face avatar
        setTimeout(() => this.drawAvatar(0, false, false, false), 500);
    }
    
    async process(video) {
        await this.faceMesh.send({image: video});
    }
    
    onResults(results) {
        if (this.app.state !== 'login' && this.app.state !== 'emotion') return;
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // Calculate Smile using robust normalized width and corners elevation
            const leftEyeOuter = landmarks[33];
            const rightEyeOuter = landmarks[263];
            const eyeDist = Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y) + 0.001;

            const leftMouth = landmarks[61];
            const rightMouth = landmarks[291];
            const mouthWidth = Math.hypot(rightMouth.x - leftMouth.x, rightMouth.y - leftMouth.y);
            const mouthHeight = Math.hypot(landmarks[13].x - landmarks[14].x, landmarks[13].y - landmarks[14].y);
            
            const normMouthW = mouthWidth / eyeDist;
            const lipCenterY = (landmarks[13].y + landmarks[14].y) / 2;
            const cornersAverageY = (leftMouth.y + rightMouth.y) / 2;
            const cornersUp = (lipCenterY - cornersAverageY) / eyeDist;

            // Combine both factors: resting normMouthW ≈ 0.75, cornersUp ≈ 0.0
            // Smiling stretches lips (normMouthW increases) and pulls corners up (cornersUp increases)
            const smileScore = (normMouthW - 0.76) * 2.5 + (cornersUp > 0 ? cornersUp * 4.0 : cornersUp * 1.5);
            const isSmiling = smileScore > 0.20; 

            // Eye aspects for blink detection
            const leftEyeTop = landmarks[159];
            const leftEyeBot = landmarks[145];
            const leftEyeLeft = landmarks[33];
            const leftEyeRight = landmarks[133];
            const leftEAR = Math.hypot(leftEyeTop.x - leftEyeBot.x, leftEyeTop.y - leftEyeBot.y) / 
                            Math.hypot(leftEyeLeft.x - leftEyeRight.x, leftEyeLeft.y - leftEyeRight.y);

            const rightEyeTop = landmarks[386];
            const rightEyeBot = landmarks[374];
            const rightEyeLeft = landmarks[362];
            const rightEyeRight = landmarks[263];
            const rightEAR = Math.hypot(rightEyeTop.x - rightEyeBot.x, rightEyeTop.y - rightEyeBot.y) / 
                             Math.hypot(rightEyeLeft.x - rightEyeRight.x, rightEyeLeft.y - rightEyeRight.y);

            const blinkLeft = leftEAR < 0.18;
            const blinkRight = rightEAR < 0.18;
            const jawOpen = (mouthHeight / (mouthWidth + 0.001)) > 0.35;
            
            // Blink sound trigger
            if ((blinkLeft && !this.lastBlinkLeft) || (blinkRight && !this.lastBlinkRight)) {
                this.app.soundSynth.playBlink();
            }
            this.lastBlinkLeft = blinkLeft;
            this.lastBlinkRight = blinkRight;
            
            if (this.app.state === 'login') {
                if (isSmiling) { // Correct smile check
                    this.smileProgress += 2.5;
                    this.app.soundSynth.playSmilePower(this.smileProgress);
                    // Add some VFX
                    this.app.particleSystem.emit(
                        window.innerWidth/2 + (Math.random()-0.5)*200, 
                        window.innerHeight/2 + 100, 
                        '#ff007f', 1, 0.5
                    );
                } else {
                    this.smileProgress -= 2.0; // Drains when resting
                }
                
                this.smileProgress = Math.max(0, Math.min(100, this.smileProgress));
                if (this.smileBar) this.smileBar.style.width = this.smileProgress + '%';
                
                // Draw vector face and its progress ring
                this.drawAvatar(this.smileProgress, blinkLeft, blinkRight, jawOpen);
                
                if (this.smileProgress >= 100) {
                    this.smileProgress = 0;
                    this.app.soundSynth.playSuccess();
                    this.app.particleSystem.emit(window.innerWidth/2, window.innerHeight/2, '#00ff66', 60, 2);
                    setTimeout(() => {
                        this.app.setState('menu');
                    }, 800);
                }
            } else if (this.app.state === 'emotion') {
                if (this.app.gameEmotion) {
                    this.app.gameEmotion.update({
                        smile: smileScore,
                        blinkLeft: blinkLeft,
                        blinkRight: blinkRight,
                        jawOpen: jawOpen
                    });
                }
            }
        } else {
            if (this.app.state === 'login') {
                this.smileProgress = Math.max(0, this.smileProgress - 1.5);
                if (this.smileBar) this.smileBar.style.width = this.smileProgress + '%';
                this.drawAvatar(this.smileProgress, false, false, false);
            }
        }
    }

    drawAvatar(progress, blinkLeft = false, blinkRight = false, jawOpen = false) {
        const canvas = document.getElementById('login-avatar-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 210; // Scaled up face radius (~3x of 70)
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Faint outer background ring
        ctx.beginPath();
        ctx.arc(cx, cy, r + 40, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 14;
        ctx.stroke();
        
        // 2. Glowing completion progress ring (border completes like in desktop)
        if (progress > 0) {
            const angle = (progress / 100) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r + 40, -Math.PI / 2, -Math.PI / 2 + angle);
            
            // Neon gradient style
            const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
            grad.addColorStop(0, '#00f3ff'); // cyan
            grad.addColorStop(1, '#ff007f'); // pink
            
            ctx.strokeStyle = grad;
            ctx.lineWidth = 18;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 24;
            ctx.shadowColor = progress > 50 ? '#ff007f' : '#00f3ff';
            ctx.stroke();
            ctx.shadowBlur = 0; // Reset
        }
        
        // 3. Draw Transparent Face Outline (Sarı zemin şeffaf, sadece kontur var)
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        // Face outline is semi-transparent white/cyan, getting brighter as smile progress completes
        ctx.strokeStyle = `rgba(0, 243, 255, ${0.4 + (progress/100)*0.5})`;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Draw dotted helper ears as alignment guides for kids
        if (progress < 25) {
            ctx.beginPath();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
            ctx.lineWidth = 4;
            // Left Ear Outline
            ctx.arc(cx - r, cy, 40, Math.PI * 0.5, Math.PI * 1.5);
            ctx.stroke();
            // Right Ear Outline
            ctx.beginPath();
            ctx.arc(cx + r, cy, 40, Math.PI * 1.5, Math.PI * 0.5);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
        }
        
        // Faint glowing backdrop within the circle just to define face borders cleanly
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.04)';
        ctx.fill();
        
        // 4. Draw Eyes
        const eyeXOffset = 65;
        const eyeYOffset = 50;
        
        // Eyes are drawn in glowing white/cyan vector style rather than plain dark grey to look good overlaying the camera feed
        ctx.strokeStyle = '#00f3ff';
        ctx.fillStyle = '#00f3ff';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        
        // Left Eye
        if (blinkLeft) {
            ctx.beginPath();
            ctx.moveTo(cx - eyeXOffset - 35, cy - eyeYOffset);
            ctx.lineTo(cx - eyeXOffset + 35, cy - eyeYOffset);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(cx - eyeXOffset, cy - eyeYOffset, 30, 0, Math.PI * 2);
            ctx.fill();
            // Pupil shine
            ctx.beginPath();
            ctx.arc(cx - eyeXOffset - 9, cy - eyeYOffset - 9, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.fillStyle = '#00f3ff'; // Reset
        }
        
        // Right Eye
        if (blinkRight) {
            ctx.beginPath();
            ctx.moveTo(cx + eyeXOffset - 35, cy - eyeYOffset);
            ctx.lineTo(cx + eyeXOffset + 35, cy - eyeYOffset);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(cx + eyeXOffset, cy - eyeYOffset, 30, 0, Math.PI * 2);
            ctx.fill();
            // Pupil shine
            ctx.beginPath();
            ctx.arc(cx + eyeXOffset - 9, cy - eyeYOffset - 9, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.fillStyle = '#00f3ff'; // Reset
        }
        
        // 5. Draw Mouth (Dynamic based on jawOpen and smile progress)
        const mouthY = cy + 50;
        const mouthW = 130 + (progress / 100) * 50;
        
        if (jawOpen) {
            // Draw open mouth (ellipse shape)
            const jawHeight = 35 + (progress / 100) * 60;
            ctx.beginPath();
            ctx.ellipse(cx, mouthY + 15, mouthW / 2, jawHeight, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fill();
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#00f3ff';
            ctx.stroke();
            
            // Draw tongue inside open mouth if smiling
            if (progress > 30) {
                ctx.beginPath();
                ctx.ellipse(cx, mouthY + 15 + jawHeight/2, mouthW / 3, jawHeight / 2, 0, Math.PI, Math.PI * 2);
                ctx.fillStyle = '#ff007f';
                ctx.fill();
            }
        } else {
            // Draw curved smile line
            const smileDepth = 15 + (progress / 100) * 75;
            ctx.beginPath();
            ctx.moveTo(cx - mouthW / 2, mouthY);
            ctx.quadraticCurveTo(cx, mouthY + smileDepth, cx + mouthW / 2, mouthY);
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 14;
            ctx.stroke();
        }
        
        // 6. Draw Blushing Cheeks (more intense pink as smile progress increases)
        if (progress > 10) {
            const blushAlpha = (progress / 100) * 0.7;
            ctx.beginPath();
            ctx.arc(cx - 120, cy + 25, 35, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 127, ${blushAlpha})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(cx + 120, cy + 25, 35, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 127, ${blushAlpha})`;
            ctx.fill();
        }
    }
}
