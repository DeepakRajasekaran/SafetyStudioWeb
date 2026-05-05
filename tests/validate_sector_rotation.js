/**
 * Validates sector rotation via vertical constraint on a construction line.
 * Uses the ACTUAL cadSolver.js propagateConstraints function.
 */

// Load the actual solver
const path = require('path');
// We need to handle ES module exports — use a simple transform approach
const fs = require('fs');

let solverCode = fs.readFileSync(path.join(__dirname, '../src/utils/cadSolver.js'), 'utf8');
// Convert ES module exports to CommonJS
solverCode = solverCode.replace(/^export const /gm, 'const ');
solverCode = solverCode.replace(/^export function /gm, 'function ');
// Add module.exports at end
solverCode += `\nmodule.exports = { propagateConstraints, applyConstraint };`;
// Write temp file
const tmpFile = path.join(__dirname, '_tmp_solver.js');
fs.writeFileSync(tmpFile, solverCode);
const { propagateConstraints } = require(tmpFile);
fs.unlinkSync(tmpFile);

// ── SETUP ──
const SCALE_M = 100;
const S = { id: 'Sector 1', type: 'sector', center: [100, 100], radius: 80, startAngle: 0, sweepAngle: Math.PI / 2 };
const midArcX = 100 + 80 * Math.cos(Math.PI / 4);
const midArcY = 100 + 80 * Math.sin(Math.PI / 4);
const L = { id: 'Line 1', type: 'line', points: [100, 100, midArcX, midArcY] };

const sketches = [S, L];
const constraints = [
  { id: 1, type: 'coincident', v1: { sketchId: 'Line 1', part: 'start' }, v2: { sketchId: 'Sector 1', part: 'center' } },
  { id: 2, type: 'coincident', v1: { sketchId: 'Line 1', part: 'end' },   v2: { sketchId: 'Sector 1', part: 'mid_arc' } },
  { id: 3, type: 'vertical',   v1: { sketchId: 'Line 1', part: 'start' }, v2: null }
];

console.log(`Initial sector startAngle: ${(S.startAngle * 180 / Math.PI).toFixed(1)}° → midArc at 45°`);
console.log(`Expected after vertical: sector rotates so midArc is ~90° (pointing up)`);

const result = propagateConstraints(sketches, constraints, [], [], SCALE_M, []);

if (result.error) {
  console.error('Solver error:', result.error);
  process.exit(1);
}

const solved = result.sketches;
const ss = solved.find(s => s.id === 'Sector 1');
const sl = solved.find(s => s.id === 'Line 1');

const cx = ss.center[0], cy = ss.center[1];
const startPx = cx + ss.radius * Math.cos(ss.startAngle);
const startPy = cy + ss.radius * Math.sin(ss.startAngle);
const endPx = cx + ss.radius * Math.cos(ss.startAngle + ss.sweepAngle);
const endPy = cy + ss.radius * Math.sin(ss.startAngle + ss.sweepAngle);
const midAng = ss.startAngle + ss.sweepAngle / 2;
const midAng_deg = midAng * 180 / Math.PI;

const lineDx = Math.abs(sl.points[0] - sl.points[2]);

console.log(`\n─── Results ───`);
console.log(`Sector center: (${cx.toFixed(1)}, ${cy.toFixed(1)})`);
console.log(`Sector radius: ${ss.radius.toFixed(1)}`);
console.log(`Sector startAngle: ${(ss.startAngle * 180 / Math.PI).toFixed(1)}°`);
console.log(`Mid-arc angle: ${midAng_deg.toFixed(1)}° [want ~90°]`);
console.log(`Line Δx: ${lineDx.toFixed(3)} [want <3 for vertical]`);

let pass = 0, fail = 0;
function chk(ok, msg) { if (ok) { console.log(`✅ ${msg}`); pass++; } else { console.error(`❌ ${msg}`); fail++; } }

chk(Math.abs(cx - 100) < 2 && Math.abs(cy - 100) < 2, `Center stayed near (100,100)`);
chk(Math.abs(ss.radius - 80) < 2, `Radius preserved (~80)`);
chk(lineDx < 5, `Line became approximately vertical`);
chk(Math.abs(midAng_deg - 90) < 10, `Mid-arc rotated to ~90°`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
