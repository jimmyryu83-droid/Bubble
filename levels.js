// Bubble Bobble Original Style Level Designs (100 Rounds)
// 각 라운드는 고유한 지형 패턴과 난이도를 가집니다.

const WALL_L = 32;
const WALL_R = 768;
const FLOOR = 568;

function createHorizontalBars(round, rows, gapType = 'end') {
    const platforms = [];
    const spacing = Math.floor((FLOOR - 100) / rows);
    for (let i = 1; i <= rows; i++) {
        const y = FLOOR - i * spacing;
        if (gapType === 'center') {
            platforms.push({ x: WALL_L, y, w: 300, h: 20 });
            platforms.push({ x: WALL_R - 300, y, w: 300, h: 20 });
        } else if (gapType === 'end') {
            platforms.push({ x: (i % 2 === 0 ? 150 : WALL_L), y, w: 500, h: 20 });
        } else if (gapType === 'both') {
            platforms.push({ x: 150, y, w: 500, h: 20 });
        }
    }
    return platforms;
}

function createBoxPattern(round, size) {
    const midX = 400;
    const midY = 300;
    return [
        { x: midX - size/2, y: midY - size/2, w: size, h: 20 },
        { x: midX - size/2, y: midY + size/2, w: size, h: 20 },
        { x: midX - size/2, y: midY - size/2, w: 20, h: size },
        { x: midX + size/2 - 20, y: midY - size/2, w: 20, h: size },
    ];
}

const levelsData = [];

// 1-10: Classical Open Patterns (유튜브 영상 고증 반영)
for (let r = 1; r <= 10; r++) {
    let platforms = [];
    let enemies = [];
    if (r === 1) {
        platforms = [
            { x: WALL_L, y: 460, w: 250, h: 20 }, { x: WALL_R - 250, y: 460, w: 250, h: 20 },
            { x: 150, y: 340, w: 500, h: 20 },
            { x: WALL_L, y: 220, w: 250, h: 20 }, { x: WALL_R - 250, y: 220, w: 250, h: 20 }
        ];
        enemies = [{ x: 400, y: 300 }, { x: 200, y: 400 }, { x: 600, y: 400 }];
    } else if (r === 2) {
        platforms = [
            { x: WALL_L, y: 480, w: 300, h: 20 }, { x: WALL_R - 300, y: 480, w: 300, h: 20 },
            { x: 150, y: 360, w: 500, h: 20 },
            { x: WALL_L, y: 240, w: 300, h: 20 }, { x: WALL_R - 300, y: 240, w: 300, h: 20 }
        ];
        enemies = [{ x: 400, y: 300, type: 'monsta' }, { x: 200, y: 150 }, { x: 600, y: 150 }];
    } else if (r === 3) {
        // E-shape Maze pattern
        platforms = [
            { x: 200, y: 150, w: 400, h: 20 },
            { x: 200, y: 250, w: 300, h: 20 },
            { x: 200, y: 350, w: 400, h: 20 },
            { x: 200, y: 150, w: 20, h: 350 }
        ];
        enemies = [{ x: 500, y: 200, type: 'monsta' }, { x: 500, y: 400, type: 'monsta' }];
    } else if (r === 10) {
        platforms = createHorizontalBars(r, 5, 'center');
        enemies = Array(8).fill(0).map((_, i) => ({ x: 100 + i * 80, y: 80, type: i % 2 === 0 ? 'zen-chan' : 'monsta' }));
    } else {
        platforms = createHorizontalBars(r, 4, (r % 2 === 0 ? 'end' : 'center'));
        enemies = Array(4 + Math.floor(r/3)).fill(0).map((_, i) => ({ 
            x: 100 + Math.random() * 600, 
            y: 100 + Math.random() * 300,
            type: i === 0 ? 'monsta' : 'zen-chan'
        }));
    }
    levelsData.push({ round: r, platforms, enemies });
}

// 11-30: Vertical & Grid Patterns
for (let r = 11; r <= 30; r++) {
    const platforms = [];
    if (r % 5 === 0) {
        // Grid pattern
        for(let i=1; i<4; i++) for(let j=1; j<3; j++) platforms.push({ x: i*200, y: j*180, w: 100, h: 20 });
    } else {
        // Stairs
        for(let i=0; i<6; i++) platforms.push({ x: (r%2===0 ? 100+i*100 : 600-i*100), y: 500-i*80, w: 120, h: 20 });
    }
    const enemyCount = 4 + Math.floor(r/10);
    const enemies = Array(enemyCount).fill(0).map((_, i) => ({ 
        x: 100 + (i * 150) % 600, 
        y: 100 + (i * 100) % 400,
        type: i % 3 === 0 ? 'monsta' : 'zen-chan'
    }));
    levelsData.push({ round: r, platforms, enemies });
}

// 31-50: Symmetric & Box Patterns
for (let r = 31; r <= 50; r++) {
    let platforms = [];
    if (r % 4 === 0) platforms = createBoxPattern(r, 200 + (r % 10) * 10);
    else {
        platforms = [
            { x: 100, y: 480, w: 200, h: 20 }, { x: 500, y: 480, w: 200, h: 20 },
            { x: 200, y: 360, w: 400, h: 20 },
            { x: 100, y: 240, w: 200, h: 20 }, { x: 500, y: 240, w: 150, h: 20 },
            { x: 300, y: 120, w: 200, h: 20 }
        ];
    }
    const enemies = Array(6 + (r > 40 ? 2 : 0)).fill(0).map((_, i) => ({ 
        x: 150 + (i * 100) % 500, 
        y: 50 + (i * 120) % 450,
        type: i % 2 === 0 ? 'monsta' : 'zen-chan'
    }));
    levelsData.push({ round: r, platforms, enemies });
}

// 51-80: Complex shapes & Traps
for (let r = 51; r <= 80; r++) {
    const platforms = [];
    const seed = r * 12345;
    const type = r % 3;
    if (type === 0) {
        // Vertical pillars
        for(let i=1; i<5; i++) platforms.push({ x: i*160, y: 150, w: 20, h: 350 });
        platforms.push({ x: 100, y: 400, w: 600, h: 20 });
    } else if (type === 1) {
        // Zig Zag
        for(let i=0; i<8; i++) platforms.push({ x: i%2===0 ? 100 : 400, y: 100 + i*60, w: 300, h: 20 });
    } else {
        // Random Floating
        for(let i=0; i<12; i++) platforms.push({ x: 100 + (Math.sin(seed+i)*300+300), y: 100 + i*40, w: 80, h: 20 });
    }
    const enemyCount = 7 + Math.floor(r/15);
    const enemies = Array(enemyCount).fill(0).map((_, i) => ({ 
        x: 100 + (i * 90) % 600, 
        y: 100 + (i * 110) % 500,
        type: i % 4 === 0 ? 'monsta' : 'zen-chan'
    }));
    levelsData.push({ round: r, platforms, enemies });
}

// 81-100: Final High Difficulty Rounds
for (let r = 81; r <= 100; r++) {
    let platforms = [];
    if (r === 100) {
        // Final Boss-like level pattern (The Big Trap)
        platforms = [
            { x: 100, y: 500, w: 600, h: 20 },
            { x: 100, y: 100, w: 600, h: 20 },
            { x: 100, y: 100, w: 20, h: 420 },
            { x: 680, y: 100, w: 20, h: 420 },
            // Inner maze
            { x: 200, y: 400, w: 400, h: 20 },
            { x: 200, y: 300, w: 400, h: 20 },
            { x: 200, y: 200, w: 400, h: 20 }
        ];
    } else {
        // Dense platforming
        for(let i=0; i<5; i++) {
            platforms.push({ x: 100, y: 150 + i*80, w: 250, h: 20 });
            platforms.push({ x: 450, y: 150 + i*80, w: 250, h: 20 });
        }
        platforms.push({ x: 350, y: 100, w: 100, h: 450 }); // Central thin pillar
    }
    const enemies = Array(10).fill(0).map((_, i) => ({ 
        x: 120 + (i * 60) % 560, 
        y: 120 + (i * 80) % 400,
        type: i % 2 === 0 ? 'monsta' : 'zen-chan'
    }));
    levelsData.push({ round: r, platforms, enemies });
}

export const LEVELS = levelsData;
