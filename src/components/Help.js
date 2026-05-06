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
          <a href="#phase1-editor">2. Phase 1: Editor & Geometry</a>
          <div className="toc-sub">
            <a href="#footprint">2.1. Robot Footprint</a>
            <a href="#sketching">2.2. CAD Sketching</a>
            <a href="#booleans">2.3. Boolean Operations</a>
            <a href="#sensors">2.4. Sensor Mounting</a>
          </div>
          <a href="#phase2-matrix">3. Phase 2: Evaluation Matrix</a>
          <a href="#phase3-results">4. Phase 3: Validation & Refinement</a>
          <div className="toc-sub">
            <a href="#views">4.1. View Modes</a>
            <a href="#lidar-view">4.2. LiDAR Coordinate View</a>
            <a href="#shadows">4.3. Shadow Analysis</a>
            <a href="#poly-edit">4.4. Polygon Editing</a>
            <a href="#result-cad">4.5. CAD-Based Union/Subtract</a>
          </div>
          <a href="#phase4-hardware">5. Phase 4: Hardware Export</a>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="help-content-area">
        <div id="introduction" className="help-doc-section">
          <h1 className="doc-main-title">Safety Studio User Manual</h1>
          <p className="doc-intro">
            Safety Studio is a comprehensive engineering suite for the automated generation of safety fieldsets. 
            This manual covers the complete workflow from defining robot geometry to deploying hardware-ready 
            configurations.
          </p>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 1: EDITOR */}
        <div id="phase1-editor" className="help-doc-section">
          <h2>Phase 1: Editor & Geometry Setup</h2>
          <p>
            The <strong>Editor</strong> is where you define the physical extents of your robot and its sensors. 
            Before drawing, ensure you have selected the correct layer (Footprint, Load 1, or Load 2) 
            from the CAD toolbar.
          </p>
          
          <div className="screenshot-container">
            <img src="/help/manual_editor.png" alt="Editor Setup" />
            <p className="screenshot-caption">The CAD Editor: Defining Footprint, Load 1, and dual-sensor mounting.</p>
          </div>

          <h3 id="footprint">2.1. Robot Footprint</h3>
          <p>
            Define your base robot geometry by importing a 1:1 DXF or using the sketching tools. 
            The system simplifies these shapes into valid polygons for simulation.
          </p>

          <h3 id="sketching">2.2. CAD Sketching & Context</h3>
          <p>
            <strong>IMPORTANT:</strong> Before creating new shapes, select the intended context in the toolbar. 
            Shapes drawn in the <em>Footprint</em> context define the robot base, while those in <em>Load</em> 
            contexts define payloads that might obstruct sensor views.
          </p>

          <h3 id="booleans">2.3. Boolean Operations (Union/Subtract)</h3>
          <p>
            You can create complex geometries using <strong>Subtraction Mode</strong>. 
            While hollow robot bodies are rare, subtraction is frequently used to:
          </p>
          <ul>
            <li>Carve out notches or irregular shapes in footprints.</li>
            <li>Remove specific sectors from a load polygon to account for mechanical apertures.</li>
            <li>Define exclusion zones directly within the generated safety fields.</li>
          </ul>

          <h3 id="sensors">2.4. Sensor Mounting</h3>
          <p>
            Mount your LiDARs at strategic positions. A standard reliable setup includes:
          </p>
          <ul>
            <li><strong>Front-Left:</strong> e.g., X: 0.4, Y: 0.3, Angle: 45&deg;.</li>
            <li><strong>Rear-Right:</strong> e.g., X: -0.4, Y: -0.3, Angle: 225&deg;.</li>
          </ul>
          <p>This "Cross-Corner" mounting ensures 360&deg; coverage with minimal blind spots.</p>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 2: MATRIX */}
        <div id="phase2-matrix" className="help-doc-section">
          <h2>Phase 2: The Evaluation Matrix</h2>
          <p>
            The <strong>Matrix</strong> defines the kinematic scenarios for field generation. 
            Click <strong>Generate All Cases</strong> to automatically build a library of motion profiles 
            based on your Max Velocity and Deceleration parameters.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual_matrix.png" alt="Evaluation Matrix" />
            <p className="screenshot-caption">Matrix View: Managing velocity steps and physics parameters.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 3: RESULTS */}
        <div id="phase3-results" className="help-doc-section">
          <h2>Phase 3: Validation & Advanced Refinement</h2>
          <p>
            The <strong>Results</strong> tab provides high-fidelity visualization and manual editing tools 
            for the generated fieldsets.
          </p>

          <h3 id="views">4.1. View Modes (Composite vs Sweeps)</h3>
          <p>
            Switch between <strong>Composite</strong> view to see the final merged field, or 
            <strong>Sweeps</strong> view to see the robot's footprint positions during the braking trajectory.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual_results_sweeps.png" alt="Sweeps View" />
            <p className="screenshot-caption">Sweeps View: Inspecting the footprint path during deceleration.</p>
          </div>

          <h3 id="lidar-view">4.2. LiDAR Coordinate View</h3>
          <p>
            For hardware validation, switch to <strong>LiDAR View</strong>. This transforms the global 
            safety field into the sensor's local coordinate system (X/Y relative to the lens).
          </p>
          <div className="screenshot-container">
            <img src="/help/manual_results_lidar.png" alt="LiDAR View" />
            <p className="screenshot-caption">LiDAR View: Local coordinate perspective for sensor configuration.</p>
          </div>

          <h3 id="shadows">4.3. Shadow Analysis</h3>
          <p>
            <strong>Shadow Zones</strong> are automatically generated whenever a <strong>Load Polygon</strong> 
            is active or when one sensor's body obstructs another. These zones represent areas the 
            LiDAR cannot monitor and are subtracted from the safety field to prevent false positives.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual_results_composite.png" alt="Shadow Analysis" />
            <p className="screenshot-caption">Shadow Generation: Identifying blind spots caused by payloads.</p>
          </div>

          <h3 id="poly-edit">4.4. Polygon Editing</h3>
          <p>
            Manually refine fields by dragging vertices, clicking edges to add new points, 
            or using the Delete key to remove unnecessary vertices.
          </p>

          <h3 id="result-cad">4.5. CAD-Based Union/Subtract</h3>
          <p>
            Apply boolean operations directly to the result. Use <strong>Subtract</strong> mode 
            to manually remove parts of the safety field where monitoring is not required 
            (e.g., ignoring static environment features).
          </p>
          <div className="screenshot-container">
            <img src="/help/manual_results_cad_subtract.png" alt="CAD Result Editing" />
            <p className="screenshot-caption">CAD Refinement: Using subtraction to customize the final field geometry.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 4: HARDWARE */}
        <div id="phase4-hardware" className="help-doc-section">
          <h2>Phase 4: Hardware Deployment</h2>
          <p>
            Once validated, map your cases to physical fieldsets and export to 
            <strong>SICK (.sdxml)</strong> or <strong>Leuze (.csv)</strong> formats.
          </p>
        </div>

        <div className="help-footer-official">
          Safety Studio &bull; Enterprise Safety Engineering Tools &bull; 2026
        </div>
      </div>
    </div>
  );
};

export default Help;
