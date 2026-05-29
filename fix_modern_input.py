import sys
with open("src/components/Generation.js", "r") as f:
    content = f.read()

# Fix ModernInput to allow empty strings
old_input = """const ModernInput = ({ value, onChange, disabled, style }) => (
  <input type="number" step="any" value={value} onChange={onChange} disabled={disabled}
    className="modern-select" style={{ ...style, textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: disabled ? '#888' : '#fff' }}
  />
);"""

new_input = """const ModernInput = ({ value, onChange, disabled, style }) => (
  <input type="text" value={value} onChange={onChange} disabled={disabled}
    className="modern-select" style={{ ...style, textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: disabled ? '#888' : '#fff' }}
    onBlur={(e) => {
        if (e.target.value === '') onChange({ target: { value: '0' } });
        else if (!isNaN(parseFloat(e.target.value))) onChange({ target: { value: parseFloat(e.target.value).toString() } });
    }}
  />
);"""
content = content.replace(old_input, new_input)
with open("src/components/Generation.js", "w") as f:
    f.write(content)
