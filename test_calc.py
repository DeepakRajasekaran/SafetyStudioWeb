from core import SafetyMath
import json
from shapely.geometry import Polygon

fp = Polygon([(-0.5, -0.3), (0.5, -0.3), (0.5, 0.3), (-0.5, 0.3)])
load = Polygon([(-0.6, -0.4), (0.6, -0.4), (0.6, 0.4), (-0.6, 0.4)])
sensors = [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}]

# Config for kinemtaic warning mode
P = {'enabled': True, 'warning_strategy': 'kinematic', 'warning_time': 0.5, 'warning_margin': 0.5, 'tr':0.1, 'ac':1.0, 'ds':0.1, 'pad':0.05, 'smooth':0.0}

final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union, warning_final = SafetyMath.calc_case(
    fp, load, sensors, 1.0, 0.0, P, None, None, {}
)

if warning_final:
    print("WARNING FINAL IS GENERATED:", warning_final.wkt[:100])
else:
    print("WARNING FINAL IS NONE")

