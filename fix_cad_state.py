import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

# Fix targetSketches getters
old_getters = """  const targetSketches = cadData?.Overrides?.[selectedCaseId]?.sketches || [];
  const targetDimensions = cadData?.Overrides?.[selectedCaseId]?.dimensions || [];
  const targetFixedPoints = cadData?.Overrides?.[selectedCaseId]?.fixedPoints || [];
  const targetConstraints = cadData?.Overrides?.[selectedCaseId]?.constraints || [];"""

new_getters = """  const cadOverrideKey = editingTarget === 'warning' ? `${selectedCaseId}_warning` : selectedCaseId;
  const targetSketches = cadData?.Overrides?.[cadOverrideKey]?.sketches || [];
  const targetDimensions = cadData?.Overrides?.[cadOverrideKey]?.dimensions || [];
  const targetFixedPoints = cadData?.Overrides?.[cadOverrideKey]?.fixedPoints || [];
  const targetConstraints = cadData?.Overrides?.[cadOverrideKey]?.constraints || [];"""
content = content.replace(old_getters, new_getters)

# Fix setters
old_setters = """                // 1. Auto-save sketches session to cadData
                if (draftCad) {
                   setCadFieldSafe('Overrides', selectedCaseId, 'sketches', draftCad.sketches);
                   setCadFieldSafe('Overrides', selectedCaseId, 'dimensions', draftCad.dimensions);
                   setCadFieldSafe('Overrides', selectedCaseId, 'constraints', draftCad.constraints);
                   setCadFieldSafe('Overrides', selectedCaseId, 'fixedPoints', draftCad.fixedPoints);
                }"""

new_setters = """                // 1. Auto-save sketches session to cadData
                if (draftCad) {
                   const saveKey = editingTarget === 'warning' ? `${selectedCaseId}_warning` : selectedCaseId;
                   setCadFieldSafe('Overrides', saveKey, 'sketches', draftCad.sketches);
                   setCadFieldSafe('Overrides', saveKey, 'dimensions', draftCad.dimensions);
                   setCadFieldSafe('Overrides', saveKey, 'constraints', draftCad.constraints);
                   setCadFieldSafe('Overrides', saveKey, 'fixedPoints', draftCad.fixedPoints);
                }"""
content = content.replace(old_setters, new_setters)

# In useEffect for initializing draftCad
old_effect = """  useEffect(() => {
    if (isEditMode && resultsMode === 'cad') {
       const init = { 
          sketches: [...targetSketches],
          dimensions: [...targetDimensions],
          constraints: [...targetConstraints],
          fixedPoints: [...targetFixedPoints]
       };
       setDraftCad(init);
       setCadSnapshot(JSON.stringify(init));
    } else {
       setDraftCad(null);
       setCadHistory([]);
    }
  }, [isEditMode, resultsMode, selectedCaseId]);"""

new_effect = """  useEffect(() => {
    if (isEditMode && resultsMode === 'cad') {
       const init = { 
          sketches: [...targetSketches],
          dimensions: [...targetDimensions],
          constraints: [...targetConstraints],
          fixedPoints: [...targetFixedPoints]
       };
       setDraftCad(init);
       setCadSnapshot(JSON.stringify(init));
    } else {
       setDraftCad(null);
       setCadHistory([]);
    }
  }, [isEditMode, resultsMode, selectedCaseId, editingTarget]);"""
content = content.replace(old_effect, new_effect)

# In handleCalculate for sending payload
# need to send custom_warning_dxf
old_payload = """      custom_field_wkt: k.custom_dxf || null,
      physics_params: sanitizedPhysics,
      entity_meta: cadData?.[k.load]?.entityMeta || []"""
new_payload = """      custom_field_wkt: k.custom_dxf || null,
      custom_warning_wkt: k.custom_warning_dxf || null,
      physics_params: sanitizedPhysics,
      entity_meta: cadData?.[k.load]?.entityMeta || []"""
content = content.replace(old_payload, new_payload)

with open("src/components/Results.js", "w") as f:
    f.write(content)
