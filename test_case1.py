import requests

# Case 1 is v=0, w=-0.6 - test that AND a forward-velocity case
for v, w, label in [(0, -0.6, "Case1 (v=0,w=-0.6)"), (0.6, -0.6, "Case4 (v=0.6,w=-0.6)"), (0.6, 0, "Case5 (v=0.6,w=0)")]:
    payload = {
        "footprint_wkt": "POLYGON ((-0.5 -0.3, 0.5 -0.3, 0.5 0.3, -0.5 0.3, -0.5 -0.3))",
        "load_wkt": None, "load2_wkt": None,
        "sensors": [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}],
        "v": v, "w": w, "load": "NoLoad",
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
    d = res.json()
    prot = d.get('final_field_wkt')
    warn = d.get('warning_field_wkt')
    if prot and warn:
        # Check if they're different
        from shapely.geometry import Polygon
        from shapely import wkt
        p1 = wkt.loads(prot)
        p2 = wkt.loads(warn)
        diff_area = p2.difference(p1).area
        print(f"{label}: protective_area={p1.area:.3f}, warning_area={p2.area:.3f}, warning_extends_beyond_protective_by={diff_area:.3f}m2")
    else:
        print(f"{label}: warning={bool(warn)}, protective={bool(prot)}")
