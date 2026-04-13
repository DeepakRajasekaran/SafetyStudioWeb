import json

with open("app.py", "r") as f:
    content = f.read()

patch_code = """
@app.route('/api/calculate', methods=['POST'])
def calculate_field():
    data = request.json
    with open('last_payload.json', 'w') as f:
        json.dump(data, f, indent=2)
    # prep input
"""
content = content.replace(
    "@app.route('/api/calculate', methods=['POST'])\ndef calculate_field():\n    data = request.json\n    # prep input", 
    patch_code
)

with open("app.py", "w") as f:
    f.write(content)

