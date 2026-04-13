from core import SafetyMath, DxfHandler
from shapely.geometry import Polygon
import json

footprint = Polygon([(-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)])
sensors = [
    {'name': 'Main', 'x': 0.45, 'y': 0, 'mount': 0, 'fov': 270, 'r': 10.0, 'dia':0.15}
]
v = 1.0
w = 0.0
P = {'tr': 0.5, 'ac': 1.0, 'ds': 0.1, 'pad': 0.05, 'smooth': 0}

final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union = SafetyMath.calc_case(
    footprint, None, sensors, v, w, P
)

print(final.wkt if final else "None")
print("-------------")
print(sw_union.wkt if sw_union else "None")
