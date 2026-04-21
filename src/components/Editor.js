import React, { useState, useEffect } from 'react';
import { Layer, Line, Circle, Group } from 'react-konva';
import { MousePointer2, PenLine, Circle as CircleIcon, Square, Undo2, Trash2, PencilLine, Ruler, GripHorizontal, Link2, Equal, ArrowUp, ArrowRight, Rows, CornerDownLeft, Anchor, Hammer, Minus, Lock } from 'lucide-react';
import axios from 'axios';
import { parseWktToKonva } from '../utils/wktParser';
import GridCanvas, { SCALE_M } from './GridCanvas';
import LidarMarker from './LidarMarker';
import CADSketcher from './CADSketcher';
import ConstraintList from './ConstraintList';
import { sketchesToWkt } from '../utils/cadToWkt';

const Editor = ({ globals, setActiveTab }) => {
  const { 
    geometry, setGeometry, 
    sensors, setSensors, 
    cadData, setCadFieldSafe, setCadBatchSafe,
    undo, pushToHistory,
    selectedSensorIndex, setSelectedSensorIndex,
    activeTool, setActiveTool,
    maxFields, setMaxFields
  } = globals;
  
  const [isConstructionMode, setIsConstructionMode] = useState(false);
  const [isSubtractionMode, setIsSubtractionMode] = useState(false);
  const [showFootPrint, setShowFootPrint] = useState(true);
  const [showL1, setShowL1]   = useState(true);
  const [showL2, setShowL2]   = useState(true);
  const [isSketchingMode, setIsSketchingMode] = useState(false);
  const [formData, setFormData] = useState({
    name: 'New Sensor', x: 0, y: 0, mount: 0, fov: 270, r: 10, dia: 150, flipped: false, locked: false
  });
  const [targetLayer, setTargetLayer] = useState('FootPrint');
  const layerRef = React.useRef(null);
  
  // --- Force Canvas Redraw on State Change ---
  useEffect(() => {
    if (layerRef.current) {
       layerRef.current.batchDraw();
    }
  }, [geometry, sensors, cadData, isSketchingMode]);

  useEffect(() => {
    if (sensors && sensors.length > 0) {
      if (selectedSensorIndex !== null && selectedSensorIndex < sensors.length) {
        setFormData({ ...sensors[selectedSensorIndex] });
      }
    }
  }, [selectedSensorIndex, sensors]);


  const handleUpload = async (e, key) => {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const fd   = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/upload_dxf', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGeometry(prev => ({ ...prev, [key]: res.data.wkt }));
    } catch (err) {
      alert('Failed to upload DXF: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleClear       = (key) => setGeometry(prev => ({ ...prev, [key]: null }));
  const handleSaveSensor  = () => { const u = [...sensors]; u[selectedSensorIndex] = { ...formData }; setSensors(u); };
  const handleAddSensor   = () => {
    const ns = { name: `Lidar${sensors.length + 1}`, model: sensors[0]?.model || 'Sick Nanoscan3Pro', x: 0, y: 0, mount: 0, fov: 270, r: 10, dia: 150, flipped: false, locked: false };
    setSensors([...sensors, ns]);
    setSelectedSensorIndex(sensors.length);
  };
  const handleDeleteSensor = () => {
    if (sensors.length <= 1) return;
    setSensors(sensors.filter((_, i) => i !== selectedSensorIndex));
    setSelectedSensorIndex(0);
  };

  const parsedFP = showFootPrint && geometry.FootPrint ? parseWktToKonva(geometry.FootPrint) : [];
  const parsedL1 = showL1 && geometry.Load1 ? parseWktToKonva(geometry.Load1) : [];
  const parsedL2 = showL2 && geometry.Load2 ? parseWktToKonva(geometry.Load2) : [];

  const targetSketches = cadData[targetLayer]?.sketches || [];
  const targetDimensions = cadData[targetLayer]?.dimensions || [];
  const targetFixedPoints = cadData[targetLayer]?.fixedPoints || [];
  const targetConstraints = cadData[targetLayer]?.constraints || [];

  const handleClearSketch = () => {
    pushToHistory();
    setCadFieldSafe(targetLayer, null, 'sketches', []);
    setCadFieldSafe(targetLayer, null, 'dimensions', []);
    setCadFieldSafe(targetLayer, null, 'fixedPoints', []);
    setCadFieldSafe(targetLayer, null, 'constraints', []);
  };

  const buildRefVertices = () => {
    let refs = [];
    const addLayer = (parsed, layerName) => {
       parsed.forEach((poly, polyIdx) => {
          for (let i = 0; i < poly.length; i += 2) {
             refs.push({
               x: poly[i], y: poly[i+1],
               sketchId: `ref-${layerName}-${polyIdx}-${i}`,
               part: 'point',
               type: 'reference',
               snapped: true
             });
          }
       });
    };
    if (targetLayer !== 'FootPrint') addLayer(parsedFP, 'FootPrint');
    if (targetLayer !== 'Load1') addLayer(parsedL1, 'Load1');
    if (targetLayer !== 'Load2') addLayer(parsedL2, 'Load2');
    return refs;
  };
  const referenceVertices = buildRefVertices();

  useEffect(() => {
    const handleEsc = (e) => {
      // If the user is typing in a dimension overlay or any other input, 
      // let the local handler deal with ESC.
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Escape') {
         if (isSketchingMode) {
            if (activeTool !== 'select') {
               setActiveTool('select');
               return; // Only cancel tool, stay in sketching mode
            }
            // If already in 'select' tool, exit sketching mode with prompt
            if (targetSketches.length > 0) {
               if (window.confirm("Save sketched shapes before exiting?")) {
                  const { wkt, error } = sketchesToWkt(targetSketches, SCALE_M);
                  if (error) {
                    alert(`⚠️ Finalize Rejected:\n\n${error}`);
                    return;
                  }
                  if (wkt) setGeometry(prev => ({ ...prev, [targetLayer]: wkt }));
               } else {
                  handleClearSketch();
               }
            }
            setIsSketchingMode(false);
         }
         setActiveTool('select');
         setSelectedSensorIndex(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSketchingMode, targetSketches, targetLayer, SCALE_M, setGeometry, activeTool, setActiveTool]);

  return (
    <div className="editor-container" style={{ flexDirection: 'column' }}>

      {/* ── Docked Sub-Toolbar ── */}
      <div className="toolbar" style={{ justifyContent: 'flex-start', gap: 20 }}>
        <div style={{ display: 'flex', gap: 15, borderRight: '1px solid #444', paddingRight: 12, marginRight: 12, alignItems: 'center' }}>
          {[['FootPrint', showFootPrint, setShowFootPrint, '#999', !!geometry.FootPrint],
            ['Load1',     showL1,        setShowL1,        '#2196F3', !!geometry.Load1],
            ['Load2',     showL2,        setShowL2,        '#4CAF50', !!geometry.Load2]
          ].map(([lbl, val, set, col, isEnabled]) => (
            <label key={lbl} className="checkbox-group" style={{ color: col, opacity: isEnabled ? 1 : 0.4, cursor: 'pointer' }}>
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} disabled={!isEnabled} style={{ cursor: 'pointer' }} />
              {lbl}
            </label>
          ))}
        </div>
        
        {isSketchingMode && (
        <div style={{ display: 'flex', gap: 5, background: '#222', padding: '2px 8px', borderRadius: 6, alignItems: 'center' }}>
          <button onClick={() => setActiveTool('select')} title="Select"
            style={{ background: activeTool === 'select' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <MousePointer2 size={16} />
          </button>

          <div style={{ width: 1, height: 16, background: '#333', margin: '0 4px' }} />
          
          <button onClick={() => setIsConstructionMode(!isConstructionMode)} title="Toggle Construction Mode"
            style={{ background: isConstructionMode ? '#5c4d1a' : 'transparent', color: isConstructionMode ? '#ff9800' : '#888', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
             <Hammer size={16} />
          </button>
          <button onClick={() => setIsSubtractionMode(!isSubtractionMode)} title="Toggle Subtraction Mode (Removal)"
            style={{ background: isSubtractionMode ? '#5c1a1a' : 'transparent', color: isSubtractionMode ? '#ff5252' : '#888', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
             <Minus size={16} />
          </button>
          <button onClick={() => setActiveTool('circle')} title="Circle"
            style={{ background: activeTool === 'circle' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <CircleIcon size={16} />
          </button>
          <button onClick={() => setActiveTool('line')} title="Line"
            style={{ background: activeTool === 'line' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <PenLine size={16} />
          </button>
          <button onClick={() => setActiveTool('rect')} title="Rectangle"
            style={{ background: activeTool === 'rect' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <Square size={16} />
          </button>
          <button onClick={() => setActiveTool('dimension')} title="Dimension"
            style={{ background: activeTool === 'dimension' ? '#1a3a5c' : 'transparent', color: 'white', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <Ruler size={16} />
          </button>
          
          <div style={{ width: 1, height: 16, background: '#444', margin: '0 2px' }} />

          <button onClick={undo} title="Undo (Ctrl+Z)"
            style={{ background: 'transparent', color: '#aaa', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <Undo2 size={16} />
          </button>
          <button onClick={handleClearSketch} title="Clear All Sketch"
            style={{ background: 'transparent', color: '#ff5252', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
            <Trash2 size={16} />
          </button>
          
          <div style={{ width: 1, height: 16, background: '#444', margin: '0 4px' }} />

          <div style={{ display: 'flex', gap: 2 }}>
             {[
               ['coincide', Link2], ['equal', Equal], ['vertical', ArrowUp], 
               ['horizontal', ArrowRight], ['parallel', Rows], ['perpendicular', CornerDownLeft], ['anchor', Anchor]
             ].map(([t, Icon]) => (
                <button key={t} onClick={() => setActiveTool(t)} title={t.charAt(0).toUpperCase() + t.slice(1)}
                  style={{ background: activeTool === t ? '#1a3a5c' : 'transparent', color: '#00e5ff', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: 4 }}>
                  <Icon size={16} />
                </button>
             ))}
          </div>

          <div style={{ width: 1, height: 16, background: '#333', margin: '0 4px' }} />

          <button onClick={() => {
            const { wkt, error } = sketchesToWkt(targetSketches, SCALE_M);
            if (error) {
              alert(`⚠️ Finalize Rejected:\n\n${error}`);
              return;
            }
            if (wkt) {
              setGeometry(prev => ({ ...prev, [targetLayer]: wkt }));
              setIsSketchingMode(false);
              setActiveTool('select');
              alert(`✓ Sketch applied to ${targetLayer}!`);
            }
          }} style={{ background: '#1a4a25', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
            Finalize
          </button>
        </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Left: Canvas + Rulers ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>


        <GridCanvas initialScale={1.0} draggable={activeTool === 'select'}>
          {({ scale: canvasScale, setOverlay }) => (
            <Layer ref={layerRef}>
              {/* FootPrint */}
              {parsedFP.map((pts, i) => (
                <Line key={`fp-${i}`} points={pts} fill="rgba(153,153,153,0.4)" closed stroke="#888" strokeWidth={1 / canvasScale} />
              ))}
              {/* Load 1 */}
              {parsedL1.map((pts, i) => (
                <Line key={`l1-${i}`} points={pts} fill="rgba(33,150,243,0.4)" closed stroke="#2196F3" strokeWidth={1 / canvasScale} />
              ))}
              {/* Load 2 */}
              {parsedL2.map((pts, i) => (
                <Line key={`l2-${i}`} points={pts} fill="rgba(76,175,80,0.4)" closed stroke="#4CAF50" strokeWidth={1 / canvasScale} />
              ))}
              {/* CAD Sketches */}
              {isSketchingMode && (
                  <CADSketcher 
                    sketches={targetSketches} 
                    setSketches={(v) => setCadFieldSafe(targetLayer, null, 'sketches', v)} 
                    dimensions={targetDimensions}
                    setDimensions={(v) => setCadFieldSafe(targetLayer, null, 'dimensions', v)}
                    fixedPoints={targetFixedPoints}
                    setFixedPoints={(v) => setCadFieldSafe(targetLayer, null, 'fixedPoints', v)}
                    constraints={targetConstraints}
                    setConstraints={(v) => setCadFieldSafe(targetLayer, null, 'constraints', v)} 
                    setCadBatchSafe={(updates) => setCadBatchSafe(targetLayer, null, updates)}
                    referenceVertices={referenceVertices}
                    pushToHistory={pushToHistory}
                    scale={canvasScale} 
                    SCALE_M={SCALE_M} 
                    activeTool={activeTool} 
                    setOverlay={setOverlay}
                    isConstructionMode={isConstructionMode}
                    isSubtractionMode={isSubtractionMode}
                  />
              )}

              {/* Sensors */}
              {sensors.map((s, i) => (
                <LidarMarker
                  key={`s-${i}`}
                  x={s.x * SCALE_M}
                  y={-s.y * SCALE_M}
                  rotation={-s.mount}
                  scale={canvasScale}
                  name={s.name}
                  dia={s.dia}
                  SCALE_M={SCALE_M}
                  draggable={!s.locked}
                  selected={selectedSensorIndex === i}
                  onDragMove={(e) => {
                    const nx = e.target.x() / SCALE_M;
                    const ny = -e.target.y() / SCALE_M;
                    // Highlight this sensor and update temporary form if it's selected
                    if (selectedSensorIndex === i) {
                       setFormData(f => ({ ...f, x: Number(nx.toFixed(3)), y: Number(ny.toFixed(3)) }));
                    }
                  }}
                  onDragEnd={(e) => {
                    const nx = Number((e.target.x() / SCALE_M).toFixed(3));
                    const ny = Number((-e.target.y() / SCALE_M).toFixed(3));
                    const updated = [...sensors];
                    updated[i] = { ...updated[i], x: nx, y: ny };
                    setSensors(updated);
                    setSelectedSensorIndex(i);
                  }}
                  onSelect={() => setSelectedSensorIndex(i)}
                />
              ))}
            </Layer>
          )}
        </GridCanvas>

        {isSketchingMode && (
          <ConstraintList 
            constraints={targetConstraints} 
            setConstraints={(v) => setCadFieldSafe(targetLayer, null, 'constraints', v)} 
            dimensions={targetDimensions} 
            setDimensions={(v) => setCadFieldSafe(targetLayer, null, 'dimensions', v)} 
            fixedPoints={cadData?.[targetLayer]?.fixedPoints}
            setFixedPoints={(v) => setCadFieldSafe(targetLayer, null, 'fixedPoints', v)}
          />
        )}
      </div>

      {/* ── Right: Config Panel ── */}
      <div className="config-panel">

        {/* Sensor Manager */}
        <div className="panel-section">
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            LiDAR Manager
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#00e5ff' }}>CAPACITY:</span>
              <input 
                type="number" 
                value={maxFields} 
                onChange={(e) => setMaxFields(parseInt(e.target.value) || 0)}
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #444', color: '#fff', width: 50, fontSize: '0.75rem', textAlign: 'center', borderRadius: 4, padding: '2px 0' }}
              />
            </div>
          </div>
          <div className="sensor-list">
            {sensors.map((s, i) => (
              <div key={i} className={`sensor-item ${selectedSensorIndex === i ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedSensorIndex(i);
                  setFormData(s);
                }}
                onDoubleClick={() => {
                  setSelectedSensorIndex(i);
                  setFormData(s);
                }}>
                {s.name}
                <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: 6 }}>({s.model})</span>
              </div>
            ))}
          </div>
          <div className="row-group">
            <button className="btn-blue" onClick={handleAddSensor}>+ Add</button>
            <button className="btn-red"  onClick={handleDeleteSensor}>– Del</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '8px', alignItems: 'center', marginTop: 8 }}>
            <span>Name</span>
            <input className="dark-input" value={formData.name}  
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              onKeyDown={e => e.key === 'Enter' && handleSaveSensor()}
              style={{ gridColumn: '2 / span 3' }} />
            {[['X (m)', 'x'], ['Y (m)', 'y'], ['Mount °', 'mount'], ['FOV °', 'fov'], ['Range (m)', 'r'], ['Dia (mm)', 'dia']].map(([lbl, key]) => (
              <React.Fragment key={key}>
                <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{lbl}</span>
                <input type="text" className="dark-input" value={formData[key]}
                  disabled={formData.locked && ['x', 'y', 'mount'].includes(key)}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })} 
                  onBlur={e => {
                    const parsed = parseFloat(e.target.value);
                    setFormData(prev => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSensor()} />
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={formData.flipped}
                onChange={e => setFormData({ ...formData, flipped: e.target.checked })} />
              Flipped (Upside Down)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={formData.locked || false}
                onChange={e => setFormData({ ...formData, locked: e.target.checked })} />
              <Lock size={14} style={{ opacity: formData.locked ? 1 : 0.5 }}/> Pose Lock
            </label>
          </div>

          <button className="primary-btn" onClick={handleSaveSensor} style={{ marginTop: 10 }}>Apply Changes</button>
        </div>

        {/* Geometry Loader */}
        <div className="panel-section">
          <div className="panel-title">Geometry Loader</div>
          {['FootPrint', 'Load1', 'Load2'].map((key) => (
            <div className="file-row" key={key} style={{ background: targetLayer === key ? 'rgba(26,58,92,0.3)' : 'transparent', borderRadius: 4, padding: 2 }}>
              <label className="btn-blue" style={{ textAlign: 'center', cursor: 'pointer', flex: 2, fontSize: '0.8rem', padding: '5px' }}>
                {geometry[key] ? `✓ ${key}` : key}
                <input type="file" style={{ display: 'none' }} accept=".dxf" onChange={e => handleUpload(e, key)} />
              </label>
              <button className="btn-blue" title="Draw manually" onClick={() => {
                 setTargetLayer(key);
                 setActiveTool('line');
                 setIsSketchingMode(true);
              }} style={{ padding: '0 8px' }}>
                <PencilLine size={14} />
              </button>
              <button className="btn-red" title="Clear both DXF and Sketch" onClick={() => {
                 handleClear(key);
                 setCadFieldSafe(key, null, 'sketches', []);
              }} style={{ padding: '0 8px' }}>✕</button>
            </div>
          ))}
        </div>

      </div>
    </div> {/* End of main content flex container */}
      <style>{`.dark-input{background:#1e1e1e;border:1px solid #555;color:white;padding:5px 7px;border-radius:4px;width:100%;box-sizing:border-box;font-size:0.85rem}`}</style>
    </div>
  );
};

export default Editor;
