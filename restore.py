import re

log_path = "/home/lucifer/.gemini/antigravity/brain/537b9e6c-213d-4645-b829-09c369cce72b/.system_generated/logs/overview.txt"

with open(log_path, 'r') as f:
    content = f.read()

# We look for the tool call response of view_file for Generation.js
gen_match = re.search(r"File Path: `file:///home/lucifer/anscer_workspace/SafetyStudioWeb/src/components/Generation\.js`\nTotal Lines: 423\nTotal Bytes: 19382\n.*?The following code has been modified.*?\n(1: .*?)The above content shows the entire", content, re.DOTALL)
if gen_match:
    gen_code = gen_match.group(1)
    gen_lines = []
    for line in gen_code.strip().split('\n'):
        if line.startswith(tuple(str(i) + ":" for i in range(10))):
            idx = line.find(': ')
            if idx != -1:
                gen_lines.append(line[idx+2:])
        else:
            gen_lines.append(line)
    with open('/home/lucifer/anscer_workspace/SafetyStudioWeb/src/components/Generation.js', 'w') as f:
        f.write('\n'.join(gen_lines) + '\n')
    print("Generation.js restored!")

res_match = re.search(r"File Path: `file:///home/lucifer/anscer_workspace/SafetyStudioWeb/src/components/Results\.js`\nTotal Lines: 458\nTotal Bytes: 25029\n.*?The following code has been modified.*?\n(1: .*?)The above content shows the entire", content, re.DOTALL)
if res_match:
    res_code = res_match.group(1)
    res_lines = []
    for line in res_code.strip().split('\n'):
        if line.startswith(tuple(str(i) + ":" for i in range(10))):
            idx = line.find(': ')
            if idx != -1:
                res_lines.append(line[idx+2:])
        else:
            res_lines.append(line)
    
    # Also inject the missing 'v' parameter in Results.js!
    final_res_lines = []
    for line in res_lines:
        final_res_lines.append(line)
        if "w: parseFloat(k.w) || 0," in line:
            final_res_lines.append("      v: parseFloat(k.v) || 0,")
            print("Injected 'v' parameter in Results.js")
            
    with open('/home/lucifer/anscer_workspace/SafetyStudioWeb/src/components/Results.js', 'w') as f:
        f.write('\n'.join(final_res_lines) + '\n')
    print("Results.js restored!")

