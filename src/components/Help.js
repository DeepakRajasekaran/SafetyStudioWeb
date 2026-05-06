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
    // The useEffect dependency on activeIndex will naturally "reset" the interval 
    // because the previous interval is cleared and a new one starts from the new index.
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
    { src: '/help/manual/physics_and_matrix_generator2.png', title: 'Generation Config', alt: 'Gen Config', caption: 'Selecting motion types and intensity levels.' },
    { src: '/help/manual/physics_and_matrix_generator3.png', title: 'Field Methodology', alt: 'Methodology', caption: 'Choosing between Sweep Union and Hybrid generation.' },
    { src: '/help/manual/physics_and_matrix_generator4.png', title: 'Shadow Toggle', alt: 'Shadows', caption: 'Enabling shadow analysis for specific load cases.' },
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
          </div>
          <a href="#phase2-matrix">3. Phase 2: Matrix & Generation</a>
          <div className="toc-sub">
            <a href="#matrix-flow">3.1. Case Generation</a>
            <a href="#shadow-mgmt">3.2. Shadow Analysis</a>
          </div>
          <a href="#phase3-results">4. Phase 3: Results & Validation</a>
          <div className="toc-sub">
            <a href="#poly-edit">4.1. Polygon Editing</a>
            <a href="#cad-refinement">4.2. CAD Refinement</a>
            <a href="#shadow-view">4.3. Shadow Visualization</a>
          </div>
          <a href="#phase4-mask">5. Phase 4: Mask Management</a>
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
          
          <ImageCarousel images={geometryImages} />

          <h3 id="geometry-flow">2.1. Geometry Workflow</h3>
          <p>
            Start with the <strong>Footprint</strong> to define the base robot. Then, add <strong>Loads</strong> 
            which represent payloads. These loads are critical for calculating sensor shadows.
          </p>

          <h3 id="sketching">2.2. CAD Sketching</h3>
          <p>
            The CAD Editor provides professional sketching tools to define complex robot shapes.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual/example_footprint_load_defined.png" alt="Defined State" />
            <p className="screenshot-caption">Complete Setup: Footprint and Loads fully defined.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        <div id="phase2-matrix" className="help-doc-section">
          <h2>Phase 2: Matrix & Case Generation</h2>
          <p>
            Configure the physics and generate all necessary motion cases.
          </p>
          
          <ImageCarousel images={matrixImages} />

          <h3 id="matrix-flow">3.1. Automated Generation</h3>
          <p>
            The <strong>Evaluation Matrix</strong> allows you to specify velocity steps and 
            motion types. Click <strong>Generate All Cases</strong> to populate the library 
            automatically based on your constraints.
          </p>

          <h3 id="shadow-mgmt">3.2. Shadow Analysis</h3>
          <p>
            Configure how payloads obstruct sensor visibility by toggling shadow zones per load.
          </p>
        </div>

        <hr className="doc-divider" />

        <div id="phase3-results" className="help-doc-section">
          <h2>Phase 3: Results & Validation</h2>
          <p>
            Inspect and refine the generated safety fields.
          </p>

          <h3 id="poly-edit">4.1. Manual Polygon Editing</h3>
          <p>
            Drag individual vertices to adjust the field boundary. You can also add new points by clicking 
            between existing ones or remove them to simplify the shape.
          </p>
          <ImageCarousel images={polygonEditImages} />

          <h3 id="cad-refinement">4.2. CAD-Based Refinement</h3>
          <p>
            Use parametric CAD tools to "patch" regions of the field. This supports Union (adding area) 
            and Subtraction (carving out area).
          </p>
          <ImageCarousel images={cadEditImages} />

          <h3 id="shadow-view">4.3. Shadow Visualization</h3>
          <p>
            The system automatically calculates <strong>Shadow Zones</strong> (Red) where 
            the load obstructs the sensor's line of sight.
          </p>
          <div className="screenshot-container">
            <img src="/help/manual/generated_shadow_for_load2.png" alt="Shadows" />
            <p className="screenshot-caption">Shadow Generation: Identifying blind spots caused by the payload.</p>
          </div>
        </div>

        <hr className="doc-divider" />

        <div id="phase4-mask" className="help-doc-section">
          <h2>Phase 4: Global Mask Management</h2>
          <p>
            Define exclusion zones that apply to all generated cases.
          </p>
          <ImageCarousel images={maskImages} />
        </div>

        <div className="help-footer-official">
          Safety Studio &bull; Professional Engineering Documentation &bull; 2026
        </div>
      </div>
    </div>
  );
};

export default Help;
