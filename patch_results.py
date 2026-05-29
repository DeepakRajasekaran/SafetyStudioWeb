import sys

with open("src/components/Results.js", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "const parsedField   = currentResult ? parseWktWithTransform(currentResult.final_field_wkt, tObj.fn) : [];" in line:
        new_lines.append(line)
        new_lines.append("  const parsedWarning = currentResult ? parseWktWithTransform(currentResult.warning_field_wkt, tObj.fn) : [];\n")
        continue

    # Protective Field rendering logic
    if "{parsedField.map((poly, idx) => (" in line:
        insert = """                {parsedWarning.map((poly, idx) => (
                  <Line
                    key={`warn-${idx}`}
                    points={poly}
                    fill={getComputedStyle(document.documentElement).getPropertyValue('--warning-field-color').trim() || '#FFC640'}
                    opacity={parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--warning-field-opacity').trim() || '0.7')}
                    closed
                    stroke="#FFC640"
                    strokeWidth={1}
                  />
                ))}
"""
        new_lines.append(insert)
        new_lines.append(line)
        continue

    # In LiDAR view, warning should be rendered if it's there
    if "viewMode === 'LiDAR View' && showComposite" in line and "parsedField.map" in line:
        # Wait, the string might not match exactly.
        pass

    new_lines.append(line)

with open("src/components/Results.js", "w") as f:
    f.writelines(new_lines)
