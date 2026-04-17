import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileUp, Settings2, Activity, Database, Check, History, Layers, Sliders, Info, Zap, Calculator, Trash, Minus } from 'lucide-react';
import axios from 'axios';

const ModernInput = ({ value, onChange, placeholder, disabled, style = {} }) => (
  <input 
    type="text" 
    className="modern-input"
    value={value} 
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    style={{
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '0.85rem',
      width: '100%',
      textAlign: 'center',
      transition: 'all 0.2s',
      ...style
    }}
  />
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
    <div style={{ padding: 10, background: 'rgba(0,229,255,0.1)', borderRadius: 12, display: 'flex' }}>
      <Icon size={20} color="#00e5ff" />
    </div>
    <div>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '0.7rem', color: '#666', fontWeight: 500 }}>{subtitle}</p>
    </div>
  </div>
);

const Generation = ({ globals }) => {
  const { physics, setPhysics, evaluationCases, setEvaluationCases, genConfig, setGenConfig, genSync: sync, setGenSync: setSync, geometry, results, setResults, maxFields } = globals;

  const fileInputRef = useRef(null);
  const [activeCaseId, setActiveCaseId] = useState(null);

  // Handlers for Physics Config Grid
  const handlePhysicsChange = (load, key, value) => {
    setPhysics(prev => ({
      ...prev,
      [load]: { ...prev[load], [key]: value }
    }));
  };

  const handleGenConfigChange = (load, key, value) => {
    setGenConfig(prev => {
      const next = { ...prev };
      next[load] = { ...prev[load], [key]: value };
      if (sync && typeof value === 'boolean' && key !== 'enabled') {
        Object.keys(next).forEach(l => { next[l][key] = value; });
      }
      return next;
    });
  };

  const handlePopulateTable = () => {
    const newCases = [];
    let idCounter = 1;

    ['NoLoad', 'Load1', 'Load2'].forEach(load => {
      const c = genConfig[load];
      if (!c.enabled) return;

      const levels = parseInt(c.levels) || 1;
      const vMax = parseFloat(c.v) || 0;
      const vMin = parseFloat(c.minV) || 0;
      const vW   = parseFloat(c.w) || 0;
      const vRevMax = parseFloat(c.revV) || 0;

      // Actual step calculation: from minV to vMax in 'levels' segments
      const vRange = vMax - vMin;
      const vStep = levels > 0 ? vRange / levels : 0;
      
      const vRevRange = vRevMax - vMin;
      const vRevStep = levels > 0 ? vRevRange / levels : 0;

      // 1. Handle In-Place Rotation / Idle (v=0)
      if (c.idle) {
        newCases.push({ id: idCounter++, load, v: 0.0, w: 0.0, custom_dxf: null, type: 'std' });
      }
      if (c.ip) {
        newCases.push({ id: idCounter++, load, v: 0.0, w: vW, custom_dxf: null, type: 'std' });
        newCases.push({ id: idCounter++, load, v: 0.0, w: parseFloat((-vW).toFixed(2)), custom_dxf: null, type: 'std' });
      }

      // 2. Generate levels
      for (let i = 0; i <= levels; i++) {
        const currV = parseFloat((vMin + i * vStep).toFixed(2));
        const currRevV = parseFloat((vMin + i * vRevStep).toFixed(2));
        
        // Skip v=0 here if it was already handled by IP or if it's the start of the loop
        if (currV === 0 && c.ip) continue;

        if (c.fwd) {
          newCases.push({ id: idCounter++, load, v: currV, w: 0.0, custom_dxf: null, type: 'std' });
          if (c.rev) {
            newCases.push({ id: idCounter++, load, v: parseFloat((-currRevV).toFixed(2)), w: 0.0, custom_dxf: null, type: 'std' });
          }
        }
        if (c.turn) {
          const wVal = parseFloat(vW.toFixed(2));
          newCases.push({ id: idCounter++, load, v: currV, w: wVal, custom_dxf: null, type: 'std' });
          newCases.push({ id: idCounter++, load, v: currV, w: parseFloat((-wVal).toFixed(2)), custom_dxf: null, type: 'std' });
          
          if (c.rev) {
            newCases.push({ id: idCounter++, load, v: parseFloat((-currRevV).toFixed(2)), w: wVal, custom_dxf: null, type: 'std' });
            newCases.push({ id: idCounter++, load, v: parseFloat((-currRevV).toFixed(2)), w: parseFloat((-wVal).toFixed(2)), custom_dxf: null, type: 'std' });
          }
        }
      }
    });

    // Sort logically: Load Group -> Linear Velocity (v) -> Angular Velocity (w)
    newCases.sort((a, b) => {
      const loadOrder = { 'NoLoad': 0, 'Load1': 1, 'Load2': 2 };
      if (loadOrder[a.load] !== loadOrder[b.load]) return (loadOrder[a.load] ?? 3) - (loadOrder[b.load] ?? 3);
      if (Math.abs(a.v - b.v) > 0.001) return a.v - b.v;
      return a.w - b.w;
    });

    setEvaluationCases(newCases.map((c, i) => ({ ...c, id: i + 1 })));

    if (newCases.length > maxFields) {
      alert(`Warning: Generated ${newCases.length} cases, but your global LiDAR capacity is only ${maxFields}. You may not be able to map all of them to fieldsets.`);
    }
  };

  const handleScaleToHardware = () => {
    const activeLoadsCount = ['NoLoad', 'Load1', 'Load2'].filter(l => genConfig[l].enabled).length;
    if (activeLoadsCount === 0) return;
    
    const budgetPerLoad = Math.floor(maxFields / activeLoadsCount);

    ['NoLoad', 'Load1', 'Load2'].forEach(load => {
       if (!genConfig[load].enabled) return;
       const c = genConfig[load];
       // Modes per level: (fwd:1 + turn:2) * (rev:2 if rev else 1)
       const modesPerLevel = ((c.fwd ? 1 : 0) + (c.turn ? 2 : 0)) * (c.rev ? 2 : 1);
       if (modesPerLevel === 0) return;
       
       const ipCount = (c.ip ? 2 : 0) + (c.idle ? 1 : 0);
       
       const calculatedLevels = Math.floor((budgetPerLoad - ipCount) / modesPerLevel) - 1;
       handleGenConfigChange(load, 'levels', Math.max(0, calculatedLevels));
    });
    alert(`Generation levels adjusted to fit hardware capacity (${maxFields} fields).`);
  };

  const handleAddMiscCase = () => {
    if (evaluationCases.length >= maxFields) {
      if (!window.confirm(`Global hardware capacity reached (${maxFields}). Adding more cases might exceed your hardware limit. Proceed anyway?`)) {
        return;
      }
    }
    const nextId = evaluationCases.length > 0 ? Math.max(...evaluationCases.map(k => k.id)) + 1 : 1;
    setEvaluationCases([...evaluationCases, { id: nextId, load: 'Misc', v: 0.0, w: 0.0, custom_dxf: null, type: 'misc' }]);
  };

  const handleDeleteCase = (id) => {
    const filtered = evaluationCases.filter(k => k.id !== id);
    const idMap = {};
    const reindexed = filtered.map((k, index) => {
      const newId = index + 1;
      idMap[k.id] = newId;
      return { ...k, id: newId };
    });

    const newResults = {};
    Object.keys(results).forEach(oldIdKey => {
      const oldId = parseInt(oldIdKey);
      if (idMap[oldId]) newResults[idMap[oldId]] = results[oldId];
    });

    setEvaluationCases(reindexed);
    setResults(newResults);
  };

  const handleCaseChange = (id, field, value) => {
    setEvaluationCases(evaluationCases.map(k => {
      if (k.id !== id) return k;
      const updated = { ...k, [field]: value };
      if (field === 'load') {
        const isStd = ['NoLoad', 'Load1', 'Load2'].includes(value);
        updated.type = isStd ? 'std' : 'misc';
      }
      return updated;
    }));
  };

  const triggerFileUpload = (id) => {
    setActiveCaseId(id);
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || activeCaseId === null) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/upload_dxf', formData);
      if (res.data.wkt) {
        setEvaluationCases(evaluationCases.map(k => k.id === activeCaseId ? {
          ...k, custom_dxf_name: res.data.filename, custom_dxf: res.data.wkt
        } : k));
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      e.target.value = ''; setActiveCaseId(null);
    }
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 24, padding: 24, boxSizing: 'border-box', height: '100%', width: '100%', overflow: 'hidden' }}>
        
        {/* Left Config Panel */}
        <div style={{ flex: '0 0 450px', display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto', paddingRight: 4 }}>
          
          {/* Physics Config Card */}
          <div className="glass-card" style={{ padding: 24, borderRadius: 20, background: 'rgba(25,25,25,0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <SectionHeader icon={Activity} title="PHYSICS ENGINE" subtitle="Calculated Stopping Distance parameters" />
            
            <div style={{ background: 'rgba(0,229,255,0.05)', padding: '12px', borderRadius: 12, marginBottom: 20, fontFamily: 'monospace', color: '#00e5ff', fontSize: '0.75rem', textAlign: 'center', border: '1px dashed rgba(0,229,255,0.2)' }}>
              D = v·Tᵣ + v²/2a + Dₛ
            </div>

            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
              <thead>
                <tr style={{ fontSize: '0.65rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ textAlign: 'left', fontWeight: 800, paddingBottom: 8 }}>Param</th>
                  <th style={{ textAlign: 'center', paddingBottom: 8 }}>No Load</th>
                  <th style={{ textAlign: 'center', paddingBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={physics.Load1.enabled} disabled={!geometry.Load1}
                        onChange={e => handlePhysicsChange('Load1', 'enabled', e.target.checked)}
                        style={{ accentColor: '#00e5ff' }} />
                      Load 1
                    </label>
                  </th>
                  <th style={{ textAlign: 'center', paddingBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={physics.Load2.enabled} disabled={!geometry.Load2}
                        onChange={e => handlePhysicsChange('Load2', 'enabled', e.target.checked)}
                        style={{ accentColor: '#00e5ff' }} />
                      Load 2
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Numeric rows */}
                {[
                  { lbl: 'Reaction Tr (s)', k: 'tr' },
                  { lbl: 'Decel a (m/s²)', k: 'ac' },
                  { lbl: 'Safety Ds (m)', k: 'ds' },
                  { lbl: 'Pad Offset (m)', k: 'pad' },
                  { lbl: 'Smooth (m)', k: 'smooth' },
                  { lbl: 'Lateral Scale', k: 'lat_scale' },
                ].map(row => (
                  <tr key={row.k}>
                    <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>{row.lbl}</td>
                    {['NoLoad', 'Load1', 'Load2'].map(load => (
                      <td key={load} style={{ padding: '0 4px' }}>
                        <ModernInput
                          value={physics[load][row.k]}
                          onChange={e => handlePhysicsChange(load, row.k, e.target.value)}
                          disabled={load !== 'NoLoad' && !physics[load].enabled}
                          style={{ opacity: (load !== 'NoLoad' && !physics[load].enabled) ? 0.2 : 1 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Divider */}
                <tr><td colSpan="4"><div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '6px 0' }} /></td></tr>
                {/* String/Dropdown rows */}
                <tr>
                  <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>Field Method</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => (
                    <td key={load} style={{ padding: '0 4px' }}>
                      <select 
                        className="modern-select" 
                        value={physics[load].field_method || 'union'}
                        onChange={e => handlePhysicsChange(load, 'field_method', e.target.value)}
                        disabled={load !== 'NoLoad' && !physics[load].enabled}
                        style={{ opacity: (load !== 'NoLoad' && !physics[load].enabled) ? 0.2 : 1, fontSize: '0.7rem' }}
                      >
                        <option value="union">Sweep Union</option>
                        <option value="hull">Convex Hull</option>
                        <option value="hybrid">Hybrid (Auto-Hull)</option>
                      </select>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>Hull Threshold (m)</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => (
                    <td key={load} style={{ padding: '0 4px' }}>
                      <ModernInput
                        value={physics[load].hull_threshold || 0.5}
                        onChange={e => handlePhysicsChange(load, 'hull_threshold', e.target.value)}
                        disabled={load !== 'NoLoad' && !physics[load].enabled}
                        style={{ opacity: (load !== 'NoLoad' && !physics[load].enabled) ? 0.2 : 1 }}
                      />
                    </td>
                  ))}
                </tr>
                {/* Checkbox rows */}
                {[
                  { lbl: 'Shadow Zones', k: 'shadow', naFor: 'NoLoad' },
                  { lbl: 'Include Load Shape', k: 'include_load', naFor: 'NoLoad' },
                  { lbl: 'Patch Notches', k: 'patch_notch', naFor: null },
                ].map(row => (
                  <tr key={row.k}>
                    <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>{row.lbl}</td>
                    {['NoLoad', 'Load1', 'Load2'].map(load => {
                      const isNA = row.naFor && load === row.naFor;
                      const disabled = isNA || (load !== 'NoLoad' && !physics[load].enabled);
                      return (
                        <td key={load} style={{ textAlign: 'center', padding: '4px' }}>
                          {isNA ? (
                            <span style={{ color: '#333', fontSize: '0.65rem' }}>N/A</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={physics[load][row.k]}
                              onChange={e => handlePhysicsChange(load, row.k, e.target.checked)}
                              disabled={disabled}
                              style={{ accentColor: '#00e5ff', width: 14, height: 14, opacity: disabled ? 0.2 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Matrix Generator Card */}
          <div className="glass-card" style={{ padding: 24, borderRadius: 20, background: 'rgba(25,25,25,0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <SectionHeader icon={Sliders} title="MATRIX GENERATOR" subtitle="Auto-populate evaluation cases" />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: 700 }}>SYNC COLUMNS</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: sync ? '#00e5ff' : '#888', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)}
                  style={{ accentColor: '#00e5ff', width: 14, height: 14, cursor: 'pointer' }} />
                Sync All
              </label>
            </div>

            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
              <thead>
                <tr style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ textAlign: 'left', paddingBottom: 8 }}>Param</th>
                  <th style={{ textAlign: 'center', paddingBottom: 8 }}>No Load</th>
                  <th style={{ textAlign: 'center', paddingBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={genConfig.Load1.enabled} disabled={!geometry.Load1}
                        onChange={e => handleGenConfigChange('Load1', 'enabled', e.target.checked)}
                        style={{ accentColor: '#00e5ff' }} />
                      Load 1
                    </label>
                  </th>
                  <th style={{ textAlign: 'center', paddingBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={genConfig.Load2.enabled} disabled={!geometry.Load2}
                        onChange={e => handleGenConfigChange('Load2', 'enabled', e.target.checked)}
                        style={{ accentColor: '#00e5ff' }} />
                      Load 2
                    </label>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Numeric params */}
                {[
                  { lbl: 'Intensity Levels', k: 'levels', icon: Database },
                  { lbl: 'Max Fwd v (m/s)', k: 'v', icon: Zap },
                  { lbl: 'Max Rev v (m/s)', k: 'revV', icon: History },
                  { lbl: 'Min v (m/s)', k: 'minV', icon: Minus },
                  { lbl: 'Max Ang w (rad/s)', k: 'w', icon: Settings2 },
                ].map(row => (
                  <tr key={row.k}>
                    <td style={{ color: '#ccc', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, height: 36 }}>
                      <row.icon size={12} color="#666" /> {row.lbl}
                    </td>
                    {['NoLoad', 'Load1', 'Load2'].map(load => (
                      <td key={load} style={{ padding: '0 4px' }}>
                        <ModernInput
                          value={genConfig[load][row.k]}
                          onChange={e => handleGenConfigChange(load, row.k, e.target.value)}
                          disabled={load !== 'NoLoad' && !genConfig[load].enabled}
                          style={{ opacity: (load !== 'NoLoad' && !genConfig[load].enabled) ? 0.2 : 1 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Derived Params */}
                <tr>
                  <td style={{ color: '#00e5ff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, height: 32 }}>
                    <Activity size={12} /> EFFECTIVE STEP
                  </td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => {
                    const c = genConfig[load];
                    const vRange = (parseFloat(c.v) || 0) - (parseFloat(c.minV) || 0);
                    const step = (parseInt(c.levels) || 1) > 0 ? vRange / (parseInt(c.levels) || 1) : 0;
                    return (
                      <td key={load} style={{ textAlign: 'center', color: '#888', fontSize: '0.7rem', fontWeight: 700 }}>
                         {c.enabled ? `${step.toFixed(3)} m/s` : '---'}
                      </td>
                    );
                  })}
                </tr>
                {/* Divider */}
                <tr><td colSpan="4"><div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '6px 0' }} /></td></tr>
                <tr>
                  <td colSpan="4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 }}>
                    <span style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Motion Types</span>
                    <button onClick={handleScaleToHardware} style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)', padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer' }}>
                      SCALE TO HARDWARE
                    </button>
                  </td>
                </tr>
                {/* Motion checkboxes */}
                {[
                  { lbl: 'Forward Linear', k: 'fwd' },
                  { lbl: 'Curve / Turn', k: 'turn' },
                  { lbl: 'In-place Rotate', k: 'ip' },
                  { lbl: 'Idle (Stop)', k: 'idle' },
                  { lbl: 'Reverse', k: 'rev' },
                ].map(row => (
                  <tr key={row.k}>
                    <td style={{ color: '#ccc', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>{row.lbl}</td>
                    {['NoLoad', 'Load1', 'Load2'].map(load => {
                      const disabled = load !== 'NoLoad' && !genConfig[load].enabled;
                      return (
                        <td key={load} style={{ textAlign: 'center', padding: '4px' }}>
                          <input
                            type="checkbox"
                            checked={genConfig[load][row.k]}
                            onChange={e => handleGenConfigChange(load, row.k, e.target.checked)}
                            disabled={disabled}
                            style={{ accentColor: '#00e5ff', width: 14, height: 14, opacity: disabled ? 0.2 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
               <button onClick={handlePopulateTable} className="action-btn-primary" style={{ gridColumn: 'span 2' }}>
                 <Calculator size={16} /> GENERATE ALL CASES
               </button>
               <button onClick={handleAddMiscCase} className="action-btn-secondary">
                 <Plus size={16} /> ADD MISC
               </button>
               <button onClick={() => setEvaluationCases([])} className="action-btn-danger">
                 <Trash2 size={16} /> CLEAR
               </button>
            </div>
          </div>
        </div>

        {/* Right Table Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(20,20,20,0.4)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ padding: 10, background: 'rgba(168,85,247,0.1)', borderRadius: 12 }}>
                <Layers size={22} color="#a855f7" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>EVALUATION MATRIX</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>{evaluationCases.length} total cases defined</p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
                <tr style={{ fontSize: '0.65rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '16px 12px', textAlign: 'left' }}>Load / Payload</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>Vel (v)</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>Ang (w)</th>
                  <th style={{ padding: '16px 12px', textAlign: 'center' }}>Custom DXF</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluationCases.map((k) => (
                  <tr key={k.id} className="case-row">
                    <td style={{ padding: '12px', color: '#fff', fontSize: '0.85rem', fontWeight: 800, background: 'rgba(255,255,255,0.03)', borderRadius: '12px 0 0 12px' }}>#{k.id}</td>
                    <td style={{ padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.6rem', background: k.type==='misc'?'rgba(168,85,247,0.2)':'rgba(59,130,246,0.2)', color: k.type==='misc'?'#d8b4fe':'#93c5fd', padding: '4px 8px', borderRadius: 6, fontWeight: 700, letterSpacing: '0.05em' }}>
                        {k.type?.toUpperCase() || 'STD'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <select className="modern-select" value={k.load} onChange={e => handleCaseChange(k.id, 'load', e.target.value)}>
                        <option value="NoLoad">No Load</option>
                        <option value="Load1">Load 1 (Main)</option>
                        <option value="Load2">Load 2 (Alt)</option>
                        <option value="Misc">Miscellaneous</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <ModernInput value={k.v} onChange={e => handleCaseChange(k.id, 'v', e.target.value)} style={{ width: 70, margin: '0 auto' }} />
                    </td>
                    <td style={{ padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                      <ModernInput value={k.w} onChange={e => handleCaseChange(k.id, 'w', e.target.value)} style={{ width: 70, margin: '0 auto' }} />
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.03)' }}>
                       <button onClick={() => triggerFileUpload(k.id)} className="dxf-btn" style={{ background: k.custom_dxf ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: k.custom_dxf ? '#4ade80' : '#888', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                         <FileUp size={12} /> {k.custom_dxf_name || 'Upload'}
                       </button>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', background: 'rgba(255,255,255,0.03)', borderRadius: '0 12px 12px 0' }}>
                      <button onClick={() => handleDeleteCase(k.id)} className="delete-icon-btn">
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {evaluationCases.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, color: '#444' }}>
                <History size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No evaluation cases yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Generate a matrix or add cases manually</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".dxf" />

      <style>{`
        .modern-select {
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          width: 100%;
          outline: none;
        }
        .action-btn-primary {
          background: linear-gradient(135deg, #224A25 0%, #1e3a20 100%);
          color: white; border: none; padding: 12px; border-radius: 12px;
          font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: all 0.2s;
        }
        .action-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(34,74,37,0.3); }
        .action-btn-secondary {
          background: #252525; color: #fff; border: 1px solid #333; padding: 10px; border-radius: 12px;
          font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
        }
        .action-btn-secondary:hover { background: #333; }
        .action-btn-danger {
          background: rgba(220,38,38,0.1); color: #ef4444; border: 1px solid rgba(220,38,38,0.2); padding: 10px; border-radius: 12px;
          font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
        }
        .action-btn-danger:hover { background: rgba(220,38,38,0.2); }
        .delete-icon-btn {
          background: none; border: none; color: #444; cursor: pointer; padding: 8px; border-radius: 8px; transition: all 0.2s;
        }
        .delete-icon-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; }
        .toggle-checkbox:before {
          content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px;
          background: #fff; borderRadius: 50%; transition: all 0.3s;
          transform: translateX(${sync ? '16px' : '0'});
        }
        .case-row { transition: transform 0.2s; }
        .case-row:hover { transform: scale(1.002); }
      `}</style>
    </div>
  );
};

export default Generation;
