import React from 'react';

const Export = ({ globals }) => {
  const { geometry, sensors, physics, evaluationCases, results } = globals;

  const exportData = {
    geometry: {
      FootPrint: geometry.FootPrint,
      Load1: geometry.Load1,
      Load2: geometry.Load2
    },
    sensors,
    physics, // Now includes NoLoad / Load1 / Load2 per-load config
    evaluationCases,
    results: Object.fromEntries(
      Object.entries(results).map(([id, data]) => [
        id,
        {
          final_field_wkt: data?.final_field_wkt || data,
          load: data?.load,
          dist_d: data?.dist_d
        }
      ])
    )
  };

  const jsonStr = JSON.stringify(exportData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    alert('Copied to clipboard!');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    link.download = 'safety_studio_config.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.geometry)   globals.setGeometry(d.geometry);
        if (d.sensors)    globals.setSensors(d.sensors);
        if (d.physics)    globals.setPhysics(d.physics);
        if (d.evaluationCases) globals.setEvaluationCases(d.evaluationCases);
        else if (d.kinematics) globals.setEvaluationCases(d.kinematics);
        if (d.fieldsets)  globals.setFieldsets(d.fieldsets);
        
        // Restore results if present
        if (d.results) {
           const restoredResults = {};
           Object.entries(d.results).forEach(([id, val]) => {
             // In local storage, results might be simplified or full
             restoredResults[id] = val;
           });
           globals.setResults(restoredResults);
        }
        
        alert('Configuration imported successfully!');
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Count calculated cases
  const calculatedCount = Object.values(results).filter(Boolean).length;
  const totalCount = evaluationCases.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '20px', height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <h2 className="panel-title" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Export / Import Configuration</h2>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {[
          { label: 'Sensors', value: sensors.length, color: '#E91E63' },
          { label: 'Cases', value: totalCount, color: '#2196F3' },
          { label: 'Calculated', value: `${calculatedCount} / ${totalCount}`, color: '#4CAF50' },
          { label: 'Loads Active', value: ['NoLoad','Load1','Load2'].filter(l => physics[l]?.enabled !== false).length, color: '#FFD700' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, padding: '12px 20px', minWidth: 100 }}>
            <div style={{ color: s.color, fontSize: '1.5rem', fontWeight: 'bold' }}>{s.value}</div>
            <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button className="primary-btn" onClick={handleDownload} style={{ padding: '10px 20px' }}>
          ↓ Download JSON
        </button>
        <button className="secondary-btn" onClick={handleCopy} style={{ padding: '10px 20px' }}>
          ⧉ Copy to Clipboard
        </button>
        <label className="secondary-btn" style={{ padding: '10px 20px', cursor: 'pointer' }}>
          ↑ Import JSON
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>
      </div>

      {/* JSON Preview */}
      <div style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '6px 14px', background: '#222', color: '#888', fontSize: '0.75rem', borderBottom: '1px solid #333', letterSpacing: 1 }}>
          CONFIGURATION JSON PREVIEW
        </div>
        <textarea
          readOnly
          value={jsonStr}
          spellCheck={false}
          style={{
            flex: 1, background: 'transparent', color: '#00e676', padding: '16px',
            border: 'none', resize: 'none', outline: 'none',
            fontFamily: 'monospace', fontSize: '0.8rem', boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );
};

export default Export;
