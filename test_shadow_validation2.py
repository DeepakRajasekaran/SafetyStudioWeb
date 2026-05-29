import requests
from shapely.wkt import loads

payload = {
    "footprint_wkt": "POLYGON ((-0.5 -0.5, 0.5 -0.5, 0.5 0.5, -0.5 0.5, -0.5 -0.5))",
    "load_wkt": None, "load2_wkt": None,
    "sensors": [
        {'name':'L1','x':-0.3,'y':0.0,'theta':0.0,'fov':270,'mount':-90,'flipped':False,'r':2.0,'dia':0.15},
        {'name':'L2','x':0.3,'y':0.0,'theta':0.0,'fov':270,'mount':90,'flipped':False,'r':2.0,'dia':0.15}
    ],
    "v": 0.0, "w": 0.0, "load": "NoLoad",
    "custom_field_wkt": None, "custom_warning_wkt": None,
    "physics_params": {
        "enabled": True, "tr": 0.1, "ac": 1.0, "ds": 0.5, "pad": 0.05, "smooth": 0.0,
        "lat_scale": 1.0, "shadow": True, "include_load": True, "patch_notch": False,
        "field_method": "union", "hull_threshold": 0.5, "use_hull_polygon": False,
        "warning_strategy": "kinematic", "warning_time": 0.5, "warning_margin": 0.5
    },
    "entity_meta": []
}

res = requests.post("http://localhost:80/api/calculate", json=payload)
data = res.json()
print("API Success:", data.get('success'))

final_wkt = data.get('final_field_wkt')
warn_wkt = data.get('warning_field_wkt')

final_poly = loads(final_wkt)
warn_poly = loads(warn_wkt)

from shapely.wkt import loads as load_pt
pt = load_pt("POINT(1.0 0.0)")

print(f"[Kinematic] Is Point(1.0, 0.0) inside Protective Field? {final_poly.contains(pt)}")
print(f"[Kinematic] Is Point(1.0, 0.0) inside Warning Field? {warn_poly.contains(pt)}")
