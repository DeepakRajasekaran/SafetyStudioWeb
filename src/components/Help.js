import React, { useState, useEffect } from 'react';
import './Help.css';

const ImageCarousel = ({ images, interval = 6000 }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval, isPaused, activeIndex]);

  const handleManualControl = (index) => {
    setActiveIndex(index);
  };

  return (
    <div 
      className="carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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
            onClick={() => handleManualControl(idx)}
          />
        ))}
      </div>
      <button className="carousel-control prev" onClick={() => handleManualControl((activeIndex - 1 + images.length) % images.length)}>‹</button>
      <button className="carousel-control next" onClick={() => handleManualControl((activeIndex + 1) % images.length)}>›</button>
    </div>
  );
};

const Help = () => {
  const [showVideo, setShowVideo] = useState(false);

  const geometryImages = [
    { src: '/help/manual/sketching_footprint.png', title: 'Sketching Footprint', alt: 'Footprint', caption: 'Starting with the robot base geometry.' },
    { src: '/help/manual/footprint_after_sketching.png', title: 'Defined Footprint', alt: 'Footprint Final', caption: 'The finalized robot base polygon.' },
    { src: '/help/manual/sketching_load1.png', title: 'Sketching Load 1', alt: 'Load 1', caption: 'Adding the first payload context.' },
    { src: '/help/manual/load1_after_sketching.png', title: 'Defined Load 1', alt: 'Load 1 Final', caption: 'Load 1 geometry established.' },
    { src: '/help/manual/sketching_load2.png', title: 'Sketching Load 2', alt: 'Load 2', caption: 'Defining complex circular payloads.' },
    { src: '/help/manual/load2_after_sketching.png', title: 'Defined Load 2', alt: 'Load 2 Final', caption: 'Load 2 geometry established.' }
  ];

  const matrixImages = [
    { src: '/help/manual/physics_and_matrix_generator1.png', title: 'Physics Config', alt: 'Physics', caption: 'Setting deceleration and reaction time parameters.' },
    { src: '/help/manual/physics_and_matrix_generator2.png', title: 'Generation Config', alt: 'Gen Config', caption:  'Choosing methodology (Sweep Union vs Hybrid), and toggling hull polygon sweeps.'},
    { src: '/help/manual/physics_and_matrix_generator3.png', title: 'Field Methodology', alt: 'Methodology', caption: 'Selecting motion types and intensity levels.' },
    { src: '/help/manual/generated_cases_from_evalMatrix.png', title: 'Generated Cases', alt: 'Cases', caption: 'The finalized library of motion profiles.' }
  ];

  const polygonEditImages = [
    { src: '/help/manual/polygonEditCompositeFIeld.png', title: 'Edit Mode', alt: 'Edit', caption: 'Entering polygon edit mode for manual refinement.' },
    { src: '/help/manual/adjustedPolygonVertex.png', title: 'Node Manipulation', alt: 'Adjust', caption: 'Dragging vertices to reshape the safety boundary.' },
    { src: '/help/manual/polygon_edit_add_remove.png', title: 'Add/Remove Points', alt: 'Nodes', caption: 'Inserting new vertices or deleting existing ones.' }
  ];

  const cadEditImages = [
    { src: '/help/manual/cadCompositePolygonEditor.png', title: 'CAD Mode', alt: 'CAD', caption: 'Using parametric CAD tools on result polygons.' },
    { src: '/help/manual/patchingARegionUsingCad.png', title: 'Patching Area', alt: 'Patch', caption: 'Drawing a CAD shape to Union or Subtract from the field.' },
    { src: '/help/manual/afterPatchingUsingCad.png', title: 'Applied Patch', alt: 'Applied', caption: 'The field updated with the custom CAD refinement.' },
    { src: '/help/manual/compiled_fields.png', title: 'Compiled Fields', alt: 'Compiled', caption: 'Final validated fieldsets ready for deployment.' }
  ];

  const maskImages = [
    { src: '/help/manual/editing_mask_poly.png', title: 'Mask Editor', alt: 'Mask', caption: 'Defining global exclusion zones for sensors.' },
    { src: '/help/manual/appliedEdittedMask.png', title: 'Applied Mask', alt: 'Final Mask', caption: 'The exclusion zone effectively hiding robot parts.' }
  ];

  return (
    <div className="help-page-container">
      <div className="help-sidebar">
        <h2 className="toc-title">User Manual</h2>
        <nav className="toc-nav">
          <a href="#introduction">1. Introduction</a>
          
          <a href="#phase1-editor">2. Phase 1: Editor & Geometry</a>
          <div className="toc-sub">
            <a href="#geometry-flow">2.1. Geometry Workflow</a>
            <a href="#sketching">2.2. CAD Sketching</a>
            <a href="#sensor-config">2.3. Sensor Configuration</a>
          </div>
          <a href="#phase2-matrix">3. Phase 2: Matrix & Generation</a>
          <div className="toc-sub">
            <a href="#matrix-config">3.1. Matrix Configuration & Case Generation</a>
          </div>
          <a href="#phase3-results">4. Phase 3: Results & Validation</a>
          <div className="toc-sub">
            <a href="#mask-mgmt">4.1. Global Mask Management</a>
            <a href="#poly-edit">4.2. Polygon Editing</a>
            <a href="#cad-refinement">4.3. CAD Refinement</a>
          </div>
          <a href="#phase4-export">5. Phase 4: Hardware Export</a>

          <button className="toc-video-btn" onClick={() => setShowVideo(true)}>
            <span className="play-icon">▶</span> 6. Video Tutorial
          </button>
        </nav>
      </div>

      <div className="help-content-area">
        <div id="introduction" className="help-doc-section">
          <h1 className="doc-main-title">Safety Studio User Manual</h1>
          <p className="doc-intro">
            Welcome to the comprehensive guide for Safety Studio. This manual is designed to walk you 
            through the entire process of safety field generation, from raw CAD sketches to 
            hardware-ready deployments.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="phase1-editor" className="help-doc-section">
          <h2>Phase 1: Editor & Geometry Foundation</h2>
          <p>
            Define the physical robot and its environment. The Editor supports multiple layers: 
            Footprint, Load 1, and Load 2.
          </p>

          <h3 id="geometry-flow">2.1. Geometry Workflow</h3>
          <p>
            Start with the <strong>Footprint</strong> to define the base robot. Then, add <strong>Loads</strong> 
            which represent payloads.
          </p>

          <h3 id="sketching">2.2. CAD Sketching</h3>
          <p>
            The CAD Editor provides professional sketching tools to define complex robot shapes.
          </p>

          <ImageCarousel images={geometryImages} />

          <div className="screenshot-container">
            <img src="/help/manual/example_footprint_load_defined.png" alt="Defined State" />
            <p className="screenshot-caption">Complete Setup: Footprint and Loads fully defined.</p>
          </div>

          <h3 id="sensor-config">2.3. Sensor Configuration</h3>
          <p>
            Precisely define the mounting position (X, Y) and orientation (Angle) of each LiDAR sensor 
            relative to the robot's base link origin. You must also specify the <strong>Max Fields</strong> 
            configurable for your specific hardware.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual/lidarManager.png" alt="LiDAR Config" />
            <p className="screenshot-caption">LiDAR Manager: Configuring sensor placement and rotation constraints.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        <div id="phase2-matrix" className="help-doc-section">
          <h2>Phase 2: Matrix & Case Generation</h2>
          <p>
            Configure the physics and generate all necessary motion cases.
          </p>
          
          <ImageCarousel images={matrixImages} />

          <h3 id="matrix-config">3.1. Matrix Configuration & Case Generation</h3>
          <p>
            The <strong>Evaluation Matrix</strong> serves as the central hub for defining the robot's dynamic safety constraints. 
            This phase involves configuring critical <strong>Physics parameters</strong> (deceleration, reaction time), 
            and selecting the <strong>Generation Methodology</strong> (Sweep Union vs Hybrid). 
            Additionally, you can toggle <strong>Hull Polygon Sweep</strong> to use a simplified convex 
            hull of the combined robot and payload geometry as the sweep base. Once the 
            constraints are set, the system automatically generates a complete library of motion profiles, 
            populating the matrix with validated safety cases ready for inspection.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="phase3-results" className="help-doc-section">
          <h2>Phase 3: Results & Validation</h2>
          <p>
            Inspect and refine the generated safety fields.
          </p>

          <h3 id="mask-mgmt">4.1. Global Mask Management</h3>
          <p>
            Define exclusion zones that apply to all generated cases. Masks are used to hide 
            static robot parts from the sensors' field of view.
          </p>
          <ImageCarousel images={maskImages} />

          <h3 id="poly-edit">4.2. Manual Polygon Editing</h3>
          <p>
            Drag individual vertices to adjust the field boundary. You can also add new points by clicking 
            between existing ones or remove them to simplify the shape.
          </p>
          <ImageCarousel images={polygonEditImages} />

          <h3 id="cad-refinement">4.3. CAD-Based Refinement</h3>
          <p>
            Use parametric CAD tools to "patch" regions of the field. This supports Union (adding area) 
            and Subtraction (carving out area).
          </p>
          <ImageCarousel images={cadEditImages} />
        </div>

        <hr className="doc-divider" />

        <div id="phase4-export" className="help-doc-section">
          <h2>Phase 4: Hardware Export</h2>
          <p>
            Once validated, export your fieldsets to hardware-ready formats for your specific scanner models.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual/hardwareExport.png" alt="Hardware Export" />
            <p className="screenshot-caption">Hardware Manager: Reviewing and exporting the final safety field matrix.</p>
          </div>
        </div>

        <div className="help-footer-official">
          Safety Studio &bull; Documentation &bull; 2026
        </div>

        {showVideo && (
          <div className="video-modal-overlay" onClick={() => setShowVideo(false)}>
            <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowVideo(false)}>&times;</button>
              <div className="video-player-container-modal">
                <video 
                  controls 
                  className="tutorial-video-modal"
                  poster="/help/manual/results_page.png"
                  preload="auto"
                >
                  <source src="/tutorial.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
