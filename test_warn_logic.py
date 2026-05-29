from core import SafetyMath
from shapely.geometry import Polygon
from shapely import wkt as shapely_wkt

fp = Polygon([(-0.5, -0.3), (0.5, -0.3), (0.5, 0.3), (-0.5, 0.3)])
sensors = [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}]

P = {'enabled':True,'tr':0.1,'ac':1.0,'ds':0.1,'pad':0.05,'smooth':0.05,'lat_scale':1.0,
     'shadow':True,'include_load':True,'patch_notch':True,'field_method':'union','hull_threshold':0.5,'use_hull_polygon':False,
     'warning_strategy':'kinematic','warning_time':0.5,'warning_margin':0.5}

for v, w in [(0.0, -0.6), (0.6, 0.0), (1.2, -0.4)]:
    final, _, traj, _, D, _, _, _, warning = SafetyMath.calc_case(fp, None, sensors, v, w, P, None, None, {})
    prot_a = final.area if final else 0
    warn_a = warning.area if warning else 0
    diff = warning.difference(final).area if (warning and final) else 0
    print(f"v={v}, w={w} -> protective={prot_a:.3f}m2, warning={warn_a:.3f}m2, warning_extends_by={diff:.3f}m2")
