import requests, json

# Simulate exactly what the browser sends - with the physics params being strings like
# they would be in localStorage
payload = {
    "footprint_wkt": "POLYGON ((-0.5 -0.3, 0.5 -0.3, 0.5 0.3, -0.5 0.3, -0.5 -0.3))",
    "load_wkt": None,
    "load2_wkt": None,
    "sensors": [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}],
    "v": 1.0,
    "w": 0.0,
    "load": "NoLoad",
    "custom_field_wkt": None,
    "custom_warning_wkt": None,
    "physics_params": {
        "enabled": True,
        "tr": 0.1, "ac": 1.0, "ds": 0.1, "pad": 0.05, "smooth": 0.05,
        "lat_scale": 1.0, "shadow": True, "include_load": True,
        "patch_notch": True, "field_method": "union", "hull_threshold": 0.5,
        "use_hull_polygon": False,
        "warning_strategy": "kinematic",
        "warning_time": 0.5,
        "warning_margin": 0.5
    },
    "entity_meta": []
}

res = requests.post("http://localhost:80/api/calculate", json=payload)
data = res.json()
print("Success:", data.get('success'))
print("Warning WKT present:", bool(data.get('warning_field_wkt')))
if data.get('warning_field_wkt'):
    print("Warning WKT (first 100 chars):", data['warning_field_wkt'][:100])
if not data.get('success'):
    print("Error:", data.get('error'))
