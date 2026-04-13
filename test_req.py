import requests

payload = {
    "footprint_wkt": "POLYGON ((-0.5 -0.5, 0.5 -0.5, 0.5 0.5, -0.5 0.5, -0.5 -0.5))",
    "load": "NoLoad",
    "sensors": [
        {"name": "Lidar1", "x": 0.45, "y": 0, "mount": 0, "fov": 270, "r": 10.0, "dia": 0.15, "flipped": False}
    ],
    "v": 1.0,
    "w": 0.0,
    "physics_params": {
        "tr": 0.5, "ac": 1.0, "ds": 0.1, "pad": 0.1, "sm": 0.05, "ls": 1.0
    }
}

try:
    res = requests.post("http://localhost:5000/api/calculate", json=payload)
    print("Status Code:", res.status_code)
    try:
        data = res.json()
        print("Success:", data.get("success"))
        print("Final WKT:", data.get("final_field_wkt")[:50] if data.get("final_field_wkt") else "None")
        print("Ideal WKT:", data.get("ideal_field_wkt")[:50] if data.get("ideal_field_wkt") else "None")
        print("Lidars:", len(data.get("lidars", [])))
        print("Sweeps:", len(data.get("sweeps", [])))
    except Exception as e:
        print("Failed to parse JSON:", res.text)
except Exception as e:
    print("Error:", e)

