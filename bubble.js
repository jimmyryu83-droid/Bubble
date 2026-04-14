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
        this.poppingDuration = 500;
        this.isTimeout = false; // 시간이 다 되어 터졌는지 여부
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
                    if (this.isTimeout) {
                        // 시간이 다 되어 터지면 적이 각성(Angry) 상태로 부활
                        this.trappedEnemy.state = 'alive';
                        this.trappedEnemy.isAngry = true;
                        this.trappedEnemy.vx = (Math.random() > 0.5 ? 1 : -1) * 2;
                        this.trappedEnemy.vy = -10; // 튀어나올 때 점프 효과
                    } else {
                        // 플레이어가 직접 터뜨린 경우에만 처치
                        this.game.defeatEnemy(this.trappedEnemy);
                    }
                }
                this.game.removeBubble(this);
            }
        }

        if (this.trappedEnemy) {
            this.trappedEnemy.x = this.x + 4;
            this.trappedEnemy.y = this.y + 4;
        }

        if (this.state !== 'popping' && this.lifetime > this.maxLifetime) {
            this.pop(false, true); // 시간이 다 된 경우 타임아웃 플래그 전달
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
            ctx.globalAlpha = 0.6; // 일반 거품 투명도 조절로 고전 느낌 재현
            ctx.drawImage(this.image, sx, sy, sw, sh, this.x, this.y, this.width, this.height);
        }
        ctx.restore();
        
        if ((this.state === 'trapped' || this.state === 'popping') && this.trappedEnemy) {
            const esx = 40;
            const esy = 360;
            const esw = 240;
            const esh = 240;
            
            ctx.save();
            // 포획된 거품은 오리지널처럼 화려하게 깜빡임 (초록/노랑 변환)
            if (this.state === 'popping' || this.lifetime % 300 < 150) {
                ctx.filter = 'brightness(1.8) hue-rotate(120deg) drop-shadow(0 0 5px gold)';
            } else {
                ctx.filter = 'brightness(1.2) hue-rotate(60deg)';
            }
            ctx.drawImage(this.image, esx, esy, esw, esh, this.x + 8, this.y + 8, this.width - 16, this.height - 16);
            ctx.restore();
        }
    }

    pop(forcePoppingEffect = false, isTimeout = false, comboData = null) {
        if (this.state === 'popping') return; // 이미 터지는 중이면 무시
        
        // 콤보 데이터 초기화 (최초 팝업 시)
        if (!comboData && !isTimeout && this.trappedEnemy) {
            comboData = { count: 0 };
        }
        
        // 1개당 10점 포인트 추가
        this.game.score += 10;
        this.game.updateScore();
        
        this.isTimeout = isTimeout;
        if (this.trappedEnemy || forcePoppingEffect) {
            this.state = 'popping';
            this.poppingTimer = 0;
            if (this.trappedEnemy && comboData) {
                comboData.count++;
            }
        } else {
            this.game.removeBubble(this);
        }

        // 주변 거품 연쇄 터짐 (타임아웃 터짐이 아닐 때만 개시)
        if (!isTimeout) {
            // 현재 터지는 거품과 인접한 필드 내 다른 거품들을 탐색
            const neighbors = this.game.bubbles.filter(other => {
                if (other === this || (other.state !== 'floating' && other.state !== 'trapped')) return false;
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                return Math.sqrt(dx * dx + dy * dy) < 45; // 거품 크기가 40px이므로 약 45px 이내
            });
            
            // 인접 거품들도 함께 터뜨림 (재귀적으로 연쇄 반응)
            neighbors.forEach(neighbor => neighbor.pop(neighbor.state === 'trapped', false, comboData));

            // 최초 호출자라면 콤보 결과 확인
            if (comboData && comboData.count >= 2) {
                console.log(`COMBO! ${comboData.count} enemies popped!`);
                this.game.addAiScoreBonus(comboData.count);
            }
        }
    }
}
