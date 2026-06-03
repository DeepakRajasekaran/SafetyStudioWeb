import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { parse } from 'wellknown';
import { Layer, Line, Circle, Group } from 'react-konva';
import { 
  SelectionPlus, 
  LineSegment, 
  Circle as CircleIcon, 
  Rectangle, 
  ArrowUUpLeft, 
  Trash, 
  Ruler, 
  DotsSix, 
  Link, 
  Equals,
  GpsFix,
  Anchor, 
  ArrowUp, 
  ArrowRight, 
  Rows, 
  VectorTwo, 
  Sliders, 
  Info, 
  List, 
  Database, 
  Hammer, 
  Subtract, 
  X, 
  PencilSimple,
  Stack,
  DownloadSimple, 
  Play, 
  Lightning 
} from '@phosphor-icons/react';
import axios from 'axios';
import Generation from './Generation';
import { parseWktToKonva } from '../utils/wktParser';
import GridCanvas, { SCALE_M } from './GridCanvas';
import LidarMarker from './LidarMarker';
import CADSketcher from './CADSketcher';
import CADToolbar from './CADToolbar';
import ConstraintList from './ConstraintList';
import { sketchesToWkt } from '../utils/cadToWkt';
import { propagateConstraints } from '../utils/cadSolver';
import { union, difference } from 'polygon-clipping';

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
const IGNORED_GRAY_FILL = '#4d4d4d';
const FIELD_STROKE_WIDTH = 1.5;
const FIELD_PROTECTIVE_COLOR = '#ff6d00';
const FIELD_WARNING_COLOR = '#FFD700';

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
  const [showComposite, setShowComposite] = useState(false);
  const [retainOri, setRetainOri] = useState(true);
  const [wrtLidar, setWrtLidar] = useState(false);
  const [showFootprint, setShowFootprint] = useState(true);
  const [showLoad1, setShowLoad1] = useState(true);
  const [editingTarget, setEditingTarget] = useState('protective');
  const [showLoad2, setShowLoad2] = useState(true);
  const [fillSweeps, setFillSweeps] = useState(false);
  const [stagePos, setStagePos] = useState(null);
  const [inspectorText, setInspectorText] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditingMask, setIsEditingMask] = useState(false);
  const originalMaskWkt = useRef(null);
  const [resultsMode, setResultsMode] = useState('polygon'); // 'polygon' | 'cad'
  const [isConstructionMode, setIsConstructionMode] = useState(false);
  const [isSubtractionMode, setIsSubtractionMode] = useState(false);
  const [caseListOpen, setCaseListOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [draftCad, setDraftCad] = useState(null);
  const [cadHistory, setCadHistory] = useState([]); // local undo stack for draft CAD
  const [previewFieldWkt, setPreviewFieldWkt] = useState(null); // live boolean result
  const [isGenOpen, setIsGenOpen] = useState(false);
  const [cadSnapshot, setCadSnapshot] = useState(null);
  const [maskCad, setMaskCad] = useState(null);
  const [maskCadHistory, setMaskCadHistory] = useState([]);

  const targetSketches = cadData?.Overrides?.[selectedCaseId]?.sketches || [];
  const targetDimensions = cadData?.Overrides?.[selectedCaseId]?.dimensions || [];
  const targetFixedPoints = cadData?.Overrides?.[selectedCaseId]?.fixedPoints || [];
  const targetConstraints = cadData?.Overrides?.[selectedCaseId]?.constraints || [];
  const cadRef = useRef(null);
  const layerRef = useRef(null);

  // BRUTE FORCE Z-INDEX ENFORCEMENT
  // React-Konva reconciliation bugs can still shuffle static groups if their children conditionally render.
  // This layout effect completely overrides Konva's internal array on every single DOM update.
  useLayoutEffect(() => {
    if (!layerRef.current) return;
    const layer = layerRef.current;
    
    // Exact requested order:
    // static -> warning -> protective -> footprint -> mask -> lidar -> trajectories -> sensors -> handles
    const ORDER = [
      'static-layer',
      'composite-bottom-layer',
      'composite-top-layer',
      'footprint-layer',
      'mask-layer',
      'lidar-bottom-layer',
      'lidar-top-layer',
      'trajectories-layer',
      'sensors-layer',
      'handles-layer'
    ];
    
    const children = layer.getChildren();
    if (!children || children.length === 0) return;
    
    // Create a sorted copy of the children array
    const sortedChildren = [...children].sort((a, b) => {
      const idxA = ORDER.indexOf(a.name() || '');
      const idxB = ORDER.indexOf(b.name() || '');
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
    
    // Use Konva's native API to enforce the Z-index. 
    // This safely updates the internal scene graph and dirty flags.
    sortedChildren.forEach((child, i) => {
      child.setZIndex(i);
    });
    
    layer.batchDraw();
  });

  const handleCadUndo = () => {
    if (cadHistory.length === 0) return;
    const [last, ...remaining] = cadHistory;
    try {
      setDraftCad(JSON.parse(last));
      setCadHistory(remaining);
    } catch (e) {
      console.error("CAD Undo failed", e);
    }
  };

  const handleMaskCadUndo = () => {
    if (maskCadHistory.length === 0) return;
    const [last, ...remaining] = maskCadHistory;
    try {
      setMaskCad(JSON.parse(last));
      setMaskCadHistory(remaining);
    } catch (e) {
      console.error("Mask CAD Undo failed", e);
    }
  };

  const handleClearSketch = () => {
    if (confirm("Are you sure you want to clear all CAD sketches and constraints?")) {
      pushToHistory();
      if (isEditMode) setDraftCad(prev => ({ ...prev, sketches: [], constraints: [], dimensions: [], fixedPoints: [] }));
      if (isEditingMask) setMaskCad(prev => ({ ...prev, sketches: [], constraints: [], dimensions: [], fixedPoints: [] }));
    }
  };

  const currentResult = results[selectedCaseId] || null;

  // --- Draft State Lifecycle ---
  useEffect(() => {
    if (draftCad && draftCad.sketches.length) {
      const res = runSolverResults(
          draftCad.sketches, 
          draftCad.constraints, 
          draftCad.dimensions, 
          draftCad.fixedPoints, 
          SCALE_M
      );
      setDraftCad(prev => prev ? ({ ...prev, sketches: res.sketches }) : prev);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    if (isEditMode && resultsMode === 'cad') {
       setCadHistory([]); 
       const init = {
          sketches: [...targetSketches],
          dimensions: [...targetDimensions],
          constraints: [...targetConstraints],
          fixedPoints: [...targetFixedPoints]
       };
       setDraftCad(init);
       setCadSnapshot(JSON.stringify(init));
    } else {
       setDraftCad(null);
       setCadHistory([]);
    }
  }, [isEditMode, resultsMode, selectedCaseId]);

  const handleSaveDraft = () => {
    if (!draftCad) return;
    setCadFieldSafe('Overrides', selectedCaseId, 'sketches', draftCad.sketches);
    setCadFieldSafe('Overrides', selectedCaseId, 'dimensions', draftCad.dimensions);
    setCadFieldSafe('Overrides', selectedCaseId, 'constraints', draftCad.constraints);
    setCadFieldSafe('Overrides', selectedCaseId, 'fixedPoints', draftCad.fixedPoints);
  };

  // (Auto-save removed to allow Transactional Ignore/Discard logic)
  
  // --- Force Canvas Redraw on State Change ---
  useEffect(() => {
    if (layerRef.current) {
       layerRef.current.batchDraw();
    }
  }, [currentResult, draftCad, isEditMode, resultsMode, selectedCaseId]);

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

  // --- Live Boolean Preview (union/subtract sketches onto the existing composite field) ---
  useEffect(() => {
    const active = isEditMode || isEditingMask;
    if (!active || resultsMode !== 'cad') {
      setPreviewFieldWkt(null);
      return;
    }
    const activeCad = isEditMode ? draftCad : maskCad;
    if (!activeCad) {
      setPreviewFieldWkt(null);
      return;
    }

    const baseWkt = isEditMode ? currentResult?.final_field_wkt : currentResult?.ignored_wkt;
    
    if (!baseWkt && (!activeCad.sketches || activeCad.sketches.length === 0)) {
      setPreviewFieldWkt(null);
      return;
    }

    const { wkt: sketchWkt, error } = sketchesToWkt(activeCad.sketches || [], SCALE_M);
    if (error || !sketchWkt) {
      // No valid sketch drawn yet — show base as-is
      setPreviewFieldWkt(baseWkt || null);
      return;
    }

    // Convert WKT strings to polygon-clipping MultiPolygon format [ Polygon, ... ]
    const wktToRings = (wktStr) => {
      if (!wktStr) return null;
      try {
        const geojson = parse(wktStr);
        if (!geojson) return null;

        const results = [];
        const processPolygon = (poly) => {
          if (!Array.isArray(poly)) return;
          results.push(poly.map(ring => {
            return ring.map(pt => [pt[0], pt[1]]);
          }));
        };

        if (geojson.type === 'Polygon' && geojson.coordinates) {
          processPolygon(geojson.coordinates);
        } else if (geojson.type === 'MultiPolygon' && geojson.coordinates) {
          geojson.coordinates.forEach(processPolygon);
        }
        return results;
      } catch(e) { return null; }
    };

    const activeSketches = (activeCad.sketches || []).filter(s => !s.construction);
    const hasSubtract = activeSketches.some(s => s.op === 'subtract');
    const hasUnion = activeSketches.some(s => s.op !== 'subtract');

    try {
      const baseRings = wktToRings(baseWkt);
      let result = baseRings || [];

      // Union additive shapes
      if (hasUnion) {
        const additiveSketches = activeSketches.filter(s => s.op !== 'subtract');
        const { wkt: addWkt } = sketchesToWkt(additiveSketches, SCALE_M);
        if (addWkt) {
          const addRings = wktToRings(addWkt);
          if (addRings) {
            result = result.length > 0 ? union(result, addRings) : addRings;
          }
        }
      }

      // Subtract subtractive shapes
      if (hasSubtract && result.length > 0) {
        const subtractiveSketches = activeSketches.filter(s => s.op === 'subtract');
        const { wkt: subWkt } = sketchesToWkt(subtractiveSketches, SCALE_M);
        if (subWkt) {
          const subRings = wktToRings(subWkt);
          if (subRings) {
            result = difference(result, subRings);
          }
        }
      }

      if (!result || result.length === 0) {
        setPreviewFieldWkt(null);
        return;
      }

      // Convert back to WKT
      const fmt = (poly) => {
        const rings = poly.map(ring => `(${ring.map(p => `${p[0].toFixed(4)} ${p[1].toFixed(4)}`).join(', ')})`);
        return `(${rings.join(', ')})`;
      };
      const outWkt = result.length === 1
        ? `POLYGON${fmt(result[0])}`
        : `MULTIPOLYGON(${result.map(fmt).join(', ')})`;
      setPreviewFieldWkt(outWkt);
    } catch (err) {
      console.warn('Preview boolean failed:', err);
      setPreviewFieldWkt(baseWkt || null);
    }
  }, [draftCad, maskCad, isEditMode, isEditingMask, resultsMode, selectedCaseId, currentResult]);


  const buildPayload = (k) => {
    if (!k) return null;
    const rawPhysics = physics[k.load] || physics['NoLoad'] || {};
    const sanitizedPhysics = {};
    const keys = [...new Set([...Object.keys(rawPhysics), 'field_method'])];
    keys.forEach(key => {
      let val = rawPhysics[key];
      if (key === 'field_method' || key === 'warning_strategy') {
        sanitizedPhysics[key] = val || (key === 'field_method' ? 'union' : 'none');
      } else if (typeof val === 'boolean') {
        sanitizedPhysics[key] = val;
      } else {
        // Numeric value from input field (often string in state)
        sanitizedPhysics[key] = parseFloat(val) || 0;
      }
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
      physics_params: sanitizedPhysics,
      entity_meta: cadData?.[k.load]?.entityMeta || []
    };
  };

  const handleCalculate = async (targetCaseArg = null) => {
    // Check if targetCaseArg is an event object (from onClick) rather than a case object
    const isValidCase = targetCaseArg && targetCaseArg.id !== undefined;
    let k = isValidCase ? targetCaseArg : evaluationCases.find(c => c.id === selectedCaseId);
    if (!k && evaluationCases.length > 0) k = evaluationCases[0];
    if (!k || !geometry.FootPrint) return;
    setIsCalculating(true);
    pushToHistory();
    // Clear old result for this case immediately
    setResults(prev => ({ ...prev, [k.id]: null }));
    try {
      const res = await axios.post('/api/calculate', buildPayload(k));
      if (res.data.success) {
        setResults(prev => ({ ...prev, [k.id]: res.data }));
      } else {
        alert("Calculation failed: " + (res.data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Calculation Error:", err);
      alert("Network or Server error during calculation.");
    } finally { setIsCalculating(false); }
  };

  const handleCalculateAll = async () => {
    setIsCalculating(true);
    pushToHistory();
    // Clear old results for all evaluation cases immediately
    const clearedResults = {};
    evaluationCases.forEach(c => clearedResults[c.id] = null);
    setResults(prev => ({ ...prev, ...clearedResults }));
    
    for (const k of evaluationCases) {
      try {
        const res = await axios.post('/api/calculate', buildPayload(k));
        if (res.data.success) setResults(prev => ({ ...prev, [k.id]: res.data }));
      } catch (err) {}
    }
    setIsCalculating(false);
  };


  useEffect(() => {
    const handleEsc = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Undo (Ctrl+Z) locally if in CAD mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && isEditMode && resultsMode === 'cad') {
        e.preventDefault();
        handleCadUndo();
        return;
      }

      if (e.key === 'Escape') {
         // Exit mask edit — revert to snapshot
         if (isEditingMask) {
           if (originalMaskWkt.current !== null) {
             const revertWkt = originalMaskWkt.current;
             setResults(prev => {
               const updated = { ...prev };
               Object.keys(updated).forEach(id => {
                 if (updated[id]) updated[id] = { ...updated[id], ignored_wkt: revertWkt };
               });
               return updated;
             });
             originalMaskWkt.current = null;
           }
           setIsEditingMask(false);
           return;
         }
         
         if (isEditMode && resultsMode === 'cad') {
            if (activeTool !== 'select') {
               setActiveTool('select');
               return;
            }
            // Transactional: Ignore changes on ESC
            if (cadSnapshot) {
               try {
                 setDraftCad(JSON.parse(cadSnapshot));
               } catch(e) {}
            }
            setIsEditMode(false);
            return;
         }
         
         setIsEditMode(false);
         setActiveTool('select');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isEditingMask, isEditMode, resultsMode, activeTool, cadSnapshot, setResults, setDraftCad, setActiveTool]);

  const lidarList = currentResult?.lidars || [];
  const activeLidar = lidarList.find(l => l.name === selectedLidar) || lidarList[0] || null;

  const tfConfig = wrtLidar || !retainOri ? activeLidar : null;
  const tObj = buildTransform(viewMode, tfConfig, retainOri, wrtLidar);

  useEffect(() => {
    if (!currentResult) { setInspectorText('No result yet.'); return; }
    let txt = `Status: CALCULATED\nSafety Dist (D): ${currentResult.dist_d?.toFixed(3)} m\n`;
    if (currentResult.generation_meta) {
      const meta = currentResult.generation_meta;
      txt += `Base Polygon: ${meta.base_was_hull ? 'Convex Hull' : 'Footprint'}\n`;
      txt += `Protective Method: ${meta.field_method_used.toUpperCase()} ${meta.patched ? '(Patched)' : ''}\n`;
      txt += `Warning Method: ${meta.warn_field_method_used.toUpperCase()} ${meta.warn_patched ? '(Patched)' : ''}\n\n`;
    } else {
      txt += `\n`;
    }
    
    if (viewMode === 'LiDAR View' && activeLidar) {
      txt += `--- ${activeLidar.name} ---\n`;
      const ox = (activeLidar.origin && activeLidar.origin[0] !== undefined) ? activeLidar.origin[0] : (activeLidar.x || 0);
      const oy = (activeLidar.origin && activeLidar.origin[1] !== undefined) ? activeLidar.origin[1] : (activeLidar.y || 0);
      txt += `Origin: (${ox.toFixed(3)}, ${oy.toFixed(3)})\n`;
      txt += `Mount: ${activeLidar.mount}°\n`;
      txt += `Warning Clip Exists: ${!!activeLidar.w_clip_wkt}\n`;
      
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
  const parsedWarning = currentResult ? parseWktWithTransform(currentResult.warning_field_wkt, tObj.fn) : [];
  const parsedIdeal   = currentResult ? parseWktWithTransform(currentResult.ideal_field_wkt, tObj.fn) : [];
  const parsedIgnored = currentResult ? parseWktWithTransform(currentResult.ignored_wkt, tObj.fn) : [];
  const parsedLidarClip = (viewMode === 'LiDAR View' && activeLidar?.clip_wkt) ? parseWktWithTransform(activeLidar.clip_wkt, tObj.fn) : [];
  const parsedLidarWarningClip = (viewMode === 'LiDAR View' && activeLidar?.w_clip_wkt) ? parseWktWithTransform(activeLidar.w_clip_wkt, tObj.fn) : [];
  const parsedSweeps = (viewMode === 'Sweep Steps' && currentResult?.sweeps) ? currentResult.sweeps.flatMap(s => parseWktToKonva(s)) : [];

  // Client-side convex hull of all sweep vertices (Andrew's monotone chain) — always shown in Sweep Steps
  const sweepHullPoints = (() => {
    if (viewMode !== 'Sweep Steps' || parsedSweeps.length === 0) return null;
    const pts = [];
    parsedSweeps.forEach(poly => {
      for (let i = 0; i < poly.length; i += 2) pts.push([poly[i], poly[i + 1]]);
    });
    if (pts.length < 3) return null;
    pts.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
    const cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
    const lower = [], upper = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
      lower.push(p);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
      upper.push(p);
    }
    upper.pop(); lower.pop();
    return [...lower, ...upper].flat();
  })();

  const worldToCanvas = (x, y) => [x * SCALE, -y * SCALE];
  const showTraj = showArc && currentResult?.traj;
  const trajCanvas = (showTraj && (viewMode === 'Composite' || viewMode === 'Sweep Steps' || (viewMode === 'LiDAR View' && showComposite))) ? currentResult.traj.map(p => worldToCanvas(p[0], p[1])).flat() : null;
  const frontTrajCanvas = (showTraj && (viewMode === 'Composite' || viewMode === 'Sweep Steps' || (viewMode === 'LiDAR View' && showComposite))) ? currentResult.front_traj?.map(p => worldToCanvas(p[0], p[1])).flat() || null : null;

  const handlePointDrag = (polyIdx, pIdx, newX, newY) => {
    const targetKey = editingTarget === 'warning' ? 'warning_field_wkt' : 'final_field_wkt';
    if (!currentResult?.[targetKey]) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult[targetKey]);
    const poly = [...raw[polyIdx]];
    poly[pIdx * 2] = newX; poly[pIdx * 2 + 1] = newY;
    if (pIdx === 0 || pIdx === (poly.length / 2) - 1) {
      const last = (poly.length / 2) - 1;
      poly[0] = poly[last * 2] = newX; poly[1] = poly[last * 2 + 1] = newY;
    }
    raw[polyIdx] = poly;
    syncPolyToWkt(raw, targetKey);
  };

  const handlePointDelete = (polyIdx, pIdx) => {
    const targetKey = editingTarget === 'warning' ? 'warning_field_wkt' : 'final_field_wkt';
    if (!currentResult?.[targetKey]) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult[targetKey]);
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
      newPoly[lastIdx * 2] = newPoly[0];
      newPoly[lastIdx * 2 + 1] = newPoly[1];
    }

    raw[polyIdx] = newPoly;
    syncPolyToWkt(raw, targetKey);
  };

  const handleEdgeClick = (polyIdx, edgeIdx, x, y) => {
    const targetKey = editingTarget === 'warning' ? 'warning_field_wkt' : 'final_field_wkt';
    if (!currentResult?.[targetKey]) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult[targetKey]);
    const poly = [...raw[polyIdx]];
    poly.splice((edgeIdx + 1) * 2, 0, x, y);
    raw[polyIdx] = poly;
    syncPolyToWkt(raw, targetKey);
  };

  const syncPolyToWkt = (rawPolys, fieldKey = 'final_field_wkt') => {
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
    setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], [fieldKey]: wktStr } }));
  };

  // --- Mask (ignored_wkt) editing helpers ---
  const syncMaskToWkt = (rawPolys) => {
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
    // Apply to ALL results so the mask is global across every case
    setResults(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        if (updated[id]) updated[id] = { ...updated[id], ignored_wkt: wktStr };
      });
      return updated;
    });
  };

  const handleMaskPointDrag = (polyIdx, pIdx, newX, newY) => {
    if (!currentResult?.ignored_wkt) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult.ignored_wkt);
    const poly = [...raw[polyIdx]];
    poly[pIdx * 2] = newX; poly[pIdx * 2 + 1] = newY;
    if (pIdx === 0 || pIdx === (poly.length / 2) - 1) {
      const last = (poly.length / 2) - 1;
      poly[0] = poly[last * 2] = newX; poly[1] = poly[last * 2 + 1] = newY;
    }
    raw[polyIdx] = poly;
    syncMaskToWkt(raw);
  };

  const handleMaskPointDelete = (polyIdx, pIdx) => {
    if (!currentResult?.ignored_wkt) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult.ignored_wkt);
    const poly = [...raw[polyIdx]];
    if (poly.length <= 8) { alert("Cannot delete vertex: minimum 3 vertices required."); return; }
    const newPoly = [];
    for (let i = 0; i < poly.length / 2; i++) {
      if (i === pIdx) continue;
      newPoly.push(poly[i * 2], poly[i * 2 + 1]);
    }
    if (pIdx === 0 || pIdx === (poly.length / 2) - 1) {
      const lastIdx = (newPoly.length / 2) - 1;
      newPoly[lastIdx * 2] = newPoly[0];
      newPoly[lastIdx * 2 + 1] = newPoly[1];
    }
    raw[polyIdx] = newPoly;
    syncMaskToWkt(raw);
  };

  const handleMaskEdgeClick = (polyIdx, edgeIdx, x, y) => {
    if (!currentResult?.ignored_wkt) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult.ignored_wkt);
    const poly = [...raw[polyIdx]];
    poly.splice((edgeIdx + 1) * 2, 0, x, y);
    raw[polyIdx] = poly;
    syncMaskToWkt(raw);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#111', overflow: 'hidden' }}>
      
      {/* ── Results Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '8px 20px', background: '#1a1a1a', borderBottom: '1px solid #2a2a2a', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.3)', zIndex: 10 }}>
        
        {/* View Mode Segmented Control */}
        <div className="segmented-control">
           {[
             { id: 'Composite', label: 'Composite' },
             { id: 'LiDAR View', label: 'LiDAR' },
             { id: 'Sweep Steps', label: 'Sweeps' }
           ].map(v => (
             <button 
               key={v.id} 
               onClick={() => setViewMode(v.id)} 
               className={`segmented-btn ${viewMode === v.id ? 'active' : ''}`}
             >
               {v.label}
             </button>
           ))}
        </div>

        {viewMode === 'LiDAR View' && (
          <>
            <div style={{ width: 1, height: 16, background: '#333' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="segmented-control">
                {lidarList.map((l, idx) => (
                  <button 
                    key={l.name} 
                    onClick={() => setSelectedLidar(l.name)}
                    className={`segmented-btn ${activeLidar?.name === l.name ? 'active' : ''}`}
                    style={{ background: activeLidar?.name === l.name ? '#1a4a25' : 'transparent' }}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', paddingLeft: 10, fontWeight: '500' }}>
                <input type="checkbox" checked={wrtLidar} onChange={e => setWrtLidar(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> w.r.t Lidar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={retainOri} onChange={e => setRetainOri(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> Original Orientation
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={showComposite} onChange={e => setShowComposite(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> Composite Field
              </label>
            </div>
          </>
        )}

        <div style={{ width: 1, background: '#333', height: 16 }} />

        {/* Visibility Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.2)', padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { id: 'FP', label: 'FP', state: showFootprint, set: setShowFootprint, col: '#fff' },
            { id: 'L1', label: 'L1', state: showLoad1, set: setShowLoad1, col: '#4CAF50' },
            { id: 'L2', label: 'L2', state: showLoad2, set: setShowLoad2, col: '#2196F3' }
          ].map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.state ? t.col : '#555', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '800', transition: 'all 0.2s' }}>
              <input type="checkbox" checked={t.state} onChange={e => t.set(e.target.checked)} style={{ accentColor: t.col, width: 12, height: 12, cursor: 'pointer' }} />
              {t.label}
            </label>
          ))}
          {viewMode === 'Sweep Steps' && (
            <>
               <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 12, margin: '0 4px' }} />
               <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: fillSweeps ? '#ff9800' : '#555', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '800' }}>
                 <input type="checkbox" checked={fillSweeps} onChange={e => setFillSweeps(e.target.checked)} style={{ accentColor: '#ff9800', width: 12, height: 12, cursor: 'pointer' }} />
                 SHADE
               </label>
            </>
          )}
        </div>

                {(viewMode === 'Composite' || viewMode === 'LiDAR View') && !isEditingMask && (
          <div className="segmented-control" style={{ marginBottom: 4 }}>
             <button onClick={() => setEditingTarget('protective')} className={`segmented-btn ${editingTarget === 'protective' ? 'active' : ''}`} style={{ background: editingTarget === 'protective' ? '#1a4a25' : 'transparent', fontSize: '0.65rem' }}>
               PROTECTIVE
             </button>
             <button onClick={() => setEditingTarget('warning')} className={`segmented-btn ${editingTarget === 'warning' ? 'active' : ''}`} style={{ background: editingTarget === 'warning' ? '#ff9800' : 'transparent', color: editingTarget === 'warning' ? '#000' : '#aaa', fontSize: '0.65rem' }}>
               WARNING
             </button>
          </div>
        )}

        {viewMode === 'Composite' && (isEditMode || isEditingMask) && (
          <div className="segmented-control">
             <button onClick={() => setResultsMode('polygon')} className={`segmented-btn ${resultsMode === 'polygon' ? 'active' : ''}`}>
               POLYGON
             </button>
             <button onClick={() => setResultsMode('cad')} className={`segmented-btn ${resultsMode === 'cad' ? 'active' : ''}`}>
               CAD
             </button>
          </div>
        )}

        {(isEditMode || isEditingMask) && resultsMode === 'cad' && viewMode === 'Composite' && (
          <div style={{ marginLeft: 10 }}>
            <CADToolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              isConstructionMode={isConstructionMode}
              setIsConstructionMode={setIsConstructionMode}
              isSubtractionMode={isSubtractionMode}
              setIsSubtractionMode={setIsSubtractionMode}
              undo={(isEditMode || isEditingMask) && resultsMode === 'cad' ? (isEditMode ? handleCadUndo : handleMaskCadUndo) : undo}
              handleClearSketch={handleClearSketch}
              onConstructionClick={() => {
                if (cadRef.current && cadRef.current.hasSelection) {
                  cadRef.current.toggleConstruction();
                } else {
                  setIsConstructionMode(!isConstructionMode);
                }
              }}
            >
              {!isEditingMask && (
                <button onClick={async () => {
                const finalWkt = previewFieldWkt;
                if (!finalWkt) {
                  alert("No sketches found to finalize.");
                  return;
                }

                // 1. Auto-save sketches session to cadData
                if (draftCad) {
                   setCadFieldSafe('Overrides', selectedCaseId, 'sketches', draftCad.sketches);
                   setCadFieldSafe('Overrides', selectedCaseId, 'dimensions', draftCad.dimensions);
                   setCadFieldSafe('Overrides', selectedCaseId, 'constraints', draftCad.constraints);
                   setCadFieldSafe('Overrides', selectedCaseId, 'fixedPoints', draftCad.fixedPoints);
                }

                // 2. Prepare updated case with custom_dxf
                const updatedCases = [...evaluationCases];
                const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
                if (idx !== -1) {
                  updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };
                  pushToHistory();
                  setEvaluationCases(updatedCases);
                  
                  // 3. Trigger immediate calculation with updated case to avoid race condition
                  await handleCalculate(updatedCases[idx]);
                }

                setIsEditMode(false);
              }} style={{ background: '#1a4a25', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                Finalize
              </button>
              )}
          </CADToolbar>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Edit Mask button — only in Composite view */}
        {viewMode === 'Composite' && currentResult && !isEditMode && (
          <button
            onClick={() => {
              if (!isEditingMask) {
                originalMaskWkt.current = currentResult.ignored_wkt;
                setMaskCad({ sketches: [], dimensions: [], fixedPoints: [], constraints: [] });
                setIsEditingMask(true);
                setIsEditMode(false);
              } else {
                if (resultsMode === 'cad' && previewFieldWkt) {
                  setResults(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(id => {
                      if (updated[id]) updated[id] = { ...updated[id], ignored_wkt: previewFieldWkt };
                    });
                    return updated;
                  });
                  // Clear mask sketches after baking them into the ignored_wkt
                  setMaskCad(null);
                }
                originalMaskWkt.current = null;
                setIsEditingMask(false);
              }
            }}
            title="Edit Mask (Gray No-FOV Region)"
            style={{
              background: isEditingMask ? '#4a1a1a' : '#222',
              color: isEditingMask ? '#ff5252' : '#888',
              border: isEditingMask ? '1px solid #ff5252' : '1px solid transparent',
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>⬛</span> {isEditingMask ? 'Done' : 'Edit Mask'}
          </button>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={undo} title="Global Undo (Ctrl+Z)" className="toolbar-action-btn" style={{ background: 'rgba(0,0,0,0.2)', color: '#666', border: 'none', padding: '6px' }}>
            <ArrowUUpLeft size={14} weight="bold" />
          </button>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 16, margin: '0 4px' }} />
          <button onClick={() => setCaseListOpen(!caseListOpen)} title="Toggle Case List" className="toolbar-action-btn" style={{ background: caseListOpen ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: caseListOpen ? '#fff' : '#666', border: 'none', padding: '6px' }}><List size={14} weight="bold" /></button>
          <button onClick={() => setInspectorOpen(!inspectorOpen)} title="Toggle Inspector" className="toolbar-action-btn" style={{ background: inspectorOpen ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: inspectorOpen ? '#fff' : '#666', border: 'none', padding: '6px' }}><Info size={14} weight="bold" /></button>
        </div>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 16, marginLeft: 4, marginRight: 4 }} />

        {viewMode === 'Composite' && !isEditingMask && (
          <button onClick={async () => {
            if (isEditMode && resultsMode === 'polygon') {
                // Safely exit edit mode. We do NOT submit final_field_wkt as custom_dxf here,
                // nor do we trigger handleCalculate, because that causes the backend to
                // completely overwrite local edits and potentially wipe the ignored_wkt mask.
                setIsEditMode(false);
            } else {
                setIsEditMode(!isEditMode);
            }
          }} className={`toolbar-action-btn ${isEditMode ? 'danger' : 'primary'}`} style={{ minWidth: 90, justifyContent: 'center', gap: 6 }}>
            {isEditMode ? (resultsMode === 'cad' ? 'EXIT' : 'DONE') : <><PencilSimple size={14} weight="fill" /> EDIT</>}
          </button>
        )}

        {!isEditMode && !isEditingMask && (
          <>
            <button onClick={() => setIsGenOpen(true)} className="toolbar-action-btn" style={{ background: '#581c87', color: '#fff' }}>
              <Stack size={14} weight="bold" color="#fff" /> EVALUATION
            </button>

            <button onClick={handleCalculate} disabled={isCalculating} className="toolbar-action-btn info">
              {isCalculating ? '...' : <><Play size={14} weight="bold" /> CALC</>}
            </button>
            
            <button onClick={handleCalculateAll} disabled={isCalculating} className="toolbar-action-btn success">
              <Lightning size={14} weight="bold" /> ALL
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── Evaluation Modal ── */}
        {isGenOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: 'rgba(168,85,247,0.1)', borderRadius: 10 }}>
                    <Stack size={20} weight="bold" color="#a855f7" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>EVALUATION MATRIX</h2>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#666', fontWeight: 500 }}>Global config and generation parameters</p>
                  </div>
                </div>
                <button onClick={() => setIsGenOpen(false)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='#444'}>
                  <X size={24} />
                </button>
              </div>
              <div className="modal-body">
                <Generation globals={globals} />
              </div>
              <div style={{ padding: '15px 25px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
               <button onClick={() => setIsGenOpen(false)} className="toolbar-action-btn primary" style={{ padding: '12px 60px', borderRadius: 12, fontSize: '1rem', fontWeight: 800 }}>
                 Done
               </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Case List Sidebar */}
        {caseListOpen && (
          <div style={{ width: 220, background: '#111', borderRight: '1px solid #222', overflowY: 'auto', padding: '10px 0' }}>
            <div style={{ padding: '0 15px 10px', fontSize: '0.65rem', color: '#888', letterSpacing: 1, fontWeight: 'bold' }}>EVALUATION MATRIX</div>
            {[...new Set(evaluationCases.map(c => c.load))].map(load => (
              <div key={load}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 15px', background: '#161616', color: '#aaa', fontSize: '0.7rem' }}>
                  <Database size={10} /> {load}
                </div>
                {evaluationCases.filter(c => c.load === load).map(c => (
                  <div key={c.id} onClick={() => setSelectedCaseId(c.id)} style={{ padding: '10px 20px', cursor: 'pointer', background: c.id === selectedCaseId ? 'rgba(0,229,255,0.08)' : 'transparent', borderLeft: c.id === selectedCaseId ? '3px solid #00e5ff' : '3px solid transparent', color: c.id === selectedCaseId ? '#fff' : '#aaa' }}>
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
          
          <GridCanvas stagePos={stagePos} onStagePosChange={setStagePos} draggable={!(isEditMode || isEditingMask) || activeTool === 'select'}>
            {({ scale, setOverlay }) => (
              <Layer ref={(node) => { layerRef.current = node; window.__debugLayer = node; }}>
                {/* GROUP 1: Static background */}
                <Group key="layer-static" name="static-layer">
                  {/* 1a. Static Sweeps */}
                  {viewMode === 'Sweep Steps' && parsedSweeps.map((poly, i) => (
                    <Line key={`sw-${i}`} points={poly} fill={fillSweeps ? "rgba(255,165,0,0.05)" : "transparent"} stroke="rgba(255,165,0,0.4)" strokeWidth={1/scale} closed />
                  ))}
                  {/* 1b. Sweep Convex Hull Outline */}
                  {viewMode === 'Sweep Steps' && sweepHullPoints && (
                    <Line points={sweepHullPoints} stroke="#00e5ff" strokeWidth={2/scale} fill="rgba(0,229,255,0.04)" dash={[6/scale, 4/scale]} closed />
                  )}
                  {/* 1c. Ghost Field (Reference) */}
                  {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIdeal.map((poly, i) => (
                    <Line key={`ideal-${i}`} points={poly} stroke="#444" strokeWidth={1/scale} dash={[5/scale, 5/scale]} closed />
                  ))}
                  {/* 1d. CAD Preview Field */}
                  {isEditMode && resultsMode === 'cad' && previewFieldWkt && (() => {
                    const transformFn = viewMode === 'LiDAR View' ? tObj.inv : tObj.fn;
                    return parseWktWithTransform(previewFieldWkt, transformFn).map((poly, i) => (
                      <Line
                        key={`preview-${i}`}
                        points={poly}
                        fill="rgba(0, 230, 118, 0.35)"
                        stroke="#00e676"
                        strokeWidth={2/scale}
                        closed
                        dash={[6/scale, 3/scale]}
                        listening={false}
                      />
                    ));
                  })()}
                </Group>

                {/* 2. Composite Field (Bottom - Inactive) */}
                <Group key="layer-comp-bot" name="composite-bottom-layer">
                  {editingTarget === 'warning' ? (
                    (viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedField.map((poly, i) => (
                      <Line key={`field-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                    ))
                  ) : (
                    (viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedWarning.map((poly, i) => (
                      <Line key={`warn-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                    ))
                  )}
                </Group>

                {/* 3. Composite Field (Top - Active) */}
                <Group key="layer-comp-top" name="composite-top-layer">
                  {editingTarget === 'warning' ? (
                    (viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedWarning.map((poly, i) => (
                      <Line key={`warn-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
                    ))
                  ) : (
                    (viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedField.map((poly, i) => (
                      <Line key={`field-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
                    ))
                  )}
                </Group>

                {/* 4. Footprint + load outlines */}
                <Group key="layer-footprint" name="footprint-layer">
                  {showFootprint && geometry.FootPrint && parseWktWithTransform(geometry.FootPrint, tObj.fn).map((poly, i) => (
                    <Line key={`fp-${i}`} points={poly} stroke="#fff" strokeWidth={1/scale} dash={[5/scale, 5/scale]} opacity={0.6} closed />
                  ))}
                  {currentResult?.load_wkt && (
                    (currentResult.load === 'Load1' && showLoad1) ||
                    (currentResult.load === 'Load2' && showLoad2)
                  ) && parseWktWithTransform(currentResult.load_wkt, tObj.fn).map((poly, i) => {
                    const isL2 = currentResult.load === 'Load2';
                    return (
                      <Line
                        key={`load-${i}`}
                        points={poly}
                        stroke={isL2 ? "#2196F3" : "#4CAF50"}
                        strokeWidth={2/scale}
                        dash={[5/scale, 5/scale]}
                        fill={isL2 ? "rgba(33, 150, 243, 0.1)" : "rgba(76, 175, 80, 0.1)"}
                        closed
                      />
                    );
                  })}
                </Group>

                {/* 5. Mask (Ignored Area) */}
                <Group key="layer-mask" name="mask-layer" listening={false}>
                  {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIgnored.map((poly, i) => (
                    <Line
                      key={`ig-${i}`}
                      points={poly}
                      fill={IGNORED_GRAY_FILL}
                      stroke={isEditingMask ? '#ff5252' : 'transparent'}
                      strokeWidth={isEditingMask ? 2/scale : 0}
                      dash={isEditingMask ? [6/scale, 4/scale] : undefined}
                      closed
                    />
                  ))}

                  {/* 5b. CAD Preview Mask */}
                  {isEditingMask && resultsMode === 'cad' && previewFieldWkt && (() => {
                    const transformFn = viewMode === 'LiDAR View' ? tObj.inv : tObj.fn;
                    return parseWktWithTransform(previewFieldWkt, transformFn).map((poly, i) => (
                      <Line
                        key={`mask-preview-${i}`}
                        points={poly}
                        fill={IGNORED_GRAY_FILL}
                        stroke="#00e676"
                        strokeWidth={2/scale}
                        closed
                        dash={[6/scale, 3/scale]}
                        listening={false}
                      />
                    ));
                  })()}
                </Group>

                {/* 6. LiDAR Fields (Bottom - Inactive) */}
                <Group key="layer-lidar-bot" name="lidar-bottom-layer">
                  {viewMode === 'LiDAR View' && (
                    editingTarget === 'warning' ? (
                      parsedLidarClip.map((poly, i) => (
                        <Line key={`lc-inact-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                      ))
                    ) : (
                      parsedLidarWarningClip.map((poly, i) => (
                        <Line key={`lwc-inact-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                      ))
                    )
                  )}
                </Group>

                {/* 7. LiDAR Fields (Top - Active) */}
                <Group key="layer-lidar-top" name="lidar-top-layer">
                  {viewMode === 'LiDAR View' && (
                    editingTarget === 'warning' ? (
                      parsedLidarWarningClip.map((poly, i) => (
                        <Line key={`lwc-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.6} listening={false} />
                      ))
                    ) : (
                      parsedLidarClip.map((poly, i) => (
                        <Line key={`lc-act-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.6} listening={false} />
                      ))
                    )
                  )}
                </Group>

                {/* GROUP 5: Trajectories */}
                <Group key="layer-trajectories" name="trajectories-layer">
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
                </Group>

                {/* GROUP 8: Sensor markers */}
                <Group key="layer-sensors" name="sensors-layer">
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
                </Group>

                {/* GROUP 9: Edit handles */}
                <Group key="layer-handles" name="handles-layer">
                {isEditMode && resultsMode === 'polygon' && viewMode === 'Composite' && (editingTarget === 'warning' ? parsedWarning : parsedField).map((poly, polyIdx) => {
                   if (polyIdx !== 0) return null; // only edit main polygon for now
                   return (
                     <Group key={`edit-${polyIdx}`}>
                       {/* Edges Midpoints (Add Points) */}
                       {Array.from({ length: poly.length / 2 - 1 }).map((_, pIdx) => {
                          const x1 = poly[pIdx*2], y1 = poly[pIdx*2+1];
                          const x2 = poly[(pIdx+1)*2], y2 = poly[(pIdx+1)*2+1];
                          const mx = (x1+x2)/2, my = (y1+y2)/2;
                          return (
                            <Circle key={`add-${pIdx}`} x={mx} y={my} radius={4/scale} fill="#00e676" opacity={0.3} 
                              onClick={() => handleEdgeClick(polyIdx, pIdx, mx, my)}
                              onMouseEnter={(e) => { e.target.opacity(1); e.target.getStage().container().style.cursor = 'copy'; }}
                              onMouseLeave={(e) => { e.target.opacity(0.3); e.target.getStage().container().style.cursor = 'default'; }}
                            />
                          );
                       })}
                       {/* Vertices */}
                       {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
                         if (pIdx === (poly.length / 2) - 1) return null;
                         return (
                           <Circle key={`h-${pIdx}`} x={poly[pIdx*2]} y={poly[pIdx*2+1]} radius={6/scale} fill="#ff1744" stroke="#fff" strokeWidth={2/scale} draggable
                             onDragStart={() => pushToHistory()}
                             onDragMove={(e) => handlePointDrag(polyIdx, pIdx, e.target.x(), e.target.y())}
                             onContextMenu={(e) => { e.evt.preventDefault(); handlePointDelete(polyIdx, pIdx); }}
                           />
                         );
                       })}
                     </Group>
                   );
                })}
                       {/* Mask Handles — inside handlesGroupRef to prevent Z-order corruption */}
                {isEditingMask && resultsMode === 'polygon' && viewMode === 'Composite' && parsedIgnored.map((poly, polyIdx) => (
                  <Group key={`mask-edit-${polyIdx}`}>
                    {/* Edges Midpoints (Add Points) */}
                    {Array.from({ length: poly.length / 2 - 1 }).map((_, pIdx) => {
                        const x1 = poly[pIdx * 2], y1 = poly[pIdx * 2 + 1];
                        const x2 = poly[(pIdx + 1) * 2], y2 = poly[(pIdx + 1) * 2 + 1];
                        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                        return (
                          <Circle key={`madd-${pIdx}`} x={mx} y={my} radius={4/scale} fill="#ff5252" opacity={0.3}
                            onClick={() => handleMaskEdgeClick(polyIdx, pIdx, mx, my)}
                            onMouseEnter={(e) => { e.target.opacity(1); e.target.getStage().container().style.cursor = 'copy'; }}
                            onMouseLeave={(e) => { e.target.opacity(0.3); e.target.getStage().container().style.cursor = 'default'; }}
                          />
                        );
                    })}
                    {/* Vertices */}
                    {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
                      if (pIdx === (poly.length / 2) - 1) return null;
                      return (
                        <Circle
                          key={`mh-${pIdx}`}
                          x={poly[pIdx * 2]} y={poly[pIdx * 2 + 1]}
                          radius={6/scale}
                          fill="#ff5252"
                          stroke="#fff"
                          strokeWidth={2/scale}
                          draggable
                          onDragStart={() => pushToHistory()}
                          onDragMove={(e) => handleMaskPointDrag(polyIdx, pIdx, e.target.x(), e.target.y())}
                          onContextMenu={(e) => { e.evt.preventDefault(); handleMaskPointDelete(polyIdx, pIdx); }}
                        />
                      );
                    })}
                  </Group>
                ))}

                {/* 10. CAD Sketcher */}
                {(isEditMode || isEditingMask) && resultsMode === 'cad' && (isEditMode ? draftCad : maskCad) && (() => {
                  const activeCad = isEditMode ? draftCad : maskCad;
                  const setActiveCad = isEditMode ? setDraftCad : setMaskCad;
                  const activeUndoHistory = isEditMode ? cadHistory : maskCadHistory;
                  const setActiveUndoHistory = isEditMode ? setCadHistory : setMaskCadHistory;
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
                      ref={cadRef}
                      sketches={activeCad.sketches} 
                      setSketches={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.sketches) : v;
                         setActiveCad(prev => ({ ...prev, sketches: updated }));
                      }} 
                      dimensions={activeCad.dimensions}
                      setDimensions={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.dimensions) : v;
                         setActiveCad(prev => ({ ...prev, dimensions: updated }));
                      }}
                      fixedPoints={activeCad.fixedPoints}
                      setFixedPoints={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.fixedPoints) : v;
                         setActiveCad(prev => ({ ...prev, fixedPoints: updated }));
                      }}
                      constraints={activeCad.constraints}
                      setConstraints={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.constraints) : v;
                         setActiveCad(prev => ({ ...prev, constraints: updated }));
                      }}
                      referenceVertices={refs}
                       pushToHistory={() => {
                         setActiveUndoHistory(prev => [JSON.stringify(activeCad), ...prev].slice(0, 30));
                       }}
                      scale={scale} 
                      SCALE_M={SCALE_M} 
                      activeTool={activeTool}
                      setOverlay={setOverlay}
                      isConstructionMode={isConstructionMode}
                      isSubtractionMode={isSubtractionMode}
                    />
                  );
                })()}
                 </Group>
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
