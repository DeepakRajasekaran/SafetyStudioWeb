with open("src/App.js", "r") as f:
    text = f.read()

target = """        const parsed = JSON.parse(saved);
        if (parsed) return parsed;"""

replacement = """        const parsed = JSON.parse(saved);
        if (parsed && parsed.physics) {
          ['NoLoad', 'Load1', 'Load2'].forEach(k => {
             if (parsed.physics[k] && parsed.physics[k].warning_strategy === 'none') {
                 parsed.physics[k].warning_strategy = 'kinematic';
             }
          });
        }
        if (parsed) return parsed;"""

text = text.replace(target, replacement)
with open("src/App.js", "w") as f:
    f.write(text)
