import React, { useState, useEffect } from "react";
import { 
  HouseLine, 
  CompassTool, 
  Polygon, 
  Download, 
  Cpu, 
  Question,
  X
} from '@phosphor-icons/react';
import "./App.css";
import logo from "./assets/logo.svg";

// Components
import Home from "./components/Home";
import Editor from "./components/Editor";
import Results from "./components/Results";
import Hardware from "./components/Hardware";
import Help from "./components/Help";

function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTool, setActiveTool] = useState("select");
  const [selectedSensorIndex, setSelectedSensorIndex] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // --- GLOBAL STATE ---
  
  const DEFAULTS = {
    geometry: { FootPrint: null, Load1: null, Load2: null },
    sensors: [],
    physics: {
      NoLoad: { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: true, field_method: 'union', hull_threshold: 0.5 },
      Load1:  { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: true, field_method: 'union', hull_threshold: 0.5 },
      Load2:  { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: true, field_method: 'union', hull_threshold: 0.5 }
    },
    evaluationCases: [
      { id: 1, load: 'NoLoad', v: 1.0, w: 0.0, type: 'std' },
      { id: 2, load: 'NoLoad', v: -0.5, w: 0.0, type: 'std' },
      { id: 3, load: 'NoLoad', v: 0.5, w: 0.5, type: 'std' },
      { id: 4, load: 'NoLoad', v: 0.5, w: -0.5, type: 'std' },
      { id: 5, load: 'NoLoad', v: 0.0, w: 1.0, type: 'std' },
      { id: 6, load: 'NoLoad', v: 0.0, w: -1.0, type: 'std' }
    ],
    genConfig: {
      NoLoad: { enabled: true, levels: 5, v: 1.2, w: 0.6, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false, idle: true },
      Load1:  { enabled: false, levels: 5, v: 1.0, w: 0.4, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false, idle: true },
      Load2:  { enabled: false, levels: 5, v: 0.8, w: 0.3, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false, idle: true },
    },
    results: {},
    fieldsets: [],
    cadData: {
      FootPrint: { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
      Load1:     { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
      Load2:     { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
      Overrides: {}
    },
    maxFields: 128
  };

  const [geometry, setGeometry] = useState(DEFAULTS.geometry);
  const [sensors, setSensors] = useState(DEFAULTS.sensors);
  const [physics, setPhysics] = useState(DEFAULTS.physics);
  const [evaluationCases, setEvaluationCases] = useState(DEFAULTS.evaluationCases);
  const [genConfig, setGenConfig] = useState(DEFAULTS.genConfig);
  const [genSync, setGenSync] = useState(true);
  const [results, setResults] = useState(DEFAULTS.results);
  const [fieldsets, setFieldsets] = useState(DEFAULTS.fieldsets);
  const [maxFields, setMaxFields] = useState(DEFAULTS.maxFields);
  const [cadData, setCadData] = useState(DEFAULTS.cadData);
  const [history, setHistory] = useState([]);

  // Fail-Safe: Recursively verify that no NaN or Infinity exists in the state
  const isStateValid = (data) => {
    if (data === null || data === undefined) return true;
    if (typeof data === 'number') {
      return Number.isFinite(data);
    }
    if (Array.isArray(data)) {
      return data.every(item => isStateValid(item));
    }
    if (typeof data === 'object') {
      return Object.values(data).every(item => isStateValid(item));
    }
    return true;
  };

  const setCadBatchSafe = (layer, caseId, updates) => {
    setCadData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let target;
      if (layer === 'Overrides') {
        if (!next.Overrides[caseId]) next.Overrides[caseId] = { sketches: [], dimensions: [], fixedPoints: [], constraints: [] };
        target = next.Overrides[caseId];
      } else {
        target = next[layer];
      }

      for (const [field, updater] of Object.entries(updates)) {
        const val = typeof updater === 'function' ? updater(target[field]) : updater;
        if (!isStateValid(val)) {
          console.warn(`CAD batch update blocked: NaN/Infinity detected in ${layer} ${field}`);
          return prev;
        }
        target[field] = val;
      }
      return next;
    });
  };

  const setCadFieldSafe = (layer, caseId, field, updater) => {
    setCadBatchSafe(layer, caseId, { [field]: updater });
  };

  const pushToHistory = () => {
    setHistory(prev => {
      const entry = JSON.stringify({ geometry, sensors, physics, evaluationCases, results, fieldsets, cadData, maxFields, genConfig });
      return [entry, ...prev].slice(0, 50);
    });
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const [last, ...remaining] = prev;
      try {
        const d = JSON.parse(last);
        if (d.geometry) setGeometry(d.geometry);
        if (d.sensors) setSensors(d.sensors);
        if (d.physics) setPhysics(d.physics);
        if (d.evaluationCases) setEvaluationCases(d.evaluationCases);
        if (d.results) setResults(d.results);
        if (d.fieldsets) setFieldsets(d.fieldsets);
        if (d.cadData) setCadData(d.cadData);
        if (d.maxFields !== undefined) setMaxFields(d.maxFields);
        if (d.genConfig) setGenConfig(d.genConfig);
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
     const saved = localStorage.getItem('safetystudio_session_v1');
     if (saved) {
       try { 
         const d = JSON.parse(saved);
         if (d.geometry) setGeometry(d.geometry);
         if (d.sensors) setSensors(d.sensors);
         if (d.physics) {
           const p = d.physics;
           // Migration: Ensure patch_notch is enabled by default even if not in saved state
           ['NoLoad', 'Load1', 'Load2'].forEach(l => {
             if (p[l] && p[l].patch_notch === undefined) p[l].patch_notch = true;
             // Force it to true once to fix potential stale false values from previous turn
             if (p[l]) p[l].patch_notch = true; 
           });
           setPhysics(p);
         }
         if (d.evaluationCases) setEvaluationCases(d.evaluationCases);
         if (d.genConfig) setGenConfig(d.genConfig);
         if (d.results) setResults(d.results);
         if (d.fieldsets) setFieldsets(d.fieldsets);
         if (d.maxFields) setMaxFields(d.maxFields);
         if (d.cadData) setCadData(d.cadData);
       } catch (e) { console.error("Session Load failed", e); }
     }
  }, []);

  useEffect(() => {
     const session = {
       geometry, sensors, physics, evaluationCases, 
       genConfig, results, fieldsets, maxFields, cadData
     };
     localStorage.setItem('safetystudio_session_v1', JSON.stringify(session));
  }, [geometry, sensors, physics, evaluationCases, genConfig, results, fieldsets, maxFields, cadData]);

  const clearSession = () => {
    if (window.confirm("Are you sure you want to clear all session data? This cannot be undone.")) {
      localStorage.removeItem('safetystudio_session_v1');
      setGeometry(DEFAULTS.geometry);
      setSensors(DEFAULTS.sensors);
      setPhysics(DEFAULTS.physics);
      setEvaluationCases(DEFAULTS.evaluationCases);
      setGenConfig(DEFAULTS.genConfig);
      setResults(DEFAULTS.results);
      setFieldsets(DEFAULTS.fieldsets);
      setMaxFields(DEFAULTS.maxFields);
      setCadData(DEFAULTS.cadData);
      setHistory([]);
      setActiveTab("Home");
      // Optional: window.location.reload(); 
    }
  };

  const globals = {
    geometry, setGeometry,
    sensors, setSensors,
    physics, setPhysics,
    evaluationCases, setEvaluationCases,
    results, setResults,
    fieldsets, setFieldsets,
    maxFields, setMaxFields,
    genConfig, setGenConfig,
    genSync, setGenSync,
    cadData, setCadFieldSafe, setCadBatchSafe,
    undo, pushToHistory,
    clearSession,
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
      case "Results":
        return <Results globals={globals} />;
      case "Hardware":
        return <Hardware globals={globals} />;
      case "Help":
        return <Help />;
      default:
        return <div>Tab not found</div>;
    }
  };

  const tabs = [
    { id: 'Home', icon: HouseLine, label: 'Home' },
    { id: 'Editor', icon: CompassTool, label: 'CAD Editor' },
    { id: 'Results', icon: Polygon, label: 'Results & Solver' },
    { id: 'Hardware', icon: Download, label: 'Hardware Config' },
    { id: 'Help', icon: Question, label: 'Documentation' },
  ];

  return (
    <div className="App dark">
      <header className="App-header">
        {/* Logo */}
        <div className="brand" title="Safety Studio">
          <img src={logo} alt="Safety Studio" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* Nav Items */}
        <nav className="tab-bar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  style={{ color: isActive ? '#ffffff' : '#666' }}
                >
                  <Icon size={24} weight="bold" />
                  <span className="tab-tooltip">{tab.label}</span>
                </button>
              );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

      </header>
      <main className="App-main">{renderTabContent()}</main>
    </div>
  );
}

export default App;
