import React from 'react';

const Help = () => {
  return (
    <div className="help-container" style={{ padding: '20px 40px', color: '#ddd', width: '100%', height: '100%', overflowY: 'auto', margin: '0', lineHeight: '1.6' }}>
      <h1 style={{ color: '#4CAF50', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Safety Studio User Guide</h1>
      <p>This tool generates safety fields for mobile robots based on kinematic footprints and braking physics.</p>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>1. Editor Tab</h2>
      <ul>
        <li><strong>Footprint:</strong> Import a DXF file defining the robot's base shape.</li>
        <li><strong>Sensors:</strong> Configure LiDAR placement (X, Y), Mounting Angle, FOV, Range, and <strong>Diameter</strong> (for self-occlusion).</li>
        <li><strong>Loads:</strong> Load additional DXF shapes for L1/L2 configurations (e.g., pallets).</li>
      </ul>
      <p><em style={{ color: '#aaa' }}>Note: The DXF origin (0,0) is considered the <strong>base_link</strong>.</em></p>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>2. Generation Tab</h2>
      <ul>
        <li><strong>Physics Config:</strong>
          <ul>
            <li><strong>Tr:</strong> System reaction time (seconds).</li>
            <li><strong>ac:</strong> Deceleration limit (m/s²).</li>
            <li><strong>Ds:</strong> Safety buffer distance (meters).</li>
          </ul>
        </li>
        <li><strong>Plan Auto-Gen:</strong>
          <ul>
            <li>Define velocity ranges (Max V, Max W) and step counts per load.</li>
            <li><strong>Shadow:</strong> Enable blind spot calculation based on footprint/load geometry occluding the LiDAR.</li>
            <li><strong>Inc Shape:</strong> Automatically merge load geometry into the footprint for safety distance calculation.</li>
          </ul>
        </li>
      </ul>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>3. Results Tab</h2>
      <ul>
        <li><strong>View Modes:</strong>
          <ul>
            <li><strong>Composite:</strong> Shows all active sensor fields merged.</li>
            <li><strong>LiDAR View:</strong> Shows individual sensor fields with coordinate transforms.</li>
            <li><strong>Sweep Steps:</strong> Visualizes the intermediate footprint projections.</li>
          </ul>
        </li>
        <li><strong>Interactive Editing:</strong> Use the <strong>Edit Poly</strong> toggle to manually modify vertex positions on the canvas.</li>
      </ul>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>4. Hardware Export Tab</h2>
      <ul>
        <li><strong>Fieldsets:</strong> Organize safety fields into sets for hardware import.</li>
        <li><strong>Auto-Gen:</strong> Automatically group fields by Load case (NoLoad, Load1, Load2) into sequential sets.</li>
        <li><strong>Export:</strong> Download SICK XML (.sdxml) or Leuze CSV (.zip) packages.</li>
      </ul>

      <div style={{ marginTop: '50px', borderTop: '1px solid #333', paddingTop: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        Safety Studio Web Migration &bull; 2026
      </div>
    </div>
  );
};

export default Help;
