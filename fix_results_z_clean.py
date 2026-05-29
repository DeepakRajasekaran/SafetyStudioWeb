import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

# 1. We know CAD Sketcher is duplicated. We will remove ALL CAD Sketcher blocks and insert it once, exactly where we want it.
cad_marker = "{/* 10. CAD Sketcher */}"
cad_end_marker = "})()}"

while cad_marker in content:
    start_idx = content.find(cad_marker)
    end_idx = content.find(cad_end_marker, start_idx) + len(cad_end_marker)
    cad_block = content[start_idx:end_idx]
    content = content[:start_idx] + content[end_idx:]

# 2. Extract Handles block
h1_marker = "{/* 9a. Safety Field Handles */}"
h2_marker = "{/* 9b. Mask (Ignored) Handles */}"
h_end_marker = "</Group>\n                ))}"

h1_start = content.find(h1_marker)
if h1_start != -1:
    h2_start = content.find(h2_marker, h1_start)
    h_end = content.find(h_end_marker, h2_start) + len(h_end_marker)
    handles_block = content[h1_start:h_end]
    content = content[:h1_start] + content[h_end:]
else:
    handles_block = ""

# 3. Find where to insert both: right after the Safety Field.
safety_field_marker = "{/* 3. Safety Field (GOLD - Parity Color #FFD700) */}"
sf_idx = content.find(safety_field_marker)
sf_end = content.find("))}", sf_idx) + 3

if sf_idx != -1:
    content = content[:sf_end] + "\n\n                " + cad_block + "\n\n                " + handles_block + "\n" + content[sf_end:]
else:
    print("Could not find Safety Field marker")

with open("src/components/Results.js", "w") as f:
    f.write(content)

