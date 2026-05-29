import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

old_keys_logic = "const keys = [...new Set([...Object.keys(rawPhysics), 'field_method'])];"
new_keys_logic = "const keys = [...new Set([...Object.keys(rawPhysics), 'field_method', 'warning_strategy', 'warning_time', 'warning_margin'])];"

if old_keys_logic in content:
    content = content.replace(old_keys_logic, new_keys_logic)
    with open("src/components/Results.js", "w") as f:
        f.write(content)
    print("Fixed keys in buildPayload")
else:
    print("Could not find old_keys_logic")
