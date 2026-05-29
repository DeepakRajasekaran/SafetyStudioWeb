import sys

with open("core.py", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union" in line:
        line = line.replace("return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union", "return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union, warning_final")
    if "return None, [], [], [], 0.0, [], None, None" in line:
        line = line.replace("return None, [], [], [], 0.0, [], None, None", "return None, [], [], [], 0.0, [], None, None, None")
        
    if "def calc_case(footprint, load_poly, sensors, v, w_input, P, override_poly=None, entity_meta=None):" in line:
        line = line.replace("override_poly=None, entity_meta=None", "override_poly=None, override_warning_poly=None, entity_meta=None")
    
    if "override_poly = sanitize_geom(override_poly)" in line:
        new_lines.append(line)
        new_lines.append("            override_warning_poly = sanitize_geom(override_warning_poly)\n")
        continue

    if "lid_out = []; all_fovs = []; composite_clips = []" in line:
        insert = """
            warning_base = None
            if override_warning_poly is not None:
                warning_base = override_warning_poly
            else:
                warning_strategy = P.get('warning_strategy', 'none')
                if warning_strategy == 'kinematic':
                    warn_T = T + float(P.get('warning_time', 0.5))
                    warn_ts = np.arange(0, warn_T+0.02, 0.02)
                    warn_sweeps = []
                    warn_traj=np.zeros((len(warn_ts),3)); warn_traj[0]=[0,0,np.pi/2]
                    for i in range(len(warn_ts)):
                        if i>0:
                            px,py,pth = warn_traj[i-1]
                            warn_traj[i] = [px+v*np.cos(pth)*0.02, py+v*np.sin(pth)*0.02, pth+ang_vel*0.02]
                        cx,cy,cth = warn_traj[i]; rot_deg = np.degrees(cth - np.pi/2)
                        poly_instance = translate(rotate(sweep_base, rot_deg, origin=(0,0)), cx, cy)
                        warn_sweeps.append(poly_instance)
                    
                    warning_base = unary_union(warn_sweeps)
                    if abs(v) < 1e-3 and abs(ang_vel) > 1e-3 and P.get('patch_notch', False):
                        warning_base = SafetyMath.patch_notch(warning_base)
                    if field_method == 'hull':
                        warning_base = warning_base.convex_hull
                    elif field_method == 'hybrid' and D < float(P.get('hull_threshold', 0.5)):
                        warning_base = warning_base.convex_hull
                    warning_base = warning_base.buffer(P.get('smooth',0.05), join_style=1).simplify(0.01)
                    
                elif warning_strategy == 'geometric':
                    warning_margin = float(P.get('warning_margin', 0.5))
                    warning_base = final.buffer(warning_margin, join_style=2)

            composite_w_clips = []
"""
        new_lines.append(insert)
        new_lines.append(line.replace("composite_clips = []", "composite_clips = []\n            warning_final = None\n"))
        continue

    if "clip = final.intersection(fov)" in line:
        new_lines.append(line)
        new_lines.append("                w_clip = warning_base.intersection(fov) if warning_base else None\n")
        continue

    if "clip_indiv = clip.difference(shadow)" in line:
        new_lines.append(line)
        new_lines.append("                if warning_base and shadow: w_clip = w_clip.difference(shadow)\n")
        continue

    if "composite_clips.append(clip)" in line:
        new_lines.append(line)
        new_lines.append("                if warning_base: composite_w_clips.append(w_clip)\n")
        continue

    if "final = unary_union(composite_clips)" in line:
        new_lines.append(line)
        new_lines.append("                if composite_w_clips: warning_final = unary_union(composite_w_clips)\n")
        continue

    if "elif load_poly:" in line:
        new_lines.append(line)
        continue
    if "final = final.difference(load_poly)" in line:
        new_lines.append(line)
        new_lines.append("                if warning_base: warning_final = warning_base.difference(load_poly)\n")
        continue

    new_lines.append(line)

with open("core.py", "w") as f:
    f.writelines(new_lines)
