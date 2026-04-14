export class Enemy {
    constructor(game, x, y, type = 'zen-chan') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.vx = (Math.random() > 0.5 ? 1 : -1) * 2;
        this.vy = 0;
        this.width = 36;
        this.height = 36;
        this.state = 'alive'; 
        this.gravity = 0.5;
        this.grounded = false;
        this.spawnDelay = 1000; // 1초 지연 추가
        
        this.image = new Image();
        this.image.src = 'assets/tiles.png';
        
        this.direction = this.vx > 0 ? 1 : -1;
        this.flip = this.direction === -1;
        this.frameX = 0;
        this.frameY = (type === 'monsta' ? 1 : 0); // 껍질(Zen-Chan)은 0, 유령(Monsta)은 1 등으로 구분 가능
        this.frameCount = 0;
        this.isAngry = false;
    }

    update() {
        if (this.game.player.isArriving) {
            return;
        }
        if (this.state === 'alive' || this.state === 'angry') {
            if (this.type === 'monsta') {
                this.updateMonsta();
                return;
            }
            if (this.isAngry) {
                // 각성(Angry) 상태일 때는 기본적으로 플레이어를 추적합니다.
                if (this.game.player.x < this.x - 10) {
                    this.vx = -1.5; // 베이스 속도
                    this.direction = -1;
                } else if (this.game.player.x > this.x + 10) {
                    this.vx = 1.5;
                    this.direction = 1;
                }

                // 플레이어가 위에 있을 경우 더 자주 점프하여 추격합니다.
                if (this.grounded && this.game.player.y < this.y - 40 && Math.random() < 0.02) {
                    this.vy = -12;
                    this.grounded = false;
                }
            }

            const speedMultiplier = this.isAngry ? 2.2 : 1; // 각성 시 총 속도는 훨씬 빨라짐
            
            this.vy += this.gravity;
            this.x += this.vx * speedMultiplier;
            this.y += this.vy;

            if (this.x < 32) {
                this.x = 32;
                this.vx *= -1;
                this.direction = 1;
                this.flip = false;
            }
            if (this.x > 768 - this.width) {
                this.x = 768 - this.width;
                this.vx *= -1;
                this.direction = -1;
                this.flip = true;
            }

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

            if (this.grounded && Math.random() < 0.01) {
                this.vy = -10;
                this.grounded = false;
            }

            if (this.y < -this.height) this.y = 600;
            if (this.y > 600) this.y = -this.height;

            this.frameCount++;
            if (this.frameCount > (this.isAngry ? 6 : 12)) {
                this.frameCount = 0;
                this.frameX = (this.frameX + 1) % 2;
            }
        }
    }

    updateMonsta() {
        // Monsta(유령)는 중력의 영향을 받지 않고 대각선으로 이동하며 벽에 튕깁니다.
        const speed = this.isAngry ? 4 : 2;
        if (!this.monstaVx) this.monstaVx = (Math.random() > 0.5 ? 1 : -1) * speed;
        if (!this.monstaVy) this.monstaVy = (Math.random() > 0.5 ? 1 : -1) * speed;

        this.x += this.monstaVx;
        this.y += this.monstaVy;

        if (this.x < 32 || this.x > 768 - this.width) {
            this.monstaVx *= -1;
            this.direction = this.monstaVx > 0 ? 1 : -1;
            this.flip = this.direction === -1;
        }
        if (this.y < 32 || this.y > 568 - this.height) {
            this.monstaVy *= -1;
        }

        this.frameCount++;
        if (this.frameCount > 10) {
            this.frameCount = 0;
            this.frameX = (this.frameX + 1) % 2;
        }
    }

    draw(ctx) {
        if (this.state === 'alive' || this.state === 'angry') {
            // tiles.png 640x640. Zen-Chan in bottom-left quadrant.
            // Quadrant 0, 320 to 320, 640.
            // Crop tighter: (40, 360) with size 240x240
            const sw = 240; 
            const sh = 240;
            let sx = 40, sy = 360; // Zen-Chan 기본 좌표
            
            if (this.type === 'monsta') {
                // Monsta 전용 보라색 유령 스프라이트 영역 (Tiles.png 좌표 기준 조정)
                sx = 340; sy = 40;
            }

            ctx.save();
            if (this.isAngry) {
                ctx.filter = 'hue-rotate(-120deg) brightness(1.2)';
            }
            
            if (this.flip) {
                ctx.scale(-1, 1);
                // 반전 적용: -(x + width)
                ctx.drawImage(this.image, sx, sy, sw, sh, -this.x - this.width, this.y, this.width, this.height);
            } else {
                ctx.drawImage(this.image, sx, sy, sw, sh, this.x, this.y, this.width, this.height);
            }
            ctx.restore();
        }
    }
}
