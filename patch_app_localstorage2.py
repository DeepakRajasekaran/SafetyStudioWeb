with open("src/App.js", "r") as f:
    text = f.read()

target = """             if (parsed.physics[k] && parsed.physics[k].warning_strategy === 'none') {"""
replacement = """             if (parsed.physics[k] && parsed.physics[k].warning_strategy !== 'geometric') {"""

text = text.replace(target, replacement)
with open("src/App.js", "w") as f:
    f.write(text)
