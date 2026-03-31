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
        this.frameTimer = 0;
        this.frameInterval = 120; 
        
        this.animations = {
            'IDLE': { row: 0, frames: 4 },
            'WALKING': { row: 1, frames: 6 },
            'JUMPING': { row: 2, frames: 5 },
            'SHOOTING': { row: 3, frames: 6 }
        };

        this.lastShot = 0;
        this.shootDelay = 250;
        this.isShooting = false;
        this.shootingTimer = 0;

        // 640x640 sheet -> 6 cols, 4 rows
        this.colWidth = 640 / 6;
        this.rowHeight = 640 / 4;
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
        const keys = input.keys;
        const leftKey = this.isPlayer2 ? 'a' : 'ArrowLeft';
        const rightKey = this.isPlayer2 ? 'd' : 'ArrowRight';
        const upKey = this.isPlayer2 ? 'w' : 'ArrowUp';
        const shootKey = this.isPlayer2 ? 'q' : ' ';

        if (keys.includes(leftKey)) {
            this.vx = -this.speed;
            this.direction = -1;
            if (this.grounded) this.state = 'WALKING';
        } else if (keys.includes(rightKey)) {
            this.vx = this.speed;
            this.direction = 1;
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
            this.game.shootBubble(this.x + (this.direction === 1 ? this.width : 0), this.y + 10, this.direction);
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

        this.frameTimer += 16;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            const anim = this.animations[this.state];
            this.frameX = (this.frameX + 1) % anim.frames;
        }
    }

    hit() {
        if (this.isInvincible) return;
        this.isInvincible = true;
        this.invincibleTimer = 2000;
        console.log('Player hit! isInvincible is now:', this.isInvincible);
        
        // Push the player back slightly and stop vertical velocity
        this.vy = -5;
        this.vx = this.direction * -5;
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
        if (this.direction === -1) {
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.processedImage, sx, sy, sw, sh, 0, 0, this.width, this.height);
        } else {
            ctx.drawImage(this.processedImage, sx, sy, sw, sh, this.x, this.y, this.width, this.height);
        }
        ctx.restore();
    }
}
