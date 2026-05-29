import sys

with open("src/components/Generation.js", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "{/* Divider */}" in line and "margin: '6px 0'" in line:
        insert = """
                {/* Warning Strategy */}
                <tr>
                  <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>Warning Mode</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => (
                    <td key={load} style={{ padding: '0 4px' }}>
                      <select 
                        className="modern-select" 
                        value={physics[load].warning_strategy || 'none'}
                        onChange={e => handlePhysicsChange(load, 'warning_strategy', e.target.value)}
                        disabled={load !== 'NoLoad' && !physics[load].enabled}
                        style={{ opacity: (load !== 'NoLoad' && !physics[load].enabled) ? 0.2 : 1, fontSize: '0.7rem' }}
                      >
                        <option value="none">Disabled</option>
                        <option value="kinematic">Kinematic (Time)</option>
                        <option value="geometric">Geometric (Margin)</option>
                      </select>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>Warn Time (s)</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => {
                    const isKin = physics[load].warning_strategy === 'kinematic';
                    const disabled = (load !== 'NoLoad' && !physics[load].enabled) || !isKin;
                    return (
                      <td key={load} style={{ padding: '0 4px', textAlign: 'center' }}>
                        {!isKin ? (
                          <span style={{ color: '#333', fontSize: '0.65rem' }}>N/A</span>
                        ) : (
                          <ModernInput
                            value={physics[load].warning_time || 0.5}
                            onChange={e => handlePhysicsChange(load, 'warning_time', e.target.value)}
                            disabled={disabled}
                            style={{ opacity: disabled ? 0.2 : 1 }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ color: '#aaa', fontSize: '0.78rem', fontWeight: 500, paddingRight: 8 }}>Warn Margin (m)</td>
                  {['NoLoad', 'Load1', 'Load2'].map(load => {
                    const isGeo = physics[load].warning_strategy === 'geometric';
                    const disabled = (load !== 'NoLoad' && !physics[load].enabled) || !isGeo;
                    return (
                      <td key={load} style={{ padding: '0 4px', textAlign: 'center' }}>
                        {!isGeo ? (
                          <span style={{ color: '#333', fontSize: '0.65rem' }}>N/A</span>
                        ) : (
                          <ModernInput
                            value={physics[load].warning_margin || 0.5}
                            onChange={e => handlePhysicsChange(load, 'warning_margin', e.target.value)}
                            disabled={disabled}
                            style={{ opacity: disabled ? 0.2 : 1 }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
"""
        new_lines.append(insert)
    
    new_lines.append(line)

with open("src/components/Generation.js", "w") as f:
    f.writelines(new_lines)
