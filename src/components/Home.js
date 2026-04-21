import React, { useState } from 'react';
import { Settings, Play, X, Download, Upload } from 'lucide-react';

const Home = ({ globals, setActiveTab }) => {
  const { 
    geometry, sensors, setSensors, physics, evaluationCases, results, 
    fieldsets, setGeometry, setPhysics, setEvaluationCases, setResults, setFieldsets,
    clearSession 
  } = globals;
  const [model, setModel] = useState("Sick Nanoscan3Pro");
  const [count, setCount] = useState(2);

  const handleStart = () => {
    // Generate initial sensors
    const initSensors = [];
    for (let i = 0; i < count; i++) {
      initSensors.push({
        name: `Lidar${i + 1}`,
        model: model,
        x: i === 0 ? 0.45 : i === 1 ? -0.45 : 0,
        y: 0,
        mount: i === 0 ? 0 : i === 1 ? 180 : 0,
        fov: 270,
        r: 10.0,
        dia: 150,
        flipped: false
      });
    }
    setSensors(initSensors);
    setActiveTab("Editor");
  };

  const handleDownload = () => {
    const exportData = {
      geometry, sensors, physics, evaluationCases, fieldsets, cadData, maxFields, genConfig,
      results: Object.fromEntries(
        Object.entries(results).map(([id, data]) => [
          id, { final_field_wkt: data?.final_field_wkt || data, load: data?.load, dist_d: data?.dist_d }
        ])
      )
    };
    const link = document.createElement('a');
    link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
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
        if (d.geometry) setGeometry(d.geometry);
        if (d.sensors) setSensors(d.sensors);
        if (d.physics) setPhysics(d.physics);
        if (d.evaluationCases) setEvaluationCases(d.evaluationCases);
        if (d.fieldsets) setFieldsets(d.fieldsets);
        if (d.results) setResults(d.results);
        if (d.cadData) setCadData(d.cadData);
        if (d.maxFields !== undefined) setMaxFields(d.maxFields);
        if (d.genConfig) setGenConfig(d.genConfig);
        alert('Configuration imported successfully!');
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="home-container">
      <div className="center-card">
        <h1 className="title">Safety Studio</h1>
        
        <div className="settings-panel">
          <div className="input-group">
            <label>Select LiDAR Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="Sick Nanoscan3Pro">Sick Nanoscan3Pro</option>
              <option value="Leuze RSL200">Leuze RSL200</option>
            </select>
          </div>

          <div className="input-group">
            <label>Number of Sensors</label>
            <input 
              type="text" 
              value={count} 
              onChange={(e) => setCount(e.target.value)} 
              onBlur={(e) => {
                const n = parseInt(e.target.value) || 1;
                setCount(Math.min(8, Math.max(1, n)));
              }}
            />
          </div>

          <button className="primary-btn mt-4" onClick={handleStart}>
            <Play size={18} /> Start Configuration
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="secondary-btn mt-4" style={{ flex: 1 }} onClick={handleDownload}>
              <Download size={18} /> Export
            </button>
            <label className="secondary-btn mt-4" style={{ flex: 1, cursor: 'pointer' }}>
               <Upload size={18} /> Import
               <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>

          <button className="btn-danger mt-4" onClick={clearSession}>
            <X size={18} /> Clear Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
