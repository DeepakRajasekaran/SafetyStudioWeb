import re

with open('src/components/Results.js', 'r') as f:
    text = f.read()

# 1. Colors
if 'FIELD_PROTECTIVE_COLOR' not in text:
    text = text.replace("const FIELD_STROKE_WIDTH = 1.5;", "const FIELD_STROKE_WIDTH = 1.5;\nconst FIELD_PROTECTIVE_COLOR = 'rgba(255, 0, 0, 1)';\nconst FIELD_WARNING_COLOR = '#FFD700';")

# 2. State
if 'const [editingTarget' not in text:
    text = text.replace("const [showLoad1, setShowLoad1] = useState(true);", "const [showLoad1, setShowLoad1] = useState(true);\n  const [editingTarget, setEditingTarget] = useState('protective');")

# 3. Parsed Variables
if 'const parsedWarning =' not in text:
    text = text.replace("const parsedField   = currentResult ? parseWktWithTransform(currentResult.final_field_wkt, tObj.fn) : [];", "const parsedField   = currentResult ? parseWktWithTransform(currentResult.final_field_wkt, tObj.fn) : [];\n  const parsedWarning = currentResult ? parseWktWithTransform(currentResult.warning_field_wkt, tObj.fn) : [];")

if 'const parsedLidarWarningClip' not in text:
    text = text.replace("const parsedLidarClip = (viewMode === 'LiDAR View' && activeLidar?.clip_wkt) ? parseWktWithTransform(activeLidar.clip_wkt, tObj.fn) : [];", "const parsedLidarClip = (viewMode === 'LiDAR View' && activeLidar?.clip_wkt) ? parseWktWithTransform(activeLidar.clip_wkt, tObj.fn) : [];\n  const parsedLidarWarningClip = (viewMode === 'LiDAR View' && activeLidar?.w_clip_wkt) ? parseWktWithTransform(activeLidar.w_clip_wkt, tObj.fn) : [];")

# 4. Inspector Text
if 'Warning Clip Exists' not in text:
    text = text.replace("txt += `Mount: ${activeLidar.mount}°\\n`;", "txt += `Mount: ${activeLidar.mount}°\\n`;\n      txt += `Warning Clip Exists: ${!!activeLidar.w_clip_wkt}\\n`;")

# 5. Buttons
btn_html = """        {(viewMode === 'Composite' || viewMode === 'LiDAR View') && !isEditingMask && (
          <div className="segmented-control" style={{ marginBottom: 4 }}>
             <button onClick={() => setEditingTarget('protective')} className={`segmented-btn ${editingTarget === 'protective' ? 'active' : ''}`} style={{ background: editingTarget === 'protective' ? '#1a4a25' : 'transparent', fontSize: '0.65rem' }}>
               PROTECTIVE
             </button>
             <button onClick={() => setEditingTarget('warning')} className={`segmented-btn ${editingTarget === 'warning' ? 'active' : ''}`} style={{ background: editingTarget === 'warning' ? '#ff9800' : 'transparent', color: editingTarget === 'warning' ? '#000' : '#aaa', fontSize: '0.65rem' }}>
               WARNING
             </button>
          </div>
        )}

        {viewMode === 'Composite' && (isEditMode || isEditingMask) && ("""
if 'PROTECTIVE / WARNING' not in text and 'setEditingTarget(' not in text:
    text = text.replace("{viewMode === 'Composite' && (isEditMode || isEditingMask) && (", btn_html)

# 6. Rendering Logic for Field
old_field = """                {/* 2. Ghost Field (Reference) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIdeal.map((poly, i) => (
                  <Line key={`ideal-${i}`} points={poly} stroke="#444" strokeWidth={1/scale} dash={[5/scale, 5/scale]} closed />
                ))}

                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedField.map((poly, i) => (
                  <Line 
                    key={`field-${i}`} 
                    points={poly} 
                    fill={isEditMode && resultsMode === 'cad' ? "rgba(255, 215, 0, 0.2)" : FIELD_GOLD_FILL} 
                    stroke={FIELD_GOLD_STROKE} 
                    strokeWidth={FIELD_STROKE_WIDTH/scale} 
                    closed
                  />
                ))}"""

new_field = """                {/* 2. Ghost Field (Reference) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIdeal.map((poly, i) => (
                  <Line key={`ideal-${i}`} points={poly} stroke="#444" strokeWidth={1/scale} dash={[5/scale, 5/scale]} closed />
                ))}

                {/* 2. Inactive Field (rendered first / bottom) */}
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
                {/* 3. Active Field (rendered above inactive, but below handles) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (
                  <>
                    {editingTarget === 'protective' && parsedField.map((poly, i) => (
                      <Line key={`field-act-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
                    ))}
                    {editingTarget === 'warning' && parsedWarning.map((poly, i) => (
                      <Line key={`warn-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
                    ))}
                  </>
                )}"""
if 'field-inact-' not in text:
    text = text.replace(old_field, new_field)

# 7. Rendering Logic for Lidar
old_lidar = """                {/* 8. Active Sensor Focus */}
                {viewMode === 'LiDAR View' && parsedLidarClip.map((poly, i) => {
                   const lidarIdx = lidarList.findIndex(l => l.name === activeLidar?.name);
                   const lidarColor = LIDAR_COLORS[lidarIdx % LIDAR_COLORS.length] || FIELD_GOLD_FILL;
                   return (
                    <Line key={`lc-${i}`} points={poly} fill={lidarColor} stroke={lidarColor} strokeWidth={2/scale} closed
                    listening={false} />
                   );
                 })}"""

new_lidar = """                {/* 8. Active Sensor Focus */}
                {viewMode === 'LiDAR View' && (
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
                )}"""

if 'lc-inact-' not in text:
    text = text.replace(old_lidar, new_lidar)

with open('src/components/Results.js', 'w') as f:
    f.write(text)

print("Patched Results.js successfully.")
