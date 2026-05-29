from core import SafetyMath
from shapely.geometry import Polygon

fp = Polygon([(-0.5, -0.3), (0.5, -0.3), (0.5, 0.3), (-0.5, 0.3)])
sensors = [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}]

P = {
    'enabled': True, 
    'warning_strategy': 'kinematic', 
    'warning_time': 0.5, 
    'warning_margin': 0.5,
    'tr': 0.1, 'ac': 1.0, 'ds': 0.1, 'pad': 0.05, 'smooth': 0.05,
    'lat_scale': 1.0, 'shadow': True, 'include_load': True, 
    'patch_notch': True, 'field_method': 'union',
    'hull_threshold': 0.5, 'use_hull_polygon': False
}

final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union, warning_final = SafetyMath.calc_case(
    fp, None, sensors, 1.0, 0.0, P, None, None, {}
)

print(f"Final field: {bool(final)}")
print(f"Warning final: {bool(warning_final)}")
if warning_final:
    print(f"Warning WKT (first 80 chars): {warning_final.wkt[:80]}")
