class Game2D {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.joystickCanvas = document.getElementById('joystick');
        this.joystickCtx = this.joystickCanvas.getContext('2d');

        this.state = 'menu';
        this.time = 90;
        this.coinsCollected = 0;
        this.coinsTotal = 20;
        this.coinsRequired = 14;

        this.player = {
            x: 400,
            y: 300,
            radius: 20,
            speed: 200,
            color: '#00ff00'
        };

        this.bossImage = new Image();
        this.bossImage.src = 'assets/images/boss.png';
        this.boss = {
            x: 100,
            y: 100,
            radius: 30,
            speed: 120
        };

        this.hackerImage = new Image();
        this.hackerImage.src = 'assets/images/aaa.png';

        this.obstacles = [];
        this.generateObstacles();

        this.coins = [];
        this.generateCoins();

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

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.setupJoystick();

        this.setupUI();

        this.lastTime = 0;
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    resize() {
        const padding = 20;
        this.canvas.width = window.innerWidth - padding;
        this.canvas.height = window.innerHeight - padding;

        if (window.innerWidth < 768) {
            this.canvas.height = Math.max(this.canvas.height, window.innerHeight - padding);
        }

        const joystickSize = Math.min(250, window.innerHeight * 0.3, window.innerWidth * 0.3);
        this.joystickCanvas.width = joystickSize;
        this.joystickCanvas.height = joystickSize;
        this.joystick.baseX = joystickSize / 2;
        this.joystick.baseY = joystickSize / 2;
        this.joystick.knobX = this.joystick.baseX;
        this.joystick.knobY = this.joystick.baseY;
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
                x: Math.random() * (this.canvas.width - 60) + 30,
                y: Math.random() * (this.canvas.height - 60) + 30,
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
                x: Math.random() * (this.canvas.width - 60) + 30,
                y: Math.random() * (this.canvas.height - 60) + 30,
                radius: 10,
                collected: false
            });
        }
    }

    generateObstacles() {
        this.obstacles = [];

        const area = this.canvas.width * this.canvas.height;
        const baseArea = 640000;
        const areaRatio = area / baseArea;

        let numObstacles = Math.floor(8 * areaRatio);
        numObstacles = Math.max(3, Math.min(12, numObstacles));

        const minSize = Math.max(40, this.canvas.width * 0.06);
        const maxSize = Math.max(80, this.canvas.width * 0.12);

        const margin = Math.max(30, this.canvas.width * 0.05);

        const sectorsX = Math.ceil(Math.sqrt(numObstacles));
        const sectorsY = Math.ceil(numObstacles / sectorsX);
        const sectorWidth = this.canvas.width / sectorsX;
        const sectorHeight = this.canvas.height / sectorsY;

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
                    x + width <= this.canvas.width - margin &&
                    y + height <= this.canvas.height - margin) {

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

        let playerSpawned = false;
        let attempts = 0;
        while (!playerSpawned && attempts < 100) {
            attempts++;
            const testX = Math.random() * (this.canvas.width - 100) + 50;
            const testY = Math.random() * (this.canvas.height - 100) + 50;

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
            this.player.x = this.canvas.width / 2;
            this.player.y = this.canvas.height / 2;
        }

        let bossSpawned = false;
        attempts = 0;
        while (!bossSpawned && attempts < 100) {
            attempts++;
            const testX = Math.random() * (this.canvas.width - 100) + 50;
            const testY = Math.random() * (this.canvas.height - 100) + 50;

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
            this.boss.x = this.canvas.width * 0.9;
            this.boss.y = this.canvas.height * 0.1;
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

        let newX = this.player.x + this.joystick.deltaX * this.player.speed * dt;
        let newY = this.player.y + this.joystick.deltaY * this.player.speed * dt;

        newX = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, newX));
        newY = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, newY));

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

                if (this.coinsCollected >= this.coinsRequired) {
                    this.win();
                }
            }
        }

        document.getElementById('timer').textContent = Math.ceil(this.time);
        document.getElementById('coins').textContent = this.coinsCollected;
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
        document.getElementById('win-screen').classList.add('active');
    }

    lose(msg) {
        this.state = 'lose';
        document.getElementById('lose-msg').textContent = msg;
        document.getElementById('lose-screen').classList.add('active');
    }

    draw() {
        const ctx = this.ctx;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const gridSize = 30;
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
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

        if (this.joystick.active) {
                jCtx.shadowBlur = 25;
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

                jCtx.shadowBlur = 20;
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

        const pulse = Math.sin(this.animTime * 10) * 0.1 + 0.9;
        const walkCycle = Math.sin(this.animTime * 8);

        ctx.shadowBlur = 25;
        ctx.shadowColor = '#00ff41';

        ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.fillStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(0, 14);
        ctx.stroke();

        const armSwing = walkCycle * 0.5;
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(0, 6);
        ctx.lineTo(-8, 12 + armSwing * 5);
        ctx.moveTo(10, 6);
        ctx.lineTo(0, 6);
        ctx.lineTo(8, 12 - armSwing * 5);
        ctx.stroke();

        const legSwing = walkCycle * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(-6, 22 + legSwing * 4);
        ctx.moveTo(0, 14);
        ctx.lineTo(6, 22 - legSwing * 4);
        ctx.stroke();

        if (this.hackerImage.complete && this.hackerImage.width > 0) {
            const headRadius = 12;

            ctx.shadowBlur = 30;
            ctx.shadowColor = `rgba(0, 255, 65, ${pulse})`;

            ctx.save();
            ctx.beginPath();
            ctx.arc(0, -8, headRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
                this.hackerImage,
                -headRadius,
                -8 - headRadius,
                headRadius * 2,
                headRadius * 2
            );
            ctx.restore();

            ctx.shadowBlur = 20;
            ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -8, headRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(0, 255, 65, 0.2)`;
            ctx.lineWidth = 1;
            for (let i = -headRadius; i < headRadius; i += 3) {
                ctx.beginPath();
                ctx.moveTo(-headRadius, -8 + i);
                ctx.lineTo(headRadius, -8 + i);
                ctx.stroke();
            }

        } else {
            ctx.beginPath();
            ctx.arc(0, -8, 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(0, 255, 65, ${pulse})`;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('<>', 0, 8);

        ctx.restore();
    }

    drawBoss(ctx) {
        ctx.save();
        ctx.translate(this.boss.x, this.boss.y);

        const pulse = Math.sin(this.animTime * 4) * 0.2 + 0.8;
        const glow = Math.sin(this.animTime * 2) * 10 + 20;

        ctx.shadowBlur = glow;
        ctx.shadowColor = '#ff0000';

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
