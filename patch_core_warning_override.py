import sys

with open("core.py", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "def calc_case(footprint, load_poly, sensors, v, w_input, P, override_poly=None, entity_meta=None):" in line:
        line = line.replace("override_poly=None, entity_meta=None", "override_poly=None, override_warning_poly=None, entity_meta=None")
    
    if "override_poly = sanitize_geom(override_poly)" in line:
        new_lines.append(line)
        new_lines.append("            override_warning_poly = sanitize_geom(override_warning_poly)\n")
        continue

    if "warning_base = None" in line and "warning_strategy =" in lines[lines.index(line)+1]:
        insert = """            warning_base = None
            if override_warning_poly is not None:
                warning_base = override_warning_poly
                warning_strategy = 'custom'
            else:
"""
        new_lines.append(insert)
        continue

    # Need to indent the warning_strategy block if we put it in else
    if "warning_strategy = P.get('warning_strategy', 'none')" in line:
        new_lines.append("                " + line.strip() + "\n")
        continue
    if "if warning_strategy == 'kinematic':" in line and "warning_strategy = P.get" in lines[lines.index(line)-1]:
        new_lines.append("                if warning_strategy == 'kinematic':\n")
        continue

    # Wait, simple way: Just do this
    # if override_warning_poly is not None:
    #     warning_base = override_warning_poly
    # else:
    #     warning_strategy = P.get('warning_strategy', 'none')
    #     if warning_strategy == ...
    new_lines.append(line)

with open("core.py", "w") as f:
    f.writelines(new_lines)
