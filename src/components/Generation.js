import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileUp } from 'lucide-react';
import axios from 'axios';

const Generation = ({ globals }) => {
  const { physics, setPhysics, evaluationCases, setEvaluationCases, genConfig, setGenConfig, genSync: sync, setGenSync: setSync, geometry } = globals;

  const fileInputRef = useRef(null);
  const [activeCaseId, setActiveCaseId] = useState(null);

  // Handlers for Physics Config Grid
  const handlePhysicsChange = (load, key, value) => {
    // If it's a number-like field and the value is empty string, allow it in state for UX
    setPhysics(prev => ({
      ...prev,
      [load]: { ...prev[load], [key]: value }
    }));
  };

  const handleGenConfigChange = (load, key, value) => {
    setGenConfig(prev => {
      const next = { ...prev };
      next[load] = { ...prev[load], [key]: value };
      
      // If sync is on for checkboxes, apply to all loads
      if (sync && typeof value === 'boolean' && key !== 'enabled') {
        Object.keys(next).forEach(l => {
          next[l][key] = value;
        });
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

      let rem = c.cnt;
      
      // In-Place bounds
      if (c.ip && rem > 0) {
        newCases.push({ id: idCounter++, load, v: 0.0, w: c.w, custom_dxf: null });
        rem--;
        if (rem > 0) {
          newCases.push({ id: idCounter++, load, v: 0.0, w: -c.w, custom_dxf: null });
          rem--;
        }
      }

      const modesPerLevel = ((c.fwd ? 1 : 0) + (c.turn ? 2 : 0)) * (c.rev ? 2 : 1);
      if (modesPerLevel === 0 || rem <= 0) return;

      const steps = Math.ceil(rem / modesPerLevel);
      
      const vRange = c.v - c.minV;
      const vStep = steps > 1 ? vRange / (steps - 1) : 0;

      const revRange = c.revV - c.minV;
      const revStep = steps > 1 ? revRange / (steps - 1) : 0;

      let currV = c.minV;
      let currRevV = c.minV;

      for (let i = 0; i < steps; i++) {
        if (c.fwd && rem > 0) {
          newCases.push({ id: idCounter++, load, v: parseFloat(currV.toFixed(2)), w: 0.0, custom_dxf: null, type: 'std' });
          rem--;
          if (c.rev && rem > 0) {
            newCases.push({ id: idCounter++, load, v: parseFloat((-currRevV).toFixed(2)), w: 0.0, custom_dxf: null, type: 'std' });
            rem--;
          }
        }
        if (c.turn && rem > 0) {
          newCases.push({ id: idCounter++, load, v: parseFloat(currV.toFixed(2)), w: parseFloat(c.w.toFixed(2)), custom_dxf: null, type: 'std' });
          rem--;
          if (c.rev && rem > 0) {
            newCases.push({ id: idCounter++, load, v: parseFloat((-currRevV).toFixed(2)), w: parseFloat(c.w.toFixed(2)), custom_dxf: null, type: 'std' });
            rem--;
          }
        }
        if (c.turn && rem > 0) {
          newCases.push({ id: idCounter++, load, v: parseFloat(currV.toFixed(2)), w: parseFloat(-c.w.toFixed(2)), custom_dxf: null, type: 'std' });
          rem--;
          if (c.rev && rem > 0) {
            newCases.push({ id: idCounter++, load, v: parseFloat((-currRevV).toFixed(2)), w: parseFloat(-c.w.toFixed(2)), custom_dxf: null, type: 'std' });
            rem--;
          }
        }
        currV += vStep;
        currRevV += revStep;
      }
    });

    setEvaluationCases(newCases);
  };

  const handleAddMiscCase = () => {
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

    // 3. Migrate the results state to match new IDs
    const { results, setResults } = globals;
    const newResults = {};
    Object.keys(results).forEach(oldIdKey => {
      const oldId = parseInt(oldIdKey);
      if (idMap[oldId]) {
        newResults[idMap[oldId]] = results[oldId];
      }
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
          ...k,
          custom_dxf_name: res.data.filename,
          custom_dxf: res.data.wkt
        } : k));
        alert('Custom DXF uploaded for Case #' + activeCaseId);
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      e.target.value = '';
      setActiveCaseId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', padding: '20px', boxSizing: 'border-box', height: '100%', width: '100%', overflow: 'hidden' }}>
      
      {/* Column 1: Configs */}
      <div style={{ flex: '1 0 320px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {/* 1. Physics Configuration Grid */}
        <div className="settings-panel">
          <h2 className="panel-title" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Physics Configuration</h2>
          <div style={{ background: '#111', padding: '10px', borderRadius: '5px', marginBottom: 15, fontFamily: 'monospace', color: 'cyan', textAlign: 'center' }}>
            D = v*Tr + v²/2a + Ds
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '5px' }}>Param</th>
                <th style={{ padding: '5px' }}>NoLoad</th>
                <th style={{ padding: '5px' }}><input type="checkbox" checked={physics.Load1.enabled} disabled={!geometry.Load1} onChange={e => handlePhysicsChange('Load1', 'enabled', e.target.checked)}/> Load1</th>
                <th style={{ padding: '5px' }}><input type="checkbox" checked={physics.Load2.enabled} disabled={!geometry.Load2} onChange={e => handlePhysicsChange('Load2', 'enabled', e.target.checked)}/> Load2</th>
              </tr>
            </thead>
            <tbody>
              {[
                { lbl: 'Tr (s)', k: 'tr', type: 'number', step: 0.05 },
                { lbl: 'a (m/s²)', k: 'ac', type: 'number', step: 0.1 },
                { lbl: 'Ds (m)', k: 'ds', type: 'number', step: 0.05 },
                { lbl: 'Pad (m)', k: 'pad', type: 'number', step: 0.01 },
                { lbl: 'Smooth (m)', k: 'smooth', type: 'number', step: 0.01 },
                { lbl: 'Lateral Scale', k: 'lat_scale', type: 'number', step: 0.1 },
                { lbl: 'Shadow', k: 'shadow', type: 'checkbox' },
                { lbl: 'Inc Shape', k: 'include_load', type: 'checkbox' },
                { lbl: 'Patch Notches', k: 'patch_notch', type: 'checkbox' },
              ].map(row => (
                <tr key={row.k}>
                  <td style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #333' }}>{row.lbl}</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => (
                    <td key={load} style={{ padding: '5px', borderBottom: '1px solid #333' }}>
                      {row.type === 'checkbox' ? (
                        ((row.k === 'shadow' || row.k === 'include_load') && load === 'NoLoad') ? (
                          <span style={{ color: '#444', fontSize: '0.7rem' }}>N/A</span>
                        ) : (
                          <input 
                            type="checkbox"
                            checked={physics[load][row.k]} 
                            onChange={e => handlePhysicsChange(load, row.k, e.target.checked)}
                            disabled={load !== 'NoLoad' && !physics[load].enabled}
                            style={{ opacity: (load!=='NoLoad' && !physics[load].enabled) ? 0.3 : 1 }}
                          />
                        )
                      ) : (
                        <input 
                          type="text" className="dark-input" 
                          value={physics[load][row.k]} 
                          onChange={e => handlePhysicsChange(load, row.k, e.target.value)}
                          onBlur={e => {
                             if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                                handlePhysicsChange(load, row.k, 0);
                             } else {
                                handlePhysicsChange(load, row.k, parseFloat(e.target.value));
                             }
                          }}
                          disabled={load !== 'NoLoad' && !physics[load].enabled}
                          style={{ opacity: (load!=='NoLoad' && !physics[load].enabled) ? 0.3 : 1, width: '100%' }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. Evaluation Case Generation */}
        <div className="settings-panel">
          <h2 className="panel-title" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Evaluation Case Generation</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '5px' }}>Param</th>
                <th style={{ padding: '5px' }}>NoLoad</th>
                <th style={{ padding: '5px' }}><input type="checkbox" checked={genConfig.Load1.enabled} disabled={!geometry.Load1} onChange={e => handleGenConfigChange('Load1', 'enabled', e.target.checked)}/> Load1</th>
                <th style={{ padding: '5px' }}><input type="checkbox" checked={genConfig.Load2.enabled} disabled={!geometry.Load2} onChange={e => handleGenConfigChange('Load2', 'enabled', e.target.checked)}/> Load2</th>
              </tr>
            </thead>
            <tbody>
              {[
                { lbl: 'Count', k: 'cnt', type: 'number' },
                { lbl: 'Max Fwd (m/s)', k: 'v', type: 'number' },
                { lbl: 'Max Rev (m/s)', k: 'revV', type: 'number' },
                { lbl: 'Min V (m/s)', k: 'minV', type: 'number' },
                { lbl: 'Max W (rad/s)', k: 'w', type: 'number' },
              ].map(row => (
                <tr key={row.k}>
                  <td style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #333' }}>{row.lbl}</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => (
                    <td key={load} style={{ padding: '5px', borderBottom: '1px solid #333' }}>
                      <input 
                        type="text" className="dark-input" 
                        id={`gen-${load}-${row.k}`}
                        value={genConfig[load][row.k]} 
                        onChange={e => handleGenConfigChange(load, row.k, e.target.value)}
                        onBlur={e => {
                           if (e.target.value === '' || isNaN(parseFloat(e.target.value))) {
                              handleGenConfigChange(load, row.k, 0);
                           } else {
                              handleGenConfigChange(load, row.k, parseFloat(e.target.value));
                           }
                        }}
                        disabled={load !== 'NoLoad' && !genConfig[load].enabled}
                        style={{ opacity: (load!=='NoLoad' && !genConfig[load].enabled) ? 0.3 : 1, width: '100%', background: '#222', border: 'none', color: 'white', textAlign: 'center' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr><td colSpan="4"><hr style={{borderColor: '#444', margin: '10px 0'}}/></td></tr>
              <tr>
                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>Motions</td>
                <td colSpan="3" style={{ textAlign: 'right' }}>
                  <label><input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)}/> Sync Columns</label>
                </td>
              </tr>
              {[
                { lbl: 'Fwd Linear', k: 'fwd' },
                { lbl: 'Curve Turn', k: 'turn' },
                { lbl: 'Inplace', k: 'ip' },
                { lbl: 'Reverse', k: 'rev' },
              ].map(row => (
                <tr key={row.k}>
                  <td style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #333' }}>{row.lbl}</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => (
                    <td key={load} style={{ padding: '5px', borderBottom: '1px solid #333' }}>
                      <input 
                        type="checkbox"
                        checked={genConfig[load][row.k]} 
                        onChange={e => handleGenConfigChange(load, row.k, e.target.checked)}
                        disabled={load !== 'NoLoad' && !genConfig[load].enabled}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <button className="primary-btn" onClick={handlePopulateTable} style={{ width: '100%', marginTop: '15px', padding: '10px', backgroundColor: '#223A5E' }}>
            Auto-Populate Evaluation Table
          </button>
          <button className="primary-btn" onClick={handleAddMiscCase} style={{ width: '100%', marginTop: '10px', padding: '10px', backgroundColor: '#2a4a5c' }}>
            + Add Misc Case
          </button>
        </div>
      </div>

      {/* Column 2: Evaluation Cases */}
      <div style={{ flex: 2.5, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".dxf" />
        
        <div className="settings-panel" style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="panel-title" style={{ fontSize: '1.5rem', margin: 0 }}>Evaluation Cases Table</h2>
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Optional secondary controls if needed */}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #444', backgroundColor: '#222' }}>
                  <th style={{ padding: '10px' }}>ID</th>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>Load</th>
                  <th style={{ padding: '10px' }}>Vel v (m/s)</th>
                  <th style={{ padding: '10px' }}>Ang w (rad/s)</th>
                  <th style={{ padding: '10px' }}>Custom (Browse DXF)</th>
                  <th style={{ padding: '10px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluationCases.map((k) => (
                  <tr key={k.id} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '10px' }}>{k.id}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '0.7rem', background: k.type==='misc'?'#4a148c':'#1a237e', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                        {k.type || 'std'}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <select className="dark-input" value={k.load} onChange={e => handleCaseChange(k.id, 'load', e.target.value)}>
                        <option value="NoLoad">NoLoad</option>
                        <option value="Load1">Load 1</option>
                        <option value="Load2">Load 2</option>
                        <option value="Misc">Misc</option>
                      </select>
                    </td>
                  <td style={{ padding: '10px' }}>
                    <input type="text" className="dark-input" value={k.v} 
                      onChange={e => handleCaseChange(k.id, 'v', e.target.value)} 
                      onBlur={e => {
                        if (e.target.value === '' || isNaN(parseFloat(e.target.value))) handleCaseChange(k.id, 'v', 0);
                        else handleCaseChange(k.id, 'v', parseFloat(e.target.value));
                      }}
                      style={{ width: '80px' }}
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input type="text" className="dark-input" value={k.w} 
                      onChange={e => handleCaseChange(k.id, 'w', e.target.value)} 
                      onBlur={e => {
                        if (e.target.value === '' || isNaN(parseFloat(e.target.value))) handleCaseChange(k.id, 'w', 0);
                        else handleCaseChange(k.id, 'w', parseFloat(e.target.value));
                      }}
                      style={{ width: '80px' }}
                    />
                  </td>
                  <td style={{ padding: '10px', color: '#888', cursor: 'pointer', textDecoration: 'underline' }} 
                      onClick={() => triggerFileUpload(k.id)}>
                     {k.custom_dxf_name ? k.custom_dxf_name : '<none>'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button className="btn-red" onClick={() => handleDeleteCase(k.id)} style={{ padding: '6px' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {evaluationCases.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No evaluation cases defined.</div>
          )}
        </div>
      </div>

      <style>{`
        .dark-input {
          background-color: #1a1a1a;
          border: 1px solid #444;
          color: white;
          padding: 6px;
          border-radius: 4px;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default Generation;
