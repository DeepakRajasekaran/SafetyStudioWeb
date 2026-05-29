with open("core.py", "r") as f:
    text = f.read()

target = """            else:
                warning_strategy = P.get('warning_strategy', 'none')
                if warning_strategy == 'kinematic':"""

replacement = """            else:
                warning_strategy = P.get('warning_strategy', 'none')
                if warning_strategy == 'geometric' and final and not final.is_empty:
                    warning_margin = float(P.get('warning_margin', 0.5))
                    warning_base = final.buffer(warning_margin, join_style=2)
                elif warning_strategy == 'kinematic':"""

text = text.replace(target, replacement)

target2 = """            # Geometric warning: buffer the CLIPPED protective field, then subtract load shadow
            if override_warning_poly is None and P.get('warning_strategy', 'none') == 'geometric' and final and not final.is_empty:
                warning_margin = float(P.get('warning_margin', 0.5))
                warning_final = final.buffer(warning_margin, join_style=2)"""

replacement2 = """            # Geometric warning is now computed before the lidar loop"""

text = text.replace(target2, replacement2)

with open("core.py", "w") as f:
    f.write(text)
