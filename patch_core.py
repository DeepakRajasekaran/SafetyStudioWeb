import sys

with open("core.py", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union" in line:
        line = line.replace("return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union", "return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union, warning_final")
    if "return None, [], [], [], 0.0, [], None, None" in line:
        line = line.replace("return None, [], [], [], 0.0, [], None, None", "return None, [], [], [], 0.0, [], None, None, None")
    new_lines.append(line)

with open("core.py", "w") as f:
    f.writelines(new_lines)
