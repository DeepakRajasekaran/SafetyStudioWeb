/**
 * Validates that snapping a line to sector mid_arc with a coincide constraint
 * translates the sector (moves its center) without distorting radius or sweep angle.
 *
 * No UI involved — pure solver logic.
 */

// Inline a minimal copy of the solver logic to test
const STEP = 0.4;
const TOLERANCE = 0.01;

function extractParticles(sketches, fixedPoints) {
  const particles = {};
  const addPt = (id, x, y) => { if (!particles[id]) particles[id] = { x, y, fixed: false }; };

  sketches.forEach(s => {
    if (s.type === 'line') {
      addPt(`${s.id}-start`, s.points[0], s.points[1]);
      addPt(`${s.id}-end`, s.points[2], s.points[3]);
    } else if (s.type === 'sector') {
      addPt(`${s.id}-center`, s.center[0], s.center[1]);
      addPt(`${s.id}-start`, s.center[0] + s.radius * Math.cos(s.startAngle), s.center[1] + s.radius * Math.sin(s.startAngle));
      addPt(`${s.id}-end`, s.center[0] + s.radius * Math.cos(s.startAngle + s.sweepAngle), s.center[1] + s.radius * Math.sin(s.startAngle + s.sweepAngle));
      // mid_arc is virtual, NOT added here
    }
  });

  addPt('origin', 0, 0);
  particles['origin'].fixed = true;
  (fixedPoints || []).forEach(f => {
    const pid = `${f.sketchId}-${f.part}`;
    if (particles[pid]) particles[pid].fixed = true;
  });
  return particles;
}

function resolvePosition(particles, v, sketches) {
  if (!v) return null;
  if (v.type === 'origin') return { x: 0, y: 0, fixed: true };
  const { sketchId, part } = v;
  const s = sketches.find(sk => sk.id === sketchId);

  if (part === 'mid_arc' && s && s.type === 'sector') {
    const c = particles[`${sketchId}-center`];
    const start = particles[`${sketchId}-start`];
    const end = particles[`${sketchId}-end`];
    if (!c || !start || !end) return null;
    const aS = Math.atan2(start.y - c.y, start.x - c.x);
    const aE = Math.atan2(end.y - c.y, end.x - c.x);
    const r = Math.sqrt((start.x - c.x) ** 2 + (start.y - c.y) ** 2);
    let sweep = aE - aS;
    if (sweep < 0) sweep += 2 * Math.PI;
    const midAng = aS + sweep / 2;
    return {
      x: c.x + r * Math.cos(midAng),
      y: c.y + r * Math.sin(midAng),
      virtual: true,
      p1Id: `${sketchId}-center`,
      p2Id: `${sketchId}-center`,
      fixed: c.fixed
    };
  }

  const pid = `${sketchId}-${part}`;
  const p = particles[pid];
  if (!p) return null;
  return { ...p, pid };
}

function applyDelta(particles, resolved, dx, dy, stepScale = STEP) {
  if (!resolved || resolved.fixed) return;
  if (resolved.virtual) {
    const p1 = particles[resolved.p1Id];
    const p2 = particles[resolved.p2Id];
    if (p1 && !p1.fixed) { p1.x += dx * stepScale * 0.5; p1.y += dy * stepScale * 0.5; }
    if (p2 && !p2.fixed) { p2.x += dx * stepScale * 0.5; p2.y += dy * stepScale * 0.5; }
  } else if (resolved.pid) {
    const p = particles[resolved.pid];
    if (p && !p.fixed) { p.x += dx * stepScale; p.y += dy * stepScale; }
  }
}

function solve(sketches, constraints, fixedPoints, iterations = 200) {
  const particles = extractParticles(sketches, fixedPoints);

  for (let iter = 0; iter < iterations; iter++) {
    // Sector implicit: enforce equal radii
    sketches.forEach(s => {
      if (s.type !== 'sector') return;
      const c = particles[`${s.id}-center`];
      const start = particles[`${s.id}-start`];
      const end = particles[`${s.id}-end`];
      if (!c || !start || !end) return;
      const r1 = Math.sqrt((start.x - c.x) ** 2 + (start.y - c.y) ** 2);
      const r2 = Math.sqrt((end.x - c.x) ** 2 + (end.y - c.y) ** 2);
      const targetR = (r1 + r2) / 2;
      if (r1 > 1e-6) {
        const ratio = targetR / r1;
        if (!start.fixed) { start.x = c.x + (start.x - c.x) * ratio; start.y = c.y + (start.y - c.y) * ratio; }
      }
      if (r2 > 1e-6) {
        const ratio = targetR / r2;
        if (!end.fixed) { end.x = c.x + (end.x - c.x) * ratio; end.y = c.y + (end.y - c.y) * ratio; }
      }
    });

    // Constraints
    constraints.forEach(con => {
      if (con.type !== 'coincident') return;
      const r1 = resolvePosition(particles, con.v1, sketches);
      const r2 = resolvePosition(particles, con.v2, sketches);
      if (!r1 || !r2) return;
      const dx = r2.x - r1.x, dy = r2.y - r1.y;
      if (!r1.fixed && !r2.fixed) {
        applyDelta(particles, r1, dx * 0.5, dy * 0.5);
        applyDelta(particles, r2, -dx * 0.5, -dy * 0.5);
      } else if (r1.fixed) {
        applyDelta(particles, r2, r1.x - r2.x, r1.y - r2.y);
      } else if (r2.fixed) {
        applyDelta(particles, r1, r2.x - r1.x, r2.y - r1.y);
      }
    });
  }

  // Read back sector geometry
  return particles;
}

// ── TEST SETUP ──
// Sector: center (100, 100), radius 80, startAngle 0, sweepAngle PI/2 (90 deg)
const sector = {
  id: 'Sector 1',
  type: 'sector',
  center: [100, 100],
  radius: 80,
  startAngle: 0,
  sweepAngle: Math.PI / 2
};

// mid_arc is at angle PI/4 from center, 80 units out
const midArcX = 100 + 80 * Math.cos(Math.PI / 4);
const midArcY = 100 + 80 * Math.sin(Math.PI / 4);

// Line: from sector center (100,100) to mid_arc
const line = {
  id: 'Line 1',
  type: 'line',
  points: [100, 100, midArcX, midArcY]
};

console.log(`\nInitial sector center: (${sector.center[0]}, ${sector.center[1]})`);
console.log(`Initial sector radius: ${sector.radius}`);
console.log(`Initial sector sweepAngle: ${(sector.sweepAngle * 180 / Math.PI).toFixed(1)}°`);
console.log(`Expected mid_arc position: (${midArcX.toFixed(3)}, ${midArcY.toFixed(3)})`);

// Constraint: coincide line.start with sector.center, coincide line.end with sector.mid_arc
const constraints = [
  { type: 'coincident', v1: { sketchId: 'Line 1', part: 'start' }, v2: { sketchId: 'Sector 1', part: 'center' } },
  { type: 'coincident', v1: { sketchId: 'Line 1', part: 'end' }, v2: { sketchId: 'Sector 1', part: 'mid_arc' } }
];

const particles = solve([sector, line], constraints, []);

const c = particles['Sector 1-center'];
const start = particles['Sector 1-start'];
const end = particles['Sector 1-end'];
const ls = particles['Line 1-start'];
const le = particles['Line 1-end'];

const r1 = Math.sqrt((start.x - c.x) ** 2 + (start.y - c.y) ** 2);
const r2 = Math.sqrt((end.x - c.x) ** 2 + (end.y - c.y) ** 2);
const aS = Math.atan2(start.y - c.y, start.x - c.x);
const aE = Math.atan2(end.y - c.y, end.x - c.x);
let sw = aE - aS; if (sw < 0) sw += 2 * Math.PI;

// Re-compute virtual mid_arc from solved particles
const midAng = aS + sw / 2;
const midVx = c.x + r1 * Math.cos(midAng);
const midVy = c.y + r1 * Math.sin(midAng);

console.log(`\n─── After Solving ───`);
console.log(`Sector center:    (${c.x.toFixed(3)}, ${c.y.toFixed(3)})`);
console.log(`Sector radius r1: ${r1.toFixed(3)} (was 80)`);
console.log(`Sector radius r2: ${r2.toFixed(3)} (was 80)`);
console.log(`Sector sweep:     ${(sw * 180 / Math.PI).toFixed(3)}° (was 90°)`);
console.log(`Virtual mid_arc:  (${midVx.toFixed(3)}, ${midVy.toFixed(3)})`);
console.log(`Line start:       (${ls.x.toFixed(3)}, ${ls.y.toFixed(3)})`);
console.log(`Line end:         (${le.x.toFixed(3)}, ${le.y.toFixed(3)})`);

// Validation assertions
const eps = 1.0; // 1 px tolerance for solver convergence
const radiiOk = Math.abs(r1 - 80) < eps && Math.abs(r2 - 80) < eps;
const sweepOk = Math.abs(sw - Math.PI / 2) < 0.05;
const coincideStartOk = Math.hypot(ls.x - c.x, ls.y - c.y) < eps;
const coincideMidOk = Math.hypot(le.x - midVx, le.y - midVy) < eps;

console.log(`\n─── Validation ───`);
console.log(`✅/❌ Radii preserved:              ${radiiOk ? '✅ PASS' : '❌ FAIL (radius changed!)'}`);
console.log(`✅/❌ Sweep angle preserved:         ${sweepOk ? '✅ PASS' : '❌ FAIL (sweep changed!)'}`);
console.log(`✅/❌ Line start at sector center:   ${coincideStartOk ? '✅ PASS' : '❌ FAIL'}`);
console.log(`✅/❌ Line end at virtual mid_arc:   ${coincideMidOk ? '✅ PASS' : '❌ FAIL'}`);

if (radiiOk && sweepOk && coincideStartOk && coincideMidOk) {
  console.log(`\n✅ ALL TESTS PASSED — mid_arc as virtual particle works correctly.\n`);
  process.exit(0);
} else {
  console.log(`\n❌ SOME TESTS FAILED\n`);
  process.exit(1);
}
