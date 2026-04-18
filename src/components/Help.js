import React from 'react';

const Help = () => {
  return (
    <div className="help-container" style={{ padding: '20px 40px', color: '#ddd', width: '100%', height: '100%', overflowY: 'auto', margin: '0', lineHeight: '1.6' }}>
      <h1 style={{ color: '#4CAF50', borderBottom: '1px solid #333', paddingBottom: '10px' }}>Safety Studio User Guide</h1>
      <p>This tool generates safety fields for mobile robots based on kinematic footprints and braking physics.</p>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>1. Editor Tab</h2>
      <ul>
        <li><strong>Footprint:</strong> Import a DXF file defining the robot's base shape or use the sketching tools.</li>
        <li><strong>Sensors:</strong> Configure LiDAR placement (X, Y), Mounting Angle, FOV, Range, and <strong>Diameter</strong>.</li>
        <li><strong>Lidar Capacity:</strong> Use the <strong>CAPACITY</strong> input at the top of the manager to set the maximum allowed fields globally.</li>
        <li><strong>Loads:</strong> Load additional DXF shapes for L1/L2 configurations.</li>
      </ul>
      <p><em style={{ color: '#aaa' }}>Note: The DXF origin (0,0) is considered the <strong>base_link</strong>.</em></p>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>2. Geometric Sketching</h2>
      <p>Create precise robot footprints and safety field zones directly in the browser.</p>
      <ul>
        <li><strong>Drawing Tools:</strong> Use <strong>Line</strong>, <strong>Circle</strong>, or <strong>Rect</strong> to define geometry.
          <ul>
            <li><em>Polylines:</em> The Line tool allows chaining; double-click or press Enter to finalize the path.</li>
            <li><em>Snap:</em> Tools automatically snap to existing vertices and edges for precision.</li>
          </ul>
        </li>
        <li><strong>Global Modifiers:</strong>
          <ul>
            <li><strong>Construction:</strong> Shapes drawn in this mode (dashed) are for reference/constraints only and are ignored in the final safety field.</li>
            <li><strong>Subtract:</strong> Shapes drawn in red act as cutouts (holes) in the robot footprint.</li>
          </ul>
        </li>
        <li><strong>Constraints & Dimensions:</strong>
          <ul>
            <li><strong>Constraints:</strong> Select two elements to apply geometric relationships (Equal, Parallel, Perpendicular, etc.).</li>
            <li><strong>Dimensions:</strong> Click an edge or two points to set precise distances. Click an existing dimension label to edit its value and tolerance.</li>
            <li><strong>Anchors:</strong> Use the Anchor tool to fix specific points to the canvas (the origin is fixed by default).</li>
          </ul>
        </li>
        <li><strong>Selection & Editing:</strong>
          <ul>
            <li><strong>Marquee:</strong> Double-click on empty space to start a rectangular selection box.</li>
            <li><strong>Multi-select:</strong> Hold <strong>Shift</strong> while clicking to select multiple shapes.</li>
            <li><strong>Delete:</strong> Press <strong>Delete</strong> or <strong>Backspace</strong> to remove selected elements.</li>
          </ul>
        </li>
      </ul>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>3. Evaluation Matrix</h2>
      <ul>
        <li><strong>Intensity Levels:</strong> Replaces simple counts. Cases are generated at uniform velocity intervals (Effective Step) from 0 up to Max V.</li>
        <li><strong>Scale to Hardware:</strong> Automatically calculates the maximum Intensity Levels that fit within your configured Lidar Capacity.</li>
        <li><strong>Motion Types:</strong>
          <ul>
            <li><strong>Forward/Reverse:</strong> Linear motion cases.</li>
            <li><strong>Curve / Turn:</strong> Angular motion cases.</li>
            <li><strong>In-place Rotate:</strong> v=0 rotation cases.</li>
            <li><strong>Idle (Stop):</strong> v=0, w=0 safety field.</li>
          </ul>
        </li>
        <li><strong>Sorting:</strong> All cases are generated in strictly ascending numerical order (e.g., -1.0 to +1.0).</li>
      </ul>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>4. Results Tab</h2>
      <ul>
        <li><strong>View Modes:</strong>
          <ul>
            <li><strong>Composite:</strong> Shows all active sensor fields merged.</li>
            <li><strong>LiDAR View:</strong> Shows individual sensor fields with consistent color outlines.</li>
            <li><strong>Sweep Steps:</strong> Visualizes the intermediate footprint projections.</li>
          </ul>
        </li>
        <li><strong>Case Explorer:</strong> Select results from the sidebar to view detailed calculations.</li>
        <li><strong>Inspector:</strong> Disabled by default; toggle it via the (i) icon to see vertex coordinates.</li>
      </ul>

      <h2 style={{ color: '#2196F3', marginTop: '30px' }}>5. Hardware Export Tab</h2>
      <ul>
        <li><strong>Global Capacity:</strong> Shows the remaining field slots based on your configuration.</li>
        <li><strong>Sequential Auto-Gen:</strong> Pairs evaluation cases into fieldsets of 2 fields each in Matrix order.</li>
        <li><strong>Warnings:</strong> Fieldsets with uncalculated cases are marked with a ⚠️ icon.</li>
        <li><strong>Export:</strong> Download SICK XML (.sdxml) or Leuze CSV (.zip) packages.</li>
      </ul>

      <div style={{ marginTop: '50px', borderTop: '1px solid #333', paddingTop: '20px', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
        Safety Studio Web Migration &bull; 2026
      </div>
    </div>
  );
};

export default Help;
