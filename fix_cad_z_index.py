import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

# Find the CAD Sketcher block
start_str = "{/* 10. CAD Sketcher */}"
end_str = "})()}"
cad_start = content.find(start_str)
cad_end = content.find(end_str, cad_start) + len(end_str)

cad_block = content[cad_start:cad_end]

# Remove it from its current position
content = content[:cad_start] + content[cad_end:]

# Find where to insert it: after the parsedField block
insert_target = """                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (!isEditMode || editingTarget === 'protective') && parsedField.map((poly, i) => (
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

if insert_target in content:
    content = content.replace(insert_target, insert_target + "\n\n                " + cad_block)
else:
    print("Warning: Could not find insert_target")

with open("src/components/Results.js", "w") as f:
    f.write(content)

