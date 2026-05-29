import sys

with open("core.py", "r") as f:
    content = f.read()

old_sweep_loop = """            for i in range(len(traj)):
                if i>0:
                    px, py, pth = traj[i-1]
                    traj[i] = [px+v*np.cos(pth)*dt, py+v*np.sin(pth)*dt, pth+ang_vel*dt]
                if override_poly is None:
                    cx,cy,cth = traj[i]; rot_deg = np.degrees(cth - np.pi/2)
                    poly_instance = translate(rotate(sweep_base, rot_deg, origin=(0,0)), cx, cy)
                    sweeps.append(poly_instance)"""

new_sweep_loop = """            for i in range(len(traj)):
                if i>0:
                    px, py, pth = traj[i-1]
                    traj[i] = [px+v*np.cos(pth)*dt, py+v*np.sin(pth)*dt, pth+ang_vel*dt]
                cx,cy,cth = traj[i]; rot_deg = np.degrees(cth - np.pi/2)
                poly_instance = translate(rotate(sweep_base, rot_deg, origin=(0,0)), cx, cy)
                sweeps.append(poly_instance)"""
content = content.replace(old_sweep_loop, new_sweep_loop)

with open("core.py", "w") as f:
    f.write(content)
