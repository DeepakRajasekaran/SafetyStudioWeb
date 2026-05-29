import sys

with open("core.py", "r") as f:
    content = f.read()

# Replace the block around composite_clips processing
old_logic = """            composite_w_clips = []
            lid_out = []; all_fovs = []; composite_clips = []
            warning_final = None"""

new_logic = """            composite_w_clips = []
            lid_out = []; all_fovs = []; composite_clips = []
            warning_final = warning_base"""
content = content.replace(old_logic, new_logic)

with open("core.py", "w") as f:
    f.write(content)
