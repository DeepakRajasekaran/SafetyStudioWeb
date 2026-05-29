import requests
import json

payload = {
    "footprint_wkt": "POLYGON ((-0.5 -0.3, 0.5 -0.3, 0.5 0.3, -0.5 0.3, -0.5 -0.3))",
    "load_wkt": None, "load2_wkt": None,
    "sensors": [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}],
    "v": 1.0, "w": 0.0, "load": "NoLoad",
    "custom_field_wkt": None, "custom_warning_wkt": None,
    "physics_params": {
        "enabled": True, "tr": 0.1, "ac": 1.0, "ds": 0.1, "pad": 0.05, "smooth": 0.05,
        "lat_scale": 1.0, "shadow": True, "include_load": True, "patch_notch": True,
        "field_method": "union", "hull_threshold": 0.5, "use_hull_polygon": False,
        "warning_strategy": "kinematic", "warning_time": 0.5, "warning_margin": 0.5
    },
    "entity_meta": []
}

res = requests.post("http://localhost:80/api/calculate", json=payload)
data = res.json()
print("Success:", data.get('success'))
print("final_field_wkt:", data.get('final_field_wkt')[:50] if data.get('final_field_wkt') else None)
print("warning_field_wkt:", data.get('warning_field_wkt')[:50] if data.get('warning_field_wkt') else None)
print("lidars[0] clip_wkt:", data['lidars'][0].get('clip_wkt')[:50] if data['lidars'][0].get('clip_wkt') else None)
print("lidars[0] w_clip_wkt:", data['lidars'][0].get('w_clip_wkt')[:50] if data['lidars'][0].get('w_clip_wkt') else None)
