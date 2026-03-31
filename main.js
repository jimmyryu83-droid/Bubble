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
        this.transitionTimer = 0;
        
        this.input = {
            keys: []
        };
        this.score = 0;
        this.highScore = 150000;
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
        
        document.getElementById('round-val').innerText = level.round.toString().padStart(2, '0');
        this.isLevelTransitioning = false;
        
        // Flash effect for new round
        this.flashTimer = 500;
    }

    nextLevel() {
        if (this.isLevelTransitioning) return;
        this.isLevelTransitioning = true;
        this.transitionTimer = 3000;
    }

    shootBubble(x, y, direction) {
        this.bubbles.push(new Bubble(this, x, y, direction));
    }

    removeBubble(bubble) {
        this.bubbles = this.bubbles.filter(b => b !== bubble);
    }

    spawnFood(x, y, type = 'fruit') {
        const foodTypes = [
            { name: 'cherry', color: '#ff3366', value: 500, sx: 0, sy: 0 },
            { name: 'banana', color: '#ffff33', value: 800, sx: 32, sy: 0 },
            { name: 'apple', color: '#ff3333', value: 1000, sx: 64, sy: 0 },
        ];
        const food = foodTypes[Math.floor(Math.random() * foodTypes.length)];
        
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
            return;
        }

        this.update();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.isLevelTransitioning) {
            this.transitionTimer -= 16;
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
        this.foods.forEach((food, index) => {
            food.vy += food.gravity;
            food.y += food.vy;
            
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
                this.foods.splice(index, 1);
            }
        });

        // Level Clear Check
        if (this.enemies.length === 0 && this.foods.length === 0 && !this.isLevelTransitioning) {
            this.nextLevel();
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
        this.ctx.fillRect(0, 568, 800, 32); 
        this.ctx.fillRect(0, 0, 32, 600);   
        this.ctx.fillRect(768, 0, 32, 600); 

        // Draw Platforms with brick pattern
        this.platforms.forEach(p => {
            this.ctx.fillStyle = wallColor;
            this.ctx.fillRect(p.x, p.y, p.w, p.h);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, p.y, p.w, p.h);
            
            // Internal lines for bricks
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for(let bx = p.x + 32; bx < p.x + p.w; bx += 32) {
                this.ctx.moveTo(bx, p.y);
                this.ctx.lineTo(bx, p.y + p.h);
            }
            this.ctx.stroke();
        });
        this.ctx.shadowBlur = 0;

        // Draw HUD overlay (optional if CSS is used, but good to have)
        if (this.isLevelTransitioning) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '32px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('NEXT ROUND!', 400, 300);
        }

        this.player.draw(this.ctx);
        this.bubbles.forEach(bubble => bubble.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
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
