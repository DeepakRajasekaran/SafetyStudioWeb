import sys

with open("src/components/Generation.js", "r") as f:
    content = f.read()

# 1. Extract and remove the Warning Params block from Matrix Generator
start_marker = "{/* Warning Params */}"
end_marker = "{/* Derived Params */}"
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    warning_block = content[start_idx:end_idx]
    content = content[:start_idx] + content[end_idx:]

    # Transform warning_block to use physics instead of genConfig
    warning_block = warning_block.replace("genConfig", "physics")
    warning_block = warning_block.replace("handleGenConfigChange", "handlePhysicsChange")
    
    # 2. Insert warning_block at the end of the Physics & Engine Config table body
    # The Physics table ends with:
    #                     )}
    #                   </td>
    #                 ))}
    #               </tr>
    #             ))}
    #           </tbody>
    #         </table>
    # We can search for the end of the Physics table. Let's find "hull_polygon" which is the last boolean option.
    insert_marker = "].map(row => ("
    # Actually, the easiest way is to find a specific string in the Physics table.
    # We know the boolean checkboxes are generated from a list ending in { lbl: 'Use Hull Polygon', k: 'use_hull_polygon' }
    target_idx = content.find("{ lbl: 'Use Hull Polygon', k: 'use_hull_polygon' }")
    if target_idx != -1:
        # Find the end of this map block
        tbody_end_idx = content.find("</tbody>", target_idx)
        if tbody_end_idx != -1:
            content = content[:tbody_end_idx] + "                " + warning_block + "\n" + content[tbody_end_idx:]

    with open("src/components/Generation.js", "w") as f:
        f.write(content)
    print("Fixed Generation.js warning params location.")
else:
    print("Could not find Warning Params block.")

