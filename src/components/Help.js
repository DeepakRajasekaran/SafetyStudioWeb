import React, { useState, useEffect } from 'react';
import './Help.css';

const ImageCarousel = ({ images, interval = 5000 }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);

  return (
    <div className="carousel-container">
      <div className="carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {images.map((img, idx) => (
          <div key={idx} className="carousel-slide">
            <img src={img.src} alt={img.alt} />
            <div className="carousel-caption">{img.caption}</div>
          </div>
        ))}
      </div>
      <div className="carousel-dots">
        {images.map((_, idx) => (
          <button
            key={idx}
            className={`carousel-dot ${idx === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(idx)}
          />
        ))}
      </div>
      <button className="carousel-control prev" onClick={() => setActiveIndex((prev) => (prev - 1 + images.length) % images.length)}>‹</button>
      <button className="carousel-control next" onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}>›</button>
    </div>
  );
};

const Help = () => {
  const resultImages = [
    { src: '/help/user_results_composite.png', alt: 'Composite View', caption: 'Global Safety Field: The final merged protection zone.' },
    { src: '/help/user_results_lidar.png', alt: 'LiDAR View', caption: 'Local Coordinate View: Field relative to the sensor lens.' },
    { src: '/help/user_results_sweeps.png', alt: 'Sweeps View', caption: 'Trajectory Sweeps: Footprint path during braking.' }
  ];

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
            <a href="#sensors">2.3. Sensor Mounting</a>
          </div>
          <a href="#phase2-matrix">3. Phase 2: Matrix & Generation</a>
          <div className="toc-sub">
            <a href="#matrix-config">3.1. Case Generation</a>
            <a href="#shadow-mgmt">3.2. Shadow Management</a>
          </div>
          <a href="#phase3-results">4. Phase 3: Validation & Refinement</a>
          <div className="toc-sub">
            <a href="#view-carousel">4.1. Visual Validation</a>
            <a href="#poly-edit">4.2. Polygon Editing</a>
            <a href="#result-cad">4.3. CAD Refinement</a>
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
            Before drawing, ensure you have selected the correct context (Footprint, Load 1, or Load 2) 
            from the CAD toolbar.
          </p>
          
          <div className="screenshot-container">
            <img src="/help/user_editor.png" alt="Editor Setup" />
            <p className="screenshot-caption">The CAD Editor: Defining a 900x600mm Footprint with multiple payloads.</p>
          </div>

          <h3 id="footprint">2.1. Robot Footprint</h3>
          <p>
            Define your base robot geometry (e.g., 900mm x 600mm). For maximum precision, 
            coincide the center of your footprint with the origin (0,0).
          </p>

          <h3 id="sketching">2.2. CAD Sketching & Context</h3>
          <p>
            <strong>IMPORTANT:</strong> Select the intended context in the toolbar before sketching. 
            Shapes drawn in the <em>Footprint</em> context define the robot base, while those in <em>Load</em> 
            contexts define payloads that might obstruct sensor views.
          </p>

          <h3 id="sensors">2.3. Sensor Mounting</h3>
          <p>
            Mount your LiDARs at strategic positions relative to the robot's center. A standard setup for 
            360&deg; coverage might include a <strong>Front-Left</strong> and a <strong>Rear-Right</strong> sensor.
          </p>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 2: MATRIX & GENERATION */}
        <div id="phase2-matrix" className="help-doc-section">
          <h2>Phase 2: Matrix & Case Generation</h2>
          <p>
            The <strong>Matrix</strong> tab manages the kinematic scenarios and physical parameters 
            for automated field generation.
          </p>

          <h3 id="matrix-config">3.1. Case Generation</h3>
          <p>
            The <strong>Matrix Generator</strong> builds a comprehensive library of motion profiles. 
            Define your velocity increments and motion types (Linear, Angular, Spin), then click 
            <strong>Generate All Cases</strong>. The system will calculate braking distances for every step.
          </p>
          
          <div className="screenshot-container">
            <img src="/help/user_matrix.png" alt="Evaluation Matrix" />
            <p className="screenshot-caption">Matrix View: Configuring motion profiles and safety parameters.</p>
          </div>

          <h3 id="shadow-mgmt">3.2. Shadow Management</h3>
          <p>
            Manage how payloads interact with sensor views. You can toggle shadow calculation 
            per load. For example, an internal component may be set to <strong>No Shadow</strong>, 
            while external forks are set to <strong>With Shadow</strong> to cast realistic blind spots.
          </p>
        </div>

        <hr className="doc-divider" />

        {/* PHASE 3: RESULTS & CAROUSEL */}
        <div id="phase3-results" className="help-doc-section">
          <h2>Phase 3: Validation & Advanced Refinement</h2>
          <p>
            The <strong>Results</strong> tab provides high-fidelity visualization and manual editing tools.
          </p>

          <h3 id="view-carousel">4.1. Visual Validation Modes</h3>
          <p>
            Inspect the generated fields from different perspectives using the interactive viewer.
          </p>
          
          <ImageCarousel images={resultImages} />

          <h3 id="poly-edit">4.2. Polygon Editing</h3>
          <p>
            Manually refine fields by dragging vertices, clicking edges to add new points, 
            or using the Delete key to remove unnecessary vertices.
          </p>

          <h3 id="result-cad">4.3. CAD-Based Union/Subtract</h3>
          <p>
            Apply boolean operations directly to the result. Use <strong>Subtract</strong> mode 
            to manually remove parts of the safety field where monitoring is not required.
          </p>
          <div className="screenshot-container">
            <img src="/help/user_results_cad_subtract.png" alt="CAD Result Editing" />
            <p className="screenshot-caption">CAD Refinement: Customizing field geometry using subtraction.</p>
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
