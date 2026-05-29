import requests

payload = {
    "v": 1.0,
    "w": 0.0,
    "physics": {
        "warning_strategy": "kinematic",
        "warning_time": 0.5,
        "enabled": True
    },
    "footprint_wkt": "POLYGON ((-0.5 -0.3, 0.5 -0.3, 0.5 0.3, -0.5 0.3, -0.5 -0.3))",
    "sensors": [{'name':'L1','x':0.4,'y':0.0,'theta':0.0,'fov':270,'mount':0,'flipped':False,'r':10,'dia':0.1}]
}
res = requests.post("http://localhost:80/api/calculate", json=payload)
print(res.json())
