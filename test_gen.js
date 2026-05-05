const c = { levels: 5, v: 1.2, w: 0.6, revV: 0.3, fwd: true, turn: true, ip: true, rev: true, idle: true };
const levels = parseInt(c.levels) || 1;
const vMax = parseFloat(c.v) || 0;
const vW   = parseFloat(c.w) || 0;
const vRevMax = parseFloat(c.revV) || 0;

const minBound = c.rev ? -vRevMax : 0;
const maxBound = vMax;
const vRange = maxBound - minBound;
const vStep = levels > 0 ? vRange / levels : 0;

let newCases = [];
let idCounter = 1;
const load = 'NoLoad';

for (let i = 0; i <= levels; i++) {
  const currV = parseFloat((minBound + i * vStep).toFixed(3));
  if (Math.abs(currV) < 1e-4) continue;
  if (currV > 0) {
    if (c.fwd) newCases.push({ id: idCounter++, load, v: currV, w: 0.0, type: 'std' });
    if (c.turn) {
      newCases.push({ id: idCounter++, load, v: currV, w: vW, type: 'std' });
      newCases.push({ id: idCounter++, load, v: currV, w: -vW, type: 'std' });
    }
  } else if (currV < 0) {
    if (c.rev) newCases.push({ id: idCounter++, load, v: currV, w: 0.0, type: 'std' });
  }
}
console.log("Cases:", newCases.map(c => `v=${c.v}, w=${c.w}`));
