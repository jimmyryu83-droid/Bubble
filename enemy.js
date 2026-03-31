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
        
        this.image = new Image();
        this.image.src = 'assets/tiles.png';
        
        this.direction = this.vx > 0 ? 1 : -1;
        this.animTimer = 0;
        this.frame = 0;
        this.isAngry = false;
    }

    update() {
        if (this.state === 'alive' || this.state === 'angry') {
            const speedMultiplier = this.isAngry ? 2 : 1;
            
            this.vy += this.gravity;
            this.x += this.vx * speedMultiplier;
            this.y += this.vy;

            if (this.x < 32) {
                this.x = 32;
                this.vx *= -1;
                this.direction = 1;
            }
            if (this.x > 768 - this.width) {
                this.x = 768 - this.width;
                this.vx *= -1;
                this.direction = -1;
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

            this.animTimer += 16;
            if (this.animTimer > (this.isAngry ? 100 : 200)) {
                this.animTimer = 0;
                this.frame = (this.frame + 1) % 2;
            }
        }
    }

    draw(ctx) {
        if (this.state === 'alive' || this.state === 'angry') {
            // tiles.png 640x640. Zen-Chan in bottom-left quadrant.
            // Quadrant 0, 320 to 320, 640.
            // Crop tighter: (40, 360) with size 240x240
            const sw = 240; 
            const sh = 240;
            const sx = 40; 
            const sy = 360;

            ctx.save();
            if (this.isAngry) {
                ctx.filter = 'hue-rotate(-120deg) brightness(1.2)';
            }
            
            if (this.direction === -1) {
                ctx.translate(this.x + this.width, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(this.image, sx, sy, sw, sh, 0, 0, this.width, this.height);
            } else {
                ctx.drawImage(this.image, sx, sy, sw, sh, this.x, this.y, this.width, this.height);
            }
            ctx.restore();
        }
    }
}
