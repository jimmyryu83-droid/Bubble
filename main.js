import { Player } from './player.js';
import { Bubble } from './bubble.js';
import { Enemy } from './enemy.js';
import { LEVELS } from './levels.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;

        this.player = new Player(this);
        this.bubbles = [];
        this.enemies = [];
        this.foods = [];
        this.platforms = [];
        
        this.currentLevel = 0;
        this.gameState = 'TITLE'; // TITLE, PLAYING, GAMEOVER
        this.isLevelTransitioning = false;
        this.levelClearWaitTimer = 0;
        this.transitionTimer = 0;
        this.transitionYOffset = 0;
        
        this.input = {
            keys: []
        };
        this.score = 0;
        this.highScore = 150000;
        this.lives = 3;
        this.gameOverTimer = 0;
        this.demoTimer = 0;

        this.initInput();
        const overlay = document.getElementById('start-overlay');
        overlay.querySelector('h1').innerText = 'CLICK TO START';
        this.loadLevel(0);
        this.gameLoop();
    }

    initInput() {
        const overlay = document.getElementById('start-overlay');
        overlay.addEventListener('click', () => {
            if (this.gameState === 'TITLE' || this.gameState === 'GAMEOVER') {
                this.startNewGame();
            }
            overlay.style.display = 'none';
            this.canvas.setAttribute('tabindex', '0');
            this.canvas.focus();
        });

        this.canvas.addEventListener('keydown', (e) => {
            if (!this.input.keys.includes(e.key)) this.input.keys.push(e.key);
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            // Cheat Key: N (Skip level)
            if (e.key.toLowerCase() === 'n' && !this.isLevelTransitioning) {
                this.enemies = []; // 적 전멸 처리
                this.levelClearWaitTimer = 0; // 즉시 대기 끝
                console.log('CHEAT: Next Level Skip');
            }
        });
        this.canvas.addEventListener('keyup', (e) => {
            this.input.keys = this.input.keys.filter(k => k !== e.key);
            e.preventDefault();
        });
    }

    loadLevel(index) {
        if (index >= LEVELS.length) {
            this.gameState = 'GAMECLEAR';
            this.gameOverTimer = 0;
            return;
        }
        const level = LEVELS[index];
        this.currentLevel = index;
        this.platforms = level.platforms;
        this.enemies = level.enemies.map(e => new Enemy(this, e.x, e.y));
        this.bubbles = [];
        this.foods = [];
        
        this.player.x = 80;
        this.player.y = -50; // 공중에서 등장 시작
        this.player.vx = 0;
        this.player.vy = 0;
        
        this.player.isTransitioning = false;
        this.player.isArriving = true; // 등장 연출 시작
        this.player.transitionBubbleTimer = 0;
        this.transitionYOffset = 0; // 오프셋 초기화
        this.levelClearWaitTimer = 0; // 대기 타이머 초기화
        
        document.getElementById('round-val').innerText = level.round.toString().padStart(2, '0');
        this.isLevelTransitioning = false;
        
        // Flash effect for new round
        this.flashTimer = 500;
    }

    nextLevel() {
        if (this.isLevelTransitioning) return;
        this.isLevelTransitioning = true;
        this.transitionTimer = 2000;
        this.player.isTransitioning = true;
    }

    startNewGame() {
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 0;
        this.gameState = 'PLAYING';
        this.loadLevel(0);
        this.updateScore();
    }

    shootBubble(x, y, direction, speed) {
        this.bubbles.push(new Bubble(this, x, y, direction, speed));
    }

    removeBubble(bubble) {
        this.bubbles = this.bubbles.filter(b => b !== bubble);
    }

    spawnFood(x, y, type = 'fruit') {
        const foodTypes = [
            { name: 'cherry', color: '#ff3366', value: 500, type: 'fruit' },
            { name: 'orange', color: '#ff8800', value: 800, type: 'fruit' },
            { name: 'apple', color: '#ff3333', value: 1000, type: 'fruit' },
            { name: 'pinkCandy', color: '#ff66cc', value: 200, type: 'powerup_rate' },
            { name: 'blueCandy', color: '#3366ff', value: 200, type: 'powerup_range' },
            { name: 'yellowCandy', color: '#ffff00', value: 200, type: 'powerup_speed' },
            { name: 'shoes', color: '#ffffff', value: 500, type: 'powerup_walk' },
        ];
        
        // 사탕/운동화는 약 8% 확률로 아주 가끔 등장하도록 (과일 92%)
        let food;
        const rand = Math.random();
        if (rand < 0.02) food = foodTypes[3]; // Pink Candy (2%)
        else if (rand < 0.04) food = foodTypes[4]; // Blue Candy (2%)
        else if (rand < 0.06) food = foodTypes[5]; // Yellow Candy (2%)
        else if (rand < 0.08) food = foodTypes[6]; // Shoes (2%)
        else food = foodTypes[Math.floor(Math.random() * 3)]; // Fruits
        
        this.foods.push({
            x: x,
            y: y,
            width: 32,
            height: 32,
            vy: -5, // 통 튀겨나오는 효과
            gravity: 0.3,
            value: food.value,
            color: food.color,
            name: food.name,
            type: food.type,
            lifetime: 0
        });
    }

    defeatEnemy(enemy) {
        this.enemies = this.enemies.filter(e => e !== enemy);
        this.score += 1000;
        this.updateScore();
        this.spawnFood(enemy.x, enemy.y);
    }

    updateScore() {
        document.getElementById('p1-score-val').innerText = this.score.toString().padStart(2, '0');
        if (this.score > this.highScore) {
            this.highScore = this.score;
            document.getElementById('high-score-val').innerText = this.highScore.toString().padStart(2, '0');
        }
    }

    gameLoop() {
        if (this.gameState === 'GAMECLEAR') {
            this.draw();
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, 800, 600);
            this.ctx.fillStyle = 'yellow';
            this.ctx.font = '48px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME CLEAR', 400, 300);
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.fillText('CONGRATULATIONS!', 400, 360);
            
            this.gameOverTimer += 16;
            if (this.gameOverTimer > 5000) {
                this.gameState = 'TITLE';
                this.gameOverTimer = 0;
                const overlay = document.getElementById('start-overlay');
                overlay.style.display = 'flex';
                this.loadLevel(0);
            }
        } else if (this.gameState === 'GAMEOVER') {
            this.draw();
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, 800, 600);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', 400, 300);
            
            this.gameOverTimer += 16;
            if (this.gameOverTimer > 3000) {
                this.gameState = 'TITLE';
                this.gameOverTimer = 0;
                const overlay = document.getElementById('start-overlay');
                overlay.style.display = 'flex';
                overlay.querySelector('h1').innerText = 'CLICK TO START';
                this.loadLevel(0);
            }
        } else if (this.gameState === 'TITLE') {
            this.demoUpdate();
            this.draw();
            // TITLE overlay is handled by CSS/HTML overlay visibility
        } else {
            this.update();
            this.draw();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    demoUpdate() {
        // AI Input Simulation
        const demoKeys = [];
        const nearestEnemy = this.enemies.find(e => e.state === 'alive' || e.state === 'angry');
        
        if (nearestEnemy) {
            if (nearestEnemy.x < this.player.x - 40) demoKeys.push(this.player.isPlayer2 ? 'a' : 'ArrowLeft');
            else if (nearestEnemy.x > this.player.x + 40) demoKeys.push(this.player.isPlayer2 ? 'd' : 'ArrowRight');
            
            if (nearestEnemy.y < this.player.y - 20) demoKeys.push(this.player.isPlayer2 ? 'w' : 'ArrowUp');
            if (Math.abs(nearestEnemy.x - this.player.x) < 200 && Math.abs(nearestEnemy.y - this.player.y) < 50) {
                demoKeys.push(this.player.isPlayer2 ? 'q' : ' ');
            }
        }
        
        // Use normal update logic with simulated keys
        const originalKeys = this.input.keys;
        this.input.keys = demoKeys;
        this.update();
        this.input.keys = originalKeys;

        // Auto-reset demo if stuck or cleared
        this.demoTimer += 16;
        if (this.demoTimer > 15000 || (this.enemies.length === 0 && this.levelClearWaitTimer < 100)) {
            this.loadLevel(Math.floor(Math.random() * LEVELS.length));
            this.demoTimer = 0;
        }
    }

    update() {
        if (this.isLevelTransitioning) {
            this.transitionTimer -= 16;
            this.transitionYOffset -= 2; // 배경이 위로 서서히 올라가는 효과
            this.player.update(); // 주인공 버블 애니메이션을 위해 호출
            if (this.transitionTimer <= 0) {
                this.loadLevel(this.currentLevel + 1);
            }
            return;
        }

        if (this.input.keys.length > 0) {
            // console.log('Active Keys:', this.input.keys);
        }
        this.player.update(this.input);
        
        // Bubbles update and collision
        this.bubbles.forEach(bubble => {
            bubble.update();
            
            // Player Collision (Pop/Jump)
            if (this.checkCollision(this.player, bubble)) {
                if (bubble.state === 'floating' || bubble.state === 'trapped') {
                    // 위에서 밟는 경우는 점프 (이미 player.js에서 처리하지만 여기서도 확인)
                    if (this.player.vy > 0 && this.player.y + this.player.height < bubble.y + 20) {
                        // jump handling is in player.js, but we can trigger pop here too if we want
                    } else {
                        bubble.pop(bubble.state === 'trapped'); 
                    }
                }
            }

            // Bubble-Enemy Collision
            if (bubble.state === 'shooting') {
                for (const enemy of this.enemies) {
                    if ((enemy.state === 'alive' || enemy.state === 'angry') && this.checkCollision(bubble, enemy)) {
                        bubble.state = 'trapped';
                        bubble.trappedEnemy = enemy;
                        bubble.vy = -0.8; // 즉시 위로 떠오르기 시작
                        enemy.state = 'trapped';
                        break; // 한 개의 버블은 한 명의 적만 가둡니다.
                    }
                }
            }
        });

        // Enemies update
        this.enemies.forEach((enemy, idx) => {
            enemy.update();
            // Player death collision
            if ((enemy.state === 'alive' || enemy.state === 'angry')) {
                const collision = this.checkCollision(this.player, enemy);
                if (collision && !this.player.isInvincible) {
                    console.log(`COLLISION with enemy ${idx}! player.isInvincible was: ${this.player.isInvincible}`);
                    this.player.hit();
                    console.log(`AFTER HIT: player.isInvincible is now: ${this.player.isInvincible}`);
                }
            }
        });

        // Food update and collection
        this.foods = this.foods.filter(food => {
            food.vy += food.gravity;
            food.y += food.vy;
            food.lifetime += 16; // 약 16ms씩 증가
            
            // Food collision with platforms
            this.platforms.forEach(p => {
                if (food.vy >= 0 && food.x + food.width > p.x && food.x < p.x + p.w &&
                    food.y + food.height <= p.y + 10 && food.y + food.height + food.vy >= p.y) {
                    food.y = p.y - food.height;
                    food.vy = 0;
                }
            });
            if (food.y > 568 - food.height) { food.y = 568 - food.height; food.vy = 0; }

            if (this.checkCollision(this.player, food)) {
                this.score += food.value;
                this.updateScore();

                // 아이템 효과 적용 (유튜브 영상 고증)
                if (food.type === 'powerup_rate') {
                    this.player.shootDelay = Math.max(80, this.player.shootDelay - 40);
                    console.log('연사 속도 강화!', this.player.shootDelay);
                } else if (food.type === 'powerup_range') {
                    this.player.bubbleSpeed = Math.min(15, this.player.bubbleSpeed + 2);
                    console.log('사거리 강화!', this.player.bubbleSpeed);
                } else if (food.type === 'powerup_speed') {
                    this.player.bubbleSpeed = Math.min(20, this.player.bubbleSpeed + 3);
                    console.log('버블 비행 속도 강화!', this.player.bubbleSpeed);
                } else if (food.type === 'powerup_walk') {
                    this.player.speed = Math.min(7, this.player.speed + 1);
                    console.log('이동 속도 강화!', this.player.speed);
                }

                return false; // 먹었으면 제거
            }
            
            // 3초(3000ms) 지나면 사라짐
            return food.lifetime < 3000;
        });

        // Level Clear Check: 적만 전멸하면 5초간 아이템 먹을 시간 부여
        if (this.enemies.length === 0 && !this.isLevelTransitioning) {
            if (this.levelClearWaitTimer === 0) {
                this.levelClearWaitTimer = 5000; // 5초 대기 시작
                console.log('LEVEL CLEAR! 5s waiting for items...');
            }
            
            this.levelClearWaitTimer -= 16;
            if (this.levelClearWaitTimer <= 0) {
                this.nextLevel(); // 대기 후 연출 시작
            }
        }
    }

    getPlatformColor(level) {
        const colors = ['#0affff', '#3366ff', '#ff33ff', '#00ff00', '#ff3333', '#ffff00', '#ffffff', '#ff8800', '#cc00ff', '#0aff88'];
        return colors[level % colors.length];
    }

    draw() {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Background
        this.ctx.fillStyle = '#000'; 
        this.ctx.fillRect(0, 0, 800, 600);
        
        const wallColor = this.getPlatformColor(this.currentLevel);
        
        // Draw Floor & Walls with Neon Glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = wallColor;
        this.ctx.fillStyle = wallColor; 
        
        // 오프셋을 적용한 그리기 (벽과 바닥)
        const offset = this.transitionYOffset;
        this.ctx.fillRect(0, 568 + offset, 800, 32); 
        this.ctx.fillRect(0, offset, 32, 600);   
        this.ctx.fillRect(768, offset, 32, 600); 

        // Draw Platforms with brick pattern
        this.platforms.forEach(p => {
            this.ctx.fillStyle = wallColor;
            this.ctx.fillRect(p.x, p.y + offset, p.w, p.h);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, p.y + offset, p.w, p.h);
            
            // Internal lines for bricks
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for(let bx = p.x + 32; bx < p.x + p.w; bx += 32) {
                this.ctx.moveTo(bx, p.y + offset);
                this.ctx.lineTo(bx, p.y + offset + p.h);
            }
            this.ctx.stroke();
        });
        this.ctx.shadowBlur = 0;
        
        // Draw HUD overlay (optional if CSS is used, but good to have)
        this.player.draw(this.ctx);
        this.bubbles.forEach(bubble => bubble.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.drawLives(this.ctx);
    }

    drawLives(ctx) {
        const startX = 40;
        const startY = 585;
        const size = 10;
        const spacing = 20;

        ctx.fillStyle = '#0affff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0affff';

        for (let i = 0; i < this.lives; i++) {
            ctx.beginPath();
            ctx.moveTo(startX + i * spacing, startY - size);
            ctx.lineTo(startX + i * spacing + size, startY);
            ctx.lineTo(startX + i * spacing, startY + size);
            ctx.lineTo(startX + i * spacing - size, startY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        
        // Draw Food
        this.foods.forEach(food => {
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = food.color;
            this.ctx.fillStyle = food.color;
            
            // 모양 그리기
            if (food.type.startsWith('powerup')) {
                if (food.type === 'powerup_walk') {
                    // 운동화 모양 (단순화)
                    this.ctx.fillRect(food.x + 4, food.y + 16, 24, 10);
                    this.ctx.fillRect(food.x + 20, food.y + 6, 8, 20);
                } else {
                    // 사탕 모양 (가로형)
                    this.ctx.fillRect(food.x + 4, food.y + 10, 24, 12); // 중앙 몸통
                    
                    // 왼쪽 매듭
                    this.ctx.beginPath();
                    this.ctx.moveTo(food.x + 4, food.y + 16);
                    this.ctx.lineTo(food.x - 2, food.y + 8);
                    this.ctx.lineTo(food.x - 2, food.y + 24);
                    this.ctx.fill();
                    
                    // 오른쪽 매듭
                    this.ctx.beginPath();
                    this.ctx.moveTo(food.x + 28, food.y + 16);
                    this.ctx.lineTo(food.x + 34, food.y + 8);
                    this.ctx.lineTo(food.x + 34, food.y + 24);
                    this.ctx.fill();
                }
            } else {
                // 과일 모양 (원형)
                this.ctx.beginPath();
                this.ctx.arc(food.x + food.width/2, food.y + food.height/2, 12, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 꼭지/잎사귀 (과일만)
                this.ctx.fillStyle = '#0f0';
                this.ctx.fillRect(food.x + food.width/2 - 2, food.y + food.height/2 - 16, 4, 6);
            }
            
            // 공통 하이라이트 추가
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(food.x + food.width/2 - 4, food.y + food.height/2 - 4, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }

    checkCollision(rect1, rect2) {
        if (!rect1 || !rect2) return false;
        const r1 = { x: rect1.x, y: rect1.y, w: rect1.width || 32, h: rect1.height || 32 };
        const r2 = { x: rect2.x, y: rect2.y, w: rect2.width || 32, h: rect2.height || 32 };
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    }
}

window.onload = () => new Game();
