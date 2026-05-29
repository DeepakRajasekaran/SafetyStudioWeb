import requests
from shapely.wkt import loads

# We define a robot with a large footprint and 2 LiDARs facing outward.
# Lidar 1 is at (-0.3, 0), Lidar 2 is at (0.3, 0).
# Lidar 1 will cast a shadow on Lidar 2's field, and Lidar 2 on Lidar 1's field.
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
        "warning_strategy": "geometric", "warning_margin": 0.5
    },
    "entity_meta": []
}

res = requests.post("http://localhost:80/api/calculate", json=payload)
data = res.json()
print("API Success:", data.get('success'))

final_wkt = data.get('final_field_wkt')
warn_wkt = data.get('warning_field_wkt')

if not final_wkt or not warn_wkt:
    print("Missing fields!")
    exit(1)

final_poly = loads(final_wkt)
warn_poly = loads(warn_wkt)

print(f"Protective Field Area: {final_poly.area:.4f}")
print(f"Warning Field Area: {warn_poly.area:.4f}")

# The warning field should be strictly larger than the protective field, but the shadow region
# created by the LiDAR bodies must be present in BOTH.
# In a pure geometric warning, the warning is final_poly.buffer(margin).
# A buffer might smooth over or fill in the shadow wedge! 
# Oh! Is `warning_final = final.buffer(warning_margin)` filling in the shadow wedge?
# If we do `final.buffer(margin)`, it expands outward, which will FILL IN the shadow wedge if the wedge is narrower than 2*margin!
# Let's check the number of exterior coordinates as a rough metric for geometric complexity.
print(f"Protective Exterior Points: {len(final_poly.exterior.coords)}")
print(f"Warning Exterior Points: {len(warn_poly.exterior.coords)}")

# To test if the shadow is preserved, let's test a point inside the shadow wedge.
# Lidar 2 is at (0.3, 0) and casts a shadow on Lidar 1 (-0.3, 0).
# The shadow is cast outward from (-0.3, 0) through (0.3, 0) -> towards +X.
# So points like (1.0, 0) should be in the shadow, thus OUTSIDE the fields.
pt_in_shadow = "POINT(1.0 0.0)"
from shapely.wkt import loads as load_pt
pt = load_pt(pt_in_shadow)

print(f"Is Point(1.0, 0.0) inside Protective Field? {final_poly.contains(pt)}")
print(f"Is Point(1.0, 0.0) inside Warning Field? {warn_poly.contains(pt)}")
