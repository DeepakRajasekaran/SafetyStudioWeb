with open("core.py", "r") as f:
    text = f.read()

target = """                if lidar_shadows: clip = clip.difference(unary_union(lidar_shadows))"""

replacement = """                if lidar_shadows: 
                    ls_union = unary_union(lidar_shadows)
                    clip = clip.difference(ls_union)
                    if w_clip: w_clip = w_clip.difference(ls_union)"""

text = text.replace(target, replacement)

with open("core.py", "w") as f:
    f.write(text)
