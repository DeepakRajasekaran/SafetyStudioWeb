import React, { useState } from 'react';
import './Help.css';

const Help = () => {
  const [activeTab, setActiveTab] = useState('getting-started');

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveTab(id);
    }
  };

  return (
    <div className="help-page-container">
      {/* Sidebar Navigation */}
      <div className="help-sidebar">
        <h3>Documentation</h3>
        <button 
          className={`help-nav-item ${activeTab === 'getting-started' ? 'active' : ''}`}
          onClick={() => scrollToSection('getting-started')}
        >
          Getting Started
        </button>
        <button 
          className={`help-nav-item ${activeTab === 'robot-geometry' ? 'active' : ''}`}
          onClick={() => scrollToSection('robot-geometry')}
        >
          Robot Geometry
        </button>
        <button 
          className={`help-nav-item ${activeTab === 'sensor-config' ? 'active' : ''}`}
          onClick={() => scrollToSection('sensor-config')}
        >
          Sensor Configuration
        </button>
        <button 
          className={`help-nav-item ${activeTab === 'motion-matrix' ? 'active' : ''}`}
          onClick={() => scrollToSection('motion-matrix')}
        >
          Evaluation Matrix
        </button>
        <button 
          className={`help-nav-item ${activeTab === 'export-tools' ? 'active' : ''}`}
          onClick={() => scrollToSection('export-tools')}
        >
          Export & Tools
        </button>
      </div>

      {/* Main Content Area */}
      <div className="help-content-area">
        <div className="help-breadcrumb">
          Safety Studio <span>/</span> Documentation <span>/</span> {activeTab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </div>

        <section id="getting-started" className="help-section">
          <h1>User Documentation</h1>
          <p>
            Welcome to the <strong>Safety Studio</strong> user guide. This platform provides specialized tools for designing, 
            simulating, and exporting certified safety field configurations for mobile industrial robots.
          </p>
          <div className="info-box">
            <p><strong>Note:</strong> All physical dimensions in this tool are processed in <strong>Meters (m)</strong> and <strong>Degrees (°)</strong> unless otherwise specified.</p>
          </div>
        </section>

        <section id="robot-geometry" className="help-section">
          <h2>Robot Geometry & Swept Areas</h2>
          <p>
            The foundation of a safety field is the robot's physical footprint. The tool uses this footprint 
            to calculate the "Swept Area"—the total physical space occupied by the robot as it moves along a path.
          </p>
          <ul>
            <li><strong>Footprint Import:</strong> Use the <em>Editor</em> tab to upload a DXF file or sketch the base link.</li>
            <li><strong>Safety Boundary:</strong> The boundary is calculated based on the maximum extent of the robot, including any dynamic loads.</li>
          </ul>
          <div className="help-illustration">
            <img src="/help/swept_area_literal.png" alt="Swept Area Schematic" />
            <div className="help-illustration-caption">Figure 1: Relationship between Robot Footprint and generated Swept Area.</div>
          </div>
        </section>

        <section id="sensor-config" className="help-section">
          <h2>LiDAR Sensor Configuration</h2>
          <p>
            Sensors are the 'eyes' of the safety system. Accurate placement and configuration are critical for eliminating blind spots.
          </p>
          <ul>
            <li><strong>Placement:</strong> Position sensors using (X, Y) coordinates relative to the robot's center (base_link).</li>
            <li><strong>Field of View (FOV):</strong> Define the scanning sector. Standard industrial sensors often support 270°.</li>
            <li><strong>Mounting Angle:</strong> Rotate the sensor orientation to cover specific corners or sides.</li>
          </ul>
          <div className="help-illustration">
            <img src="/help/lidar_fov_literal.png" alt="LiDAR Configuration Schematic" />
            <div className="help-illustration-caption">Figure 2: LiDAR Field of View (FOV) and Range configuration.</div>
          </div>
        </section>

        <section id="motion-matrix" className="help-section">
          <h2>Evaluation Matrix</h2>
          <p>
            The matrix defines the set of motion cases (velocities and paths) for which safety fields must be generated.
          </p>
          <ul>
            <li><strong>Forward/Reverse:</strong> Linear paths at varying velocities.</li>
            <li><strong>Turning/Curving:</strong> Paths with specific radii for cornering.</li>
            <li><strong>In-Place Rotation:</strong> Stationary rotation at defined angular velocities.</li>
          </ul>
          <div className="help-illustration">
            <img src="/help/motion_types_literal.png" alt="Motion Types Icons" />
            <div className="help-illustration-caption">Figure 3: Primary motion types supported for field generation.</div>
          </div>
        </section>

        <section id="export-tools" className="help-section">
          <h2>Exporting to Hardware</h2>
          <p>
            Once fields are generated, they can be grouped into fieldsets and exported for specific sensor hardware.
          </p>
          <ul>
            <li><strong>SICK XML (.sdxml):</strong> For SICK MicroScan3 and nanoScan3 sensors.</li>
            <li><strong>Leuze CSV:</strong> For Leuze RSL400 series sensors.</li>
            <li><strong>Validation:</strong> Ensure all cases are calculated (no warning icons) before final export.</li>
          </ul>
        </section>

        <div className="help-footer-official">
          Safety Studio Web Migration &bull; Quality Management System &bull; 2026
        </div>
      </div>
    </div>
  );
};

export default Help;
