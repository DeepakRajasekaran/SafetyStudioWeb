import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

old_logic = """      if (key === 'field_method') {
        sanitizedPhysics[key] = val || 'union';
      } else if (typeof val === 'boolean') {"""

new_logic = """      if (key === 'field_method') {
        sanitizedPhysics[key] = val || 'union';
      } else if (key === 'warning_strategy') {
        sanitizedPhysics[key] = val || 'none';
      } else if (typeof val === 'boolean') {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open("src/components/Results.js", "w") as f:
        f.write(content)
    print("Fixed buildPayload in Results.js")
else:
    print("Could not find old_logic in Results.js")
