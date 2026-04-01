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
        this.isLevelTransitioning = false;
        this.levelClearWaitTimer = 0; // 적 전멸 후 5초 대기용
        this.transitionTimer = 0;
        this.transitionYOffset = 0; // 배경 이동용 오프셋
        
        this.input = {
            keys: []
        };
        this.score = 0;
        this.highScore = 150000;
        this.lives = 3; // 기본 목숨 1 + 추가 2 = 3
        this.isGameOver = false;

        this.initInput();
        this.loadLevel(0);
        this.gameLoop();
    }

    initInput() {
        const overlay = document.getElementById('start-overlay');
        overlay.addEventListener('click', () => {
            overlay.style.display = 'none';
            this.canvas.setAttribute('tabindex', '0');
            this.canvas.focus();
            console.log('Game focused');
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
            console.log('ALL LEVELS CLEARED!');
            this.isLevelTransitioning = true;
            return;
        }
        const level = LEVELS[index];
        this.currentLevel = index;
        this.platforms = level.platforms;
        this.enemies = level.enemies.map(e => new Enemy(this, e.x, e.y));
        this.bubbles = [];
        this.foods = [];
        
        this.player.x = 80;
        this.player.y = 520;
        this.player.vx = 0;
        this.player.vy = 0;
        
        this.player.isTransitioning = false; // 버블에서 탈출
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
        this.transitionTimer = 2000; // 전환 연출 시간 (2초)
        this.player.isTransitioning = true; // 주인공 버블에 가두기
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
            { name: 'banana', color: '#ffff33', value: 800, type: 'fruit' },
            { name: 'apple', color: '#ff3333', value: 1000, type: 'fruit' },
            { name: 'yellowCandy', color: '#ffff00', value: 200, type: 'powerup_speed' },
            { name: 'blueCandy', color: '#00ccff', value: 200, type: 'powerup_range' },
        ];
        
        // 사탕은 20% 확률로 등장 (과일 80%)
        let food;
        const rand = Math.random();
        if (rand < 0.1) food = foodTypes[3]; // Yellow
        else if (rand < 0.2) food = foodTypes[4]; // Blue
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
        if (this.isGameOver) {
            this.draw();
            // 게임 오버 메시지
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', 400, 300);
            this.ctx.font = '24px "Press Start 2P"';
            this.ctx.fillText('CLICK TO RESTART', 400, 360);
            return;
        }

        this.update();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
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
                this.enemies.forEach(enemy => {
                    if ((enemy.state === 'alive' || enemy.state === 'angry') && this.checkCollision(bubble, enemy)) {
                        bubble.state = 'trapped';
                        bubble.trappedEnemy = enemy;
                        bubble.vy = -0.8; // 즉시 위로 떠오르기 시작
                        enemy.state = 'trapped';
                    }
                });
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

                // 아이템 효과 적용
                if (food.type === 'powerup_speed') {
                    this.player.shootDelay = Math.max(100, this.player.shootDelay - 30);
                    console.log('연사력 강화!', this.player.shootDelay);
                } else if (food.type === 'powerup_range') {
                    this.player.bubbleSpeed = Math.min(20, this.player.bubbleSpeed + 2);
                    console.log('사거리 강화!', this.player.bubbleSpeed);
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

        ctx.fillStyle = '#0affff'; // 다이아몬드 색상 (네온 블루)
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#0affff';

        for (let i = 0; i < this.lives; i++) {
            ctx.beginPath();
            ctx.moveTo(startX + i * spacing, startY - size); // Top
            ctx.lineTo(startX + i * spacing + size, startY); // Right
            ctx.lineTo(startX + i * spacing, startY + size); // Bottom
            ctx.lineTo(startX + i * spacing - size, startY); // Left
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Draw Food
        this.foods.forEach(food => {
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = food.color;
            this.ctx.fillStyle = food.color;
            
            // 과일 모양 그리기
            this.ctx.beginPath();
            this.ctx.arc(food.x + food.width/2, food.y + food.height/2, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 하이라이트 추가
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(food.x + food.width/2 - 4, food.y + food.height/2 - 4, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 꼭지/잎사귀
            this.ctx.fillStyle = '#0f0';
            this.ctx.fillRect(food.x + food.width/2 - 2, food.y + food.height/2 - 16, 4, 6);
            
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
