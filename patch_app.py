import sys

with open("app.py", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "override_poly = None" in line and "custom_wkt = data.get('custom_dxf')" in lines[lines.index(line)-1]:
        new_lines.append(line)
        new_lines.append("        override_warning_poly = None\n")
        new_lines.append("        custom_warning_wkt = data.get('custom_warning_dxf')\n")
        new_lines.append("        if custom_warning_wkt:\n")
        new_lines.append("            try:\n")
        new_lines.append("                override_warning_poly = wkt.loads(custom_warning_wkt)\n")
        new_lines.append("            except Exception as e:\n")
        new_lines.append("                print(f\"ERROR: Failed to load custom_warning_dxf: {e}\")\n")
        continue

    if "print(f\"DEBUG: Processing {load_key} case with P: {P} | Custom: {bool(override_poly)}\")" in line:
        new_lines.append(line.replace("Custom: {bool(override_poly)}\")", "Custom: {bool(override_poly)} | Warn Custom: {bool(override_warning_poly)}\")"))
        continue

    if "footprint, load_poly, sensors, v, w_input, P, override_poly=override_poly, entity_meta=entity_meta" in line:
        new_lines.append(line.replace("override_poly=override_poly, entity_meta=entity_meta", "override_poly=override_poly, override_warning_poly=override_warning_poly, entity_meta=entity_meta"))
        continue

    new_lines.append(line)

with open("app.py", "w") as f:
    f.writelines(new_lines)
