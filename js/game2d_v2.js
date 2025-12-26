class SoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playSound(type) {
        if (!this.enabled) return;

        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        switch(type) {
            case 'coin':
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.1);
                break;

            case 'caught':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.4, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
                break;

            case 'win':
                this.playWinSequence();
                break;

            case 'lose':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
                break;

            case 'trap':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.2);
                break;

            case 'bonus':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.15);
                break;

            case 'rush':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
                break;
        }
    }

    playWinSequence() {
        const ctx = this.audioContext;
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);

            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    }
}

class Game2D {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.joystickCanvas = document.getElementById('joystick');
        this.joystickCtx = this.joystickCanvas.getContext('2d', { alpha: true });

        this.sound = new SoundManager();

        this.state = 'menu';
        this.time = 120;
        this.coinsCollected = 0;
        this.coinsTotal = 35;
        this.coinsRequired = 35;
        this.lives = 3;

        this.player = {
            x: 400,
            y: 300,
            radius: 14,
            speed: 280,
            color: '#00ff00',
            direction: 1,
            wheelchair: {
                wheelRotation: 0,
                wheelSpeed: 0
            }
        };

        this.bossImage = new Image();
        this.bossImage.src = 'assets/images/boss.png';
        this.boss = {
            x: 100,
            y: 100,
            radius: 20,
            speed: 160,
            baseSpeed: 160,
            rushTimer: 0,
            rushCooldown: 0
        };

        this.hackerImage = new Image();
        this.hackerImage.src = 'assets/images/aaa.png';

        this.obstacles = [];
        this.generateObstacles();

        this.coins = [];
        this.generateCoins();

        this.traps = [];
        this.generateTraps();

        this.bonuses = [];
        this.generateBonuses();

        this.drones = [];
        this.generateDrones();

        this.slowEffect = {
            active: false,
            duration: 0
        };

        this.speedBoost = {
            active: false,
            duration: 0
        };

        this.particles = [];

        this.combo = {
            count: 0,
            timer: 0,
            maxTime: 2
        };

        this.waveSystem = {
            timer: 0,
            interval: 25,
            maxDrones: 5
        };

        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            baseX: 125,
            baseY: 125,
            knobX: 125,
            knobY: 125,
            radius: 80,
            knobRadius: 40,
            deltaX: 0,
            deltaY: 0
        };

        this.animTime = 0;

        this.displayWidth = window.innerWidth - 20;
        this.displayHeight = window.innerHeight - 20;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupJoystick();

        this.setupUI();

        this.lastTime = 0;
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const padding = 20;

        const displayWidth = window.innerWidth - padding;
        const displayHeight = window.innerHeight - padding;

        const canvasWidth = displayWidth * dpr;
        const canvasHeight = displayHeight * dpr;

        if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
            this.canvas.width = canvasWidth;
            this.canvas.height = canvasHeight;

            this.canvas.style.width = displayWidth + 'px';
            this.canvas.style.height = displayHeight + 'px';

            this.ctx.scale(dpr, dpr);
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
        }

        let joystickSize = 200;
        if (window.innerWidth <= 480) {
            joystickSize = 120;
        } else if (window.innerWidth <= 768) {
            joystickSize = 150;
        }

        const joyCanvasWidth = joystickSize * dpr;
        const joyCanvasHeight = joystickSize * dpr;

        if (this.joystickCanvas.width !== joyCanvasWidth || this.joystickCanvas.height !== joyCanvasHeight) {
            this.joystickCanvas.width = joyCanvasWidth;
            this.joystickCanvas.height = joyCanvasHeight;

            this.joystickCanvas.style.width = joystickSize + 'px';
            this.joystickCanvas.style.height = joystickSize + 'px';

            this.joystickCtx.scale(dpr, dpr);
            this.joystickCtx.imageSmoothingEnabled = true;
            this.joystickCtx.imageSmoothingQuality = 'high';
        }

        this.joystick.baseX = joystickSize / 2;
        this.joystick.baseY = joystickSize / 2;
        this.joystick.knobX = this.joystick.baseX;
        this.joystick.knobY = this.joystick.baseY;
        this.joystick.radius = joystickSize * 0.38;
        this.joystick.knobRadius = joystickSize * 0.19;

        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
    }

    generateCoins() {
        this.coins = [];

        if (!this.obstacles || !Array.isArray(this.obstacles)) {
            this.obstacles = [];
        }

        let attempts = 0;
        const maxAttempts = 1000;

        while (this.coins.length < this.coinsTotal && attempts < maxAttempts) {
            attempts++;

            const coin = {
                x: Math.random() * (this.displayWidth - 60) + 30,
                y: Math.random() * (this.displayHeight - 60) + 30,
                radius: 6,
                collected: false
            };

            let collides = false;
            for (const obs of this.obstacles) {
                if (this.checkCircleRectCollision(coin.x, coin.y, coin.radius + 10, obs)) {
                    collides = true;
                    break;
                }
            }

            if (!collides) {
                this.coins.push(coin);
            }
        }

        while (this.coins.length < this.coinsTotal) {
            this.coins.push({
                x: Math.random() * (this.displayWidth - 60) + 30,
                y: Math.random() * (this.displayHeight - 60) + 30,
                radius: 10,
                collected: false
            });
        }
    }

    generateTraps() {
        this.traps = [];

        const area = this.displayWidth * this.displayHeight;
        const baseArea = 640000;
        const areaRatio = area / baseArea;
        const numTraps = Math.max(3, Math.min(7, Math.floor(5 * areaRatio)));

        for (let i = 0; i < numTraps; i++) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 200) {
                attempts++;
                const trapType = Math.random() < 0.7 ? 'damage' : 'teleport';
                const trap = {
                    x: Math.random() * (this.displayWidth - 100) + 50,
                    y: Math.random() * (this.displayHeight - 100) + 50,
                    radius: 16,
                    rotation: Math.random() * Math.PI * 2,
                    type: trapType
                };

                let collides = false;

                for (const obs of this.obstacles) {
                    if (this.checkCircleRectCollision(trap.x, trap.y, trap.radius + 30, obs)) {
                        collides = true;
                        break;
                    }
                }

                if (!collides) {
                    for (const coin of this.coins) {
                        const dist = Math.sqrt(Math.pow(trap.x - coin.x, 2) + Math.pow(trap.y - coin.y, 2));
                        if (dist < trap.radius + coin.radius + 40) {
                            collides = true;
                            break;
                        }
                    }
                }

                if (!collides) {
                    for (const otherTrap of this.traps) {
                        const dist = Math.sqrt(Math.pow(trap.x - otherTrap.x, 2) + Math.pow(trap.y - otherTrap.y, 2));
                        if (dist < trap.radius + otherTrap.radius + 50) {
                            collides = true;
                            break;
                        }
                    }
                }

                if (!collides) {
                    this.traps.push(trap);
                    placed = true;
                }
            }
        }
    }

    generateBonuses() {
        this.bonuses = [];

        const area = this.displayWidth * this.displayHeight;
        const baseArea = 640000;
        const areaRatio = area / baseArea;
        const numBonuses = Math.max(2, Math.min(5, Math.floor(3 * areaRatio)));

        for (let i = 0; i < numBonuses; i++) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 200) {
                attempts++;
                const bonusTypes = ['speed', 'shield', 'magnet', 'freeze'];
                const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];

                const bonus = {
                    x: Math.random() * (this.displayWidth - 100) + 50,
                    y: Math.random() * (this.displayHeight - 100) + 50,
                    radius: 10,
                    type: type,
                    collected: false
                };

                let collides = false;

                for (const obs of this.obstacles) {
                    if (this.checkCircleRectCollision(bonus.x, bonus.y, bonus.radius + 30, obs)) {
                        collides = true;
                        break;
                    }
                }

                if (!collides) {
                    for (const coin of this.coins) {
                        const dist = Math.sqrt(Math.pow(bonus.x - coin.x, 2) + Math.pow(bonus.y - coin.y, 2));
                        if (dist < bonus.radius + coin.radius + 35) {
                            collides = true;
                            break;
                        }
                    }
                }

                if (!collides) {
                    for (const trap of this.traps) {
                        const dist = Math.sqrt(Math.pow(bonus.x - trap.x, 2) + Math.pow(bonus.y - trap.y, 2));
                        if (dist < bonus.radius + trap.radius + 60) {
                            collides = true;
                            break;
                        }
                    }
                }

                if (!collides) {
                    for (const otherBonus of this.bonuses) {
                        const dist = Math.sqrt(Math.pow(bonus.x - otherBonus.x, 2) + Math.pow(bonus.y - otherBonus.y, 2));
                        if (dist < bonus.radius + otherBonus.radius + 50) {
                            collides = true;
                            break;
                        }
                    }
                }

                if (!collides) {
                    this.bonuses.push(bonus);
                    placed = true;
                }
            }
        }
    }

    generateDrones() {
        this.drones = [];
        const numDrones = 2;

        for (let i = 0; i < numDrones; i++) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                attempts++;

                const drone = {
                    x: Math.random() * (this.displayWidth - 100) + 50,
                    y: Math.random() * (this.displayWidth - 100) + 50,
                    radius: 12,
                    speed: 100,
                    patrolPoints: [],
                    currentTargetIndex: 0,
                    justHit: false
                };

                for (let j = 0; j < 3; j++) {
                    drone.patrolPoints.push({
                        x: Math.random() * (this.displayWidth - 100) + 50,
                        y: Math.random() * (this.displayHeight - 100) + 50
                    });
                }

                let collides = false;

                for (const obs of this.obstacles) {
                    if (this.checkCircleRectCollision(drone.x, drone.y, drone.radius + 40, obs)) {
                        collides = true;
                        break;
                    }
                }

                if (!collides) {
                    const playerDist = Math.sqrt(
                        Math.pow(drone.x - this.player.x, 2) +
                        Math.pow(drone.y - this.player.y, 2)
                    );
                    if (playerDist < 100) {
                        collides = true;
                    }
                }

                if (!collides) {
                    this.drones.push(drone);
                    placed = true;
                }
            }
        }
    }

    generateObstacles() {
        this.obstacles = [];

        const area = this.displayWidth * this.displayHeight;
        const baseArea = 640000;
        const areaRatio = area / baseArea;

        let numObstacles = Math.floor(8 * areaRatio);
        numObstacles = Math.max(3, Math.min(12, numObstacles));

        const minSize = Math.max(28, this.displayWidth * 0.04);
        const maxSize = Math.max(55, this.displayWidth * 0.08);

        const margin = Math.max(20, this.displayWidth * 0.04);

        const sectorsX = Math.ceil(Math.sqrt(numObstacles));
        const sectorsY = Math.ceil(numObstacles / sectorsX);
        const sectorWidth = this.displayWidth / sectorsX;
        const sectorHeight = this.displayHeight / sectorsY;

        let obstacleIndex = 0;
        for (let sy = 0; sy < sectorsY && obstacleIndex < numObstacles; sy++) {
            for (let sx = 0; sx < sectorsX && obstacleIndex < numObstacles; sx++) {
                const width = minSize + Math.random() * (maxSize - minSize);
                const height = minSize + Math.random() * (maxSize - minSize);

                const sectorStartX = sx * sectorWidth;
                const sectorStartY = sy * sectorHeight;
                const sectorEndX = (sx + 1) * sectorWidth;
                const sectorEndY = (sy + 1) * sectorHeight;

                const x = sectorStartX + margin + Math.random() * (sectorWidth - width - margin * 2);
                const y = sectorStartY + margin + Math.random() * (sectorHeight - height - margin * 2);

                if (x >= margin &&
                    y >= margin &&
                    x + width <= this.displayWidth - margin &&
                    y + height <= this.displayHeight - margin) {

                    this.obstacles.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    });
                    obstacleIndex++;
                }
            }
        }
    }

    setupJoystick() {
        const handleStart = (clientX, clientY) => {
            this.joystick.active = true;
            this.joystick.startX = clientX;
            this.joystick.startY = clientY;

            const canvasRect = this.joystickCanvas.getBoundingClientRect();
            this.joystick.baseX = this.joystickCanvas.width / 2;
            this.joystick.baseY = this.joystickCanvas.height / 2;
            this.joystick.knobX = this.joystick.baseX;
            this.joystick.knobY = this.joystick.baseY;
        };

        const handleMove = (clientX, clientY) => {
            if (!this.joystick.active) return;

            let dx = clientX - this.joystick.startX;
            let dy = clientY - this.joystick.startY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const maxDist = 100;
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            const displayRadius = this.joystick.radius;
            const displayDx = (dx / maxDist) * displayRadius;
            const displayDy = (dy / maxDist) * displayRadius;

            this.joystick.knobX = this.joystick.baseX + displayDx;
            this.joystick.knobY = this.joystick.baseY + displayDy;
            this.joystick.deltaX = dx / maxDist;
            this.joystick.deltaY = dy / maxDist;
        };

        const handleEnd = () => {
            this.joystick.active = false;
            this.joystick.knobX = this.joystick.baseX;
            this.joystick.knobY = this.joystick.baseY;
            this.joystick.deltaX = 0;
            this.joystick.deltaY = 0;
        };

        document.addEventListener('touchstart', (e) => {
            if (this.state !== 'playing') return;
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.state !== 'playing') return;
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        });

        document.addEventListener('touchend', (e) => {
            if (this.state !== 'playing') return;
            e.preventDefault();
            handleEnd();
        });

        document.addEventListener('mousedown', (e) => {
            if (this.state !== 'playing') return;
            if (e.target.tagName === 'BUTTON') return;
            handleStart(e.clientX, e.clientY);
        });

        document.addEventListener('mousemove', (e) => {
            if (this.state !== 'playing') return;
            handleMove(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', () => {
            if (this.state !== 'playing') return;
            handleEnd();
        });
    }

    setupUI() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-win-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-lose-btn').addEventListener('click', () => this.startGame());

        document.addEventListener('keydown', (e) => {
            if (this.state !== 'playing') return;

            if (e.code === 'Space' && this.dash.cooldown <= 0 && !this.dash.active) {
                this.activateDash();
            }

            if (e.code === 'ShiftLeft' && this.slowMotion.cooldown <= 0 && !this.slowMotion.active) {
                this.activateSlowMotion();
            }
        });
    }

    startGame() {
        this.state = 'playing';
        this.time = 120;
        this.coinsCollected = 0;
        this.lives = 3;

        this.generateObstacles();
        this.generateTraps();
        this.generateBonuses();
        this.generateDrones();

        this.slowEffect.active = false;
        this.slowEffect.duration = 0;
        this.speedBoost.active = false;
        this.speedBoost.duration = 0;

        this.shield = {
            active: false,
            hits: 0
        };

        this.magnet = {
            active: false,
            duration: 0,
            range: 20
        };

        this.freeze = {
            active: false,
            duration: 0
        };

        this.dash = {
            active: false,
            cooldown: 0,
            maxCooldown: 3,
            duration: 0.2,
            distance: 80
        };

        this.slowMotion = {
            active: false,
            duration: 0,
            cooldown: 0,
            maxCooldown: 15
        };

        this.boss.rushTimer = 0;
        this.boss.rushCooldown = 0;
        this.boss.speed = this.boss.baseSpeed;

        this.particles = [];
        this.combo.count = 0;
        this.combo.timer = 0;

        let playerSpawned = false;
        let attempts = 0;
        while (!playerSpawned && attempts < 100) {
            attempts++;
            const testX = Math.random() * (this.displayWidth - 100) + 50;
            const testY = Math.random() * (this.displayHeight - 100) + 50;

            let collides = false;
            for (const obs of this.obstacles) {
                if (this.checkCircleRectCollision(testX, testY, this.player.radius + 10, obs)) {
                    collides = true;
                    break;
                }
            }

            if (!collides) {
                this.player.x = testX;
                this.player.y = testY;
                playerSpawned = true;
            }
        }

        if (!playerSpawned) {
            this.player.x = this.displayWidth / 2;
            this.player.y = this.displayHeight / 2;
        }

        let bossSpawned = false;
        attempts = 0;
        while (!bossSpawned && attempts < 100) {
            attempts++;
            const testX = Math.random() * (this.displayWidth - 100) + 50;
            const testY = Math.random() * (this.displayHeight - 100) + 50;

            const dist = Math.sqrt(Math.pow(testX - this.player.x, 2) + Math.pow(testY - this.player.y, 2));

            if (dist > 200) {
                let collides = false;
                for (const obs of this.obstacles) {
                    if (this.checkCircleRectCollision(testX, testY, this.boss.radius + 10, obs)) {
                        collides = true;
                        break;
                    }
                }

                if (!collides) {
                    this.boss.x = testX;
                    this.boss.y = testY;
                    bossSpawned = true;
                }
            }
        }

        if (!bossSpawned) {
            this.boss.x = this.displayWidth * 0.9;
            this.boss.y = this.displayHeight * 0.1;
        }

        this.generateCoins();

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    }

    update(dt) {
        if (this.state !== 'playing') {
            return;
        }

        if (this.combo.timer > 0) {
            this.combo.timer -= dt;
            if (this.combo.timer <= 0) {
                this.combo.count = 0;
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 100 * dt;
            p.alpha = p.life / p.maxLife;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.time -= dt;
        if (this.time <= 0) {
            this.time = 0;
            if (this.coinsCollected >= this.coinsRequired) {
                this.win();
            } else {
                this.lose('Time is up!');
            }
            return;
        }

        if (this.slowEffect.active) {
            this.slowEffect.duration -= dt;
            if (this.slowEffect.duration <= 0) {
                this.slowEffect.active = false;
            }
        }

        if (this.speedBoost.active) {
            this.speedBoost.duration -= dt;
            if (this.speedBoost.duration <= 0) {
                this.speedBoost.active = false;
            }
        }

        if (this.magnet.active) {
            this.magnet.duration -= dt;
            if (this.magnet.duration <= 0) {
                this.magnet.active = false;
            }

            for (const coin of this.coins) {
                if (coin.collected) continue;
                const dx = this.player.x - coin.x;
                const dy = this.player.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.magnet.range && dist > 0) {
                    const pullSpeed = 300 * dt;
                    coin.x += (dx / dist) * pullSpeed;
                    coin.y += (dy / dist) * pullSpeed;
                }
            }
        }

        if (this.freeze.active) {
            this.freeze.duration -= dt;
            if (this.freeze.duration <= 0) {
                this.freeze.active = false;
            }
        }

        if (this.dash.cooldown > 0) {
            this.dash.cooldown -= dt;
        }

        if (this.slowMotion.active) {
            this.slowMotion.duration -= dt;
            if (this.slowMotion.duration <= 0) {
                this.slowMotion.active = false;
            }
        }

        if (this.slowMotion.cooldown > 0) {
            this.slowMotion.cooldown -= dt;
        }

        this.waveSystem.timer += dt;
        if (this.waveSystem.timer >= this.waveSystem.interval && this.drones.length < this.waveSystem.maxDrones) {
            this.waveSystem.timer = 0;
            this.spawnNewDrone();
        }

        const timeMultiplier = this.slowMotion.active ? 0.5 : 1;

        let effectiveSpeed = this.player.speed;
        if (this.slowEffect.active) {
            effectiveSpeed *= 0.3;
        }
        if (this.speedBoost.active) {
            effectiveSpeed *= 1.8;
        }
        if (this.combo.count >= 3) {
            effectiveSpeed *= 1.15;
        }
        if (this.combo.count >= 5) {
            effectiveSpeed *= 1.1;
        }

        let newX = this.player.x + this.joystick.deltaX * effectiveSpeed * dt;
        let newY = this.player.y + this.joystick.deltaY * effectiveSpeed * dt;

        newX = Math.max(this.player.radius, Math.min(this.displayWidth - this.player.radius, newX));
        newY = Math.max(this.player.radius, Math.min(this.displayHeight - this.player.radius, newY));

        let canMove = true;
        for (const obs of this.obstacles) {
            if (this.checkCircleRectCollision(newX, newY, this.player.radius, obs)) {
                canMove = false;
                break;
            }
        }

        if (canMove) {
            this.player.x = newX;
            this.player.y = newY;

            if (Math.abs(this.joystick.deltaX) > 0.1) {
                this.player.direction = this.joystick.deltaX > 0 ? 1 : -1;
            }

            const moveSpeed = Math.sqrt(
                Math.pow(this.joystick.deltaX, 2) +
                Math.pow(this.joystick.deltaY, 2)
            );
            this.player.wheelchair.wheelSpeed = moveSpeed * this.player.speed * dt;
            this.player.wheelchair.wheelRotation += this.player.wheelchair.wheelSpeed * 10;
        } else {
            this.player.wheelchair.wheelSpeed *= 0.95;
            this.player.wheelchair.wheelRotation += this.player.wheelchair.wheelSpeed;
        }

        if (!this.freeze.active) {
            this.boss.rushCooldown -= dt;

            if (this.boss.rushCooldown <= 0 && Math.random() < 0.002) {
                this.boss.rushTimer = 2;
                this.boss.rushCooldown = 8;
                this.sound.playSound('rush');
            }

            if (this.boss.rushTimer > 0) {
                this.boss.rushTimer -= dt;
                this.boss.speed = this.boss.baseSpeed * 2.2;
            } else {
                this.boss.speed = this.boss.baseSpeed;
            }

            const dx = this.player.x - this.boss.x;
            const dy = this.player.y - this.boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
            let moveX = (dx / dist) * this.boss.speed * dt * timeMultiplier;
            let moveY = (dy / dist) * this.boss.speed * dt * timeMultiplier;

            let newX = this.boss.x + moveX;
            let newY = this.boss.y + moveY;

            let collides = false;
            for (const obs of this.obstacles) {
                if (this.checkCircleRectCollision(newX, newY, this.boss.radius, obs)) {
                    collides = true;
                    break;
                }
            }

            if (collides) {
                newX = this.boss.x + moveX;
                newY = this.boss.y;
                collides = false;
                for (const obs of this.obstacles) {
                    if (this.checkCircleRectCollision(newX, newY, this.boss.radius, obs)) {
                        collides = true;
                        break;
                    }
                }

                if (collides) {
                    newX = this.boss.x;
                    newY = this.boss.y + moveY;
                    collides = false;
                    for (const obs of this.obstacles) {
                        if (this.checkCircleRectCollision(newX, newY, this.boss.radius, obs)) {
                            collides = true;
                            break;
                        }
                    }
                }

                if (collides) {
                    const perpX = -moveY;
                    const perpY = moveX;
                    newX = this.boss.x + perpX;
                    newY = this.boss.y + perpY;

                    collides = false;
                    for (const obs of this.obstacles) {
                        if (this.checkCircleRectCollision(newX, newY, this.boss.radius, obs)) {
                            collides = true;
                            break;
                        }
                    }
                }
            }

            if (!collides) {
                this.boss.x = newX;
                this.boss.y = newY;
            }
            }
        }

        const bossDist = Math.sqrt(
            Math.pow(this.player.x - this.boss.x, 2) +
            Math.pow(this.player.y - this.boss.y, 2)
        );
        if (bossDist < this.player.radius + this.boss.radius) {
            if (!this.boss.justHit) {
                this.boss.justHit = true;
                this.sound.playSound('caught');
                this.createParticles(this.player.x, this.player.y, '#ff0000', 15);
                this.combo.count = 0;
                this.combo.timer = 0;

                if (this.shield.active && this.shield.hits > 0) {
                    this.shield.hits--;
                    if (this.shield.hits <= 0) {
                        this.shield.active = false;
                    }
                } else {
                    this.lives--;
                    if (this.lives <= 0) {
                        this.lose('Boss caught you!');
                        return;
                    }
                }

                setTimeout(() => { this.boss.justHit = false; }, 1500);
            }
        }

        if (!this.freeze.active) {
            for (const drone of this.drones) {
                const target = drone.patrolPoints[drone.currentTargetIndex];
                const dx = target.x - drone.x;
                const dy = target.y - drone.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 10) {
                    drone.currentTargetIndex = (drone.currentTargetIndex + 1) % drone.patrolPoints.length;
                } else {
                    const moveX = (dx / dist) * drone.speed * dt * timeMultiplier;
                    const moveY = (dy / dist) * drone.speed * dt * timeMultiplier;
                    drone.x += moveX;
                    drone.y += moveY;
                }

                const droneDist = Math.sqrt(
                    Math.pow(this.player.x - drone.x, 2) +
                    Math.pow(this.player.y - drone.y, 2)
                );

                if (droneDist < this.player.radius + drone.radius) {
                    if (!drone.justHit) {
                        drone.justHit = true;
                        this.sound.playSound('trap');
                        this.createParticles(drone.x, drone.y, '#ff8800', 12);
                        this.combo.count = 0;
                        this.combo.timer = 0;

                        if (this.shield.active && this.shield.hits > 0) {
                            this.shield.hits--;
                            if (this.shield.hits <= 0) {
                                this.shield.active = false;
                            }
                        } else {
                            this.lives--;
                            if (this.lives <= 0) {
                                this.lose('Drone caught you!');
                                return;
                            }
                        }

                        setTimeout(() => { drone.justHit = false; }, 1000);
                    }
                }
            }
        }

        for (const coin of this.coins) {
            if (coin.collected) continue;

            const coinDist = Math.sqrt(
                Math.pow(this.player.x - coin.x, 2) +
                Math.pow(this.player.y - coin.y, 2)
            );

            if (coinDist < this.player.radius + coin.radius) {
                coin.collected = true;
                this.coinsCollected++;
                this.sound.playSound('coin');

                this.combo.count++;
                this.combo.timer = this.combo.maxTime;

                this.createParticles(coin.x, coin.y, '#00ff41', 8);

                if (this.coinsCollected >= this.coinsRequired) {
                    this.win();
                }
            }
        }

        for (const trap of this.traps) {
            const trapDist = Math.sqrt(
                Math.pow(this.player.x - trap.x, 2) +
                Math.pow(this.player.y - trap.y, 2)
            );

            if (trapDist < this.player.radius + trap.radius) {
                if (!trap.hit) {
                    trap.hit = true;
                    this.sound.playSound('trap');
                    this.combo.count = 0;
                    this.combo.timer = 0;

                    if (trap.type === 'teleport') {
                        this.createParticles(trap.x, trap.y, '#ff00ff', 20);

                        let teleported = false;
                        let attempts = 0;
                        while (!teleported && attempts < 50) {
                            attempts++;
                            const newX = Math.random() * (this.displayWidth - 100) + 50;
                            const newY = Math.random() * (this.displayHeight - 100) + 50;

                            let collides = false;
                            for (const obs of this.obstacles) {
                                if (this.checkCircleRectCollision(newX, newY, this.player.radius, obs)) {
                                    collides = true;
                                    break;
                                }
                            }

                            if (!collides) {
                                this.createParticles(newX, newY, '#ff00ff', 20);
                                this.player.x = newX;
                                this.player.y = newY;
                                teleported = true;
                            }
                        }
                    } else {
                        this.createParticles(trap.x, trap.y, '#ff4444', 12);

                        if (this.shield.active && this.shield.hits > 0) {
                            this.shield.hits--;
                            if (this.shield.hits <= 0) {
                                this.shield.active = false;
                            }
                        } else {
                            this.lives--;
                            if (this.lives <= 0) {
                                this.lose('No lives left!');
                            }
                        }
                    }

                    setTimeout(() => { trap.hit = false; }, 1000);
                }
            }
        }

        for (const bonus of this.bonuses) {
            if (bonus.collected) continue;

            const bonusDist = Math.sqrt(
                Math.pow(this.player.x - bonus.x, 2) +
                Math.pow(this.player.y - bonus.y, 2)
            );

            if (bonusDist < this.player.radius + bonus.radius) {
                bonus.collected = true;
                this.sound.playSound('bonus');

                switch(bonus.type) {
                    case 'speed':
                        this.speedBoost.active = true;
                        this.speedBoost.duration = 5;
                        this.createParticles(bonus.x, bonus.y, '#00ffff', 15);
                        break;
                    case 'shield':
                        this.shield.active = true;
                        this.shield.hits = 2;
                        this.createParticles(bonus.x, bonus.y, '#ffaa00', 15);
                        break;
                    case 'magnet':
                        this.magnet.active = true;
                        this.magnet.duration = 8;
                        this.createParticles(bonus.x, bonus.y, '#ff00ff', 15);
                        break;
                    case 'freeze':
                        this.freeze.active = true;
                        this.freeze.duration = 4;
                        this.createParticles(bonus.x, bonus.y, '#aaaaff', 15);
                        break;
                }
            }
        }

        document.getElementById('timer').textContent = Math.ceil(this.time);
        document.getElementById('coins').textContent = this.coinsCollected;

        const livesDisplay = '♥'.repeat(this.lives) + '♡'.repeat(Math.max(0, 3 - this.lives));
        document.getElementById('lives').textContent = livesDisplay;

        document.getElementById('drone-count').textContent = this.drones.length;

        const slowIndicator = document.getElementById('slow-indicator');
        if (this.slowEffect.active) {
            slowIndicator.style.display = 'block';
        } else {
            slowIndicator.style.display = 'none';
        }

        const boostIndicator = document.getElementById('boost-indicator');
        if (this.speedBoost.active) {
            boostIndicator.style.display = 'block';
        } else {
            boostIndicator.style.display = 'none';
        }

        const shieldIndicator = document.getElementById('shield-indicator');
        if (this.shield.active) {
            shieldIndicator.style.display = 'block';
        } else {
            shieldIndicator.style.display = 'none';
        }

        const magnetIndicator = document.getElementById('magnet-indicator');
        if (this.magnet.active) {
            magnetIndicator.style.display = 'block';
        } else {
            magnetIndicator.style.display = 'none';
        }

        const freezeIndicator = document.getElementById('freeze-indicator');
        if (this.freeze.active) {
            freezeIndicator.style.display = 'block';
        } else {
            freezeIndicator.style.display = 'none';
        }

        const comboIndicator = document.getElementById('combo-indicator');
        if (this.combo.count >= 2) {
            comboIndicator.textContent = `${this.combo.count}x COMBO!`;
            comboIndicator.style.display = 'block';
        } else {
            comboIndicator.style.display = 'none';
        }

        const slowmoIndicator = document.getElementById('slowmo-indicator');
        if (this.slowMotion.active) {
            slowmoIndicator.style.display = 'block';
        } else {
            slowmoIndicator.style.display = 'none';
        }

        const dashCd = document.getElementById('dash-cd');
        if (this.dash.cooldown > 0) {
            dashCd.textContent = Math.ceil(this.dash.cooldown) + 's';
            dashCd.style.color = '#ff4444';
        } else {
            dashCd.textContent = '✓';
            dashCd.style.color = '#00ff41';
        }

        const slowmoCd = document.getElementById('slowmo-cd');
        if (this.slowMotion.cooldown > 0) {
            slowmoCd.textContent = Math.ceil(this.slowMotion.cooldown) + 's';
            slowmoCd.style.color = '#ff4444';
        } else {
            slowmoCd.textContent = '✓';
            slowmoCd.style.color = '#00ff41';
        }
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 100 + Math.random() * 100;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                color: color,
                size: 3 + Math.random() * 3,
                life: 0.5 + Math.random() * 0.5,
                maxLife: 0.5 + Math.random() * 0.5,
                alpha: 1
            });
        }
    }

    checkCircleRectCollision(cx, cy, cr, rect) {
        const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
        const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        return (dx * dx + dy * dy) < (cr * cr);
    }

    spawnNewDrone() {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 50) {
            attempts++;

            const drone = {
                x: Math.random() * (this.displayWidth - 100) + 50,
                y: Math.random() * (this.displayHeight - 100) + 50,
                radius: 12,
                speed: 100,
                patrolPoints: [],
                currentTargetIndex: 0,
                justHit: false
            };

            for (let j = 0; j < 3; j++) {
                drone.patrolPoints.push({
                    x: Math.random() * (this.displayWidth - 100) + 50,
                    y: Math.random() * (this.displayHeight - 100) + 50
                });
            }

            let collides = false;

            const playerDist = Math.sqrt(
                Math.pow(drone.x - this.player.x, 2) +
                Math.pow(drone.y - this.player.y, 2)
            );
            if (playerDist < 150) {
                collides = true;
            }

            if (!collides) {
                this.drones.push(drone);
                this.createParticles(drone.x, drone.y, '#ff8800', 20);
                placed = true;
            }
        }
    }

    activateDash() {
        if (this.joystick.deltaX === 0 && this.joystick.deltaY === 0) return;

        this.dash.active = true;
        this.dash.cooldown = this.dash.maxCooldown;

        const magnitude = Math.sqrt(this.joystick.deltaX ** 2 + this.joystick.deltaY ** 2);
        const dirX = this.joystick.deltaX / magnitude;
        const dirY = this.joystick.deltaY / magnitude;

        const targetX = this.player.x + dirX * this.dash.distance;
        const targetY = this.player.y + dirY * this.dash.distance;

        let finalX = Math.max(this.player.radius, Math.min(this.displayWidth - this.player.radius, targetX));
        let finalY = Math.max(this.player.radius, Math.min(this.displayHeight - this.player.radius, targetY));

        let collides = false;
        for (const obs of this.obstacles) {
            if (this.checkCircleRectCollision(finalX, finalY, this.player.radius, obs)) {
                collides = true;
                break;
            }
        }

        if (!collides) {
            this.createParticles(this.player.x, this.player.y, '#00ff41', 20);
            this.player.x = finalX;
            this.player.y = finalY;
            this.createParticles(this.player.x, this.player.y, '#00ff41', 20);
        }

        setTimeout(() => { this.dash.active = false; }, this.dash.duration * 1000);
    }

    activateSlowMotion() {
        this.slowMotion.active = true;
        this.slowMotion.duration = 3;
        this.slowMotion.cooldown = this.slowMotion.maxCooldown;
        this.createParticles(this.player.x, this.player.y, '#ffff00', 30);
    }

    win() {
        this.state = 'win';
        this.sound.playSound('win');
        document.getElementById('win-screen').classList.add('active');
    }

    lose(msg) {
        this.state = 'lose';
        if (msg !== 'Boss caught you!') {
            this.sound.playSound('lose');
        }
        document.getElementById('lose-msg').textContent = msg;
        document.getElementById('lose-screen').classList.add('active');
    }

    draw() {
        const ctx = this.ctx;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();

        const gridSize = 30;
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.displayWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.displayHeight);
            ctx.stroke();
        }
        for (let y = 0; y < this.displayHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.displayWidth, y);
            ctx.stroke();
        }

        if (this.state === 'playing') {
            for (const obs of this.obstacles) {
                const pulse = Math.sin(this.animTime * 2) * 0.2 + 0.8;

                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00ff41';

                ctx.fillStyle = `rgba(0, 100, 30, ${pulse * 0.5})`;
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

                ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

                ctx.strokeStyle = `rgba(0, 255, 65, ${pulse * 0.5})`;
                ctx.lineWidth = 1;
                const step = 10;
                for (let i = 0; i < obs.width; i += step) {
                    ctx.beginPath();
                    ctx.moveTo(obs.x + i, obs.y);
                    ctx.lineTo(obs.x + i, obs.y + obs.height);
                    ctx.stroke();
                }

                ctx.shadowBlur = 0;
            }

            for (const trap of this.traps) {
                this.drawTrap(ctx, trap);
            }

            for (const bonus of this.bonuses) {
                if (!bonus.collected) {
                    this.drawBonus(ctx, bonus);
                }
            }

            for (const coin of this.coins) {
                if (coin.collected) continue;
                this.drawCoin(ctx, coin);
            }

            this.drawPlayer(ctx);

            for (const drone of this.drones) {
                this.drawDrone(ctx, drone);
            }

            this.drawBoss(ctx);

            for (const particle of this.particles) {
                this.drawParticle(ctx, particle);
            }
        }

        const jCtx = this.joystickCtx;
        jCtx.clearRect(0, 0, this.joystickCanvas.width, this.joystickCanvas.height);

        const jPulse = Math.sin(this.animTime * 3) * 0.2 + 0.8;
        const isMobile = window.innerWidth <= 768;
        const baseShadow = isMobile ? 12 : 25;
        const knobShadow = isMobile ? 10 : 20;

        if (this.joystick.active) {
                jCtx.shadowBlur = baseShadow;
                jCtx.shadowColor = 'rgba(0, 255, 65, 0.8)';

                const baseGradient = jCtx.createRadialGradient(
                    this.joystick.baseX, this.joystick.baseY, 0,
                    this.joystick.baseX, this.joystick.baseY, this.joystick.radius
                );
                baseGradient.addColorStop(0, 'rgba(0, 100, 30, 0.6)');
                baseGradient.addColorStop(0.7, 'rgba(0, 80, 25, 0.7)');
                baseGradient.addColorStop(1, 'rgba(0, 60, 20, 0.8)');
                jCtx.fillStyle = baseGradient;
                jCtx.beginPath();
                jCtx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radius, 0, Math.PI * 2);
                jCtx.fill();

                jCtx.strokeStyle = `rgba(0, 255, 65, ${jPulse})`;
                jCtx.lineWidth = 3;
                jCtx.stroke();

                jCtx.shadowBlur = 0;

                jCtx.strokeStyle = `rgba(0, 255, 65, 0.4)`;
                jCtx.lineWidth = 2;
                jCtx.beginPath();
                jCtx.moveTo(this.joystick.baseX - this.joystick.radius * 0.7, this.joystick.baseY);
                jCtx.lineTo(this.joystick.baseX + this.joystick.radius * 0.7, this.joystick.baseY);
                jCtx.moveTo(this.joystick.baseX, this.joystick.baseY - this.joystick.radius * 0.7);
                jCtx.lineTo(this.joystick.baseX, this.joystick.baseY + this.joystick.radius * 0.7);
                jCtx.stroke();

                jCtx.shadowBlur = knobShadow;
                jCtx.shadowColor = 'rgba(0, 255, 65, 1)';

                const knobGradient = jCtx.createRadialGradient(
                    this.joystick.knobX, this.joystick.knobY, 0,
                    this.joystick.knobX, this.joystick.knobY, this.joystick.knobRadius
                );
                knobGradient.addColorStop(0, `rgba(150, 255, 150, ${jPulse})`);
                knobGradient.addColorStop(0.5, `rgba(0, 255, 65, ${jPulse})`);
                knobGradient.addColorStop(1, `rgba(0, 200, 50, ${jPulse})`);
                jCtx.fillStyle = knobGradient;
                jCtx.beginPath();
                jCtx.arc(this.joystick.knobX, this.joystick.knobY, this.joystick.knobRadius, 0, Math.PI * 2);
                jCtx.fill();

                jCtx.shadowBlur = 0;
                jCtx.strokeStyle = `rgba(0, 255, 65, ${jPulse})`;
                jCtx.lineWidth = 3;
                jCtx.stroke();

                jCtx.fillStyle = `rgba(255, 255, 255, 0.4)`;
                jCtx.beginPath();
                jCtx.arc(this.joystick.knobX, this.joystick.knobY, this.joystick.knobRadius * 0.4, 0, Math.PI * 2);
                jCtx.fill();
            } else {
                const baseGradient = jCtx.createRadialGradient(
                    this.joystick.baseX, this.joystick.baseY, 0,
                    this.joystick.baseX, this.joystick.baseY, this.joystick.radius
                );
                baseGradient.addColorStop(0, 'rgba(0, 80, 25, 0.4)');
                baseGradient.addColorStop(1, 'rgba(0, 50, 15, 0.5)');
                jCtx.fillStyle = baseGradient;
                jCtx.beginPath();
                jCtx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radius, 0, Math.PI * 2);
                jCtx.fill();

                jCtx.strokeStyle = `rgba(0, 255, 65, ${jPulse * 0.5})`;
                jCtx.lineWidth = 2;
                jCtx.stroke();

                jCtx.strokeStyle = `rgba(0, 200, 50, 0.3)`;
                jCtx.lineWidth = 2;
                jCtx.beginPath();
                jCtx.moveTo(this.joystick.baseX - this.joystick.radius * 0.6, this.joystick.baseY);
                jCtx.lineTo(this.joystick.baseX + this.joystick.radius * 0.6, this.joystick.baseY);
                jCtx.moveTo(this.joystick.baseX, this.joystick.baseY - this.joystick.radius * 0.6);
                jCtx.lineTo(this.joystick.baseX, this.joystick.baseY + this.joystick.radius * 0.6);
                jCtx.stroke();

                const knobGradient = jCtx.createRadialGradient(
                    this.joystick.baseX, this.joystick.baseY, 0,
                    this.joystick.baseX, this.joystick.baseY, this.joystick.knobRadius
                );
                knobGradient.addColorStop(0, `rgba(0, 180, 50, ${jPulse * 0.6})`);
                knobGradient.addColorStop(1, `rgba(0, 120, 35, ${jPulse * 0.7})`);
                jCtx.fillStyle = knobGradient;
                jCtx.beginPath();
                jCtx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.knobRadius, 0, Math.PI * 2);
                jCtx.fill();

                jCtx.strokeStyle = `rgba(0, 200, 50, ${jPulse * 0.5})`;
                jCtx.lineWidth = 2;
                jCtx.stroke();
            }
    }

    gameLoop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;
        this.animTime += dt;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    drawBonus(ctx, bonus) {
        const pulse = Math.sin(this.animTime * 6) * 0.3 + 0.7;
        const glow = Math.sin(this.animTime * 4) * 8 + 15;
        const rotation = this.animTime * -3;

        const colors = {
            'speed': { main: '#00ffff', shadow: '#00ffff', r: 0, g: 255, b: 255 },
            'shield': { main: '#ffaa00', shadow: '#ffaa00', r: 255, g: 170, b: 0 },
            'magnet': { main: '#ff00ff', shadow: '#ff00ff', r: 255, g: 0, b: 255 },
            'freeze': { main: '#aaaaff', shadow: '#aaaaff', r: 170, g: 170, b: 255 }
        };

        const color = colors[bonus.type] || colors['speed'];

        ctx.save();
        ctx.translate(bonus.x, bonus.y);
        ctx.rotate(rotation);

        ctx.shadowBlur = glow;
        ctx.shadowColor = color.shadow;

        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bonus.radius * 1.5);
        outerGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse * 0.4})`);
        outerGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse * 0.2})`);
        outerGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, bonus.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            ctx.save();
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, bonus.radius * 0.5);
            ctx.lineTo(0, bonus.radius * 1.3);
            ctx.stroke();

            ctx.restore();
        }

        ctx.shadowBlur = 20;
        const mainGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bonus.radius);
        mainGradient.addColorStop(0, `rgba(${color.r + 50}, ${color.g + 50}, ${color.b + 50}, ${pulse})`);
        mainGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse})`);
        mainGradient.addColorStop(1, `rgba(${color.r - 50}, ${color.g - 50}, ${color.b - 50}, ${pulse})`);
        ctx.fillStyle = mainGradient;
        ctx.beginPath();
        ctx.arc(0, 0, bonus.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 2;

        switch(bonus.type) {
            case 'speed':
                ctx.beginPath();
                ctx.moveTo(2, -8);
                ctx.lineTo(-4, 0);
                ctx.lineTo(1, 0);
                ctx.lineTo(-2, 8);
                ctx.lineTo(4, 0);
                ctx.lineTo(-1, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'shield':
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(-6, -6);
                ctx.lineTo(-6, 4);
                ctx.lineTo(0, 10);
                ctx.lineTo(6, 4);
                ctx.lineTo(6, -6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'magnet':
                ctx.beginPath();
                ctx.moveTo(-5, -8);
                ctx.lineTo(-5, 0);
                ctx.lineTo(-8, 0);
                ctx.lineTo(-8, 5);
                ctx.lineTo(-5, 5);
                ctx.moveTo(5, -8);
                ctx.lineTo(5, 0);
                ctx.lineTo(8, 0);
                ctx.lineTo(8, 5);
                ctx.lineTo(5, 5);
                ctx.stroke();
                break;
            case 'freeze':
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(0, 10);
                ctx.moveTo(-8, 0);
                ctx.lineTo(8, 0);
                ctx.moveTo(-5, -7);
                ctx.lineTo(5, 7);
                ctx.moveTo(5, -7);
                ctx.lineTo(-5, 7);
                ctx.stroke();
                break;
        }

        ctx.shadowBlur = 6;
        for (let i = 0; i < 6; i++) {
            const particleAngle = (Math.PI / 3) * i + rotation * 2;
            const particleRadius = bonus.radius * 1.1;
            const px = Math.cos(particleAngle) * particleRadius;
            const py = Math.sin(particleAngle) * particleRadius;

            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse * 0.9})`;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawTrap(ctx, trap) {
        const pulse = Math.sin(this.animTime * 4) * 0.3 + 0.7;
        const glow = Math.sin(this.animTime * 3) * 10 + 20;
        const rotation = this.animTime * 2;

        const isTeleport = trap.type === 'teleport';
        const color = isTeleport ? { r: 255, g: 0, b: 255 } : { r: 255, g: 0, b: 0 };

        ctx.save();
        ctx.translate(trap.x, trap.y);
        ctx.rotate(rotation);

        ctx.shadowBlur = glow;
        ctx.shadowColor = isTeleport ? '#ff00ff' : '#ff0000';

        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, trap.radius);
        outerGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse * 0.3})`);
        outerGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse * 0.2})`);
        outerGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, trap.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse})`;
        ctx.fillStyle = `rgba(${color.r}, ${Math.max(color.g, 50)}, ${color.b}, ${pulse * 0.8})`;
        ctx.lineWidth = 2;

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            ctx.save();
            ctx.rotate(angle);

            ctx.beginPath();
            ctx.moveTo(0, -trap.radius * 0.4);
            ctx.lineTo(-trap.radius * 0.15, -trap.radius * 0.7);
            ctx.lineTo(trap.radius * 0.15, -trap.radius * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }

        ctx.shadowBlur = 15;
        const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, trap.radius * 0.4);
        if (isTeleport) {
            centerGradient.addColorStop(0, `rgba(255, 100, 255, ${pulse})`);
            centerGradient.addColorStop(1, `rgba(200, 0, 200, ${pulse})`);
        } else {
            centerGradient.addColorStop(0, `rgba(255, 100, 0, ${pulse})`);
            centerGradient.addColorStop(1, `rgba(200, 0, 0, ${pulse})`);
        }
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, trap.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 5;
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0);

        ctx.shadowBlur = 8;
        for (let i = 0; i < 8; i++) {
            const particleAngle = (Math.PI / 4) * i - rotation * 1.5;
            const particleRadius = trap.radius * 0.85;
            const px = Math.cos(particleAngle) * particleRadius;
            const py = Math.sin(particleAngle) * particleRadius;

            ctx.fillStyle = `rgba(255, 50, 0, ${pulse * 0.8})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawParticle(ctx, p) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawCoin(ctx, coin) {
        const pulse = Math.sin(this.animTime * 5 + coin.x) * 0.3 + 0.7;
        const glow = Math.sin(this.animTime * 3) * 5 + 10;

        ctx.save();
        ctx.translate(coin.x, coin.y);

        ctx.shadowBlur = glow * 2;
        ctx.shadowColor = '#00ff41';

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i + this.animTime;
            const x = Math.cos(angle) * coin.radius;
            const y = Math.sin(angle) * coin.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.radius);
        gradient.addColorStop(0, `rgba(0, 255, 65, ${pulse})`);
        gradient.addColorStop(0.7, `rgba(0, 200, 50, ${pulse * 0.7})`);
        gradient.addColorStop(1, `rgba(0, 150, 40, ${pulse * 0.4})`);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 5;
        ctx.fillStyle = '#00ff41';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);

        ctx.restore();
    }

    drawPlayer(ctx) {
        ctx.save();
        ctx.translate(this.player.x, this.player.y);

        if (this.player.direction === -1) {
            ctx.scale(-1, 1);
        }

        const pulse = Math.sin(this.animTime * 10) * 0.1 + 0.9;
        const wheelRotation = this.player.wheelchair.wheelRotation;

        ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.fillStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const bigWheelRadius = 12;
        const backWheelX = -8;
        const backWheelY = 10;

        ctx.save();
        ctx.translate(backWheelX, backWheelY);
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00ff41';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(0, 0, bigWheelRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, bigWheelRadius - 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i + wheelRotation;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 2, Math.sin(angle) * 2);
            ctx.lineTo(Math.cos(angle) * (bigWheelRadius - 3), Math.sin(angle) * (bigWheelRadius - 3));
            ctx.stroke();
        }

        ctx.fillStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        const smallWheelRadius = 4;
        const frontWheelX = 10;
        const frontWheelY = 18;

        ctx.save();
        ctx.translate(frontWheelX, frontWheelY);
        ctx.shadowBlur = 12;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(0, 0, smallWheelRadius, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + wheelRotation * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * smallWheelRadius, Math.sin(angle) * smallWheelRadius);
            ctx.stroke();
        }

        ctx.restore();

        ctx.shadowBlur = 15;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(8, 6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(-10, 6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(-7, -6);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(-7, 0);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.lineTo(backWheelX, backWheelY - bigWheelRadius);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 6);
        ctx.lineTo(8, 14);
        ctx.lineTo(frontWheelX, frontWheelY - smallWheelRadius);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 14);
        ctx.lineTo(10, 14);
        ctx.stroke();

        ctx.shadowBlur = 20;

        const headRadius = 10;
        const headX = -2;
        const headY = -8;

        if (this.hackerImage.complete && this.hackerImage.width > 0) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = `rgba(0, 255, 65, ${pulse})`;

            ctx.save();
            ctx.beginPath();
            ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
                this.hackerImage,
                headX - headRadius,
                headY - headRadius,
                headRadius * 2,
                headRadius * 2
            );
            ctx.restore();

            ctx.shadowBlur = 18;
            ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(0, 255, 65, 0.2)`;
            ctx.lineWidth = 0.8;
            for (let i = -headRadius; i < headRadius; i += 2) {
                ctx.beginPath();
                ctx.moveTo(headX - headRadius, headY + i);
                ctx.lineTo(headX + headRadius, headY + i);
                ctx.stroke();
            }
        } else {
            ctx.shadowBlur = 18;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(headX, headY, 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-1, 2);
        ctx.lineTo(-6, 6);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-6, 6);
        ctx.lineTo(0, 7);
        ctx.stroke();

        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.lineTo(5, 11);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(5, 11);
        ctx.lineTo(8, 14);
        ctx.stroke();

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(8, 14);
        ctx.lineTo(10, 14);
        ctx.stroke();

        const handRotation = Math.sin(this.animTime * 5) * 0.4;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.moveTo(-1, 3);
        ctx.lineTo(-4, 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(backWheelX - 3, backWheelY - 4 + handRotation * 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(backWheelX - 3, backWheelY - 4 + handRotation * 5);
        const handAngle = wheelRotation + handRotation;
        const handX = backWheelX + Math.cos(handAngle + Math.PI * 0.7) * bigWheelRadius;
        const handY = backWheelY + Math.sin(handAngle + Math.PI * 0.7) * bigWheelRadius;
        ctx.lineTo(handX, handY);
        ctx.stroke();

        ctx.fillStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.beginPath();
        ctx.arc(handX, handY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (this.shield.active && this.shield.hits > 0) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, this.player.x, this.player.y);

            const shieldPulse = Math.sin(this.animTime * 8) * 0.3 + 0.7;
            const shieldRadius = this.player.radius + 8;

            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffaa00';

            ctx.strokeStyle = `rgba(255, 170, 0, ${shieldPulse * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 200, 0, ${shieldPulse * 0.5})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius + 3, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + this.animTime * 2;
                const x = Math.cos(angle) * shieldRadius;
                const y = Math.sin(angle) * shieldRadius;

                ctx.fillStyle = `rgba(255, 200, 100, ${shieldPulse})`;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        ctx.restore();
    }

    drawDrone(ctx, drone) {
        ctx.save();
        ctx.translate(drone.x, drone.y);

        const pulse = Math.sin(this.animTime * 5) * 0.3 + 0.7;
        const glow = Math.sin(this.animTime * 3) * 10 + 20;
        const rotation = this.animTime * 4;

        ctx.shadowBlur = glow;
        ctx.shadowColor = '#ff8800';

        ctx.rotate(rotation);

        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, drone.radius * 1.3);
        outerGradient.addColorStop(0, `rgba(255, 136, 0, ${pulse * 0.4})`);
        outerGradient.addColorStop(1, `rgba(255, 68, 0, 0)`);
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, drone.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, drone.radius);
        bodyGradient.addColorStop(0, `rgba(255, 150, 50, ${pulse})`);
        bodyGradient.addColorStop(0.6, `rgba(255, 100, 0, ${pulse})`);
        bodyGradient.addColorStop(1, `rgba(200, 50, 0, ${pulse})`);
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, 0, drone.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            ctx.save();
            ctx.rotate(angle);

            ctx.strokeStyle = `rgba(255, 136, 0, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drone.radius * 0.5, 0);
            ctx.lineTo(drone.radius * 1.2, 0);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 200, 100, ${pulse})`;
            ctx.beginPath();
            ctx.arc(drone.radius * 1.2, 0, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, drone.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        if (this.freeze.active) {
            const freezePulse = Math.sin(this.animTime * 10) * 0.3 + 0.7;

            ctx.shadowBlur = 15;
            ctx.shadowColor = '#aaaaff';

            ctx.strokeStyle = `rgba(170, 170, 255, ${freezePulse * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, drone.radius + 4, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const startRadius = drone.radius;
                const endRadius = drone.radius + 6;

                const x1 = Math.cos(angle) * startRadius;
                const y1 = Math.sin(angle) * startRadius;
                const x2 = Math.cos(angle) * endRadius;
                const y2 = Math.sin(angle) * endRadius;

                ctx.strokeStyle = `rgba(200, 220, 255, ${freezePulse})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawBoss(ctx) {
        ctx.save();
        ctx.translate(this.boss.x, this.boss.y);

        const isRushing = this.boss.rushTimer > 0;
        const pulse = isRushing ? Math.sin(this.animTime * 12) * 0.3 + 0.7 : Math.sin(this.animTime * 4) * 0.2 + 0.8;
        const glow = isRushing ? Math.sin(this.animTime * 6) * 20 + 40 : Math.sin(this.animTime * 2) * 10 + 20;

        ctx.shadowBlur = glow;
        ctx.shadowColor = isRushing ? '#ff4444' : '#ff0000';

        if (isRushing) {
            const particles = 8;
            for (let i = 0; i < particles; i++) {
                const angle = (Math.PI * 2 / particles) * i + this.animTime * 5;
                const distance = this.boss.radius * 1.5;
                const px = Math.cos(angle) * distance;
                const py = Math.sin(angle) * distance;

                ctx.fillStyle = `rgba(255, 100, 0, ${pulse * 0.6})`;
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (this.bossImage.complete && this.bossImage.width > 0) {
            const armAngle = Math.sin(this.animTime * 6) * 0.4;
            const legAngle = Math.sin(this.animTime * 6 + Math.PI) * 0.5;

            ctx.strokeStyle = `rgba(255, 0, 0, ${pulse * 0.8})`;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(-this.boss.radius * 0.8, -this.boss.radius * 0.3);
            ctx.lineTo(-this.boss.radius * 1.3, -this.boss.radius * 0.3 + Math.sin(armAngle) * 15);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(this.boss.radius * 0.8, -this.boss.radius * 0.3);
            ctx.lineTo(this.boss.radius * 1.3, -this.boss.radius * 0.3 - Math.sin(armAngle) * 15);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-this.boss.radius * 0.4, this.boss.radius * 0.8);
            ctx.lineTo(-this.boss.radius * 0.6, this.boss.radius * 1.4 + Math.sin(legAngle) * 10);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(this.boss.radius * 0.4, this.boss.radius * 0.8);
            ctx.lineTo(this.boss.radius * 0.6, this.boss.radius * 1.4 - Math.sin(legAngle) * 10);
            ctx.stroke();

            ctx.save();
            ctx.globalAlpha = pulse;

            ctx.beginPath();
            ctx.arc(0, 0, this.boss.radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
                this.bossImage,
                -this.boss.radius,
                -this.boss.radius,
                this.boss.radius * 2,
                this.boss.radius * 2
            );
            ctx.restore();

            ctx.globalAlpha = 1;
            ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.boss.radius, 0, Math.PI * 2);
            ctx.stroke();

        } else {
            ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.arc(0, -this.boss.radius * 0.5, 12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-5, -this.boss.radius * 0.5 - 2, 3, 0, Math.PI * 2);
            ctx.arc(5, -this.boss.radius * 0.5 - 2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;

            ctx.beginPath();
            ctx.moveTo(0, -this.boss.radius * 0.3);
            ctx.lineTo(0, this.boss.radius * 0.3);
            ctx.stroke();

            const armAngle = Math.sin(this.animTime * 6) * 0.4;
            ctx.beginPath();
            ctx.moveTo(-12, -this.boss.radius * 0.1);
            ctx.lineTo(0, 0);
            ctx.lineTo(12 * Math.cos(armAngle), 12 * Math.sin(armAngle));
            ctx.stroke();

            const legAngle = Math.sin(this.animTime * 6) * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, this.boss.radius * 0.3);
            ctx.lineTo(-8 * Math.cos(legAngle), this.boss.radius * 0.7);
            ctx.moveTo(0, this.boss.radius * 0.3);
            ctx.lineTo(8 * Math.cos(legAngle), this.boss.radius * 0.7);
            ctx.stroke();
        }

        if (this.freeze.active) {
            const freezePulse = Math.sin(this.animTime * 10) * 0.3 + 0.7;

            ctx.shadowBlur = 20;
            ctx.shadowColor = '#aaaaff';

            ctx.strokeStyle = `rgba(170, 170, 255, ${freezePulse * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.boss.radius + 5, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i;
                const startRadius = this.boss.radius;
                const endRadius = this.boss.radius + 8;

                const x1 = Math.cos(angle) * startRadius;
                const y1 = Math.sin(angle) * startRadius;
                const x2 = Math.cos(angle) * endRadius;
                const y2 = Math.sin(angle) * endRadius;

                ctx.strokeStyle = `rgba(200, 220, 255, ${freezePulse})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + this.animTime * -1.5;
                const radius = this.boss.radius + 6;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                ctx.fillStyle = `rgba(220, 230, 255, ${freezePulse})`;
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

function initGame() {
    new Game2D();
}

if (window.cordova) {
    document.addEventListener('deviceready', initGame, false);
} else {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        initGame();
    }
}
