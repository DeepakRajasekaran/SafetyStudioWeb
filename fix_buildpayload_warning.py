with open("src/components/Results.js", "r") as f:
    text = f.read()

target = """      if (key === 'field_method') {
        sanitizedPhysics[key] = val || 'union';"""

replacement = """      if (key === 'field_method' || key === 'warning_strategy') {
        sanitizedPhysics[key] = val || (key === 'field_method' ? 'union' : 'none');"""

text = text.replace(target, replacement)

with open("src/components/Results.js", "w") as f:
    f.write(text)
