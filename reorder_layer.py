import re

with open('src/components/Results.js', 'r') as f:
    content = f.read()

# We need to extract the blocks.
# Block 1: Up to Active Field (Composite)
# Block 2: Field Handles (to move)
# Block 3: CAD Sketcher (to move)
# Block 4: Footprint to Load Outline
# Block 5: Ignored Area + Mask Handles
# Block 6: LiDAR Fields (to move)
# Block 7: Sensors

# Let's just use string splitting based on the comments.
def get_block(start_marker, end_marker):
    start = content.find(start_marker)
    if end_marker:
        end = content.find(end_marker, start)
    else:
        end = content.find('</Layer>')
    if start == -1 or (end_marker and end == -1):
        raise Exception(f"Could not find {start_marker} or {end_marker}")
    return content[start:end]

b_static = get_block("{/* 1. Static Sweeps", "{/* 9a. Safety Field Handles")
b_field_handles = get_block("{/* 9a. Safety Field Handles", "{/* 10. CAD Sketcher")
b_cad = get_block("{/* 10. CAD Sketcher", "{/* 4. Base Footprint")
b_mid = get_block("{/* 4. Base Footprint", "{/* 6. Ignored Area")
b_mask = get_block("{/* 6. Ignored Area", "{viewMode === 'LiDAR View' && (")
b_lidar = get_block("{viewMode === 'LiDAR View' && (", "{/* 8. Sensors */}")
b_sensors = get_block("{/* 8. Sensors */}", "</Layer>")

new_layer_content = (
    b_static +
    b_lidar +
    b_mid +
    b_mask +
    b_field_handles +
    b_cad +
    b_sensors
)

# Replace the layer content in the original file
start_idx = content.find("{/* 1. Static Sweeps")
end_idx = content.find("</Layer>")

new_content = content[:start_idx] + new_layer_content + content[end_idx:]

# Also add listening={false} to the mask Polygon (Line)
# The mask Line is in b_mask, which starts with "{/* 6. Ignored Area"
# We'll just replace 'closed' with 'closed listening={false}' in that specific block.

new_content = new_content.replace(
'''                    dash={isEditingMask ? [6/scale, 4/scale] : undefined}
                    closed''',
'''                    dash={isEditingMask ? [6/scale, 4/scale] : undefined}
                    closed
                    listening={false}'''
)

with open('src/components/Results.js', 'w') as f:
    f.write(new_content)

print("Layer reordered successfully.")
