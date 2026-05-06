import React, { useState, useEffect } from 'react';
import './Help.css';

const ImageCarousel = ({ images, interval = 6000 }) => {
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
            <div className="carousel-caption">
              <strong>{img.title}</strong>: {img.caption}
            </div>
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
  const editorImages = [
    { src: '/help/help_editor.png', title: 'CAD Foundation', alt: 'Editor Setup', caption: 'Defining the 900x600mm footprint and dual-corner LiDAR mounting.' },
    { src: '/help/user_editor.png', title: 'Load Layers', alt: 'Load Setup', caption: 'Managing multiple payloads (Load 1 and Load 2) with distinct obstruction properties.' }
  ];

  const matrixImages = [
    { src: '/help/help_matrix.png', title: 'Global Config', alt: 'Matrix Config', caption: 'Selecting field generation methods (Sweep Union vs Hybrid) and hull thresholds.' },
    { src: '/help/help_matrix_generator.png', title: 'Case Generator', alt: 'Matrix Generator', caption: 'Automated generation of motion profiles across velocity intensities.' }
  ];

  const resultImages = [
    { src: '/help/help_results_composite.png', title: 'Composite View', alt: 'Composite', caption: 'The final global safety field merged from all active sensors.' },
    { src: '/help/help_results_lidar1.png', title: 'LiDAR 1 View', alt: 'Lidar1', caption: 'Local coordinate validation for the Front-Left sensor.' },
    { src: '/help/help_results_lidar2.png', title: 'LiDAR 2 View', alt: 'Lidar2', caption: 'Local coordinate validation for the Rear-Right sensor.' },
    { src: '/help/help_results_sweeps.png', title: 'Sweeps View', alt: 'Sweeps', caption: 'Visualizing the robot footprint trajectory during an emergency stop.' }
  ];

  const editingImages = [
    { src: '/help/help_results_poly_edit.png', title: 'Polygon Editing', alt: 'Poly Edit', caption: 'Direct vertex manipulation: dragging nodes and adding new points to the field boundary.' },
    { src: '/help/help_results_cad_union.png', title: 'CAD Union', alt: 'Union', caption: 'Merging additional CAD shapes into the generated safety field.' },
    { src: '/help/help_results_cad_subtract.png', title: 'CAD Subtraction', alt: 'Subtract', caption: 'Carving out exclusion zones or complex apertures from the field geometry.' },
    { src: '/help/help_results_cad_complex.png', title: 'Complex Intersections', alt: 'Complex', caption: 'Advanced boolean operations for high-precision field refinement.' }
  ];

  return (
    <div className="help-page-container">
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

      <div className="help-content-area">
        <div id="introduction" className="help-doc-section">
          <h1 className="doc-main-title">Safety Studio User Manual</h1>
          <p className="doc-intro">
            Safety Studio is a premium engineering environment for the automated generation of LiDAR-based 
            safety fieldsets. This manual provides a standalone workflow to design, simulate, and export 
            safety configurations without external training.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="phase1-editor" className="help-doc-section">
          <h2>Phase 1: Editor & Geometry Foundation</h2>
          <p>
            The foundation of every project is the physical robot geometry. Use the professional CAD tools 
            to define the robot base, its payloads, and LiDAR mounting positions.
          </p>
          
          <ImageCarousel images={editorImages} />

          <h3 id="footprint">2.1. Robot Footprint</h3>
          <p>
            Define the base robot geometry (e.g., 900mm x 600mm). For precision, coincide the footprint 
            center with the global origin (0,0).
          </p>

          <h3 id="sketching">2.2. CAD Sketching & Context</h3>
          <p>
            <strong>IMPORTANT:</strong> Always verify your active context (Footprint vs Load) in the toolbar. 
            Shapes in the <em>Footprint</em> context define the robot's physical extents, while <em>Load</em> 
            contexts define payloads that may obstruct sensor visibility.
          </p>

          <h3 id="sensors">2.3. Sensor Mounting</h3>
          <p>
            LiDARs are positioned relative to the robot origin. A dual-corner setup (Front-Left and 
            Rear-Right) provides 360&deg; coverage.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="phase2-matrix" className="help-doc-section">
          <h2>Phase 2: Matrix & Case Generation</h2>
          <p>
            The <strong>Matrix</strong> tab manages motion scenarios and braking physics.
          </p>
          
          <ImageCarousel images={matrixImages} />

          <h3 id="matrix-config">3.1. Case Generation</h3>
          <p>
            The <strong>Matrix Generator</strong> builds a comprehensive library of motion profiles. 
            Set your velocity increments and motion types, then click <strong>Generate All Cases</strong>. 
            The system calculates stopping distances based on Reaction Time (Tr) and Deceleration (a).
          </p>

          <h3 id="shadow-mgmt">3.2. Shadow Management</h3>
          <p>
            Payloads can cast realistic <strong>Shadow Zones</strong>. Toggle shadow calculation 
            per load to account for physical obstructions in the sensor's line-of-sight.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="phase3-results" className="help-doc-section">
          <h2>Phase 3: Results & Validation</h2>
          <p>
            The <strong>Results</strong> tab provides interactive tools to validate and manually refine 
            the generated fields.
          </p>

          <h3 id="view-carousel">4.1. Visual Validation</h3>
          <p>Cycle through different perspective views to ensure full protection coverage.</p>
          
          <ImageCarousel images={resultImages} />

          <h3 id="poly-edit">4.2. Polygon Editing</h3>
          <p>
            For fine adjustments, use <strong>Polygon Edit Mode</strong> to drag vertices or 
            add/remove nodes from the boundary.
          </p>

          <h3 id="result-cad">4.3. CAD Refinement</h3>
          <p>
            Apply boolean operations (Union/Subtract) directly to the result polygons for complex 
            environmental requirements.
          </p>

          <ImageCarousel images={editingImages} />
        </div>

        <hr className="doc-divider" />

        <div id="phase4-hardware" className="help-doc-section">
          <h2>Phase 4: Hardware Mapping & Export</h2>
          <p>
            The final stage maps validated fields to physical LiDAR fieldsets (1-128) and exports 
            deployment files.
          </p>
          
          <div className="screenshot-container">
            <img src="/help/help_hardware.png" alt="Hardware Export" />
            <p className="screenshot-caption">Hardware Mapping: Preparing deployment files for SICK and Leuze sensors.</p>
          </div>
          
          <ul>
            <li><strong>SICK Export:</strong> Generates .sdxml for Safety Designer.</li>
            <li><strong>Leuze Export:</strong> Generates CSV mapping for Leuze devices.</li>
            <li><strong>Safety Report:</strong> Downloads a comprehensive project summary.</li>
          </ul>
        </div>

        <div className="help-footer-official">
          Safety Studio &bull; Enterprise Safety Engineering Tools &bull; 2026
        </div>
      </div>
    </div>
  );
};

export default Help;
