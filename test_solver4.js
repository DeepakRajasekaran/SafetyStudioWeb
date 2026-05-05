const { propagateConstraints } = require('./src/utils/cadSolver.js');

let sketches = [
  { id: 'Rect1', type: 'rect', start: [5, 5], end: [15, 15], op: 'subtract' },
  { id: 'Line1', type: 'line', points: [10, 10, 0, 0], construction: true }
];

let constraints = [
  { type: 'vertical', v1: { sketchId: 'Line1', part: 'start' }, v2: { sketchId: 'Line1', part: 'end' } },
  { type: 'coincide', v1: { sketchId: 'Line1', part: 'start' }, v2: { sketchId: 'Rect1', part: 'center' } }
];

let res = propagateConstraints(sketches, constraints, [], [], 100, []);
console.log("After vertical + coincide rect:", res.error || "Success");

constraints.push({ type: 'coincide', v1: { sketchId: 'Line1', part: 'end' }, v2: { type: 'origin', sketchId: 'origin', part: 'origin' } });
res = propagateConstraints(res.sketches, constraints, [], [], 100, []);
console.log("After coincide origin:", res.error || "Success");
if (!res.error) console.log(JSON.stringify(res.sketches, null, 2));

