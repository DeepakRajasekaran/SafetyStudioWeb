import React, { useState, useEffect } from "react";
import "./App.css";

// Components
import Home from "./components/Home";
import Editor from "./components/Editor";
import Generation from "./components/Generation";
import Results from "./components/Results";
import Export from "./components/Export";
import Hardware from "./components/Hardware";
import Help from "./components/Help";

function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTool, setActiveTool] = useState("select");
  const [selectedSensorIndex, setSelectedSensorIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // --- GLOBAL STATE ---
  
  // 1. Geometry (Stores WKT strings from the backend)
  const [geometry, setGeometry] = useState({
    FootPrint: null,
    Load1: null,
    Load2: null
  });

  // 2. Sensors Array
  // Qt Default: [{'name':'Main','model':'Sick Nanoscan3Pro','x':0.45,'y':0,'mount':0,'fov':270,'r':10.0,'dia':150,'flipped':false}]
  const [sensors, setSensors] = useState([]);

  // 3. Physics & Calculation Params
  const [physics, setPhysics] = useState({
    NoLoad: { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: false },
    Load1:  { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: false },
    Load2:  { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: false }
  });

  // 4. Evaluation Cases
  const [evaluationCases, setEvaluationCases] = useState([
    { id: 1, load: 'NoLoad', v: 1.0, w: 0.0, type: 'std' },
    { id: 2, load: 'NoLoad', v: -0.5, w: 0.0, type: 'std' },
    { id: 3, load: 'NoLoad', v: 0.5, w: 0.5, type: 'std' },
    { id: 4, load: 'NoLoad', v: 0.5, w: -0.5, type: 'std' },
    { id: 5, load: 'NoLoad', v: 0.0, w: 1.0, type: 'std' },
    { id: 6, load: 'NoLoad', v: 0.0, w: -1.0, type: 'std' }
  ]);

  // 4b. Generation Configs
  const [genConfig, setGenConfig] = useState({
    NoLoad: { enabled: true, cnt: 6, v: 1.2, w: 0.6, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false },
    Load1:  { enabled: false, cnt: 6, v: 1.0, w: 0.4, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false },
    Load2:  { enabled: false, cnt: 6, v: 0.8, w: 0.3, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false },
  });
  const [genSync, setGenSync] = useState(true);

  // 5. Results (Map of case id -> WKT)
  const [results, setResults] = useState({});

  // 6. Fieldsets for Hardware Export
  const [fieldsets, setFieldsets] = useState([]);

  // --- CAD Sketches & History System ---
  const [cadData, setCadData] = useState({
    FootPrint: { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
    Load1:     { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
    Load2:     { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
    Overrides: {}
  });
  const [history, setHistory] = useState([]);

  // Fail-Safe: Recursively verify that no NaN or Infinity exists in the state
  const isStateValid = (data) => {
    const str = JSON.stringify(data);
    if (str.includes('null')) { 
       console.error("Invalid CAD data detected:", data);
       return false; 
    }
    return true;
  };

  const setCadFieldSafe = (layer, caseId, field, updater) => {
    setCadData(prev => {
      const next = JSON.parse(JSON.stringify(prev)); // Safe deep clone
      let target;
      if (layer === 'Overrides') {
         if (!next.Overrides[caseId]) next.Overrides[caseId] = { sketches: [], dimensions: [], fixedPoints: [], constraints: [] };
         target = next.Overrides[caseId];
      } else {
         target = next[layer];
      }
      const val = typeof updater === 'function' ? updater(target[field]) : updater;
      if (!isStateValid(val)) {
        console.warn(`CAD update blocked: NaN/Infinity detected in ${layer} ${field}`);
        return prev;
      }
      target[field] = val;
      return next;
    });
  };

  const pushToHistory = () => {
    setHistory(prev => {
      const entry = JSON.stringify(cadData);
      const newHist = [entry, ...prev].slice(0, 50);
      return newHist;
    });
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const [last, ...remaining] = prev;
      try {
        setCadData(JSON.parse(last));
      } catch (e) { console.error("Undo failed", e); }
      return remaining;
    });
  };

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [history, cadData]);

  // --- Persistence Logic ---
  useEffect(() => {
     const saved = localStorage.getItem('safetystudio_caddata2');
     if (saved) {
       try { 
         const data = JSON.parse(saved);
         if (data.FootPrint) setCadData(data);
       } catch (e) { console.error("CAD Load failed", e); }
     }
  }, []);

  useEffect(() => {
     localStorage.setItem('safetystudio_caddata2', JSON.stringify(cadData));
  }, [cadData]);

  const globals = {
    geometry, setGeometry,
    sensors, setSensors,
    physics, setPhysics,
    evaluationCases, setEvaluationCases,
    results, setResults,
    fieldsets, setFieldsets,
    genConfig, setGenConfig,
    genSync, setGenSync,
    cadData, setCadFieldSafe,
    undo, pushToHistory,
    activeTool, setActiveTool,
    selectedSensorIndex, setSelectedSensorIndex,
    selectedCaseId, setSelectedCaseId
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Home":
        return <Home globals={globals} setActiveTab={setActiveTab} />;
      case "Editor":
        return <Editor globals={globals} setActiveTab={setActiveTab} />;
      case "Generation":
        return <Generation globals={globals} />;
      case "Results":
        return <Results globals={globals} />;
      case "Export":
        return <Export globals={globals} />;
      case "Hardware":
        return <Hardware globals={globals} />;
      case "Help":
        return <Help />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="App dark">
      <header className="App-header">
        <div className="brand">Safety Studio</div>
        <div className="tab-bar">
          {["Home", "Editor", "Generation", "Results", "Export", "Hardware", "Help"].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "Generation" ? "Evaluation Cases" : tab}
            </button>
          ))}
        </div>
      </header>
      <main className="App-main">{renderTabContent()}</main>
    </div>
  );
}

export default App;
