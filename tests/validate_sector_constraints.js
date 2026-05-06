/**
 * Validates sector constraint generation in finalizeShape logic.
 * Tests:
 * 1. Sector with no snapping → 0 constraints
 * 2. Sector with center snapped to origin → 1 constraint: center ↔ origin (NOT start)
 * 3. Sector name is correctly 'Sector N', not 'Shape N'
 */

const SCALE_M = 100;

// Simulate the finalizeShape constraint logic
function computeConstraints(finalizedType, startSnap, finalPosMeta) {
  const typeLabels = { line: 'Line', circle: 'Circle', rect: 'Rect', sector: 'Sector' };
  const humanId = `${typeLabels[finalizedType] || 'Shape'} 1`;

  let newConstraints = [];

  if (finalizedType !== 'sector' && startSnap) {
    newConstraints.push({
      type: 'coincident',
      v1: { sketchId: humanId, part: finalizedType === 'rect' ? 'p1' : (finalizedType === 'circle' ? 'center' : 'start') },
      v2: startSnap
    });
  } else if (finalizedType === 'sector' && startSnap) {
    newConstraints.push({
      type: 'coincident',
      v1: { sketchId: humanId, part: 'center' },
      v2: startSnap
    });
  }

  const snapMeta = finalPosMeta && finalizedType !== 'sector' ? finalPosMeta : null;
  if (snapMeta) {
    newConstraints.push({
      type: 'coincident',
      v1: { sketchId: humanId, part: finalizedType === 'rect' ? 'p3' : (finalizedType === 'circle' ? 'rad' : 'end') },
      v2: snapMeta
    });
  }

  return { humanId, newConstraints };
}

let pass = 0, fail = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✅ PASS: ${msg}`); pass++; }
  else           { console.error(`  ❌ FAIL: ${msg}`); fail++; }
}

// ─── Test 1: Sector, no snap at all ───
console.log('\nTest 1: Sector created in empty space (no snapping)');
{
  const { humanId, newConstraints } = computeConstraints('sector', null, null);
  assert(humanId === 'Sector 1', `humanId should be 'Sector 1', got '${humanId}'`);
  assert(newConstraints.length === 0, `should have 0 constraints, got ${newConstraints.length}`);
}

// ─── Test 2: Sector, center snapped to origin ───
console.log('\nTest 2: Sector center snapped to origin');
{
  const startSnap = { sketchId: 'origin', part: 'origin', type: 'origin' };
  const { humanId, newConstraints } = computeConstraints('sector', startSnap, null);
  assert(newConstraints.length === 1, `should have 1 constraint, got ${newConstraints.length}`);
  const c = newConstraints[0];
  assert(c.v1.part === 'center', `constraint v1.part should be 'center', got '${c.v1.part}'`);
  assert(c.v2.sketchId === 'origin', `constraint v2.sketchId should be 'origin', got '${c.v2.sketchId}'`);
  assert(c.v1.sketchId === 'Sector 1', `constraint v1.sketchId should be 'Sector 1', got '${c.v1.sketchId}'`);
}

// ─── Test 3: Sector, finalPos clicks on another vertex (should be ignored) ───
console.log('\nTest 3: Sector finalization click on existing vertex (should be ignored)');
{
  const finalPosMeta = { sketchId: 'Line 1', part: 'end' };
  const { humanId, newConstraints } = computeConstraints('sector', null, finalPosMeta);
  assert(newConstraints.length === 0, `sector finalPos snap should be ignored, got ${newConstraints.length} constraints`);
}

// ─── Test 4: Line still works correctly ───
console.log('\nTest 4: Line snapping still works correctly');
{
  const startSnap = { sketchId: 'origin', part: 'origin', type: 'origin' };
  const finalPos = { sketchId: 'Sector 1', part: 'start' };
  const { newConstraints } = computeConstraints('line', startSnap, finalPos);
  assert(newConstraints.length === 2, `line should get 2 constraints, got ${newConstraints.length}`);
  assert(newConstraints[0].v1.part === 'start', `line first constraint should be 'start', got '${newConstraints[0].v1.part}'`);
  assert(newConstraints[1].v1.part === 'end', `line second constraint should be 'end', got '${newConstraints[1].v1.part}'`);
}

// ─── Test 5: Circle still works correctly ───
console.log('\nTest 5: Circle center snap still uses center');
{
  const startSnap = { sketchId: 'Line 1', part: 'mid' };
  const { newConstraints } = computeConstraints('circle', startSnap, null);
  assert(newConstraints.length === 1, `circle should get 1 constraint`);
  assert(newConstraints[0].v1.part === 'center', `circle constraint should be 'center', got '${newConstraints[0].v1.part}'`);
}

// ─── Summary ───
console.log(`\n─── Results: ${pass} passed, ${fail} failed ───\n`);
process.exit(fail > 0 ? 1 : 0);
