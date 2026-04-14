export class Player {
    constructor(game, isPlayer2 = false) {
        this.game = game;
        this.isPlayer2 = isPlayer2;
        this.width = 44;
        this.height = 44;
        this.x = isPlayer2 ? 680 : 80;
        this.y = 520;
        this.vx = 0;
        this.vy = 0;
        this.speed = 3.5;
        this.jumpForce = -13;
        this.gravity = 0.55;
        this.grounded = false;
        this.direction = isPlayer2 ? -1 : 1; 
        
        this.isInvincible = false;
        this.invincibleTimer = 0;
        
        this.rawImage = new Image();
        this.rawImage.src = 'assets/player.png';
        this.processedImage = null;
        
        this.rawImage.onload = () => {
            this.processImage();
        };
        
        this.state = 'IDLE'; 
        this.frameX = 0;
        this.frameY = 0; // 스프라이트 시트의 행
        this.frameCount = 0; // 애니메이션 속도 조절용 카운터
        this.flip = isPlayer2; // true면 왼쪽, false면 오른쪽을 봄
        this.frameInterval = 120; // 기존 간격 유지 (또는 frameCount로 대체 가능)
        
        this.animations = {
            'IDLE': { row: 0, frames: 4 },
            'WALKING': { row: 1, frames: 6 },
            'JUMPING': { row: 2, frames: 5 },
            'SHOOTING': { row: 3, frames: 6 }
        };

        this.lastShot = 0;
        this.shootDelay = 250; // 기본 발사 간격 (ms)
        this.bubbleSpeed = 10; // 기본 버블 속도
        this.isShooting = false;
        this.shootingTimer = 0;

        // 640x640 sheet -> 6 cols, 4 rows
        this.colWidth = 640 / 6;
        this.rowHeight = 640 / 4;

        // 스테이지 전환 정보
        this.isTransitioning = false;
        this.isArriving = false;
        this.transitionBubbleTimer = 0;
        this.bubbleSprite = new Image();
        this.bubbleSprite.src = 'assets/tiles.png';
    }

    processImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.rawImage.width;
        canvas.height = this.rawImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.rawImage, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // Be more aggressive with white/near-white removal for outlines
            if (data[i] > 220 && data[i+1] > 220 && data[i+2] > 220) {
                data[i+3] = 0;
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.processedImage = canvas;
    }

    update(input) {
        if (this.isTransitioning) {
            // 전환 중에는 입력 및 물리 무시, 서서히 위로 떠오름
            this.y -= 1.5;
            this.transitionBubbleTimer += 16;
            return;
        }

        if (this.isArriving) {
            // 스테이지 시작 시 버블 타고 내려옴
            this.y += 2.5; 
            this.transitionBubbleTimer += 16;
            // 목표 지점(520) 근처에 오면 종료
            if (this.y >= 520) {
                this.y = 520;
                this.isArriving = false;
                this.transitionBubbleTimer = 0;
            }
            return;
        }

        const keys = input.keys;
        const leftKey = this.isPlayer2 ? 'a' : 'ArrowLeft';
        const rightKey = this.isPlayer2 ? 'd' : 'ArrowRight';
        const upKey = this.isPlayer2 ? 'w' : 'ArrowUp';
        const shootKey = this.isPlayer2 ? 'q' : ' ';

        if (keys.includes(leftKey)) {
            this.vx = -this.speed;
            this.direction = -1;
            this.flip = true;
            if (this.grounded) this.state = 'WALKING';
        } else if (keys.includes(rightKey)) {
            this.vx = this.speed;
            this.direction = 1;
            this.flip = false;
            if (this.grounded) this.state = 'WALKING';
        } else {
            this.vx = 0;
            if (this.grounded) this.state = 'IDLE';
        }

        if (keys.includes(upKey) && this.grounded) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.state = 'JUMPING';
        }

        if (keys.includes(upKey) && this.vy > 0) {
            this.game.bubbles.forEach(b => {
                if (b.state === 'floating' || b.state === 'trapped') {
                    if (this.game.checkCollision(this, b) && this.y + this.height < b.y + 20) {
                        this.y = b.y - this.height;
                        this.vy = this.jumpForce;
                    }
                }
            });
        }

        if (keys.includes(shootKey) && Date.now() - this.lastShot > this.shootDelay) {
            this.game.shootBubble(this.x + (this.direction === 1 ? this.width : 0), this.y + 10, this.direction, this.bubbleSpeed);
            this.lastShot = Date.now();
            this.isShooting = true;
            this.shootingTimer = 200;
        }

        if (this.isShooting) {
            this.shootingTimer -= 16;
            if (this.shootingTimer <= 0) this.isShooting = false;
            else this.state = 'SHOOTING';
        }

        if (!this.grounded && !this.isShooting) {
            this.state = 'JUMPING';
        }

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        this.grounded = false;
        if (this.y > 568 - this.height) {
            this.y = 568 - this.height;
            this.vy = 0;
            this.grounded = true;
        }

        this.game.platforms.forEach(p => {
            if (this.vy >= 0 && 
                this.x + this.width * 0.7 > p.x && 
                this.x + this.width * 0.3 < p.x + p.w &&
                this.y + this.height <= p.y + 10 &&
                this.y + this.height + this.vy >= p.y) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.grounded = true;
            }
        });

        if (this.isInvincible) {
            this.invincibleTimer -= 16;
            if (this.invincibleTimer <= 0) this.isInvincible = false;
        }

        if (this.x < 32) this.x = 32;
        if (this.x > 768 - this.width) this.x = 768 - this.width;
        if (this.y < -this.height) this.y = 600;
        if (this.y > 600) this.y = -this.height;

        this.frameCount++;
        if (this.frameCount > (this.state === 'WALKING' ? 6 : 10)) { // 걷는 중엔 더 빠르게
            this.frameCount = 0;
            const anim = this.animations[this.state];
            this.frameX = (this.frameX + 1) % anim.frames;
        }
    }

    hit() {
        if (this.isInvincible || this.isArriving || this.isTransitioning || this.game.gameState === 'GAMEOVER') return;
        
        this.game.lives--;
        console.log('Player hit! Lives remaining:', this.game.lives);

        if (this.game.lives <= 0) {
            this.game.gameState = 'GAMEOVER';
            this.game.gameOverTimer = 0;
            return;
        }

        // 목숨이 남아있으면 리스폰 및 무적 부여
        this.isInvincible = true;
        this.invincibleTimer = 2000;
        
        // 시작 위치로 리스폰
        this.x = this.isPlayer2 ? 680 : 80;
        this.y = 520;
        this.vx = 0;
        this.vy = 0;
    }

    draw(ctx) {
        if (!this.processedImage) return;
        if (this.isInvincible && Math.floor(Date.now() / 100) % 2 === 0) return;

        const anim = this.animations[this.state];
        // Crop tighter to avoid black boxes and white outlines
        const sx = this.frameX * this.colWidth + 15; 
        const sy = anim.row * this.rowHeight + 65;
        const sw = 75; 
        const sh = 80;

        ctx.save();
        if (this.isPlayer2) {
             ctx.filter = 'hue-rotate(180deg)'; 
        }

        if (this.flip) {
            ctx.scale(-1, 1);
            // 반전 적용: -(x + width)
            ctx.drawImage(this.processedImage, sx, sy, sw, sh, -this.x - this.width, this.y, this.width, this.height);
        } else {
            ctx.drawImage(this.processedImage, sx, sy, sw, sh, this.x, this.y, this.width, this.height);
        }
        ctx.restore();

        // 전환 중이거나 등장 중일 경우 버블을 주인공 위에 그려줌
        if (this.isTransitioning || this.isArriving) {
            const bsx = 340; // Bubble sprite from tiles.png
            const bsy = 340;
            const bsw = 260;
            const bsh = 260;
            
            ctx.save();
            // 약간의 출렁임(Wobble) 효과
            const wobble = Math.sin(this.transitionBubbleTimer * 0.005) * 5;
            ctx.drawImage(this.bubbleSprite, bsx, bsy, bsw, bsh, this.x - 5, this.y - 5 + wobble, this.width + 10, this.height + 10);
            ctx.restore();
        }
    }
}
