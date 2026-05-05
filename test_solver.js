const { propagateConstraints, applyConstraint } = require('./src/utils/cadSolver.js');

let sketches = [
  { id: 'S1', type: 'rect', start: [10, 10], end: [20, 20] },
];

const constraints = [
  { type: 'coincide', v1: { sketchId: 'S1', part: 'p1' }, v2: { type: 'origin', sketchId: 'origin', part: 'origin' } }
];

const res = propagateConstraints(sketches, constraints, [], [], 100, []);
console.log(JSON.stringify(res, null, 2));
