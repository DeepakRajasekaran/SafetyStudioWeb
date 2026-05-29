import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

# I need to clean up whatever is between line 1225 and 1235.
# Let's locate the exact lines that have the syntax error.
lines = content.split('\n')
for i, line in enumerate(lines):
    if "                  />" in line and "                ))}" in lines[i+1]:
        # Let's check if this is floating.
        # Let's search for "9b. Mask (Ignored) Handles"
        pass

# Let's just find the orphaned text.
orphaned_text = """                  </Group>
                ))}

                  />
                ))}"""

clean_text = """                  </Group>
                ))}"""

if orphaned_text in content:
    content = content.replace(orphaned_text, clean_text)
    with open("src/components/Results.js", "w") as f:
        f.write(content)
    print("Orphaned JSX fixed.")
else:
    print("Could not find orphaned text.")
