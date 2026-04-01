export class Bubble {
    constructor(game, x, y, direction, speed = 10) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.vx = direction * speed;
        this.vy = 0;
        this.width = 40;
        this.height = 40;
        this.state = 'shooting'; 
        this.lifetime = 0;
        this.maxLifetime = 8000 + Math.random() * 2000;
        this.trappedEnemy = null;
        this.image = new Image();
        this.image.src = 'assets/tiles.png';
        
        this.wobbleSpeed = 0.005 + Math.random() * 0.002;
        this.wobbleAmount = 0.3 + Math.random() * 0.2;
        
        this.poppingTimer = 0;
        this.poppingDuration = 500; // 0.5초 동안 사방으로 튐
    }

    update() {
        this.lifetime += 16; 

        if (this.state === 'shooting') {
            this.x += this.vx;
            this.vx *= 0.92;
            if (Math.abs(this.vx) < 1) {
                this.state = 'floating';
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = -0.8;
            }
        } else if (this.state === 'floating' || this.state === 'trapped') {
            if (this.vy === 0) this.vy = -0.8; // 떠오르기 시작
            this.x += this.vx;
            this.y += this.vy;
            this.vx = Math.sin(this.lifetime * this.wobbleSpeed) * this.wobbleAmount;
            if (this.y < 40) {
                this.y = 40;
                this.vy = 0;
            }
        } else if (this.state === 'popping') {
            // 사방으로 랜덤하게 튀는 효과
            this.x += (Math.random() - 0.5) * 20;
            this.y += (Math.random() - 0.5) * 20;
            this.poppingTimer += 16;
            if (this.poppingTimer > this.poppingDuration) {
                if (this.trappedEnemy) {
                    this.game.defeatEnemy(this.trappedEnemy);
                }
                this.game.removeBubble(this);
            }
        }

        if (this.trappedEnemy) {
            this.trappedEnemy.x = this.x + 4;
            this.trappedEnemy.y = this.y + 4;
        }

        if (this.state !== 'popping' && this.lifetime > this.maxLifetime) {
            this.pop();
        }

        if (this.x < 32) this.x = 32;
        if (this.x > 768 - this.width) this.x = 768 - this.width;
    }

    draw(ctx) {
        // tiles.png 640x640. Bubble is bottom-right.
        const sx = 340; 
        const sy = 340;
        const sw = 260; 
        const sh = 260;

        ctx.save();
        if (this.state === 'popping') {
            // 터지는 효과를 위해 반짝임과 크기 변화
            ctx.filter = `brightness(${1.5 + Math.random()}) hue-rotate(${Math.random() * 360}deg)`;
            const scale = 1 + Math.random() * 0.5;
            ctx.drawImage(this.image, sx, sy, sw, sh, this.x - (this.width * (scale-1))/2, this.y - (this.height * (scale-1))/2, this.width * scale, this.height * scale);
        } else {
            ctx.drawImage(this.image, sx, sy, sw, sh, this.x, this.y, this.width, this.height);
        }
        ctx.restore();
        
        if ((this.state === 'trapped' || this.state === 'popping') && this.trappedEnemy) {
            const esx = 40;
            const esy = 360;
            const esw = 240;
            const esh = 240;
            
            ctx.save();
            if (this.state === 'popping' || this.lifetime % 200 < 100) {
                ctx.filter = 'brightness(1.5) hue-rotate(90deg)';
            }
            ctx.drawImage(this.image, esx, esy, esw, esh, this.x + 8, this.y + 8, this.width - 16, this.height - 16);
            ctx.restore();
        }
    }

    pop(forcePoppingEffect = false) {
        if (this.state === 'popping') return; // 이미 터지는 중이면 무시
        
        // 1개당 10점 포인트 추가
        this.game.score += 10;
        this.game.updateScore();
        
        if (this.trappedEnemy || forcePoppingEffect) {
            this.state = 'popping';
            this.poppingTimer = 0;
        } else {
            this.game.removeBubble(this);
        }
    }
}
