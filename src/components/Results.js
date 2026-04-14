import React, { useState, useEffect, useCallback } from 'react';
import { Layer, Line, Circle, Group } from 'react-konva';
import { MousePointer2, PenLine, Circle as CircleIcon, Square, Undo2, Trash2, Ruler, GripHorizontal, Link2, Equal, ArrowUp, ArrowRight, Rows, CornerDownLeft, Settings, Info, List, Database, Hammer } from 'lucide-react';
import axios from 'axios';
import { parseWktToKonva } from '../utils/wktParser';
import GridCanvas, { SCALE_M } from './GridCanvas';
import LidarMarker from './LidarMarker';
import CADSketcher from './CADSketcher';
import ConstraintList from './ConstraintList';
import { sketchesToWkt } from '../utils/cadToWkt';
import { propagateConstraints } from '../utils/cadSolver';
import GcsService from '../utils/GcsService';

/** Helper to unwrap propagateConstraints result in Results.js */
const runSolverResults = (sketches, constraints, dimensions, fixedPoints, SCALE_M, referenceVertices) => {
  const result = propagateConstraints(sketches, constraints, dimensions, fixedPoints, SCALE_M, referenceVertices);
  if (Array.isArray(result)) return { sketches: result, error: null };
  return result;
};

const SCALE = 100; // pixels per meter

// Parse WKT to flat [x, y, x, y...] arrays, applying a transform function
function parseWktWithTransform(wktStr, tfFn) {
  if (!wktStr || typeof tfFn !== 'function') return [];
  const raw = parseWktToKonva(wktStr);
  if (!raw || !raw.length) return [];
  
  return raw.map(poly => {
    if (!poly) return [];
    const pts = [];
    for (let i = 0; i < poly.length; i += 2) {
      const t = tfFn(poly[i] / SCALE, -poly[i + 1] / SCALE);
      pts.push(t[0] * SCALE, -t[1] * SCALE);
    }
    return pts;
  });
}

// Build a unified transform object matching SafetyStudio.py R.T logic
function buildTransform(viewMode, lidar, retainOri, wrtLidar) {
  const defaultTf = { origin: [0, 0], rotation: 0, flipped: false, fn: (x, y) => [x, y] };
  if (viewMode !== 'LiDAR View' || !lidar) return defaultTf;
  
  let ox = 0, oy = 0, tf_rot = 0, flipped = false;

  if (wrtLidar) {
     ox = (lidar.origin && lidar.origin[0] !== undefined) ? lidar.origin[0] : (lidar.x || 0);
     oy = (lidar.origin && lidar.origin[1] !== undefined) ? lidar.origin[1] : (lidar.y || 0);
  }

  if (!retainOri) {
     tf_rot = (lidar.mount || 0) * Math.PI / 180;
     flipped = !!lidar.flipped;
  }
  
  const cos = Math.cos(-tf_rot);
  const sin = Math.sin(-tf_rot);
  return {
    origin: [ox, oy], rotation: tf_rot, flipped: flipped,
    fn: (x, y) => {
      const dx = x - ox; const dy = y - oy;
      let rx = cos * dx - sin * dy;
      let ry = sin * dx + cos * dy;
      if (flipped) rx = -rx;
      return [rx, ry];
    }
  };
}

const LIDAR_COLORS = ['rgba(0, 255, 255, 0.5)', 'rgba(0, 255, 0, 0.5)', 'rgba(255, 0, 255, 0.5)', 'rgba(255, 165, 0, 0.5)', 'rgba(255, 255, 0, 0.5)'];
// Exact SafetyStudio.py Parity Styles
const FIELD_GOLD_FILL = 'rgba(255, 215, 0, 0.4)';
const FIELD_GOLD_STROKE = '#FFD700';
const IGNORED_GRAY_FILL = 'rgba(80, 80, 80, 0.5)';
const FIELD_STROKE_WIDTH = 1.5;

const Results = ({ globals }) => {
  const { 
    geometry, sensors, setSensors, physics, 
    evaluationCases, setEvaluationCases, 
    results, setResults, cadData, setCadFieldSafe, 
    undo, pushToHistory,
    selectedCaseId, setSelectedCaseId,
    activeTool, setActiveTool
  } = globals;

  const [isCalculating, setIsCalculating] = useState(false);
  const [viewMode, setViewMode] = useState('Composite'); 
  const [selectedLidar, setSelectedLidar] = useState(null);
  const [showArc, setShowArc] = useState(true);
  const [retainOri, setRetainOri] = useState(true);
  const [wrtLidar, setWrtLidar] = useState(false);
  const [stagePos, setStagePos] = useState(null);
  const [inspectorText, setInspectorText] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [gcsStatus, setGcsStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [resultsMode, setResultsMode] = useState('polygon'); // 'polygon' | 'cad'
  const [isConstructionMode, setIsConstructionMode] = useState(false);
  const [caseListOpen, setCaseListOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [draftCad, setDraftCad] = useState(null);

  const targetSketches = cadData?.Overrides?.[selectedCaseId]?.sketches || [];
  const targetDimensions = cadData?.Overrides?.[selectedCaseId]?.dimensions || [];
  const targetFixedPoints = cadData?.Overrides?.[selectedCaseId]?.fixedPoints || [];
  const targetConstraints = cadData?.Overrides?.[selectedCaseId]?.constraints || [];

  const handleClearSketch = () => {
    pushToHistory();
    setCadFieldSafe('Overrides', selectedCaseId, 'sketches', []);
    setCadFieldSafe('Overrides', selectedCaseId, 'dimensions', []);
    setCadFieldSafe('Overrides', selectedCaseId, 'fixedPoints', []);
    setCadFieldSafe('Overrides', selectedCaseId, 'constraints', []);
  };

  // --- GCS Engine Lifecycle ---
  useEffect(() => {
    GcsService.init().then(success => {
      setGcsStatus(success ? 'ready' : 'error');
      // Trigger a re-solve of draft state once initialized
        if (success && draftCad) {
          const res = runSolverResults(
              draftCad.sketches, 
              draftCad.constraints, 
              draftCad.dimensions, 
              draftCad.fixedPoints, 
              SCALE_M
          );
          setDraftCad(prev => prev ? ({ ...prev, sketches: res.sketches }) : prev);
        }
    });
  }, []);

  // --- Draft State Lifecycle ---
  useEffect(() => {
    if (isEditMode && resultsMode === 'cad') {
       setDraftCad({
          sketches: [...targetSketches],
          dimensions: [...targetDimensions],
          constraints: [...targetConstraints],
          fixedPoints: [...targetFixedPoints]
       });
    } else {
       setDraftCad(null);
    }
  }, [isEditMode, resultsMode, selectedCaseId]);

  const handleSaveDraft = () => {
    if (!draftCad) return;
    pushToHistory();
    setCadFieldSafe('Overrides', selectedCaseId, 'sketches', draftCad.sketches);
    setCadFieldSafe('Overrides', selectedCaseId, 'dimensions', draftCad.dimensions);
    setCadFieldSafe('Overrides', selectedCaseId, 'constraints', draftCad.constraints);
    setCadFieldSafe('Overrides', selectedCaseId, 'fixedPoints', draftCad.fixedPoints);
    alert("Changes applied to session.");
  };

  // --- Auto-Resolve Synchronization (Draft Only) ---
  useEffect(() => {
    if (!draftCad || !draftCad.sketches.length) return;
    const refs = [];
    const addRef = (wkt, lName) => {
      if (!wkt) return;
      const parsedArr = parseWktToKonva(wkt);
      parsedArr.forEach((poly, polyIdx) => {
        for(let i=0; i<poly.length; i+=2) {
           refs.push({ x: poly[i], y: poly[i+1], sketchId: `ref-${lName}-${polyIdx}-${i}`, part: 'point', type: 'reference', snapped: true });
        }
      });
    };
    if (currentResult?.footprint_wkt) addRef(currentResult.footprint_wkt, 'FP');
    if (currentResult?.load_wkt) addRef(currentResult.load_wkt, 'Load');

    const solveRes = runSolverResults(
       draftCad.sketches, 
       draftCad.constraints, 
       draftCad.dimensions, 
       draftCad.fixedPoints, 
       SCALE_M, 
       refs
    );
    const solved = solveRes.sketches;

    const isDifferent = (a, b) => {
       if (a.length !== b.length) return true;
       for(let i=0; i<a.length; i++) {
          const s1 = a[i], s2 = b[i];
          const getCoords = (s) => (s.points || s.center || s.start || []).concat(s.end || []).concat(s.radius || []);
          const c1 = getCoords(s1), c2 = getCoords(s2);
          for(let j=0; j<c1.length; j++) { if (Math.abs((c1[j]||0)-(c2[j]||0)) > 0.0001) return true; }
       }
       return false;
    };

    if (isDifferent(solved, draftCad.sketches)) {
       setDraftCad(prev => ({ ...prev, sketches: solved }));
    }
  }, [draftCad?.dimensions, draftCad?.constraints, draftCad?.fixedPoints, draftCad?.sketches, selectedCaseId]);

  const buildPayload = (k) => {
    if (!k) return null;
    const rawPhysics = physics[k.load] || physics['NoLoad'] || {};
    const sanitizedPhysics = {};
    Object.keys(rawPhysics).forEach(key => {
      sanitizedPhysics[key] = typeof rawPhysics[key] === 'boolean' ? rawPhysics[key] : parseFloat(rawPhysics[key]) || 0;
    });
    return {
      footprint_wkt: geometry.FootPrint,
      load_wkt: geometry.Load1 || null,
      load2_wkt: geometry.Load2 || null,
      sensors: sensors.map(s => ({
        ...s, 
        x: parseFloat(s.x)||0, 
        y: parseFloat(s.y)||0, 
        mount: parseFloat(s.mount)||0, 
        fov: parseFloat(s.fov)||0, 
        r: parseFloat(s.r) || 10.0, 
        dia: s.dia ? (parseFloat(s.dia) > 5 ? parseFloat(s.dia)/1000.0 : parseFloat(s.dia)) : 0.15 
      })),
      v: parseFloat(k.v) || 0,
      w: parseFloat(k.w) || 0,
      load: k.load,
      custom_field_wkt: k.custom_dxf || null,
      physics_params: sanitizedPhysics
    };
  };

  const handleCalculate = async () => {
    const k = evaluationCases.find(c => c.id === selectedCaseId);
    if (!k || !geometry.FootPrint) return;
    setIsCalculating(true);
    try {
      const res = await axios.post('/api/calculate', buildPayload(k));
      if (res.data.success) setResults(prev => ({ ...prev, [k.id]: res.data }));
    } finally { setIsCalculating(false); }
  };

  const handleCalculateAll = async () => {
    setIsCalculating(true);
    for (const k of evaluationCases) {
      try {
        const res = await axios.post('/api/calculate', buildPayload(k));
        if (res.data.success) setResults(prev => ({ ...prev, [k.id]: res.data }));
      } catch (err) {}
    }
    setIsCalculating(false);
  };

  const currentResult = results[selectedCaseId] || null;

  useEffect(() => {
    const handleEsc = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }
      if (e.key === 'Escape') {
         if (isEditMode && resultsMode === 'cad') {
            if (targetSketches.length > 0) {
               if (window.confirm("Save sketched shapes before exiting?")) {
                  const wkt = sketchesToWkt(targetSketches, SCALE_M);
                  if (wkt) setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], final_field_wkt: wkt }}));
               } else {
                  handleClearSketch();
               }
            }
         }
         setIsEditMode(false);
         setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isEditMode, resultsMode, cadData, selectedCaseId, setResults, setCadFieldSafe, setActiveTool]);

  const lidarList = currentResult?.lidars || [];
  const activeLidar = lidarList.find(l => l.name === selectedLidar) || lidarList[0] || null;

  const tfConfig = wrtLidar || !retainOri ? activeLidar : null;
  const tObj = buildTransform(viewMode, tfConfig, retainOri, wrtLidar);

  useEffect(() => {
    if (!currentResult) { setInspectorText('No result yet.'); return; }
    let txt = `Status: CALCULATED\nSafety Dist (D): ${currentResult.dist_d?.toFixed(3)} m\n\n`;
    
    if (viewMode === 'LiDAR View' && activeLidar) {
      txt += `--- ${activeLidar.name} ---\n`;
      const ox = (activeLidar.origin && activeLidar.origin[0] !== undefined) ? activeLidar.origin[0] : (activeLidar.x || 0);
      const oy = (activeLidar.origin && activeLidar.origin[1] !== undefined) ? activeLidar.origin[1] : (activeLidar.y || 0);
      txt += `Origin: (${ox.toFixed(3)}, ${oy.toFixed(3)})\n`;
      txt += `Mount: ${activeLidar.mount}°\n`;
      
      if (activeLidar.clip_wkt) {
        const pts = parseWktToKonva(activeLidar.clip_wkt);
        pts.forEach((poly, i) => {
          txt += `[LOCAL POLY ${i}]\n`;
          for (let p = 0; p < poly.length; p += 2) {
            const [wx, wy] = tObj.fn(poly[p]/SCALE, -poly[p+1]/SCALE);
            txt += `  (${wx.toFixed(3)}, ${wy.toFixed(3)})\n`;
          }
        });
      }
    } else {
      if (currentResult.final_field_wkt) {
        const pts = parseWktToKonva(currentResult.final_field_wkt);
        pts.forEach((poly, i) => {
          txt += `[GLOBAL POLY ${i}]\n`;
          for (let p = 0; p < poly.length; p += 2) {
            const [wx, wy] = tObj.fn(poly[p]/SCALE, -poly[p+1]/SCALE);
            txt += `  (${wx.toFixed(3)}, ${wy.toFixed(3)})\n`;
          }
        });
      }
    }
    setInspectorText(txt);
  }, [currentResult, viewMode, activeLidar, selectedCaseId, tObj.fn]);

  const parsedField   = currentResult ? parseWktWithTransform(currentResult.final_field_wkt, tObj.fn) : [];
  const parsedIdeal   = currentResult ? parseWktWithTransform(currentResult.ideal_field_wkt, tObj.fn) : [];
  const parsedIgnored = currentResult ? parseWktWithTransform(currentResult.ignored_wkt, tObj.fn) : [];
  const parsedLidarClip = (viewMode === 'LiDAR View' && activeLidar?.clip_wkt) ? parseWktWithTransform(activeLidar.clip_wkt, tObj.fn) : [];
  const parsedSweeps = (viewMode === 'Sweep Steps' && currentResult?.sweeps) ? currentResult.sweeps.flatMap(s => parseWktToKonva(s)) : [];

  const worldToCanvas = (x, y) => [x * SCALE, -y * SCALE];
  const trajCanvas = (showArc && viewMode === 'Composite' && currentResult?.traj) ? currentResult.traj.map(p => worldToCanvas(p[0], p[1])).flat() : null;
  const frontTrajCanvas = (showArc && viewMode === 'Composite' && currentResult?.front_traj) ? currentResult.front_traj.map(p => worldToCanvas(p[0], p[1])).flat() : null;

  const handlePointDrag = (polyIdx, pIdx, newX, newY) => {
    if (!currentResult?.final_field_wkt) return;
    const raw = parseWktToKonva(currentResult.final_field_wkt);
    const poly = [...raw[polyIdx]];
    poly[pIdx * 2] = newX; poly[pIdx * 2 + 1] = newY;
    if (pIdx === 0 || pIdx === (poly.length / 2) - 1) {
      const last = (poly.length / 2) - 1;
      poly[0] = poly[last * 2] = newX; poly[1] = poly[last * 2 + 1] = newY;
    }
    raw[polyIdx] = poly;
    syncPolyToWkt(raw);
  };

  const handlePointDelete = (polyIdx, pIdx) => {
    if (!currentResult?.final_field_wkt) return;
    const raw = parseWktToKonva(currentResult.final_field_wkt);
    const poly = [...raw[polyIdx]];
    
    // Polygon must have at least 3 unique vertices (4 points total including closing)
    if (poly.length <= 8) {
      alert("Cannot delete vertex: a polygon must have at least 3 vertices.");
      return;
    }

    const newPoly = [];
    for (let i = 0; i < poly.length / 2; i++) {
      if (i === pIdx) continue;
      newPoly.push(poly[i * 2], poly[i * 2 + 1]);
    }

    // Ensure it's still closed correctly if we deleted the first or last point
    if (pIdx === 0 || pIdx === (poly.length / 2) - 1) {
      const lastIdx = (newPoly.length / 2) - 1;
      newPoly[0] = newPoly[lastIdx * 2];
      newPoly[1] = newPoly[lastIdx * 2 + 1];
    }

    raw[polyIdx] = newPoly;
    syncPolyToWkt(raw);
  };

  const syncPolyToWkt = (rawPolys) => {
    const isMulti = rawPolys.length > 1;
    let wktStr = isMulti ? "MULTIPOLYGON(" : "POLYGON(";
    rawPolys.forEach((poly, idx) => {
      let pts = "";
      for (let i = 0; i < poly.length; i += 2) {
        pts += `${(poly[i] / SCALE).toFixed(4)} ${(-poly[i + 1] / SCALE).toFixed(4)}${idx === rawPolys.length - 1 && i === poly.length - 2 ? "" : i === poly.length - 2 ? "" : ", "}`;
      }
      wktStr += isMulti ? `((${pts}))${idx === rawPolys.length - 1 ? "" : ", "}` : `(${pts})`;
    });
    wktStr += ")";
    setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], final_field_wkt: wktStr } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#111', overflow: 'hidden' }}>
      
      {/* ── Results Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '8px 20px', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', zIndex: 10 }}>
        
        {/* View Mode Segmented Control */}
        <div style={{ display: 'flex', background: '#0e0e0e', padding: 3, borderRadius: 20, gap: 2, border: '1px solid #333' }}>
           {[
             { id: 'Composite', label: 'Composite' },
             { id: 'LiDAR View', label: 'LiDAR' },
             { id: 'Sweep Steps', label: 'Sweeps' }
           ].map(v => (
             <button key={v.id} onClick={() => setViewMode(v.id)} 
               style={{ 
                 background: viewMode === v.id ? '#1e3a5f' : 'transparent', 
                 color: viewMode === v.id ? '#00e5ff' : '#666', 
                 border: 'none', padding: '5px 15px', fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer', borderRadius: 18, transition: 'all 0.2s', letterSpacing: '0.05em' 
               }}>
               {v.label.toUpperCase()}
             </button>
           ))}
        </div>

        {viewMode === 'LiDAR View' && (
          <>
            <div style={{ width: 1, height: 16, background: '#333' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', background: '#0e0e0e', padding: 3, borderRadius: 20, gap: 2, border: '1px solid #333' }}>
                {lidarList.map((l, idx) => (
                  <button key={l.name} onClick={() => setSelectedLidar(l.name)}
                    style={{
                      background: activeLidar?.name === l.name ? '#1a4a25' : 'transparent',
                      color: activeLidar?.name === l.name ? '#00e676' : '#666',
                      border: 'none', padding: '5px 12px', fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer', borderRadius: 18, transition: 'all 0.2s'
                    }}>
                    {l.name.toUpperCase()}
                  </button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', paddingLeft: 10, fontWeight: '500' }}>
                <input type="checkbox" checked={wrtLidar} onChange={e => setWrtLidar(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> w.r.t Lidar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={retainOri} onChange={e => setRetainOri(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> Original Orientation
              </label>
            </div>
          </>
        )}

        <div style={{ width: 1, background: '#333', height: 16 }} />

        {viewMode === 'Composite' && isEditMode && (
          <div style={{ 
            display: 'flex', 
            background: '#151515', 
            padding: 3, 
            borderRadius: 20, 
            gap: 2, 
            border: '1px solid #333',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
          }}>
             <button onClick={() => setResultsMode('polygon')} 
               style={{ 
                 background: resultsMode === 'polygon' ? '#333' : 'transparent', 
                 color: resultsMode === 'polygon' ? '#00e5ff' : '#666', 
                 border: 'none', 
                 padding: '5px 15px', 
                 fontSize: '0.65rem', 
                 fontWeight: '700', 
                 cursor: 'pointer', 
                 borderRadius: 18,
                 transition: 'all 0.2s ease',
                 letterSpacing: '0.05em'
               }}>
               POLYGON
             </button>
             <button onClick={() => setResultsMode('cad')} 
               style={{ 
                 background: resultsMode === 'cad' ? '#333' : 'transparent', 
                 color: resultsMode === 'cad' ? '#00e5ff' : '#666', 
                 border: 'none', 
                 padding: '5px 15px', 
                 fontSize: '0.65rem', 
                 fontWeight: '700', 
                 cursor: 'pointer', 
                 borderRadius: 18,
                 transition: 'all 0.2s ease',
                 letterSpacing: '0.05em'
               }}>
               CAD
             </button>
          </div>
        )}

        {isEditMode && resultsMode === 'cad' && viewMode === 'Composite' && (
          <div style={{ display: 'flex', gap: 5, background: '#222', padding: '2px 8px', borderRadius: 6, alignItems: 'center', marginLeft: 10 }}>
            <button onClick={() => setActiveTool('select')} style={{ background: activeTool === 'select' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><MousePointer2 size={16} /></button>
            <button onClick={() => setActiveTool('line')} style={{ background: activeTool === 'line' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><PenLine size={16} /></button>
            <button onClick={() => setActiveTool('circle')} style={{ background: activeTool === 'circle' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><CircleIcon size={16} /></button>
            <button onClick={() => setActiveTool('rect')} style={{ background: activeTool === 'rect' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><Square size={16} /></button>
            <button onClick={() => setActiveTool('dimension')} style={{ background: activeTool === 'dimension' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><Ruler size={16} /></button>
            <div style={{ width: 1, height: 16, background: '#444', margin: '0 2px' }} />
            
            <button onClick={() => setIsConstructionMode(!isConstructionMode)} title="Toggle Construction Mode"
              style={{ background: isConstructionMode ? '#5c4d1a' : 'transparent', color: isConstructionMode ? '#ff9800' : '#888', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
               <Hammer size={16} />
            </button>
            <div style={{ width: 1, height: 16, background: '#444', margin: '0 2px' }} />
            <button onClick={undo} style={{ background: 'transparent', color: '#aaa', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><Undo2 size={16} /></button>
            <button onClick={handleClearSketch} style={{ background: 'transparent', color: '#ff5252', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}><Trash2 size={16} /></button>
            <div style={{ width: 1, height: 16, background: '#444', margin: '0 4px' }} />
            <button onClick={() => {
              const wkt = sketchesToWkt(targetSketches, SCALE_M);
              if (wkt) {
                const updatedCases = [...evaluationCases];
                const k = updatedCases.find(c => c.id === selectedCaseId);
                if (k) k.custom_dxf = wkt;
                setEvaluationCases(updatedCases);
                handleCalculate();
                setIsEditMode(false);
              }
            }} style={{ background: '#1a4a25', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
              Finalize
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 6 }}>
           <button onClick={() => setCaseListOpen(!caseListOpen)} title="Toggle Case List" style={{ background: caseListOpen ? '#1a3a5c' : '#222', color: '#ccc', border: 'none', padding: '5px', borderRadius: 4, cursor: 'pointer' }}><List size={14}/></button>
           <button onClick={() => setInspectorOpen(!inspectorOpen)} title="Toggle Inspector" style={{ background: inspectorOpen ? '#1a3a5c' : '#222', color: '#ccc', border: 'none', padding: '5px', borderRadius: 4, cursor: 'pointer' }}><Info size={14}/></button>
        </div>

        <div style={{ width: 1, background: '#333', height: 16, marginLeft: 6, marginRight: 6 }} />

        {viewMode === 'Composite' && (
          <>
            <button onClick={() => setIsEditMode(!isEditMode)} style={{ background: isEditMode ? '#d32f2f' : '#2a2a2a', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', marginRight: 6 }}>
              {isEditMode ? 'DONE' : '✏️ EDIT'}
            </button>
            {isEditMode && resultsMode === 'cad' && draftCad && (
              <button onClick={handleSaveDraft} style={{ background: '#00e5ff', color: '#000', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', marginRight: 6 }}>
                💾 SAVE SESSION
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 10, fontSize: '0.6rem', color: gcsStatus === 'ready' ? '#4caf50' : (gcsStatus === 'loading' ? '#ff9800' : '#f44336') }}>
               <Database size={12} /> {gcsStatus === 'ready' ? 'GCS READY' : (gcsStatus === 'loading' ? 'GCS LOADING...' : 'GCS ERROR')}
            </div>
          </>
        )}
        <button onClick={handleCalculate} disabled={isCalculating} style={{ background: '#1e4a8a', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
          {isCalculating ? '...' : '▶ CALC'}
        </button>
        <button onClick={handleCalculateAll} disabled={isCalculating} style={{ background: '#1b5e20', color: 'white', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
          ▶▶ ALL
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Case List Sidebar */}
        {caseListOpen && (
          <div style={{ width: 220, background: '#111', borderRight: '1px solid #222', overflowY: 'auto', padding: '10px 0' }}>
            <div style={{ padding: '0 15px 10px', fontSize: '0.65rem', color: '#555', letterSpacing: 1, fontWeight: 'bold' }}>EVALUATION MATRIX</div>
            {['NoLoad', 'Load1', 'Load2'].map(load => (
              <div key={load}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 15px', background: '#161616', color: '#888', fontSize: '0.7rem' }}>
                  <Database size={10} /> {load}
                </div>
                {evaluationCases.filter(c => c.load === load).map(c => (
                  <div key={c.id} onClick={() => setSelectedCaseId(c.id)} style={{ padding: '10px 20px', cursor: 'pointer', background: c.id === selectedCaseId ? 'rgba(0,229,255,0.08)' : 'transparent', borderLeft: c.id === selectedCaseId ? '3px solid #00e5ff' : '3px solid transparent', color: c.id === selectedCaseId ? '#fff' : '#666' }}>
                    <div style={{ fontSize: '0.8rem' }}>Case #{c.id}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>v={c.v} m/s | w={c.w} rad/s</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Canvas Area (Z-stacking alignment with SafetyStudio.py) */}
        <div style={{ flex: 1, position: 'relative' }}>
          
          <GridCanvas stagePos={stagePos} onStagePosChange={setStagePos} draggable={!isEditMode}>
            {({ scale, setOverlay }) => (
              <Layer>
                {/* 1. Static Sweeps (Z -10 equivalent) */}
                {viewMode === 'Sweep Steps' && parsedSweeps.map((poly, i) => (
                  <Line key={`sw-${i}`} points={poly} fill="rgba(255,165,0,0.05)" closed />
                ))}

                {/* 2. Ghost Field (Reference) */}
                {viewMode === 'Composite' && parsedIdeal.map((poly, i) => (
                  <Line key={`ideal-${i}`} points={poly} stroke="#444" strokeWidth={1/scale} dash={[5/scale, 5/scale]} closed />
                ))}

                {/* 3. Safety Field (GOLD - Parity Color #FFD700) */}
                {viewMode !== 'Sweep Steps' && parsedField.map((poly, i) => (
                  <Line 
                    key={`field-${i}`} 
                    points={poly} 
                    fill={FIELD_GOLD_FILL} 
                    stroke={FIELD_GOLD_STROKE} 
                    strokeWidth={isEditMode ? 2/scale : 0} 
                    closed 
                  />
                ))}

                {/* 4. Base Footprint Outline (Z 10 equivalent) */}
                {parseWktWithTransform(geometry.FootPrint, tObj.fn).map((poly, i) => (
                  <Line key={`fp-${i}`} points={poly} stroke="#fff" strokeWidth={1/scale} dash={[5/scale, 5/scale]} opacity={0.6} closed />
                ))}

                {/* 5. Trajectories (Z 15 equivalent) */}
                {trajCanvas && (
                   <Group>
                     <Line points={trajCanvas} stroke="cyan" strokeWidth={2/scale} dash={[8/scale, 4/scale]} />
                     <Circle x={trajCanvas[trajCanvas.length-2]} y={trajCanvas[trajCanvas.length-1]} radius={4/scale} fill="cyan" />
                   </Group>
                )}
                {frontTrajCanvas && (
                   <Group>
                     <Line points={frontTrajCanvas} stroke="lime" strokeWidth={2/scale} dash={[8/scale, 4/scale]} />
                     <Circle x={frontTrajCanvas[frontTrajCanvas.length-2]} y={frontTrajCanvas[frontTrajCanvas.length-1]} radius={4/scale} fill="lime" />
                   </Group>
                )}

                {/* 6. Load Outline (Z 20 - Green/Blue) */}
                {viewMode !== 'Sweep Steps' && currentResult?.load_wkt && parseWktWithTransform(currentResult.load_wkt, tObj.fn).map((poly, i) => (
                  <Line key={`load-${i}`} points={poly} stroke="#4CAF50" strokeWidth={2/scale} fill="rgba(76, 175, 80, 0.1)" closed />
                ))}

                {/* 6. Ignored Area (Z 30 equivalent - Rendered Higher) */}
                {viewMode === 'Composite' && parsedIgnored.map((poly, i) => (
                  <Line key={`ig-${i}`} points={poly} fill={IGNORED_GRAY_FILL} strokeWidth={0} closed />
                ))}

                {/* 7. LiDAR Local View Overlay */}
                {viewMode === 'LiDAR View' && parsedLidarClip.map((poly, i) => {
                  const lidarIdx = lidarList.findIndex(l => l.name === activeLidar?.name);
                  const lidarColor = LIDAR_COLORS[lidarIdx % LIDAR_COLORS.length] || FIELD_GOLD_FILL;
                  return (
                    <Line key={`lc-${i}`} points={poly} fill={lidarColor} stroke="#00e5ff" strokeWidth={2/scale} closed />
                  );
                })}

                {/* 8. Sensors */}
                {sensors.map((s, i) => {
                  const [tx, ty] = tObj.fn(s.x, s.y);
                  return (
                    <LidarMarker 
                      key={`s-${i}`} 
                      x={tx * SCALE_M} y={-ty * SCALE_M} 
                      rotation={-s.mount + (viewMode === 'LiDAR View' && !retainOri ? (activeLidar?.mount || 0) : 0)}
                      scale={scale} name={s.name} dia={s.dia} 
                      SCALE_M={SCALE_M} 
                    />
                  );
                })}

                {/* 9. Interactive Handles (Top-most) */}
                {isEditMode && resultsMode === 'polygon' && viewMode === 'Composite' && parsedField.map((poly, polyIdx) => {
                   if (polyIdx !== 0) return null; // Restrict handles to safety field only, ignore shadows
                   return (
                     <Group key={`edit-${polyIdx}`}>
                       {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
                         if (pIdx === (poly.length / 2) - 1) return null;
                         return (
                           <Circle key={`h-${pIdx}`} x={poly[pIdx*2]} y={poly[pIdx*2+1]} radius={6/scale} fill="#ff1744" stroke="#fff" strokeWidth={2/scale} draggable 
                             onDragMove={(e) => handlePointDrag(polyIdx, pIdx, e.target.x(), e.target.y())} 
                             onContextMenu={(e) => {
                               e.evt.preventDefault();
                               handlePointDelete(polyIdx, pIdx);
                             }}
                           />
                         );
                       })}
                     </Group>
                   );
                })}

                {/* 10. CAD Sketcher */}
                {isEditMode && resultsMode === 'cad' && draftCad && (() => {
                  let refs = [];
                  const addRef = (parsedArr, lName) => {
                    parsedArr.forEach((poly, polyIdx) => {
                       for(let i=0; i<poly.length; i+=2) refs.push({ x: poly[i], y: poly[i+1], sketchId: `ref-${lName}-${polyIdx}-${i}`, part: 'point', type: 'reference', snapped: true });
                    });
                  };
                  if (currentResult?.footprint_wkt) addRef(parseWktToKonva(currentResult.footprint_wkt), 'FP');
                  if (currentResult?.load_wkt) addRef(parseWktToKonva(currentResult.load_wkt), 'Load');

                  return (
                    <CADSketcher 
                      sketches={draftCad.sketches} 
                      setSketches={(v) => {
                         const updated = typeof v === 'function' ? v(draftCad.sketches) : v;
                         setDraftCad(prev => ({ ...prev, sketches: updated }));
                      }} 
                      dimensions={draftCad.dimensions}
                      setDimensions={(v) => {
                         const updated = typeof v === 'function' ? v(draftCad.dimensions) : v;
                         setDraftCad(prev => ({ ...prev, dimensions: updated }));
                      }}
                      fixedPoints={draftCad.fixedPoints}
                      setFixedPoints={(v) => {
                         const updated = typeof v === 'function' ? v(draftCad.fixedPoints) : v;
                         setDraftCad(prev => ({ ...prev, fixedPoints: updated }));
                      }}
                      constraints={draftCad.constraints}
                      setConstraints={(v) => {
                         const updated = typeof v === 'function' ? v(draftCad.constraints) : v;
                         setDraftCad(prev => ({ ...prev, constraints: updated }));
                      }}
                      referenceVertices={refs}
                      pushToHistory={() => {}} // No global undo for drafts yet
                      scale={scale} 
                      SCALE_M={SCALE_M} 
                      activeTool={activeTool}
                      setOverlay={setOverlay}
                      isConstructionMode={isConstructionMode}
                    />
                  );
                })()}
              </Layer>
            )}
          </GridCanvas>

          {isEditMode && resultsMode === 'cad' && draftCad && (
            <ConstraintList 
              constraints={draftCad.constraints}
              setConstraints={(v) => {
                const updated = typeof v === 'function' ? v(draftCad.constraints) : v;
                setDraftCad(prev => ({ ...prev, constraints: updated }));
              }}
              dimensions={draftCad.dimensions}
              setDimensions={(v) => {
                const updated = typeof v === 'function' ? v(draftCad.dimensions) : v;
                setDraftCad(prev => ({ ...prev, dimensions: updated }));
              }}
              fixedPoints={draftCad.fixedPoints}
              setFixedPoints={(v) => {
                const updated = typeof v === 'function' ? v(draftCad.fixedPoints) : v;
                setDraftCad(prev => ({ ...prev, fixedPoints: updated }));
              }}
            />
          )}
        </div>

        {/* Inspector Sidebar */}
        {inspectorOpen && (
          <div style={{ width: 250, background: '#111', borderLeft: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 15px', background: '#181818', fontSize: '0.7rem', color: '#555', fontWeight: 'bold' }}>SYSTEM INSPECTOR</div>
            <textarea readOnly value={inspectorText} style={{ flex: 1, background: 'transparent', color: '#00e676', border: 'none', padding: '15px', fontFamily: 'monospace', fontSize: '0.7rem', lineHeight: '1.4', resize: 'none' }} />
            <div style={{ padding: '10px', borderTop: '1px solid #222', background: '#0a0a0a' }}>
              <div style={{ fontSize: '0.6rem', color: '#444' }}>PARITY: SAFETYSTUDIO.PY (R.T FRAME)</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
