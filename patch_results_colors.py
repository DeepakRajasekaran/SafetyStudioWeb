import sys

with open("src/components/Results.js", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "const FIELD_GOLD_FILL =" in line:
        new_lines.append("const getCssVar = (name, fallback) => typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback : fallback;\n")
        new_lines.append("const FIELD_GOLD_FILL = getCssVar('--protective-field-color', '#FF3A01');\n")
        continue
    if "const FIELD_GOLD_STROKE =" in line:
        new_lines.append("const FIELD_GOLD_STROKE = getCssVar('--protective-field-color', '#FF3A01');\n")
        continue
    
    # Also I need to fix the opacity logic for Protective Field in Results.js
    if "opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 1}" in line and "FIELD_GOLD" in prev_line:
        new_lines.append("                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--protective-field-opacity', '0.8'))}\n")
        continue
    
    new_lines.append(line)
    prev_line = line

with open("src/components/Results.js", "w") as f:
    f.writelines(new_lines)
