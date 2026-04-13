import React, { useState } from 'react';
import { Settings, Play } from 'lucide-react';

const Home = ({ globals, setActiveTab }) => {
  const { setSensors } = globals;
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
        </div>
      </div>
    </div>
  );
};

export default Home;
