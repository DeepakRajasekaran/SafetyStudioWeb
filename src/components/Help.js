import React from 'react';
import './Help.css';

const Help = () => {
  return (
    <div className="help-page-container">
      {/* Table of Contents Sidebar */}
      <div className="help-sidebar">
        <h2 className="toc-title">Table of Contents</h2>
        <nav className="toc-nav">
          <a href="#introduction">1. Introduction</a>
          <a href="#step1-editor">2. Phase 1: Editor (Geometry)</a>
          <div className="toc-sub">
            <a href="#footprint">2.1. Robot Footprint</a>
            <a href="#load-shapes">2.2. Load Shapes</a>
            <a href="#sensors">2.3. Sensor Mounting</a>
          </div>
          <a href="#step2-matrix">3. Phase 2: Matrix (Generation)</a>
          <div className="toc-sub">
            <a href="#physics">3.1. Physics Engine</a>
            <a href="#gen-params">3.2. Generation Parameters</a>
            <a href="#populating">3.3. Case Population</a>
          </div>
          <a href="#step3-results">4. Phase 3: Results (Validation)</a>
          <a href="#step4-hardware">5. Phase 4: Hardware (Export)</a>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="help-content-area">
        <div id="introduction" className="help-doc-section">
          <h1 className="doc-main-title">Safety Studio User Manual</h1>
          <p className="doc-intro">
            Safety Studio is a comprehensive CAD and simulation suite designed to automate the creation of <strong>Certified Safety Fields</strong> 
            for mobile industrial robots (AMRs/AGVs). It bridges the gap between raw kinematic data and hardware-ready fieldset configurations.
          </p>
          <div className="screenshot-container">
            <img src="/help/help_home.png" alt="Home Screen" />
            <p className="screenshot-caption">Dashboard: The entry point for managing safety configurations.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        <div id="step1-editor" className="help-doc-section">
          <h2>Phase 1: The Editor (Defining Geometry)</h2>
          <p>
            Before generating fields, you must define the physical characteristics of your robot. This happens in the <strong>Editor</strong> tab.
          </p>
          
          <div className="screenshot-container">
            <img src="/help/help_editor.png" alt="Editor UI" />
            <p className="screenshot-caption">The Editor Interface: Managing Footprints, Loads, and Sensors.</p>
          </div>

          <h3 id="footprint">2.1. Robot Footprint</h3>
          <p>
            The footprint is the base link of your robot. You have two ways to define it:
          </p>
          <ul>
            <li><strong>Parametric Sketcher:</strong> Use the built-in CAD tools to draw rectangles, circles, or custom polygons. Apply constraints like <em>Parallel</em> or <em>Perpendicular</em> to ensure geometric accuracy.</li>
            <li><strong>DXF Import:</strong> Click <em>"Import Footprint"</em> to load a 1:1 scale DXF file. The system will automatically detect loops and generate a simplified polygon for simulation.</li>
          </ul>

          <h3 id="load-shapes">2.2. Load Shapes</h3>
          <p>
            Many robots carry payloads that extend beyond their base footprint. You can define up to two load shapes (<strong>Load 1</strong> and <strong>Load 2</strong>). These are used to calculate "Shadow Zones" and ensure the safety field covers the entire dynamic volume of the robot.
          </p>

          <h3 id="sensors">2.3. Sensor Mounting</h3>
          <p>
            Place your LiDAR sensors (e.g., SICK MicroScan3) on the robot. For each sensor, you must define:
          </p>
          <ul>
            <li><strong>Origin (X, Y):</strong> Offset from the robot's <em>base_link</em> (center of rotation).</li>
            <li><strong>Mounting Angle:</strong> Horizontal rotation of the sensor.</li>
            <li><strong>Field of View (FOV):</strong> The active scanning sector (typically 270°).</li>
          </ul>
        </div>

        <hr className="doc-divider" />

        <div id="step2-matrix" className="help-doc-section">
          <h2>Phase 2: The Matrix (Field Generation)</h2>
          <p>
            The <strong>Matrix</strong> tab is where the "Physics" meets the "Path". Here you define how the robot moves and how the safety fields should respond.
          </p>

          <div className="screenshot-container">
            <img src="/help/help_matrix.png" alt="Matrix UI" />
            <p className="screenshot-caption">Matrix Tab: Configuring Physics and Motion Cases.</p>
          </div>

          <h3 id="physics">3.1. Physics Engine Parameters</h3>
          <p>The safety distance (<strong>D</strong>) is calculated using the standard industrial formula:</p>
          <div className="math-box">D = (v &times; Tᵣ) + (v² / 2a) + Dₛ</div>
          
          <table className="param-table">
            <thead>
              <tr><th>Parameter</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Reaction Time (Tr)</strong></td><td>Total system latency (Sensor response + PLC + Brake engagement) in seconds.</td></tr>
              <tr><td><strong>Deceleration (a)</strong></td><td>The worst-case braking capability of the robot in m/s².</td></tr>
              <tr><td><strong>Safety Margin (Ds)</strong></td><td>Additional buffer distance (e.g., 0.1m) to account for measurement uncertainty.</td></tr>
              <tr><td><strong>Field Method</strong></td><td>
                <strong>Sweep Union:</strong> Traditional silhouette merging (fast).<br/>
                <strong>Convex Hull:</strong> Safest, most conservative bounding box.<br/>
                <strong>Hybrid:</strong> Automatically switches based on a distance threshold.
              </td></tr>
              <tr><td><strong>Lateral Scale</strong></td><td>Scales the width of the field (useful for wide payloads).</td></tr>
            </tbody>
          </table>

          <h3 id="gen-params">3.2. Generation Parameters</h3>
          <p>Define the range of motions you want to cover:</p>
          <ul>
            <li><strong>Intensity Levels:</strong> The number of discrete velocity steps between 0 and Max Speed. Higher levels result in smoother transitions but require more hardware fieldsets.</li>
            <li><strong>Motion Types:</strong> Choose between <em>Linear (Forward)</em>, <em>Curving (Turns)</em>, and <em>In-Place Rotation</em>.</li>
          </ul>

          <h3 id="populating">3.3. Case Population</h3>
          <p>
            Click <strong>"Generate All Cases"</strong> to automatically build the list. You can also manually <strong>"Add Misc"</strong> cases or upload a <strong>Custom DXF</strong> for complex, non-kinematic shapes.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="step3-results" className="help-doc-section">
          <h2>Phase 3: Results & Validation</h2>
          <p>
            After generation, switch to the <strong>Results</strong> tab to inspect the generated fields.
          </p>
          
          <div className="screenshot-container">
            <img src="/help/help_results.png" alt="Results View" />
            <p className="screenshot-caption">Results View: Inspecting the generated Composite Safety Field.</p>
          </div>

          <p>
            Each case is simulated in real-time. The visualizer shows:
          </p>
          <ul>
            <li><span style={{color: '#00e5ff'}}>●</span> <strong>Active Field:</strong> The area the sensor will monitor.</li>
            <li><span style={{color: '#ff4b2b'}}>●</span> <strong>Shadow Zones:</strong> Areas blocked by the robot's own body or payload (automatically excluded).</li>
            <li><span style={{color: '#ffcc00'}}>●</span> <strong>Trajectory:</strong> The predicted path of the robot during braking.</li>
          </ul>
        </div>

        <hr className="doc-divider" />

        <div id="step4-hardware" className="help-doc-section">
          <h2>Phase 4: Hardware Mapping & Export</h2>
          <p>
            Finally, map your generated cases to your sensor's physical memory slots (Fieldsets).
          </p>

          <div className="screenshot-container">
            <img src="/help/help_hardware.png" alt="Hardware Export" />
            <p className="screenshot-caption">Hardware Tab: Finalizing export for SICK or Leuze sensors.</p>
          </div>

          <h3 id="export-formats">Export Formats</h3>
          <ul>
            <li><strong>SICK XML (.sdxml):</strong> Directly importable into SICK Safety Designer.</li>
            <li><strong>Leuze CSV:</strong> Standard format for Leuze sensor configurations.</li>
            <li><strong>Case CSV:</strong> A summary report for safety certification documentation.</li>
          </ul>
        </div>

        <div className="help-footer-official">
          &copy; 2026 Safety Studio Web &bull; Enterprise Safety Engineering Tools
        </div>
      </div>

      <style>{`
        .help-page-container {
          display: flex;
          background: #0d0d12;
          color: #e0e0e0;
          height: 100%;
          width: 100%;
          font-family: 'Inter', sans-serif;
        }
        .help-sidebar {
          width: 300px;
          background: #14141b;
          border-right: 1px solid rgba(255,255,255,0.05);
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .toc-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #666;
          margin-bottom: 24px;
          font-weight: 800;
        }
        .toc-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .toc-nav a {
          color: #aaa;
          text-decoration: none;
          font-size: 0.9rem;
          padding: 10px 14px;
          border-radius: 8px;
          transition: all 0.2s;
          font-weight: 500;
        }
        .toc-nav a:hover {
          color: #fff;
          background: rgba(255,255,255,0.03);
        }
        .toc-sub {
          padding-left: 20px;
          margin: 4px 0 12px;
          border-left: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .toc-sub a {
          font-size: 0.8rem;
          padding: 6px 12px;
        }
        .help-content-area {
          flex: 1;
          padding: 60px 80px;
          overflow-y: auto;
          scroll-behavior: smooth;
        }
        .doc-main-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #fff 0%, #666 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .doc-intro {
          font-size: 1.25rem;
          line-height: 1.6;
          color: #999;
          margin-bottom: 40px;
          max-width: 800px;
        }
        .help-doc-section h2 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          margin-top: 60px;
          margin-bottom: 24px;
        }
        .help-doc-section h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #00e5ff;
          margin-top: 40px;
          margin-bottom: 16px;
        }
        .help-doc-section p {
          font-size: 1.05rem;
          line-height: 1.8;
          color: #bbb;
          margin-bottom: 24px;
        }
        .help-doc-section ul {
          margin-bottom: 24px;
          padding-left: 20px;
        }
        .help-doc-section li {
          margin-bottom: 12px;
          color: #bbb;
        }
        .screenshot-container {
          background: #1a1a24;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.05);
          margin: 32px 0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .screenshot-container img {
          width: 100%;
          border-radius: 8px;
          display: block;
        }
        .screenshot-caption {
          text-align: center;
          font-size: 0.85rem;
          color: #666;
          margin-top: 16px !important;
          margin-bottom: 0 !important;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .math-box {
          background: rgba(0,229,255,0.05);
          border: 1px dashed rgba(0,229,255,0.2);
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.5rem;
          color: #00e5ff;
          margin-bottom: 32px;
        }
        .param-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 32px;
          background: rgba(255,255,255,0.02);
          border-radius: 12px;
          overflow: hidden;
        }
        .param-table th {
          text-align: left;
          background: rgba(255,255,255,0.05);
          padding: 16px;
          font-size: 0.8rem;
          text-transform: uppercase;
          color: #666;
        }
        .param-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          font-size: 0.95rem;
          vertical-align: top;
        }
        .doc-divider {
          border: none;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05), transparent);
          margin: 80px 0;
        }
        .help-footer-official {
          margin-top: 100px;
          padding: 40px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
          text-align: center;
          color: #444;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
};

export default Help;
