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
        this.time = 90;
        this.coinsCollected = 0;
        this.coinsTotal = 20;
        this.coinsRequired = 20;

        this.player = {
            x: 400,
            y: 300,
            radius: 20,
            speed: 200,
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
            radius: 30,
            speed: 140,
            baseSpeed: 140,
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

        this.slowEffect = {
            active: false,
            duration: 0
        };

        this.speedBoost = {
            active: false,
            duration: 0
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
                radius: 10,
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
                const trap = {
                    x: Math.random() * (this.displayWidth - 100) + 50,
                    y: Math.random() * (this.displayHeight - 100) + 50,
                    radius: 25,
                    rotation: Math.random() * Math.PI * 2
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
                const bonus = {
                    x: Math.random() * (this.displayWidth - 100) + 50,
                    y: Math.random() * (this.displayHeight - 100) + 50,
                    radius: 15,
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

    generateObstacles() {
        this.obstacles = [];

        const area = this.displayWidth * this.displayHeight;
        const baseArea = 640000;
        const areaRatio = area / baseArea;

        let numObstacles = Math.floor(8 * areaRatio);
        numObstacles = Math.max(3, Math.min(12, numObstacles));

        const minSize = Math.max(40, this.displayWidth * 0.06);
        const maxSize = Math.max(80, this.displayWidth * 0.12);

        const margin = Math.max(30, this.displayWidth * 0.05);

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
    }

    startGame() {
        this.state = 'playing';
        this.time = 90;
        this.coinsCollected = 0;

        this.generateObstacles();
        this.generateTraps();
        this.generateBonuses();

        this.slowEffect.active = false;
        this.slowEffect.duration = 0;
        this.speedBoost.active = false;
        this.speedBoost.duration = 0;

        this.boss.rushTimer = 0;
        this.boss.rushCooldown = 0;
        this.boss.speed = this.boss.baseSpeed;

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

        let effectiveSpeed = this.player.speed;
        if (this.slowEffect.active) {
            effectiveSpeed *= 0.3;
        }
        if (this.speedBoost.active) {
            effectiveSpeed *= 1.8;
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
            let moveX = (dx / dist) * this.boss.speed * dt;
            let moveY = (dy / dist) * this.boss.speed * dt;

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

        const bossDist = Math.sqrt(
            Math.pow(this.player.x - this.boss.x, 2) +
            Math.pow(this.player.y - this.boss.y, 2)
        );
        if (bossDist < this.player.radius + this.boss.radius) {
            this.sound.playSound('caught');
            this.lose('Boss caught you!');
            return;
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
                if (!this.slowEffect.active) {
                    this.sound.playSound('trap');
                    this.slowEffect.active = true;
                    this.slowEffect.duration = 3;
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
                this.speedBoost.active = true;
                this.speedBoost.duration = 5;
            }
        }

        document.getElementById('timer').textContent = Math.ceil(this.time);
        document.getElementById('coins').textContent = this.coinsCollected;

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
    }

    checkCircleRectCollision(cx, cy, cr, rect) {
        const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
        const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
        const dx = cx - nearestX;
        const dy = cy - nearestY;
        return (dx * dx + dy * dy) < (cr * cr);
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

            this.drawBoss(ctx);
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

        ctx.save();
        ctx.translate(bonus.x, bonus.y);
        ctx.rotate(rotation);

        ctx.shadowBlur = glow;
        ctx.shadowColor = '#00ffff';

        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bonus.radius * 1.5);
        outerGradient.addColorStop(0, `rgba(0, 255, 255, ${pulse * 0.4})`);
        outerGradient.addColorStop(0.5, `rgba(0, 200, 255, ${pulse * 0.2})`);
        outerGradient.addColorStop(1, `rgba(0, 150, 255, 0)`);
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, bonus.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
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
        mainGradient.addColorStop(0, `rgba(150, 255, 255, ${pulse})`);
        mainGradient.addColorStop(0.5, `rgba(0, 255, 255, ${pulse})`);
        mainGradient.addColorStop(1, `rgba(0, 180, 255, ${pulse})`);
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

        ctx.shadowBlur = 6;
        for (let i = 0; i < 6; i++) {
            const particleAngle = (Math.PI / 3) * i + rotation * 2;
            const particleRadius = bonus.radius * 1.1;
            const px = Math.cos(particleAngle) * particleRadius;
            const py = Math.sin(particleAngle) * particleRadius;

            ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.9})`;
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

        ctx.save();
        ctx.translate(trap.x, trap.y);
        ctx.rotate(rotation);

        ctx.shadowBlur = glow;
        ctx.shadowColor = '#ff0000';

        const outerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, trap.radius);
        outerGradient.addColorStop(0, `rgba(255, 0, 0, ${pulse * 0.3})`);
        outerGradient.addColorStop(0.5, `rgba(255, 0, 0, ${pulse * 0.2})`);
        outerGradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, trap.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
        ctx.fillStyle = `rgba(255, 50, 0, ${pulse * 0.8})`;
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
        centerGradient.addColorStop(0, `rgba(255, 100, 0, ${pulse})`);
        centerGradient.addColorStop(1, `rgba(200, 0, 0, ${pulse})`);
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, trap.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 0, 0, ${pulse})`;
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
