const fs = require('fs');
const STEP = 0.5;

function solveIteration(particles) {
    let residual = 0;
    
    const b1 = particles['L1-end'];
    const a2 = particles['L2-start'];
    const dx = a2.x - b1.x, dy = a2.y - b1.y;
    residual += dx*dx + dy*dy;
    const mx = (b1.x + a2.x) / 2, my = (b1.y + a2.y) / 2;
    b1.x += (mx - b1.x) * STEP; b1.y += (my - b1.y) * STEP;
    a2.x += (mx - a2.x) * STEP; a2.y += (my - a2.y) * STEP;
    
    // Horizontal on L2
    const b2 = particles['L2-end'];
    const targetY = (a2.y + b2.y) / 2;
    const dy1 = targetY - a2.y, dy2 = targetY - b2.y;
    residual += dy1*dy1 + dy2*dy2;
    a2.y += dy1 * STEP;
    b2.y += dy2 * STEP;

    // Angle between L1 and L2 (90 degrees)
    const a1 = particles['L1-start'];
    let dx1 = b1.x - a1.x, dy11 = b1.y - a1.y;
    const len1 = Math.sqrt(dx1*dx1 + dy11*dy11);
    dx1 /= len1; dy11 /= len1;
    const theta1 = Math.atan2(dy11, dx1);
    
    let dx2 = b2.x - a2.x, dy22 = b2.y - a2.y;
    const len2 = Math.sqrt(dx2*dx2 + dy22*dy22);
    const theta2 = Math.atan2(dy22, dx2);
    
    const targetRad = 90 * Math.PI / 180;
    const t1 = theta1 + targetRad, t2 = theta1 - targetRad;
    
    let diff1 = theta2 - t1;
    while(diff1 > Math.PI) diff1 -= 2*Math.PI;
    while(diff1 < -Math.PI) diff1 += 2*Math.PI;
    
    let diff2 = theta2 - t2;
    while(diff2 > Math.PI) diff2 -= 2*Math.PI;
    while(diff2 < -Math.PI) diff2 += 2*Math.PI;
    
    const diff = Math.abs(diff1) < Math.abs(diff2) ? diff1 : diff2;
    
    residual += diff*diff*1000;
    
    // Symmetric logic
    // We want theta2 - theta1 to equal targetRad (or -targetRad).
    // The error is `diff`. We should rotate s1 by +diff/2, and s2 by -diff/2.
    const targetTheta1 = theta1 + diff/2;
    const targetTheta2 = theta2 - diff/2;
    
    const targetXX1 = Math.cos(targetTheta1), targetYY1 = Math.sin(targetTheta1);
    const targetXX2 = Math.cos(targetTheta2), targetYY2 = Math.sin(targetTheta2);
    
    const idealDx1 = targetXX1 * len1, idealDy1 = targetYY1 * len1;
    a1.x += (b1.x - idealDx1 - a1.x) * STEP * 0.5; a1.y += (b1.y - idealDy1 - a1.y) * STEP * 0.5;
    b1.x += (a1.x + idealDx1 - b1.x) * STEP * 0.5; b1.y += (a1.y + idealDy1 - b1.y) * STEP * 0.5;
    
    const idealDx2 = targetXX2 * len2, idealDy2 = targetYY2 * len2;
    a2.x += (b2.x - idealDx2 - a2.x) * STEP * 0.5; a2.y += (b2.y - idealDy2 - a2.y) * STEP * 0.5;
    b2.x += (a2.x + idealDx2 - b2.x) * STEP * 0.5; b2.y += (a2.y + idealDy2 - b2.y) * STEP * 0.5;
    
    return residual;
}

const particles = {
    'L1-start': {x: 0, y: 100},
    'L1-end': {x: 100, y: 100},
    'L2-start': {x: 100, y: 0},
    'L2-end': {x: 200, y: 0}
};

for(let i=0; i<300; i++) {
    const r = solveIteration(particles);
    if (i % 50 === 0) console.log(`Iter ${i}: res=${r.toFixed(3)}`);
    if (r < 0.01) { console.log(`Converged at ${i}`); break; }
}
console.log(particles);
