import re

with open('src/components/Results.js', 'r') as f:
    text = f.read()

# 1. Colors
text = text.replace(
    "const FIELD_PROTECTIVE_COLOR = '#ff5252';",
    "const FIELD_PROTECTIVE_COLOR = '#ff5252';\nconst FIELD_WARNING_COLOR = '#FFD700';"
)
text = text.replace(
    "const FIELD_WARNING_COLOR = '#FF9800';",
    "" # Just in case it existed
)

# 2. Add state for editingTarget
if "const [editingTarget, setEditingTarget] = useState('protective');" not in text:
    text = text.replace(
        "const [activeLidar, setActiveLidar] = useState(null);",
        "const [activeLidar, setActiveLidar] = useState(null);\n  const [editingTarget, setEditingTarget] = useState('protective');"
    )

# 3. parsedLidarWarningClip
if "const parsedLidarWarningClip" not in text:
    text = text.replace(
        "const parsedLidarClip = (viewMode === 'LiDAR View' && activeLidar?.clip_wkt) ? parseWktWithTransform(activeLidar.clip_wkt, tObj.fn) : [];",
        "const parsedLidarClip = (viewMode === 'LiDAR View' && activeLidar?.clip_wkt) ? parseWktWithTransform(activeLidar.clip_wkt, tObj.fn) : [];\n  const parsedLidarWarningClip = (viewMode === 'LiDAR View' && activeLidar?.w_clip_wkt) ? parseWktWithTransform(activeLidar.w_clip_wkt, tObj.fn) : [];"
    )

# 4. Toolbar Segmented Control for protective/warning (only in Polygon mode if editing, but the user wanted it in normal view too!)
# "introduce new factor active_viewing_field in normal view... like editing or viewing target, remove the checkbox for the visibility of protective and warning fields cases will have this as subset warning and protective vield based on which is selected it will be used"
# Let's replace the visibility checkboxes for Protective and Warning fields.

text = re.sub(r'\{ id: \'P\', label: \'PROTECTIVE\',.*?\},', '', text, flags=re.DOTALL)
text = re.sub(r'\{ id: \'W\', label: \'WARNING\',.*?\},', '', text, flags=re.DOTALL)
text = re.sub(r'\{ id: \'FP\', label: \'FP\'', '{ id: \'FP\', label: \'FP\'', text)

# Add the segmented control before the Visibility toggles (or beside them)
if 'setEditingTarget' in text and 'PROTECTIVE / WARNING' not in text:
    target_ui = """
        <div style={{ width: 1, background: '#333', height: 16 }} />
        <div className="segmented-control" style={{ marginRight: 8 }}>
          <button className={`segmented-btn ${editingTarget === 'protective' ? 'active' : ''}`} onClick={() => setEditingTarget('protective')}>PROTECTIVE</button>
          <button className={`segmented-btn ${editingTarget === 'warning' ? 'active' : ''}`} onClick={() => setEditingTarget('warning')}>WARNING</button>
        </div>
"""
    text = text.replace('{/* Visibility Toggles */}', target_ui + '{/* Visibility Toggles */}')


# 5. Layer reordering and styling
def extract_block(marker, next_marker):
    start = text.find(marker)
    end = text.find(next_marker, start) if next_marker else text.find('</Layer>')
    if start == -1 or end == -1: return ""
    return text[start:end]

# Extract original blocks
b_static = extract_block("{/* 1. Static Sweeps", "{/* 2. Ghost Field")
b_ghost = extract_block("{/* 2. Ghost Field", "{/* 3a. CAD Preview")
b_preview = extract_block("{/* 3a. CAD Preview", "{/* 2. Inactive Field")
b_inact = extract_block("{/* 2. Inactive Field", "{/* 3. Active Field")
b_act = extract_block("{/* 3. Active Field", "{/* 9a. Safety Field")
b_f_handles = extract_block("{/* 9a. Safety Field", "{/* 10. CAD Sketcher")
b_cad = extract_block("{/* 10. CAD Sketcher", "{/* 4. Base Footprint")
b_fp = extract_block("{/* 4. Base Footprint", "{/* 5. Trajectories")
b_traj = extract_block("{/* 5. Trajectories", "{/* 6. Active Evaluated Load")
b_load = extract_block("{/* 6. Active Evaluated Load", "{/* 6. Ignored Area")
b_mask = extract_block("{/* 6. Ignored Area", "{/* 9b. Mask (Ignored) Handles")
b_m_handles = extract_block("{/* 9b. Mask (Ignored)", "{viewMode === 'LiDAR View'")
b_lidar = extract_block("{viewMode === 'LiDAR View' && (", "{/* 8. Sensors */}")
b_sensors = extract_block("{/* 8. Sensors */}", "</Layer>")

# Rewrite Active/Inactive blocks for Composite view
new_inact = """                {/* 2. Inactive Field (rendered first / bottom) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (
                  <>
                    {editingTarget !== 'protective' && parsedField.map((poly, i) => (
                      <Line key={`field-inact-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                    ))}
                    {editingTarget !== 'warning' && parsedWarning.map((poly, i) => (
                      <Line key={`warn-inact-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                    ))}
                  </>
                )}
"""

new_act = """                {/* 3. Active Field (rendered above inactive, but below handles) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (
                  <>
                    {editingTarget === 'protective' && parsedField.map((poly, i) => (
                      <Line key={`field-act-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
                    ))}
                    {editingTarget === 'warning' && parsedWarning.map((poly, i) => (
                      <Line key={`warn-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
                    ))}
                  </>
                )}
"""

new_lidar = """                {viewMode === 'LiDAR View' && (
                  <>
                    {/* Inactive Lidar Field */}
                    {editingTarget !== 'protective' && parsedLidarClip.map((poly, i) => (
                      <Line key={`lc-inact-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                    ))}
                    {editingTarget !== 'warning' && parsedLidarWarningClip.map((poly, i) => (
                      <Line key={`lwc-inact-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
                    ))}
                    
                    {/* Active Lidar Field */}
                    {editingTarget === 'protective' && parsedLidarClip.map((poly, i) => (
                      <Line key={`lc-act-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.6} listening={false} />
                    ))}
                    {editingTarget === 'warning' && parsedLidarWarningClip.map((poly, i) => (
                      <Line key={`lwc-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.6} listening={false} />
                    ))}
                  </>
                )}
"""

# Add listening={false} to mask
b_mask = b_mask.replace('closed', 'closed\n                    listening={false}')

new_layer_content = (
    b_static +
    b_ghost +
    b_preview +
    new_inact +
    new_act +
    new_lidar +
    b_fp +
    b_traj +
    b_load +
    b_mask +
    b_m_handles +
    b_f_handles +
    b_cad +
    b_sensors
)

start_idx = text.find("{/* 1. Static Sweeps")
end_idx = text.find("</Layer>")
if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_layer_content + text[end_idx:]

with open('src/components/Results.js', 'w') as f:
    f.write(text)
print("done")
