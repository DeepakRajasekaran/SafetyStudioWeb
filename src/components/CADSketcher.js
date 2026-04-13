import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import { applyDimensionUpdate } from '../utils/cadConstraints';
import { applyConstraint, validateConstraints, isFullyConstrained, propagateConstraints } from '../utils/cadSolver';
import { vec, isPointSafe } from '../utils/cadMath';
import { RULER } from './GridCanvas';

/** Unwrap propagateConstraints result — now returns {sketches, error} */
const runSolver = (sketches, constraints, dimensions, fixedPoints, SCALE_M, referenceVertices) => {
  const result = propagateConstraints(sketches, constraints, dimensions, fixedPoints, SCALE_M, referenceVertices);
  // Support both old (plain array) and new ({sketches, error}) return shapes
  if (Array.isArray(result)) return { sketches: result, error: null };
  return result;
};

/**
 * Centralized vertex resolver for sketches.
 */
function resolveCadPoint(s, part) {
  if (!s) return { x: 0, y: 0 };
  if (s.type === 'line') {
    if (part === 'start') return { x: s.points[0], y: s.points[1] };
    if (part === 'end') return { x: s.points[2], y: s.points[3] };
    if (part === 'mid') return { x: (s.points[0] + s.points[2]) / 2, y: (s.points[1] + s.points[3]) / 2 };
  }
  if (s.type === 'circle') {
    if (part === 'center') return { x: s.center[0], y: s.center[1] };
    if (part === 'rad') return { x: s.center[0] + s.radius, y: s.center[1] };
    return { x: s.center[0], y: s.center[1] };
  }
  if (s.type === 'rect') {
    const [x1, y1] = s.start;
    const [x2, y2] = s.end;
    if (part === 'start' || part === 'p1') return { x: x1, y: y1 };
    if (part === 'p2') return { x: x2, y: y1 };
    if (part === 'p3' || part === 'end') return { x: x2, y: y2 };
    if (part === 'p4') return { x: x1, y: y2 };
    if (part === 'center') return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    if (part === 'mid_top') return { x: (x1 + x2) / 2, y: y1 };
    if (part === 'mid_bottom') return { x: (x1 + x2) / 2, y: y2 };
    if (part === 'mid_left') return { x: x1, y: (y1 + y2) / 2 };
    if (part === 'mid_right') return { x: x2, y: (y1 + y2) / 2 };
  }
  return { x: 0, y: 0 };
}

/**
 * ISO Standard Dimension Annotation.
 */
const Annotation = ({ x1, y1, x2, y2, label, scale, tolerance = '', symbol = '', onClick }) => {
  const safeScale = scale && scale > 0 ? scale : 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (!Number.isFinite(dist) || dist < 0.001) return null;

  const nx = -dy / dist;
  const ny = dx / dist;

  // Heuristic: Push dimension away from origin (0,0) to keep it outside robot-centric shapes
  const midX_raw = (x1 + x2) / 2;
  const midY_raw = (y1 + y2) / 2;
  const dotProd = midX_raw * nx + midY_raw * ny;
  const flip = dotProd < 0 ? -1 : 1;
  const fnx = nx * flip;
  const fny = ny * flip;

  const dimOffset = 22 / safeScale;
  const gap = 4 / safeScale;
  const ext = 8 / safeScale;

  const p1 = { x: x1 + fnx * gap, y: y1 + fny * gap };
  const p2 = { x: x2 + fnx * gap, y: y2 + fny * gap };
  const d1 = { x: x1 + fnx * dimOffset, y: y1 + fny * dimOffset };
  const d2 = { x: x2 + fnx * dimOffset, y: y2 + fny * dimOffset };
  const e1 = { x: x1 + fnx * (dimOffset + ext), y: y1 + fny * (dimOffset + ext) };
  const e2 = { x: x2 + fnx * (dimOffset + ext), y: y2 + fny * (dimOffset + ext) };

  const arrowSize = 6 / safeScale;
  const fullText = (symbol || '') + label + (tolerance ? ' ' + tolerance : '');
  const midX = (d1.x + d2.x) / 2;
  const midY = (d1.y + d2.y) / 2;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <Group>
      <Line points={[p1.x, p1.y, e1.x, e1.y]} stroke="#666" strokeWidth={1 / safeScale} listening={false} />
      <Line points={[p2.x, p2.y, e2.x, e2.y]} stroke="#666" strokeWidth={1 / safeScale} listening={false} />
      <Line points={[d1.x, d1.y, d2.x, d2.y]} stroke="white" strokeWidth={1.5 / safeScale} listening={false} />
      
      {/* Arrows */}
      <Line points={[d1.x, d1.y, d1.x + (dx/dist)*arrowSize + nx*arrowSize*0.3, d1.y + (dy/dist)*arrowSize + ny*arrowSize*0.3, d1.x + (dx/dist)*arrowSize - nx*arrowSize*0.3, d1.y + (dy/dist)*arrowSize - ny*arrowSize*0.3]} fill="white" closed listening={false} />
      <Line points={[d2.x, d2.y, d2.x - (dx/dist)*arrowSize + nx*arrowSize*0.3, d2.y - (dy/dist)*arrowSize + ny*arrowSize*0.3, d2.x - (dx/dist)*arrowSize - nx*arrowSize*0.3, d2.y - (dy/dist)*arrowSize - ny*arrowSize*0.3]} fill="white" closed listening={false} />

      <Text 
        x={midX + nx * 8 / safeScale} 
        y={midY + ny * 8 / safeScale} 
        text={fullText} 
        fill="white" 
        fontSize={12 / safeScale} 
        align="center"
        offsetX={(fullText.length * 3.5) / safeScale}
        rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
        onClick={onClick}
        onTap={onClick}
        onMouseEnter={(e) => {
          const container = e.target.getStage().container();
          container.style.cursor = 'pointer';
          e.target.fill('#00e5ff');
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage().container();
          container.style.cursor = 'default';
          e.target.fill('white');
        }}
      />
    </Group>
  );
};

const DimOverlay = ({ x, y, value, tolerance, onCommit, onCancel }) => {
  const [val, setVal] = useState(value);
  const [tol, setTol] = useState(tolerance.replace('±', ''));
  const ref = useRef(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter') onCommit(val, tol);
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)',
      background: '#1a1a1a', border: '1px solid #00e5ff', padding: '10px', borderRadius: '4px',
      display: 'flex', gap: '8px', pointerEvents: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <input ref={ref} autoFocus type="text" value={val} 
        onChange={e => setVal(e.target.value)} 
        onBlur={e => { if (e.target.value === '') setVal('0'); }}
        onKeyDown={handleKey} 
        style={{ background: '#000', color: '#00e5ff', border: '1px solid #333', padding: '4px', width: '60px', outline: 'none' }} />
      <div style={{ color: '#888' }}>±</div>
      <input type="text" value={tol} 
        onChange={e => setTol(e.target.value)} 
        onBlur={e => { if (e.target.value === '') setTol('0'); }}
        onKeyDown={handleKey} 
        style={{ background: '#000', color: '#ff9800', border: '1px solid #333', padding: '4px', width: '40px', outline: 'none' }} />
    </div>
  );
};

const CADSketcher = ({ sketches, setSketches, dimensions, setDimensions, fixedPoints, setFixedPoints, constraints = [], setConstraints, referenceVertices = [], pushToHistory, scale, SCALE_M, activeTool, setOverlay }) => {
  const [newShape, setNewShape] = useState(null);
  const [dimSelection, setDimSelection] = useState([]);
  const [constraintSelection, setConstraintSelection] = useState([]);
  const drawingState = useRef({ step: 0, isDragging: false, startPos: null });

  // Stable refs so useEffect callbacks always see current values
  const sketchesRef      = useRef(sketches);
  const constraintsRef   = useRef(constraints);
  const dimensionsRef    = useRef(dimensions);
  const fixedPointsRef   = useRef(fixedPoints);
  useEffect(() => { sketchesRef.current    = sketches;    }, [sketches]);
  useEffect(() => { constraintsRef.current = constraints; }, [constraints]);
  useEffect(() => { dimensionsRef.current  = dimensions;  }, [dimensions]);
  useEffect(() => { fixedPointsRef.current = fixedPoints; }, [fixedPoints]);

  // Reset drawing state when tool changes
  useEffect(() => {
    if (drawingState.current.step !== 0) {
      drawingState.current = { step: 0, isDragging: false, startPos: null };
      setNewShape(null);
    }
    setDimSelection([]);
    setConstraintSelection([]);
  }, [activeTool]);

  useEffect(() => {
    const isConstraint = ['coincide', 'coincident', 'equal', 'vertical', 'horizontal', 'parallel', 'perpendicular'].includes(activeTool);
    if (!isConstraint || constraintSelection.length === 0) return;

    // Use refs to avoid stale closures
    const currentSketches    = sketchesRef.current;
    const currentConstraints = constraintsRef.current;
    const currentDimensions  = dimensionsRef.current;
    const currentFixed       = fixedPointsRef.current;

    const isSingleTarget = ['vertical', 'horizontal'].includes(activeTool);

    if (isSingleTarget && constraintSelection.length >= 1) {
      let updated = [...currentSketches];
      let updatedConstraints = [...currentConstraints];
      let anyError = null;

      constraintSelection.forEach(v => {
        const { sketches: res, newConstraint, error } = applyConstraint(
          updated, activeTool, v, null,
          currentFixed, currentDimensions, SCALE_M, referenceVertices, updatedConstraints
        );
        if (error) { anyError = error; return; }
        updated = res;
        if (newConstraint) updatedConstraints.push(newConstraint);
      });

      if (anyError) {
        alert('⚠️ Constraint Error:\n\n' + anyError);
      } else {
        pushToHistory();
        // Re-run full solve with all constraints to ensure consistency
        const solveResult = runSolver(updated, updatedConstraints, currentDimensions, currentFixed, SCALE_M, referenceVertices);
        if (solveResult.error) {
          alert('⚠️ Constraint Error:\n\n' + solveResult.error);
        } else {
          setSketches(solveResult.sketches);
          if (setConstraints && updatedConstraints.length > currentConstraints.length) setConstraints(updatedConstraints);
        }
      }
      setConstraintSelection([]);

    } else if (!isSingleTarget && constraintSelection.length >= 2) {
      const v1 = constraintSelection[0];
      const v2 = constraintSelection[1];
      const { sketches: res, newConstraint, error } = applyConstraint(
        currentSketches, activeTool, v1, v2,
        currentFixed, currentDimensions, SCALE_M, referenceVertices, currentConstraints
      );

      if (error) {
        alert('⚠️ Constraint Error:\n\n' + error);
      } else if (newConstraint) {
        pushToHistory();
        const allConstraints = [...currentConstraints, newConstraint];
        // Re-solve with the complete set to keep everything consistent
        const solveResult = runSolver(res, allConstraints, currentDimensions, currentFixed, SCALE_M, referenceVertices);
        if (solveResult.error) {
          alert('⚠️ Constraint Error:\n\n' + solveResult.error);
        } else {
          setSketches(solveResult.sketches);
          if (setConstraints) setConstraints(allConstraints);
        }
      }
      setConstraintSelection([]);
    }
  // eslint-disable-next-line
  }, [activeTool, constraintSelection]);

  const getVertices = useCallback(() => {
    const v = [{ x: 0, y: 0, sketchId: 'origin', part: 'origin', type: 'origin' }, ...referenceVertices];
    sketches.forEach(s => {
      if (s.type === 'line') {
        v.push({ ...resolveCadPoint(s, 'start'), sketchId: s.id, part: 'start' });
        v.push({ ...resolveCadPoint(s, 'end'), sketchId: s.id, part: 'end' });
        v.push({ ...resolveCadPoint(s, 'mid'), sketchId: s.id, part: 'mid' });
      } else if (s.type === 'circle') {
        const center = resolveCadPoint(s, 'center');
        v.push({ ...center, sketchId: s.id, part: 'center' });
        v.push({ ...resolveCadPoint(s, 'rad'), sketchId: s.id, part: 'rad' });
      } else if (s.type === 'rect') {
        ['p1', 'p2', 'p3', 'p4', 'mid_top', 'mid_bottom', 'mid_left', 'mid_right', 'center'].forEach(p => v.push({ ...resolveCadPoint(s, p), sketchId: s.id, part: p }));
      }
    });
    return v;
  }, [sketches]);

  const snapPos = useCallback((rawX, rawY) => {
    const threshold = 18 / scale;
    let best = { x: rawX, y: rawY, snapped: false };
    let minDist = threshold;

    getVertices().forEach(v => {
      const d = vec.dist(v, { x: rawX, y: rawY });
      if (d < minDist) { minDist = d; best = { ...v, snapped: true }; }
    });

    if (best.snapped) return best;

    sketches.forEach(s => {
      if (s.type === 'line') {
        const p = vec.project({x: rawX, y: rawY}, {x: s.points[0], y: s.points[1]}, {x: s.points[2], y: s.points[3]});
        const d = vec.dist(p, {x: rawX, y: rawY});
        if (d < minDist) { minDist = d; best = { ...p, snapped: true, sketchId: s.id, type: 'edge' }; }
      } else if (s.type === 'circle') {
        const c = { x: s.center[0], y: s.center[1] };
        const d = vec.dist(c, { x: rawX, y: rawY });
        if (d > 0) {
          const ratio = s.radius / d;
          const p = { x: c.x + (rawX - c.x) * ratio, y: c.y + (rawY - c.y) * ratio };
          const distToEdge = Math.abs(d - s.radius);
          if (distToEdge < minDist) { minDist = distToEdge; best = { ...p, snapped: true, sketchId: s.id, type: 'edge' }; }
        }
      }
    });
    return best;
  }, [getVertices, scale, sketches]);

  const handleMouseDown = useCallback((e) => {
    if (!activeTool || activeTool === 'select') return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    const snapped = snapPos(pos.x, pos.y);

    if (activeTool === 'dimension') {
      if (dimSelection.length === 0) {
        if (snapped.type === 'edge') {
          const s = sketches.find(sk => sk.id === snapped.sketchId);
          if (!s) return;
          if (s.type === 'line') {
            const v1 = { x: s.points[0], y: s.points[1], sketchId: s.id, part: 'start' };
            const v2 = { x: s.points[2], y: s.points[3], sketchId: s.id, part: 'end' };
            const pAbs = stage.getAbsoluteTransform().point({x: (v1.x+v2.x)/2, y: (v1.y+v2.y)/2});
            const rect = stage.container().getBoundingClientRect();
            setOverlay({ 
              component: DimOverlay, 
              props: { 
                x: rect.left + pAbs.x, y: rect.top + pAbs.y, 
                value: (vec.dist(v1, v2)/SCALE_M).toFixed(3), tolerance: '',
                onCommit: (vStr, tStr) => commitDim(v1, v2, vStr, tStr)
              } 
            });
          } else if (s.type === 'circle') {
            const v1 = { x: s.center[0], y: s.center[1], sketchId: s.id, part: 'center' };
            const v2 = { x: s.center[0] + s.radius, y: s.center[1], sketchId: s.id, part: 'rad' };
            const pAbs = stage.getAbsoluteTransform().point(v2);
            const rect = stage.container().getBoundingClientRect();
            setOverlay({ 
              component: DimOverlay, 
              props: { 
                x: rect.left + pAbs.x, y: rect.top + pAbs.y, 
                value: (s.radius/SCALE_M).toFixed(3), tolerance: '',
                onCommit: (vStr, tStr) => commitDim(v1, v2, vStr, tStr, '⌀ ')
              } 
            });
          }
        } else if (snapped.snapped) {
          setDimSelection([snapped]);
        }
      } else {
        const v1 = dimSelection[0];
        const v2 = snapped;
        if (v2.snapped && (v1.sketchId !== v2.sketchId || v1.part !== v2.part)) {
          const pAbs = stage.getAbsoluteTransform().point({x: (v1.x+v2.x)/2, y: (v1.y+v2.y)/2});
          const rect = stage.container().getBoundingClientRect();
          setOverlay({ 
            component: DimOverlay, 
            props: { 
              x: RULER + pAbs.x, y: RULER + pAbs.y, 
              value: (vec.dist(v1, v2)/SCALE_M).toFixed(3), tolerance: '',
              onCommit: (vStr, tStr) => commitDim(v1, v2, vStr, tStr)
            } 
          });
        }
        setDimSelection([]);
      }
      return;
    }

    // ── Anchor / Fixed-point tool ──
    if (activeTool === 'anchor') {
      if (!snapped.snapped || !snapped.sketchId) return;
      // Toggle: if already fixed, unfix it; otherwise add it
      const existingIdx = fixedPoints.findIndex(
        f => f.sketchId === snapped.sketchId && f.part === snapped.part
      );
      if (existingIdx !== -1) {
        // Remove fixed point
        const updatedFixed = fixedPoints.filter((_, i) => i !== existingIdx);
        if (setFixedPoints) setFixedPoints(updatedFixed);
      } else {
        const newFixed = { sketchId: snapped.sketchId, part: snapped.part, x: snapped.x, y: snapped.y };
        const updatedFixed = [...fixedPoints, newFixed];
        if (setFixedPoints) setFixedPoints(updatedFixed);
        // Re-solve with the new anchor in place
        const solveResult = runSolver(sketches, constraints, dimensions, updatedFixed, SCALE_M, referenceVertices);
        if (!solveResult.error) setSketches(solveResult.sketches);
      }
      return;
    }

    const isConstraintTool = ['coincide', 'coincident', 'equal', 'vertical', 'horizontal', 'parallel', 'perpendicular'].includes(activeTool);
    if (isConstraintTool) {
      if (!snapped.snapped) return;
      setConstraintSelection(prev => {
        // Prevent clicking exact same piece of geometry for multi-click tools
        if (prev.length === 1 && prev[0].sketchId === snapped.sketchId && prev[0].part === snapped.part) return prev;
        return [...prev, snapped];
      });
      return;
    }

    if (activeTool === 'line' || activeTool === 'circle' || activeTool === 'rect') {
      if (drawingState.current.step === 0) {
        drawingState.current = { step: 1, isDragging: false, startPos: { x: pos.x, y: pos.y } };
        if (activeTool === 'line') setNewShape({ type: 'line', points: [snapped.x, snapped.y, snapped.x, snapped.y] });
        else if (activeTool === 'circle') setNewShape({ type: 'circle', center: [snapped.x, snapped.y], radius: 0 });
        else if (activeTool === 'rect') setNewShape({ type: 'rect', start: [snapped.x, snapped.y], end: [snapped.x, snapped.y] });
      } else if (drawingState.current.step === 1) {
        drawingState.current = { step: 0, isDragging: false, startPos: null };
        pushToHistory();
        setSketches([...sketches, { ...newShape, id: Date.now() }]);
        setNewShape(null);
      }
    }
  }, [activeTool, snapPos, sketches, dimSelection, constraintSelection, SCALE_M, setOverlay, fixedPoints, dimensions, setSketches, pushToHistory, newShape]);

  const commitDim = (v1, v2, valStr, tolStr, symbol = '') => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const newDim = { id: Date.now(), v1, v2, value: val, tolerance: tolStr ? '±' + tolStr : '', symbol, label: val.toFixed(3) };
      const allDims = [...dimensions, newDim];
      // First do a geometric approximation to pre-position the shape, then run full solve
      let prePositioned = applyDimensionUpdate(sketches, v1, v2, val, SCALE_M, dimensions, fixedPoints, referenceVertices);
      const solveResult = runSolver(prePositioned, constraints, allDims, fixedPoints, SCALE_M, referenceVertices);
      if (solveResult.error) {
        alert('⚠️ Dimension Error:\n\n' + solveResult.error);
        setOverlay(null);
        return;
      }
      pushToHistory();
      setSketches(solveResult.sketches);
      setDimensions(allDims);
    }
    setOverlay(null);
  };

  const editDim = (dimId, v1, v2, valStr, tolStr) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      const updatedDimensions = dimensions.map(d =>
        d.id === dimId ? { ...d, value: val, tolerance: tolStr ? '±' + tolStr : '', label: val.toFixed(3) } : d
      );
      let prePositioned = applyDimensionUpdate(sketches, v1, v2, val, SCALE_M, dimensions, fixedPoints, referenceVertices);
      const solveResult = runSolver(prePositioned, constraints, updatedDimensions, fixedPoints, SCALE_M, referenceVertices);
      if (solveResult.error) {
        alert('⚠️ Dimension Error:\n\n' + solveResult.error);
        setOverlay(null);
        return;
      }
      pushToHistory();
      setSketches(solveResult.sketches);
      setDimensions(updatedDimensions);
    }
    setOverlay(null);
  };

  const handleMouseMove = useCallback((e) => {
    if (drawingState.current.step === 0 || !newShape) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    
    // Detect drag
    if (drawingState.current.startPos) {
       const dist = vec.dist(drawingState.current.startPos, pos);
       if (e.evt.buttons === 1 && dist > 5) {
          drawingState.current.isDragging = true;
       }
    }

    const snapped = snapPos(pos.x, pos.y);
    if (newShape.type === 'line') setNewShape({ ...newShape, points: [newShape.points[0], newShape.points[1], snapped.x, snapped.y] });
    else if (newShape.type === 'circle') setNewShape({ ...newShape, radius: vec.dist({x: newShape.center[0], y: newShape.center[1]}, snapped) });
    else if (newShape.type === 'rect') setNewShape({ ...newShape, end: [snapped.x, snapped.y] });
  }, [newShape, snapPos]);

  const handleMouseUp = useCallback(() => {
    if (drawingState.current.step === 1 && drawingState.current.isDragging && newShape) {
      drawingState.current = { step: 0, isDragging: false, startPos: null };
      pushToHistory();
      setSketches([...sketches, { ...newShape, id: Date.now() }]);
      setNewShape(null);
    }
  }, [newShape, sketches, setSketches, pushToHistory]);

  return (
    <Group onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <Circle radius={10000} fill="rgba(0,0,0,0)" />
      {sketches.map(s => {
        const color = isFullyConstrained(s, dimensions, fixedPoints) ? '#aaaaaa' : 'white';
        return (
        <Group key={s.id}>
          {s.type === 'line' && <Line points={s.points} stroke={color} strokeWidth={2 / scale} />}
          {s.type === 'circle' && <Circle x={s.center[0]} y={s.center[1]} radius={s.radius} stroke={color} strokeWidth={2 / scale} />}
          {s.type === 'rect' && <Line points={[s.start[0], s.start[1], s.end[0], s.start[1], s.end[0], s.end[1], s.start[0], s.end[1], s.start[0], s.start[1]]} stroke={color} strokeWidth={2 / scale} closed />}
        </Group>
      )})}
      {newShape && (
        <Group>
          {newShape.type === 'line' && <Line points={newShape.points} stroke="yellow" strokeWidth={2 / scale} dash={[5/scale, 5/scale]} />}
          {newShape.type === 'circle' && <Circle x={newShape.center[0]} y={newShape.center[1]} radius={newShape.radius} stroke="yellow" strokeWidth={2 / scale} dash={[5/scale, 5/scale]} />}
          {newShape.type === 'rect' && <Line points={[newShape.start[0], newShape.start[1], newShape.end[0], newShape.start[1], newShape.end[0], newShape.end[1], newShape.start[0], newShape.end[1], newShape.start[0], newShape.start[1]]} stroke="yellow" strokeWidth={2 / scale} closed dash={[5/scale, 5/scale]} />}
        </Group>
      )}
      {dimensions.map(d => {
        const s1 = sketches.find(sk => sk.id === d.v1.sketchId);
        const s2 = sketches.find(sk => sk.id === d.v2.sketchId);
        if (!s1 || !s2) return null;
        const p1 = resolveCadPoint(s1, d.v1.part);
        const p2 = resolveCadPoint(s2, d.v2.part);
        return <Annotation key={d.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} label={d.label} symbol={d.symbol} tolerance={d.tolerance} scale={scale} 
                  onClick={(e) => {
                     e.cancelBubble = true;
                     const stage = e.target.getStage();
                     const rect = stage.container().getBoundingClientRect();
                     const pAbs = stage.getAbsoluteTransform().point({x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2});
                     
                     // Must use live coordinates, not stale snapshot coords, to calculate distance vectors correctly
                     const liveV1 = { ...d.v1, x: p1.x, y: p1.y };
                     const liveV2 = { ...d.v2, x: p2.x, y: p2.y };
                     
                     setOverlay({
                         component: DimOverlay,
                         props: {
                             x: rect.left + pAbs.x, y: rect.top + pAbs.y,
                             value: d.value.toFixed(3), tolerance: d.tolerance ? d.tolerance.replace('±', '') : '',
                             onCommit: (vStr, tStr) => editDim(d.id, liveV1, liveV2, vStr, tStr),
                             onCancel: () => setOverlay(null)
                         }
                     });
                  }}
               />;
      })}
      
      {/* Visual Feedback for Selections */}
      {[...dimSelection, ...constraintSelection].map((v, i) => (
        <Circle key={`sel-${i}`} x={v.x} y={v.y} radius={8 / scale} fill="rgba(255,165,0,0.8)" listening={false} stroke="white" strokeWidth={1.5/scale} />
      ))}

      {getVertices().map((v, i) => {
        const isFixed = (fixedPoints || []).some(f => f.sketchId === v.sketchId && f.part === v.part);
        if (v.type === 'origin') {
          return (
            <Group key={`v-${i}`} x={v.x} y={v.y} listening={false}>
              <Circle radius={6 / scale} fill="white" stroke="black" strokeWidth={1 / scale} />
              <Circle radius={3 / scale} fill="black" />
            </Group>
          );
        }
        return (
          <Circle
            key={`v-${i}`} x={v.x} y={v.y}
            radius={isFixed ? 6 / scale : 4 / scale}
            fill={isFixed ? '#ff9800' : 'white'}
            listening={false}
            stroke={isFixed ? '#ff5c00' : 'black'}
            strokeWidth={isFixed ? 1.5 / scale : 0.5 / scale}
          />
        );
      })}
    </Group>
  );
};

export default CADSketcher;
