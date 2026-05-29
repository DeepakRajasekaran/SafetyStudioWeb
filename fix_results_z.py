import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

# 1. Remove the opacity and strokeWidth logic that makes the field "jump" or change visually
# Find the Warning Field rendering block
warning_old = """                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : (isEditMode ? 2/scale : 0)} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--warning-field-opacity', '0.5'))}"""

warning_new = """                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : 0} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--warning-field-opacity', '0.5'))}"""
content = content.replace(warning_old, warning_new)

field_old = """                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : (isEditMode ? 2/scale : 0)} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--protective-field-opacity', '0.5'))}"""

field_new = """                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : 0} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--protective-field-opacity', '0.5'))}"""
content = content.replace(field_old, field_new)

# 2. Extract 9a and 9b handles blocks
handles_start_marker = "{/* 9a. Safety Field Handles */}"
handles_end_marker = "{/* 10. CAD Sketcher */}"
start_idx = content.find(handles_start_marker)
end_idx = content.find(handles_end_marker)

if start_idx != -1 and end_idx != -1:
    handles_block = content[start_idx:end_idx]
    content = content[:start_idx] + content[end_idx:]

    # Find insertion point: after CAD Sketcher block which we just moved.
    # We moved CAD Sketcher to after `{/* 3. Safety Field ... */}`. 
    # Let's insert the handles block right after the CAD Sketcher block.
    # The CAD Sketcher block ends with "})()}"
    # So let's find the first "})()}" after "10. CAD Sketcher"
    cad_marker = "{/* 10. CAD Sketcher */}"
    cad_idx = content.find(cad_marker)
    if cad_idx != -1:
        cad_end = content.find("})()}", cad_idx)
        if cad_end != -1:
            insert_pos = cad_end + 5
            content = content[:insert_pos] + "\n\n                " + handles_block + "\n" + content[insert_pos:]

with open("src/components/Results.js", "w") as f:
    f.write(content)

