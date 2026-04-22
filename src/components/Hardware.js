import React, { useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash, 
  Download, 
  Stack, 
  DownloadSimple, 
  FileArchive, 
  ShieldCheck, 
  ArrowRight,
  CaretRight,
  Gear,
  Warning
} from '@phosphor-icons/react';

const Hardware = ({ globals }) => {
  const { evaluationCases, results, fieldsets, setFieldsets, sensors, geometry, physics, maxFields, setMaxFields } = globals;
  const [selectedFsIndex, setSelectedFsIndex] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const totalFields = fieldsets.reduce((sum, fs) => sum + (fs.fields?.length || 0), 0);
  const isAtCapacity = totalFields >= maxFields;

  // --- Fieldset Actions ---
  const addFs = () => {
    if (isAtCapacity) {
      alert(`Hardware capacity reached (${maxFields} fields). Cannot add more fieldsets.`);
      return;
    }
    const newFs = { name: `Set ${fieldsets.length + 1}`, fields: [] };
    setFieldsets([...fieldsets, newFs]);
    setSelectedFsIndex(fieldsets.length);
  };

  const delFs = (idx) => {
    const updated = fieldsets.filter((_, i) => i !== idx);
    setFieldsets(updated);
    if (selectedFsIndex === idx) setSelectedFsIndex(null);
    else if (selectedFsIndex > idx) setSelectedFsIndex(selectedFsIndex - 1);
  };

  const updateFsName = (idx, name) => {
    const updated = [...fieldsets];
    updated[idx].name = name;
    setFieldsets(updated);
  };

  // --- Field Actions ---
  const addField = (fsIdx) => {
    if (isAtCapacity) {
      alert(`Hardware capacity reached (${maxFields} fields). Cannot add more fields.`);
      return;
    }
    const updated = [...fieldsets];
    const nextNum = updated[fsIdx].fields.length + 1;
    updated[fsIdx].fields.push({ name: `Field ${nextNum}`, caseId: evaluationCases[0]?.id || '' });
    setFieldsets(updated);
  };

  const delField = (fsIdx, fIdx) => {
    const updated = [...fieldsets];
    updated[fsIdx].fields = updated[fsIdx].fields.filter((_, i) => i !== fIdx);
    setFieldsets(updated);
  };

  const updateField = (fsIdx, fIdx, key, val) => {
    const updated = [...fieldsets];
    updated[fsIdx].fields[fIdx][key] = val;
    setFieldsets(updated);
  };

  // --- Auto-Gen Logic ---
  const autoGen = () => {
    if (evaluationCases.length > maxFields) {
      alert(`The number of evaluation cases (${evaluationCases.length}) exceeds the hardware field capacity (${maxFields}). Some cases will be skipped.`);
    }

    const newFieldsets = [];
    // Sequential logic: exactly 2 fields per set from the sorted evaluation cases
    for (let i = 0; i < Math.min(evaluationCases.length, maxFields); i += 2) {
      const pair = evaluationCases.slice(i, i + 2);
      // Ensure we don't exceed maxFields even in a pair
      const validPair = pair.filter((_, idx) => (i + idx) < maxFields);
      const fields = validPair.map(c => ({
        name: `${c.load}_${c.v},${c.w}`,
        caseId: c.id
      }));
      newFieldsets.push({ name: `Set ${newFieldsets.length + 1}`, fields });
    }
    setFieldsets(newFieldsets);
  };

  // --- Export Actions ---
  const handleExportSick = async (sensorIndex) => {
    if (fieldsets.length === 0) { alert("No fieldsets defined."); return; }
    setIsExporting(true);
    try {
      const sensor = sensors[sensorIndex];
      const strippedResults = {};
      Object.keys(results).forEach(k => {
        const r = results[k];
        if (r) {
          strippedResults[k] = {
            ignored_wkt: r.ignored_wkt,
            lidars: (r.lidars || []).map(l => ({ name: l.name, clip_wkt: l.clip_wkt }))
          };
        }
      });
      const payload = { sensor, fieldsets, results: strippedResults, geometry, physics, evaluationCases };
      const res = await axios.post('/api/export_sick', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sensor.name}.zip`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.error || err.message));
    } finally { setIsExporting(false); }
  };

  const handleExportLeuze = async (sensorIndex) => {
    setIsExporting(true);
    try {
      const sensor = sensors[sensorIndex];
      const strippedResults = {};
      Object.keys(results).forEach(k => {
        const r = results[k];
        if (r) {
          strippedResults[k] = {
            lidars: (r.lidars || [])
              .filter(l => l.name === sensor.name)
              .map(l => ({ 
                name: l.name, 
                clip_wkt: l.clip_wkt,
                origin: l.origin,
                mount: l.mount
              }))
          };
        }
      });
      const payload = { sensor, results: strippedResults, evaluationCases };
      const res = await axios.post('/api/export_leuze', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sensor.name}_leuze_csvs.zip`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.error || err.message));
    } finally { setIsExporting(false); }
  };

  return (
    <div className="hardware-container">
      
      {/* --- Left Panes: Fieldsets --- */}
      <div className="hardware-pane" style={{ flex: '0 0 280px' }}>
        <div className="hardware-header">
          <h3>Fieldsets</h3>
          <button onClick={addFs} className="icon-btn" title="Add New Set" disabled={isAtCapacity} style={{ opacity: isAtCapacity ? 0.3 : 1 }}>
            <Plus size={18} weight="bold" />
          </button>
        </div>
        
        <div className="hardware-list">
          {fieldsets.map((fs, i) => (
            <div key={i} className={`hw-item ${selectedFsIndex === i ? 'selected' : ''}`} onClick={() => setSelectedFsIndex(i)}>
              <Stack size={14} weight="bold" style={{ color: selectedFsIndex === i ? '#2196F3' : '#666' }} />
              <input value={fs.name} onChange={(e) => updateFsName(i, e.target.value)} 
                     onClick={(e) => e.stopPropagation()}
                     className="hw-input"
                     style={{ background: 'transparent', border: 'none', padding: 0 }} />
              <button onClick={(e) => { e.stopPropagation(); delFs(i); }} className="icon-btn red">
                <Trash size={14} weight="bold" />
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px', borderTop: '2px solid #333' }}>
          <button onClick={autoGen} className="primary-btn" style={{ width: '100%', padding: '10px' }}>
            <Gear size={16} weight="bold" /> Auto-Gen Fieldsets
          </button>
        </div>
      </div>

      {/* --- Center Pane: Fields in Set --- */}
      <div className="hardware-pane" style={{ flex: 1, borderLeft: 'none' }}>
        {selectedFsIndex !== null ? (
          <>
            <div className="hardware-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#555', fontSize: '0.8rem' }}>FIELDSET /</span>
                <span style={{ fontWeight: 'bold' }}>{fieldsets[selectedFsIndex].name}</span>
              </div>
              <button onClick={() => addField(selectedFsIndex)} className="primary-btn" disabled={isAtCapacity} style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: isAtCapacity ? 0.5 : 1 }}>
                <Plus size={14} weight="bold" /> Add Field
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 24px' }}>
              <table className="hw-table" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Field Name</th>
                    <th style={{ width: '55%' }}>Source Case</th>
                    <th style={{ width: '10%', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fieldsets[selectedFsIndex].fields.map((f, i) => (
                    <tr key={i}>
                      <td style={{ paddingRight: '12px' }}>
                        <input value={f.name} readOnly 
                               style={{ opacity: 0.7, cursor: 'not-allowed' }}
                               className="hw-input" />
                      </td>
                      <td style={{ paddingRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <select value={f.caseId} onChange={(e) => updateField(selectedFsIndex, i, 'caseId', Number(e.target.value))}
                                  className="hw-input" style={{ flex: 1, height: '38px', padding: '0 12px' }}>
                            {evaluationCases.map(k => (
                              <option key={k.id} value={k.id}>Case {k.id}: v={k.v} w={k.w} ({k.load})</option>
                            ))}
                          </select>
                          {!results[f.caseId] && (
                            <div title="Missing calculated results" style={{ color: '#ff9800', display: 'flex', alignItems: 'center' }}>
                              <Warning size={16} weight="bold" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => delField(selectedFsIndex, i)} className="icon-btn red" style={{ marginLeft: 'auto' }}>
                          <Trash size={16} weight="bold" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="hardware-header">
               {/* Spacer header to keep horizontal borders aligned */}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
              <ShieldCheck size={48} weight="bold" style={{ marginBottom: 15, opacity: 0.1 }} />
              <p style={{ fontSize: '0.85rem' }}>Select a fieldset from the left to configure.</p>
            </div>
          </>
        )}
      </div>

      {/* --- Right Pane: Export Actions --- */}
      <div className="hardware-pane" style={{ flex: '0 0 320px', borderRight: 'none', background: '#0a0a0a' }}>
        <div className="hardware-header" style={{ background: '#0d0d0d' }}>
          <h3>Hardware Export</h3>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          {sensors.length === 0 ? (
            <div style={{ color: '#444', textAlign: 'center', marginTop: 40 }}>
              <Download size={32} weight="bold" style={{ marginBottom: 16, opacity: 0.3 }} />
              <p style={{ fontSize: '0.8rem' }}>No LiDARs configured in Editor tab.</p>
            </div>
          ) : (
            sensors.map((s, i) => (
              <div key={i} className="hw-export-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#2196F3' }}>{s.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>{s.model}</div>
                  </div>
                  <Download size={20} weight="bold" color="#333" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={() => handleExportSick(i)} disabled={isExporting} className="primary-btn" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DownloadSimple size={16} weight="bold" />
                      <span>{s.model.includes('Sick') ? 'Export SICK Config' : 'Export XML'}</span>
                    </div>
                    <CaretRight size={14} weight="bold" opacity={0.5} />
                  </button>
                  <button onClick={() => handleExportLeuze(i)} disabled={isExporting} className="secondary-btn" style={{ justifyContent: 'space-between', background: '#333' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileArchive size={16} weight="bold" />
                      <span>Export CSV ZIP</span>
                    </div>
                    <CaretRight size={14} weight="bold" opacity={0.5} />
                  </button>
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: 20, padding: 15, background: 'rgba(255,255,0,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,0,0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#998a00', fontWeight: 'bold', marginBottom: 5 }}>Export Notes</div>
            <ul style={{ margin: 0, paddingLeft: 15, fontSize: '0.65rem', color: '#777', lineHeight: '1.4' }}>
              <li>SICK requires SDXML for Safety Designer.</li>
              <li>Leuze exports contain raw coordinate CSVs.</li>
              <li>Ensure all cases are calculated before export.</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Hardware;
