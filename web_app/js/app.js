class App {
    constructor() {
        this.state = 'loading'; // loading, login, menu, draw, balloon, pose, emotion
        this.videoElement = document.getElementById('video-input');
        
        // Screens
        this.screens = {
            loading: document.getElementById('screen-loading'),
            login: document.getElementById('screen-login'),
            menu: document.getElementById('screen-menu'),
        };
        
        // HUD and Tools
        this.toolbar = document.getElementById('toolbar');
        this.gameHud = document.getElementById('game-hud');
        this.btnBack = document.getElementById('btn-back');
        
        // Modules
        this.particleSystem = new ParticleSystem('vfx-canvas');
        this.canvasManager = new CanvasManager('output-canvas');
        this.uiManager = new UIManager(this.canvasManager);
        this.soundSynth = new SoundSynth();
        
        // AI Detectors (Instantiated later)
        this.handDetector = null;
        this.faceDetector = null;
        this.poseDetector = null;
        
        // Games
        this.gameBalloon = null;
        this.gamePose = null;
        this.gameEmotion = null;
        
        this.setupCamera();
        this.setupEvents();
    }
    
    async setupCamera() {
        // Initialize MediaPipe Camera Utils
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.processFrame();
            },
            width: 1280,
            height: 720
        });
        
        // Init Detectors
        this.handDetector = new HandDetectorJS(this);
        this.faceDetector = new FaceDetectorJS(this);
        this.poseDetector = new PoseDetectorJS(this);
        
        // Wait for models to load (simulated wait for CDN)
        setTimeout(() => {
            this.camera.start();
            this.setState('login');
        }, 3000);
    }
    
    async processFrame() {
        // Route frame to correct AI based on state
        if (this.state === 'login' || this.state === 'emotion') {
            await this.faceDetector.process(this.videoElement);
        } 
        else if (this.state === 'draw' || this.state === 'balloon' || this.state === 'menu') {
            await this.handDetector.process(this.videoElement);
        }
        else if (this.state === 'pose') {
            await this.poseDetector.process(this.videoElement);
        }
    }
    
    setupEvents() {
        this.btnBack.addEventListener('click', () => {
            this.setState('menu');
        });
        
        // Menu Cards
        document.querySelectorAll('.menu-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = e.currentTarget.getAttribute('data-mode');
                if (mode) {
                    this.setState(mode);
                }
            });
        });
    }
    
    setState(newState) {
        if (this.state === newState) return;
        console.log("State changing to:", newState);
        this.state = newState;
        
        // Show/hide video feed based on state (only visible during active modules)
        if (newState === 'loading') {
            this.videoElement.style.display = 'none';
        } else {
            this.videoElement.style.display = 'block';
        }
        
        // Hide all screens & UI
        Object.values(this.screens).forEach(s => s.classList.remove('active'));
        this.toolbar.style.display = 'none';
        this.gameHud.style.display = 'none';
        this.btnBack.style.display = 'none';
        this.canvasManager.clear();
        
        // Cleanup Games
        if (this.gameBalloon) this.gameBalloon.stop();
        if (this.gamePose) this.gamePose.stop();
        if (this.gameEmotion) this.gameEmotion.stop();
        
        // Background effects
        document.body.style.background = 'var(--bg-dark)';
        
        switch (newState) {
            case 'loading':
                this.screens.loading.classList.add('active');
                break;
            case 'login':
                this.screens.login.classList.add('active');
                document.body.style.backgroundImage = 'radial-gradient(circle at 50% 50%, rgba(0, 243, 255, 0.2), transparent 40%)';
                break;
            case 'menu':
                this.screens.menu.classList.add('active');
                document.body.style.backgroundImage = 'radial-gradient(circle at 15% 50%, rgba(157, 0, 255, 0.15), transparent 30%), radial-gradient(circle at 85% 30%, rgba(0, 255, 102, 0.15), transparent 30%)';
                break;
            case 'draw':
                this.toolbar.style.display = 'flex';
                this.btnBack.style.display = 'flex';
                break;
            case 'balloon':
                this.gameHud.style.display = 'flex';
                this.btnBack.style.display = 'flex';
                if (!this.gameBalloon) this.gameBalloon = new GameBalloon(this);
                this.gameBalloon.start();
                break;
            case 'pose':
                this.gameHud.style.display = 'flex';
                this.btnBack.style.display = 'flex';
                if (!this.gamePose) this.gamePose = new GamePose(this);
                this.gamePose.start();
                break;
            case 'emotion':
                this.gameHud.style.display = 'flex';
                this.btnBack.style.display = 'flex';
                if (!this.gameEmotion) this.gameEmotion = new GameEmotion(this);
                this.gameEmotion.start();
                break;
        }
    }
}

// Boot
window.onload = () => {
    window.app = new App();
};
