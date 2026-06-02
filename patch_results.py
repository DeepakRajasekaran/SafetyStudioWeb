import re

with open('src/components/Results.js', 'r') as f:
    content = f.read()

# 1. Update syncPolyToWkt
content = content.replace(
    "const syncPolyToWkt = (rawPolys) => {",
    "const syncPolyToWkt = (rawPolys, fieldKey = 'final_field_wkt') => {"
)
content = content.replace(
    "setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], final_field_wkt: wktStr } }));",
    "setResults(prev => ({ ...prev, [selectedCaseId]: { ...prev[selectedCaseId], [fieldKey]: wktStr } }));"
)

# 2. Update handlePointDrag, Delete, EdgeClick
def replace_handler(func_name, content):
    pattern = rf"(const {func_name} =.*?{{)\s*if \(!currentResult\?\.final_field_wkt\) return;\s*pushToHistory\(\);\s*const raw = parseWktToKonva\(currentResult\.final_field_wkt\);"
    replacement = f"""\\1
    const targetKey = editingTarget === 'warning' ? 'warning_field_wkt' : 'final_field_wkt';
    if (!currentResult?.[targetKey]) return;
    pushToHistory();
    const raw = parseWktToKonva(currentResult[targetKey]);"""
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # replace the trailing syncPolyToWkt
    sync_pattern = rf"raw\[polyIdx\] = .*?;\s*syncPolyToWkt\(raw\);\s*}};"
    
    # Find the function end and replace it
    def sync_repl(m):
        return m.group(0).replace("syncPolyToWkt(raw);", "syncPolyToWkt(raw, targetKey);")
    
    # Just replace all syncPolyToWkt(raw) -> syncPolyToWkt(raw, targetKey) globally within those functions if we can
    # But since they are local, a simple string replace is easier. We will just replace it later.
    return content

content = replace_handler('handlePointDrag', content)
content = replace_handler('handlePointDelete', content)
content = replace_handler('handleEdgeClick', content)

content = content.replace("syncPolyToWkt(raw);", "syncPolyToWkt(raw, targetKey);")

# 3. Layer Ordering Fixes
# Add refs
refs_code = """  const cadRef = useRef(null);
  const layerRef = useRef(null);
  const fieldGroupRef = useRef(null);
  const maskGroupRef = useRef(null);
  const handlesGroupRef = useRef(null);

  // Force Z-index ordering for Firefox Konva rendering reconciliation
  useEffect(() => {
    if (fieldGroupRef.current) fieldGroupRef.current.moveToTop();
    if (maskGroupRef.current) maskGroupRef.current.moveToTop();
    if (handlesGroupRef.current) handlesGroupRef.current.moveToTop();
  });"""
content = content.replace(
    "  const cadRef = useRef(null);\n  const layerRef = useRef(null);",
    refs_code
)

# Wrap Fields
content = content.replace(
    "{/* 2. Inactive Field (rendered first / bottom) */}",
    "  <Group ref={fieldGroupRef} name=\"composite-fields\">\n                {/* 2. Inactive Field (rendered first / bottom) */}"
)
content = content.replace(
    "                    {editingTarget === 'warning' && parsedWarning.map((poly, i) => (\n                      <Line key={`warn-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />\n                    ))}\n                  </>\n                )}",
    "                    {editingTarget === 'warning' && parsedWarning.map((poly, i) => (\n                      <Line key={`warn-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />\n                    ))}\n                  </>\n                )}\n              </Group>"
)

# Wrap Mask
content = content.replace(
    "{/* 6. Ignored Area (Z 30 equivalent - Rendered Higher) */}",
    "<Group ref={maskGroupRef} name=\"mask-layer\">\n                {/* 6. Ignored Area (Z 30 equivalent - Rendered Higher) */}"
)
content = content.replace(
    "                  {/* 6b. CAD Preview Mask (live boolean result for MASK) */}\n                {isEditingMask && resultsMode === 'cad' && previewFieldWkt && (() => {\n                  const transformFn = viewMode === 'LiDAR View' ? tObj.inv : tObj.fn;\n                  return parseWktWithTransform(previewFieldWkt, transformFn).map((poly, i) => (\n                    <Line\n                      key={`mask-preview-${i}`}\n                      points={poly}\n                      fill={IGNORED_GRAY_FILL}\n                      stroke=\"#00e676\"\n                      strokeWidth={2/scale}\n                      closed\n                      dash={[6/scale, 3/scale]}\n                      listening={false}\n                    />\n                  ));\n                })()}",
    "                  {/* 6b. CAD Preview Mask (live boolean result for MASK) */}\n                {isEditingMask && resultsMode === 'cad' && previewFieldWkt && (() => {\n                  const transformFn = viewMode === 'LiDAR View' ? tObj.inv : tObj.fn;\n                  return parseWktWithTransform(previewFieldWkt, transformFn).map((poly, i) => (\n                    <Line\n                      key={`mask-preview-${i}`}\n                      points={poly}\n                      fill={IGNORED_GRAY_FILL}\n                      stroke=\"#00e676\"\n                      strokeWidth={2/scale}\n                      closed\n                      dash={[6/scale, 3/scale]}\n                      listening={false}\n                    />\n                  ));\n                })()}\n                </Group>"
)

# Wrap Handles (Wait, the previous regex failed because I need to be careful with where I wrap handles)
content = content.replace(
    "{/* 9a. Safety Field Handles */}\n                {isEditMode && resultsMode === 'polygon' && viewMode === 'Composite' && parsedField.map((poly, polyIdx) => {",
    "{/* 9a. Safety Field Handles */}\n                <Group ref={handlesGroupRef} name=\"handles-layer\">\n                {isEditMode && resultsMode === 'polygon' && viewMode === 'Composite' && (editingTarget === 'warning' ? parsedWarning : parsedField).map((poly, polyIdx) => {"
)
# We also need to close the Group after handles map
content = content.replace(
    "                     </Group>\n                   );\n                })}\n\n                {/* 9b. Mask (Ignored) Handles */}",
    "                     </Group>\n                   );\n                })}\n                </Group>\n\n                {/* 9b. Mask (Ignored) Handles */}"
)

# LiDAR View Fields Move
lidar_block = """
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
                )}
"""

content = content.replace(lidar_block.strip(), "")
content = content.replace("              </Group>\n\n                {/* 4. Base Footprint Outline (Z 10 equivalent) */}", f"              </Group>\n\n                {lidar_block.strip()}\n\n                {{/* 4. Base Footprint Outline (Z 10 equivalent) */}}")

with open('src/components/Results.js', 'w') as f:
    f.write(content)

