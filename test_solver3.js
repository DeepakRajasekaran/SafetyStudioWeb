const { propagateConstraints } = require('./src/utils/cadSolver.js');

// 1. User draws a subtract rectangle
let sketches = [
  { id: 'Rect1', type: 'rect', start: [5, 5], end: [15, 15], op: 'subtract' }
];

// 2. User draws a construction line
sketches.push({ id: 'Line1', type: 'line', points: [10, 10, 0, 0], construction: true });

// 3. Line Start snapped to Rect-Center
// 4. Line End snapped to Origin
let constraints = [
  { type: 'coincide', v1: { sketchId: 'Line1', part: 'start' }, v2: { sketchId: 'Rect1', part: 'center' } },
  { type: 'coincide', v1: { sketchId: 'Line1', part: 'end' }, v2: { type: 'origin', sketchId: 'origin', part: 'origin' } }
];

let res = propagateConstraints(sketches, constraints, [], [], 100, []);
console.log("After coincidents:", res.error || "Success");

// 5. User applies Vertical to Line
constraints.push({ type: 'vertical', v1: { sketchId: 'Line1', part: 'start' }, v2: { sketchId: 'Line1', part: 'end' } });

res = propagateConstraints(res.sketches, constraints, [], [], 100, []);
console.log("After vertical:", res.error || "Success");
if (!res.error) {
  console.log(JSON.stringify(res.sketches, null, 2));
}

