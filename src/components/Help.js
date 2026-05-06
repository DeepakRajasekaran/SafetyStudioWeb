import React from 'react';
import './Help.css';

const Help = () => {
  return (
    <div className="help-page-container">
      {/* Table of Contents Sidebar */}
      <div className="help-sidebar">
        <h2 className="toc-title">User Manual</h2>
        <nav className="toc-nav">
          <a href="#introduction">1. Introduction</a>
          <a href="#phase1-editor">2. Phase 1: Editor & CAD</a>
          <div className="toc-sub">
            <a href="#footprint">2.1. Robot Footprint</a>
            <a href="#sketching">2.2. Advanced Sketching</a>
            <a href="#constraints">2.3. Constraints & Dims</a>
            <a href="#booleans">2.4. Boolean Operations</a>
            <a href="#sensors">2.5. Sensor Mounting</a>
          </div>
          <a href="#phase2-matrix">3. Phase 2: Eval Matrix</a>
          <div className="toc-sub">
            <a href="#physics">3.1. Physics Engine</a>
            <a href="#generation">3.2. Matrix Generation</a>
          </div>
          <a href="#phase3-results">4. Phase 3: Results & Validation</a>
          <div className="toc-sub">
            <a href="#views">4.1. View Modes</a>
            <a href="#shadows">4.2. Shadow Analysis</a>
            <a href="#poly-edit">4.3. Polygon Editing</a>
            <a href="#result-cad">4.4. Result CAD & Unions</a>
            <a href="#masking">4.5. Lidar Masking</a>
          </div>
          <a href="#phase4-hardware">5. Phase 4: Hardware Export</a>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="help-content-area">
        <div id="introduction" className="help-doc-section">
          <h1 className="doc-main-title">Safety Studio User Manual</h1>
          <p className="doc-intro">
            Safety Studio is a premium engineering environment for designing, simulating, and certifying 
            LiDAR-based safety fieldsets for autonomous mobile robots. This manual provides a complete 
            end-to-end workflow from raw geometry to hardware deployment.
          </p>
          <div className="screenshot-container">
            <img src="/help/help_home.png" alt="Home Dashboard" />
            <p className="screenshot-caption">The Workspace: Initializing your safety project.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 1: EDITOR & CAD */}
        <div id="phase1-editor" className="help-doc-section">
          <h2>Phase 1: Editor & CAD Foundation</h2>
          <p>
            The foundation of any safety configuration is the physical geometry of the robot. 
            The <strong>Editor</strong> tab provides professional-grade CAD tools to define these extents.
          </p>

          <h3 id="footprint">2.1. Robot Footprint</h3>
          <p>
            The footprint is the 2D bounding polygon of the robot's base.
          </p>
          <ul>
            <li><strong>DXF Import:</strong> Import a standard 1:1 scale DXF. The system automatically detects closed loops.</li>
            <li><strong>Manual Sketching:</strong> Use the "Draw Manually" option to enter the Parametric CAD environment.</li>
          </ul>

          <h3 id="sketching">2.2. Advanced Sketching Tools</h3>
          <p>The CAD environment supports standard geometric primitives:</p>
          <div className="screenshot-container">
            <img src="/help/editor_cad.png" alt="CAD Sketcher" />
            <p className="screenshot-caption">The Parametric CAD Environment: Drawing the Robot Footprint.</p>
          </div>
          <ul>
            <li><strong>Line & Rect:</strong> Basic linear extents.</li>
            <li><strong>Circle & Sector:</strong> Ideal for round robot bases or sweeping sensors.</li>
            <li><strong>Construction Mode:</strong> Use the "Dash" tool to create geometry that helps alignment but is ignored in the final safety calculation.</li>
          </ul>

          <h3 id="constraints">2.3. Constraints & Dimensions</h3>
          <p>
            To ensure your robot model is precise, apply <strong>Geometric Constraints</strong>:
          </p>
          <table className="param-table">
            <thead>
              <tr><th>Constraint</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Coincident</strong></td><td>Merges two points or a point onto a line.</td></tr>
              <tr><td><strong>Vertical / Horizontal</strong></td><td>Locks lines to the global X or Y axes.</td></tr>
              <tr><td><strong>Parallel / Perpendicular</strong></td><td>Ensures lines maintain fixed relative angles.</td></tr>
              <tr><td><strong>Dimensions</strong></td><td>Apply precise numeric values to lengths, radii, and angles.</td></tr>
            </tbody>
          </table>

          <h3 id="booleans">2.4. Boolean Operations (Holes)</h3>
          <p>
            You can create complex hollow shapes using <strong>Subtraction Mode</strong>. 
            Any shape drawn while this mode is active will be "cut out" from the main footprint, 
            allowing you to model internal voids where sensors might be recessed.
          </p>

          <h3 id="sensors">2.5. Sensor Mounting</h3>
          <p>
            LiDAR sensors are mounted relative to the robot's origin. 
            You must define the <strong>X, Y, and Mounting Angle</strong> accurately. 
            The <strong>Field of View (FOV)</strong> and <strong>Range (R)</strong> determine the 
            theoretical coverage before physical obstructions are considered.
          </p>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 2: EVAL MATRIX */}
        <div id="phase2-matrix" className="help-doc-section">
          <h2>Phase 2: Evaluation Matrix & Physics</h2>
          <p>
            Safety fields are dynamic. The <strong>Evaluation Matrix</strong> defines every velocity 
            and motion scenario the robot will encounter.
          </p>

          <h3 id="physics">3.1. The Physics Engine</h3>
          <p>
            The system calculates the stopping distance (<strong>D</strong>) using industrial safety standards:
          </p>
          <div className="math-box">D = (v &times; Tᵣ) + (v² / 2a) + Dₛ</div>
          <div className="tip-box">
            <strong>Pro Tip:</strong> Tr (Reaction Time) should include the worst-case PLC scan time, 
            network latency, and mechanical brake delay.
          </div>

          <h3 id="generation">3.2. Matrix Generation</h3>
          <p>
            Instead of manual entry, use the <strong>Matrix Generator</strong> to build thousands of 
            cases automatically. Define your max linear (V) and angular (W) speeds, set the 
            <strong>Intensity Levels</strong>, and the system will populate the grid with 
            standard motion cases (Forward, Turn, Spin-in-place).
          </p>
          <div className="screenshot-container">
            <img src="/help/eval_matrix.png" alt="Evaluation Matrix" />
            <p className="screenshot-caption">Evaluation Matrix: Managing kinematic scenarios and braking parameters.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 3: RESULTS & VALIDATION */}
        <div id="phase3-results" className="help-doc-section">
          <h2>Phase 3: Results & Advanced Validation</h2>
          <p>
            The <strong>Results</strong> tab is where you inspect the generated fieldsets and 
            manually refine them using advanced tools.
          </p>

          <h3 id="views">4.1. View Modes</h3>
          <ul>
            <li><strong>Composite View:</strong> Shows the merged global safety field.</li>
            <li><strong>LiDAR View:</strong> Shows the field from the perspective of a specific sensor (local coordinates).</li>
            <li><strong>Sweeps View:</strong> Visualizes the robot's footprint positions at every step of the braking trajectory.</li>
          </ul>
          <div className="screenshot-container">
            <img src="/help/sweeps_view.png" alt="Sweeps View" />
            <p className="screenshot-caption">Sweeps View: Validating the area covered by the robot during an emergency stop.</p>
          </div>

          <h3 id="shadows">4.2. Shadow Analysis (Red Zones)</h3>
          <p>
            The system automatically detects areas where one sensor blocks another or where the 
            <strong>Load Shape</strong> obstructs the view. These are highlighted as red 
            <strong>Shadow Zones</strong>.
          </p>
          <div className="screenshot-container">
            <img src="/help/shadow_zones.png" alt="Shadow Zones" />
            <p className="screenshot-caption">Shadow Generation: Identifying blind spots caused by the robot's body or payload.</p>
          </div>

          <h3 id="poly-edit">4.3. Polygon Editing (Manual Refinement)</h3>
          <p>
            If the generated field needs minor adjustments, you can enter <strong>Polygon Edit Mode</strong>:
          </p>
          <ul>
            <li><strong>Drag Points:</strong> Move any vertex to expand or contract the field.</li>
            <li><strong>Add Points:</strong> Click anywhere on a polygon edge to insert a new vertex.</li>
            <li><strong>Delete Points:</strong> Right-click a point or press Delete to simplify the shape.</li>
          </ul>

          <h3 id="result-cad">4.4. Result CAD & Boolean Unions</h3>
          <p>
            For complex field requirements, you can use the <strong>CAD Tools</strong> directly 
            on the generated result. Draw shapes to <strong>Union</strong> (Add) to the field 
            or <strong>Subtract</strong> (Cut) from it. This is ideal for carving out 
            "Non-Safe" zones in tight environments.
          </p>

          <h3 id="masking">4.5. Lidar Masking (Exclusion Zones)</h3>
          <p>
            Use the <strong>Global Mask</strong> tool to define areas that should *never* be 
            monitored by any sensor (e.g., permanent mechanical components like forks or lift mechanisms). 
            The mask is subtracted from every generated case automatically.
          </p>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 4: HARDWARE EXPORT */}
        <div id="phase4-hardware" className="help-doc-section">
          <h2>Phase 4: Hardware Mapping & Export</h2>
          <p>
            The final stage is deploying your validated fields to the physical LiDAR hardware.
          </p>
          <div className="screenshot-container">
            <img src="/help/hardware_config.png" alt="Hardware Configuration" />
            <p className="screenshot-caption">Hardware Tab: Mapping cases to sensor fieldsets.</p>
          </div>
          <h3 id="deployment">Fieldset Deployment</h3>
          <ul>
            <li><strong>Mapping:</strong> Assign each motion case to a hardware slot (Fieldset 1-128).</li>
            <li><strong>SICK Export:</strong> Generates `.sdxml` files for direct import into SICK Safety Designer.</li>
            <li><strong>Leuze Export:</strong> Generates CSV maps for Leuze sensors.</li>
            <li><strong>Safety Report:</strong> Download a comprehensive CSV summary for your technical safety file.</li>
          </ul>
        </div>

        <div className="help-footer-official">
          Safety Studio Web &bull; Engineering Documentation &bull; 2026
        </div>
      </div>
    </div>
  );
};

export default Help;
