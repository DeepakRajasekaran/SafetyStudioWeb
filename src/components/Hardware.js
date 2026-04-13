import React, { useState } from 'react';
import axios from 'axios';

const Hardware = ({ globals }) => {
  const { evaluationCases, results, fieldsets, setFieldsets, sensors, geometry, physics } = globals;
  const [selectedFsIndex, setSelectedFsIndex] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // --- Fieldset Actions ---
  const addFs = () => {
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
    const groups = { NoLoad: [], Load1: [], Load2: [] };
    evaluationCases.forEach(k => {
      if (results[k.id]) {
        groups[k.load].push(k);
      }
    });

    const activeLoads = Object.keys(groups).filter(l => groups[l].length > 0);
    if (activeLoads.length === 0) {
      alert("No calculated results found. Please run simulations first.");
      return;
    }

    // Check if counts match
    const counts = activeLoads.map(l => groups[l].length);
    const allSame = counts.every(c => c === counts[0]);
    if (!allSame) {
      alert("Mismatched case counts between loads. All active load types must have the same number of cases for auto-gen.");
      return;
    }

    const newFieldsets = [];
    for (let i = 0; i < counts[0]; i++) {
        const fields = activeLoads.map(load => ({
            name: `${load}_Case_${groups[load][i].id}`,
            caseId: groups[load][i].id
        }));
        newFieldsets.push({ name: `Set ${i + 1}`, fields });
    }
    setFieldsets(newFieldsets);
  };

  // --- Export Actions ---
  const handleExportSick = async (sensorIndex) => {
    if (fieldsets.length === 0) { alert("No fieldsets defined."); return; }
    setIsExporting(true);
    try {
      const sensor = sensors[sensorIndex];
      const payload = {
        sensor,
        fieldsets,
        results,
        geometry,
        physics
      };
      const res = await axios.post('/api/export_sick', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sensor.name}.sdxml`);
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
      const payload = { sensor, results, evaluationCases };
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
    <div className="hardware-container" style={{ display: 'flex', height: '100%', background: '#111' }}>
      
      {/* --- Left Panes: Fieldsets --- */}
      <div style={{ flex: '0 0 22%', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', minWidth: '250px' }}>
        <div className="panel-header" style={{ padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#aaa', fontSize: '0.8rem' }}>FIELDSETS</span>
          <button onClick={addFs} className="btn-blue" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>+ Add Set</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {fieldsets.map((fs, i) => (
            <div key={i} onClick={() => setSelectedFsIndex(i)} 
                 style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #222', background: selectedFsIndex === i ? '#1a3a5c' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
              <input value={fs.name} onChange={(e) => updateFsName(i, e.target.value)} 
                     onClick={(e) => e.stopPropagation()}
                     style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, outline: 'none' }} />
              <button onClick={(e) => { e.stopPropagation(); delFs(i); }} style={{ background: 'transparent', border: 'none', color: '#ff5252', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px', borderTop: '1px solid #333' }}>
          <button onClick={autoGen} className="btn-teal" style={{ width: '100%', padding: '8px', fontWeight: 'bold' }}>Auto-Gen Fieldsets</button>
        </div>
      </div>

      {/* --- Center Pane: Fields in Set --- */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', borderRight: '1px solid #333', minWidth: '400px' }}>
        {selectedFsIndex !== null ? (
          <>
            <div className="panel-header" style={{ padding: '10px', background: '#1a1a1a', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#aaa', fontSize: '0.8rem' }}>FIELDS IN {fieldsets[selectedFsIndex].name.toUpperCase()}</span>
              <button onClick={() => addField(selectedFsIndex)} className="btn-blue" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>+ Add Field</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#777', borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '8px' }}>Field Name</th>
                    <th style={{ padding: '8px' }}>Source Case</th>
                    <th style={{ padding: '8px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fieldsets[selectedFsIndex].fields.map((f, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '5px' }}>
                        <input value={f.name} onChange={(e) => updateField(selectedFsIndex, i, 'name', e.target.value)}
                               style={{ background: '#222', border: '1px solid #444', color: 'white', padding: '4px', width: '90%' }} />
                      </td>
                      <td style={{ padding: '5px' }}>
                        <select value={f.caseId} onChange={(e) => updateField(selectedFsIndex, i, 'caseId', Number(e.target.value))}
                               style={{ background: '#222', border: '1px solid #444', color: 'white', padding: '4px', width: '100%' }}>
                          {evaluationCases.map(k => (
                            <option key={k.id} value={k.id}>Case {k.id}: v={k.v} w={k.w} ({k.load})</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '5px', textAlign: 'center' }}>
                        <button onClick={() => delField(selectedFsIndex, i)} style={{ background: 'transparent', border: 'none', color: '#ff5252', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
            Select a fieldset to manage its fields.
          </div>
        )}
      </div>

      {/* --- Right Pane: Export Actions --- */}
      <div style={{ flex: '0 0 22%', display: 'flex', flexDirection: 'column', padding: '15px', minWidth: '250px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#aaa', margin: '0 0 15px 0' }}>HARDWARE EXPORT</h3>
        
        {sensors.length === 0 ? (
          <div style={{ color: '#666', fontSize: '0.8rem' }}>No LiDARs configured in Editor tab.</div>
        ) : (
          sensors.map((s, i) => (
            <div key={i} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', padding: '12px', marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', color: '#2196F3', marginBottom: '8px' }}>{s.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#777', marginBottom: '12px' }}>Model: {s.model}</div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleExportSick(i)} disabled={isExporting} 
                        className="btn-blue" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}>
                  {s.model.includes('Sick') ? 'Export SDXML' : 'Export XML'}
                </button>
                <button onClick={() => handleExportLeuze(i)} disabled={isExporting}
                        className="btn-purple" style={{ flex: 1, padding: '6px', fontSize: '0.75rem' }}>
                  Export CSVs
                </button>
              </div>
            </div>
          ))
        )}

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.7rem', color: '#444' }}>
          * SICK export requires SDXML format for Safety Designer.
          * Leuze export generates a ZIP containing coordinate CSVs.
        </div>
      </div>

    </div>
  );
};

export default Hardware;
