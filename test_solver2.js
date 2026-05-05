const { propagateConstraints } = require('./src/utils/cadSolver.js');

let sketches = [
  { id: 'S1', type: 'rect', start: [10, 10], end: [20, 20] },
  { id: 'L1', type: 'line', points: [15, 15, 0, 0] }
];

const constraints = [
  { type: 'coincide', v1: { sketchId: 'L1', part: 'start' }, v2: { sketchId: 'S1', part: 'center' } },
  { type: 'coincide', v1: { sketchId: 'L1', part: 'end' }, v2: { type: 'origin', sketchId: 'origin', part: 'origin' } },
  { type: 'vertical', v1: { sketchId: 'L1', part: 'start' }, v2: { sketchId: 'L1', part: 'end' } }
];

const res = propagateConstraints(sketches, constraints, [], [], 100, []);
console.log(JSON.stringify(res, null, 2));
