import sys
import re

with open("src/components/Results.js", "r") as f:
    content = f.read()

# 1. Add editingTarget state
if "const [isEditingMask, setIsEditingMask] = useState(false);" in content:
    content = content.replace("const [isEditingMask, setIsEditingMask] = useState(false);",
                              "const [isEditingMask, setIsEditingMask] = useState(false);\n  const [editingTarget, setEditingTarget] = useState('protective');")

# 2. Update baseWkt
old_basewkt = "const baseWkt = isEditMode ? currentResult?.final_field_wkt : currentResult?.ignored_wkt;"
new_basewkt = "const baseWkt = isEditMode ? (editingTarget === 'warning' ? currentResult?.warning_field_wkt : currentResult?.final_field_wkt) : currentResult?.ignored_wkt;"
content = content.replace(old_basewkt, new_basewkt)

# 3. Update field parsing and editing getters (handlePointDrag, handlePointDelete, handleEdgeClick, syncPolyToWkt)
def replace_wkt_ref(func_name, code):
    return code.replace(f"if (!currentResult?.final_field_wkt) return;", 
                        f"const targetWkt = editingTarget === 'warning' ? currentResult?.warning_field_wkt : currentResult?.final_field_wkt;\n    if (!targetWkt) return;")\
               .replace(f"parseWktToKonva(currentResult.final_field_wkt)", f"parseWktToKonva(targetWkt)")

for func in ["handlePointDrag", "handlePointDelete", "handleEdgeClick"]:
    # naive replace
    content = content.replace(f"if (!currentResult?.final_field_wkt) return;\n    pushToHistory();\n    const raw = parseWktToKonva(currentResult.final_field_wkt);",
                              f"const targetWkt = editingTarget === 'warning' ? currentResult?.warning_field_wkt : currentResult?.final_field_wkt;\n    if (!targetWkt) return;\n    pushToHistory();\n    const raw = parseWktToKonva(targetWkt);")

# Update syncPolyToWkt
sync_old = "setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], final_field_wkt: wktStr } }));"
sync_new = "setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], [editingTarget === 'warning' ? 'warning_field_wkt' : 'final_field_wkt']: wktStr } }));"
content = content.replace(sync_old, sync_new)

# 4. Save logic in CAD Mode (around line 835-850)
cad_save_old = """                const updatedCases = [...evaluationCases];
                const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
                if (idx !== -1) {
                  updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };"""
cad_save_new = """                const updatedCases = [...evaluationCases];
                const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
                if (idx !== -1) {
                  if (editingTarget === 'warning') {
                      updatedCases[idx] = { ...updatedCases[idx], custom_warning_dxf: finalWkt };
                  } else {
                      updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };
                  }"""
content = content.replace(cad_save_old, cad_save_new)

# 5. Save logic in Polygon Mode (around line 925)
poly_save_old = """                const finalWkt = currentResult?.final_field_wkt;
                if (finalWkt) {
                  const updatedCases = [...evaluationCases];
                  const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
                  if (idx !== -1) {
                    updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };"""
poly_save_new = """                const finalWkt = editingTarget === 'warning' ? currentResult?.warning_field_wkt : currentResult?.final_field_wkt;
                if (finalWkt) {
                  const updatedCases = [...evaluationCases];
                  const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
                  if (idx !== -1) {
                    if (editingTarget === 'warning') {
                        updatedCases[idx] = { ...updatedCases[idx], custom_warning_dxf: finalWkt };
                    } else {
                        updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };
                    }"""
content = content.replace(poly_save_old, poly_save_new)

# 6. Add UI toggle
ui_toggle = """        {viewMode === 'Composite' && (isEditMode || isEditingMask) && (
          <div className="segmented-control">
             <button onClick={() => setResultsMode('polygon')} className={`segmented-btn ${resultsMode === 'polygon' ? 'active' : ''}`}>
               POLYGON
             </button>
             <button onClick={() => setResultsMode('cad')} className={`segmented-btn ${resultsMode === 'cad' ? 'active' : ''}`}>
               CAD
             </button>
          </div>
        )}"""
ui_toggle_new = """        {viewMode === 'Composite' && (isEditMode && !isEditingMask) && (
          <div className="segmented-control" style={{ marginBottom: 4 }}>
             <button onClick={() => setEditingTarget('protective')} className={`segmented-btn ${editingTarget === 'protective' ? 'active' : ''}`} style={{ background: editingTarget === 'protective' ? '#1a4a25' : 'transparent', fontSize: '0.65rem' }}>
               PROTECTIVE
             </button>
             <button onClick={() => setEditingTarget('warning')} className={`segmented-btn ${editingTarget === 'warning' ? 'active' : ''}`} style={{ background: editingTarget === 'warning' ? '#ff9800' : 'transparent', color: editingTarget === 'warning' ? '#000' : '#aaa', fontSize: '0.65rem' }}>
               WARNING
             </button>
          </div>
        )}
""" + ui_toggle
content = content.replace(ui_toggle, ui_toggle_new)

# 7. Add Warning Field rendering and visibility
# Around "3. Safety Field"
protective_render = """                {/* 3. Safety Field (GOLD - Parity Color #FFD700) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedField.map((poly, i) => (
                  <Line 
                    key={`field-${i}`} 
                    points={poly} 
                    fill={FIELD_GOLD_FILL} 
                    stroke={FIELD_GOLD_STROKE} 
                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : (isEditMode ? 2/scale : 0)} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--protective-field-opacity', '0.8'))}
                  />
                ))}"""

warning_and_protective_render = """                {/* 2.5 Warning Field */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (!isEditMode || editingTarget === 'warning') && parsedWarning.map((poly, i) => (
                  <Line 
                    key={`warn-${i}`} 
                    points={poly} 
                    fill={getCssVar('--warning-field-color', '#FFC640')} 
                    stroke={getCssVar('--warning-field-color', '#FFC640')} 
                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : (isEditMode ? 2/scale : 0)} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--warning-field-opacity', '0.5'))}
                  />
                ))}

                {/* 3. Safety Field (GOLD - Parity Color #FFD700) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (!isEditMode || editingTarget === 'protective') && parsedField.map((poly, i) => (
                  <Line 
                    key={`field-${i}`} 
                    points={poly} 
                    fill={FIELD_GOLD_FILL} 
                    stroke={FIELD_GOLD_STROKE} 
                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : (isEditMode ? 2/scale : 0)} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--protective-field-opacity', '0.5'))}
                  />
                ))}"""

content = content.replace(protective_render, warning_and_protective_render)


# Render editable polygon nodes conditionally
# Around line 1175
poly_nodes_old = """                {isEditMode && resultsMode === 'polygon' && parsedField.map((poly, polyIdx) => ("""
poly_nodes_new = """                {isEditMode && resultsMode === 'polygon' && (editingTarget === 'warning' ? parsedWarning : parsedField).map((poly, polyIdx) => ("""
content = content.replace(poly_nodes_old, poly_nodes_new)


with open("src/components/Results.js", "w") as f:
    f.write(content)
