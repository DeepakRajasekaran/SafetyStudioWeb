import requests

url = "http://127.0.0.1:5000/api/calculate"
payload = {
    "footprint_wkt": "POLYGON ((-0.5 -0.5, 0.5 -0.5, 0.5 0.5, -0.5 0.5, -0.5 -0.5))",
    "load": "NoLoad",
    "sensors": [],
    "v": 1.0,
    "w": 0.0,
    "physics_params": {}
}

response = requests.post(url, json=payload)
print("Status Code:", response.status_code)
try:
    data = response.json()
    print("Success:", data.get("success"))
    wkt = data.get("final_field_wkt")
    print("Final WKT:", wkt[:50] + "..." if wkt else "None")
except Exception as e:
    print("Error parsing response:", e)
    print(response.text)
