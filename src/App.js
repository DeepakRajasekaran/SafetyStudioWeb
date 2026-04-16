import React, { useState, useEffect } from "react";
import { 
  Home as HomeIcon, 
  PencilRuler, 
  BarChart3, 
  Download, 
  Cpu, 
  HelpCircle,
  X
} from 'lucide-react';
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
      NoLoad: { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: false },
      Load1:  { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: false },
      Load2:  { enabled: true, tr: 0.1, ac: 1.0, ds: 0.1, pad: 0.05, smooth: 0.05, lat_scale: 1.0, shadow: true, include_load: true, patch_notch: false }
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
      NoLoad: { enabled: true, cnt: 6, v: 1.2, w: 0.6, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false },
      Load1:  { enabled: false, cnt: 6, v: 1.0, w: 0.4, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false },
      Load2:  { enabled: false, cnt: 6, v: 0.8, w: 0.3, minV: 0.1, revV: 0.3, fwd: true, turn: true, ip: true, rev: false },
    },
    results: {},
    fieldsets: [],
    cadData: {
      FootPrint: { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
      Load1:     { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
      Load2:     { sketches: [], dimensions: [], fixedPoints: [], constraints: [] },
      Overrides: {}
    }
  };

  const [geometry, setGeometry] = useState(DEFAULTS.geometry);
  const [sensors, setSensors] = useState(DEFAULTS.sensors);
  const [physics, setPhysics] = useState(DEFAULTS.physics);
  const [evaluationCases, setEvaluationCases] = useState(DEFAULTS.evaluationCases);
  const [genConfig, setGenConfig] = useState(DEFAULTS.genConfig);
  const [genSync, setGenSync] = useState(true);
  const [results, setResults] = useState(DEFAULTS.results);
  const [fieldsets, setFieldsets] = useState(DEFAULTS.fieldsets);
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
     const saved = localStorage.getItem('safetystudio_session_v1');
     if (saved) {
       try { 
         const data = JSON.parse(saved);
         if (data.geometry) setGeometry(data.geometry);
         if (data.sensors) setSensors(data.sensors);
         if (data.physics) setPhysics(data.physics);
         if (data.evaluationCases) setEvaluationCases(data.evaluationCases);
         if (data.genConfig) setGenConfig(data.genConfig);
         if (data.results) setResults(data.results);
         if (data.fieldsets) setFieldsets(data.fieldsets);
         if (data.cadData) setCadData(data.cadData);
       } catch (e) { console.error("Session Load failed", e); }
     }
  }, []);

  useEffect(() => {
     const session = {
       geometry, sensors, physics, evaluationCases, 
       genConfig, results, fieldsets, cadData
     };
     localStorage.setItem('safetystudio_session_v1', JSON.stringify(session));
  }, [geometry, sensors, physics, evaluationCases, genConfig, results, fieldsets, cadData]);

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
    { id: 'Home', icon: HomeIcon, label: 'Home' },
    { id: 'Editor', icon: PencilRuler, label: 'CAD Editor' },
    { id: 'Results', icon: BarChart3, label: 'Results & Solver' },
    { id: 'Hardware', icon: Cpu, label: 'Hardware Config' },
    { id: 'Help', icon: HelpCircle, label: 'Documentation' },
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
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="tab-tooltip">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom utility zone */}
        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button
            className="tab-btn tab-btn-danger"
            onClick={clearSession}
            title="Clear Session"
          >
            <X size={16} strokeWidth={2} />
            <span className="tab-tooltip">Clear Session</span>
          </button>
        </div>
      </header>
      <main className="App-main">{renderTabContent()}</main>
    </div>
  );
}

export default App;
