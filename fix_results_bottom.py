import sys

with open("src/components/Results.js", "r") as f:
    content = f.read()

# Let's find the start of our replacement: right after the 2. Ghost Field (Reference)
start_marker = "{/* 3a. CAD Preview Field (live boolean result — shown in CAD edit mode, replaces gold field) */}"
start_idx = content.find(start_marker)

# And find the end of the layer
end_marker = "</Layer>"
end_idx = content.find(end_marker, start_idx) + len(end_marker)

# We will reconstruct this entirely cleanly.
clean_bottom = """{/* 3a. CAD Preview Field (live boolean result — shown in CAD edit mode, replaces gold field) */}
                {isEditMode && resultsMode === 'cad' && previewFieldWkt && (() => {
                  // For the preview, if we are in LiDAR View (local), we need the inverse transform 
                  // because previewFieldWkt is generated in Robot frame (by combining with base gold field)
                  const transformFn = viewMode === 'LiDAR View' ? tObj.inv : tObj.fn;
                  return parseWktWithTransform(previewFieldWkt, transformFn).map((poly, i) => (
                    <Line
                      key={`preview-${i}`}
                      points={poly}
                      fill="rgba(0, 230, 118, 0.35)"
                      stroke="#00e676"
                      strokeWidth={2/scale}
                      closed
                      dash={[6/scale, 3/scale]}
                      listening={false}
                    />
                  ));
                })()}

                {/* 2.5 Warning Field */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (!isEditMode || editingTarget === 'warning') && parsedWarning.map((poly, i) => (
                  <Line 
                    key={`warn-${i}`} 
                    points={poly} 
                    fill={getCssVar('--warning-field-color', '#FFC640')} 
                    stroke={getCssVar('--warning-field-color', '#FFC640')} 
                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : 0} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--warning-field-opacity', '0.5'))}
                  />
                ))}

                {/* 3. Safety Field (GOLD - Parity Color #FFD700) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (!isEditMode || editingTarget === 'protective') && parsedField.map((poly, i) => (
                  <Line 
                    key={`field-${i}`} 
                    points={poly} 
                    fill={FIELD_GOLD_FILL} 
                    stroke={FIELD_GOLD_STROKE} 
                    strokeWidth={isEditMode && resultsMode === 'cad' ? 1/scale : 0} 
                    closed 
                    opacity={isEditMode && resultsMode === 'cad' ? 0.4 : parseFloat(getCssVar('--protective-field-opacity', '0.5'))}
                  />
                ))}

                {/* 9a. Safety Field Handles */}
                {isEditMode && resultsMode === 'polygon' && viewMode === 'Composite' && (editingTarget === 'warning' ? parsedWarning : parsedField).map((poly, polyIdx) => {
                   if (polyIdx !== 0) return null; // only edit main polygon for now
                   return (
                     <Group key={`edit-${polyIdx}`}>
                       {/* Edges Midpoints (Add Points) */}
                       {Array.from({ length: poly.length / 2 - 1 }).map((_, pIdx) => {
                          const x1 = poly[pIdx*2], y1 = poly[pIdx*2+1];
                          const x2 = poly[(pIdx+1)*2], y2 = poly[(pIdx+1)*2+1];
                          const mx = (x1+x2)/2, my = (y1+y2)/2;
                          return (
                            <Circle key={`add-${pIdx}`} x={mx} y={my} radius={4/scale} fill="#00e676" opacity={0.3} 
                              onClick={() => handleEdgeClick(polyIdx, pIdx, mx, my)}
                              onMouseEnter={(e) => { e.target.opacity(1); e.target.getStage().container().style.cursor = 'copy'; }}
                              onMouseLeave={(e) => { e.target.opacity(0.3); e.target.getStage().container().style.cursor = 'default'; }}
                            />
                          );
                       })}
                       {/* Vertices */}
                       {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
                         if (pIdx === (poly.length / 2) - 1) return null;
                         return (
                           <Circle key={`h-${pIdx}`} x={poly[pIdx*2]} y={poly[pIdx*2+1]} radius={6/scale} fill="#ff1744" stroke="#fff" strokeWidth={2/scale} draggable
                             onDragStart={() => pushToHistory()}
                             onDragMove={(e) => handlePointDrag(polyIdx, pIdx, e.target.x(), e.target.y())}
                             onContextMenu={(e) => { e.evt.preventDefault(); handlePointDelete(polyIdx, pIdx); }}
                           />
                         );
                       })}
                     </Group>
                   );
                })}

                {/* 10. CAD Sketcher */}
                {(isEditMode || isEditingMask) && resultsMode === 'cad' && (isEditMode ? draftCad : maskCad) && (() => {
                  const activeCad = isEditMode ? draftCad : maskCad;
                  const setActiveCad = isEditMode ? setDraftCad : setMaskCad;
                  const activeUndoHistory = isEditMode ? cadHistory : maskCadHistory;
                  const setActiveUndoHistory = isEditMode ? setCadHistory : setMaskCadHistory;
                  let refs = [];
                  const addRef = (parsedArr, lName) => {
                    parsedArr.forEach((poly, polyIdx) => {
                       for(let i=0; i<poly.length; i+=2) refs.push({ x: poly[i], y: poly[i+1], sketchId: `ref-${lName}-${polyIdx}-${i}`, part: 'point', type: 'reference', snapped: true });
                    });
                  };
                  if (currentResult?.footprint_wkt) addRef(parseWktToKonva(currentResult.footprint_wkt), 'FP');
                  if (currentResult?.load_wkt) addRef(parseWktToKonva(currentResult.load_wkt), 'Load');

                  return (
                    <CADSketcher 
                      ref={cadRef}
                      sketches={activeCad.sketches} 
                      setSketches={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.sketches) : v;
                         setActiveCad(prev => ({ ...prev, sketches: updated }));
                      }} 
                      dimensions={activeCad.dimensions}
                      setDimensions={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.dimensions) : v;
                         setActiveCad(prev => ({ ...prev, dimensions: updated }));
                      }}
                      fixedPoints={activeCad.fixedPoints}
                      setFixedPoints={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.fixedPoints) : v;
                         setActiveCad(prev => ({ ...prev, fixedPoints: updated }));
                      }}
                      constraints={activeCad.constraints}
                      setConstraints={(v) => {
                         const updated = typeof v === 'function' ? v(activeCad.constraints) : v;
                         setActiveCad(prev => ({ ...prev, constraints: updated }));
                      }}
                      referenceVertices={refs}
                       pushToHistory={() => {
                         setActiveUndoHistory(prev => [JSON.stringify(activeCad), ...prev].slice(0, 30));
                       }}
                      scale={scale} 
                      SCALE_M={SCALE_M} 
                      activeTool={activeTool}
                      setOverlay={setOverlay}
                      isConstructionMode={isConstructionMode}
                      isSubtractionMode={isSubtractionMode}
                    />
                  );
                })()}

                {/* 4. Base Footprint Outline (Z 10 equivalent) */}
                {showFootprint && geometry.FootPrint && parseWktWithTransform(geometry.FootPrint, tObj.fn).map((poly, i) => (
                  <Line key={`fp-${i}`} points={poly} stroke="#fff" strokeWidth={1/scale} dash={[5/scale, 5/scale]} opacity={0.6} closed />
                ))}

                {/* 5. Trajectories (Z 15 equivalent) */}
                {trajCanvas && (
                   <Group>
                     <Line points={trajCanvas} stroke="cyan" strokeWidth={2/scale} dash={[8/scale, 4/scale]} />
                     <Circle x={trajCanvas[trajCanvas.length-2]} y={trajCanvas[trajCanvas.length-1]} radius={4/scale} fill="cyan" />
                   </Group>
                )}
                {frontTrajCanvas && (
                   <Group>
                     <Line points={frontTrajCanvas} stroke="lime" strokeWidth={2/scale} dash={[8/scale, 4/scale]} />
                     <Circle x={frontTrajCanvas[frontTrajCanvas.length-2]} y={frontTrajCanvas[frontTrajCanvas.length-1]} radius={4/scale} fill="lime" />
                   </Group>
                )}

                {/* 6. Active Evaluated Load Outline (Z 20) */}
                {currentResult?.load_wkt && (
                  (currentResult.load === 'Load1' && showLoad1) || 
                  (currentResult.load === 'Load2' && showLoad2)
                ) && parseWktWithTransform(currentResult.load_wkt, tObj.fn).map((poly, i) => {
                  const isL2 = currentResult.load === 'Load2';
                  return (
                    <Line 
                      key={`load-${i}`} 
                      points={poly} 
                      stroke={isL2 ? "#2196F3" : "#4CAF50"} 
                      strokeWidth={2/scale} 
                      dash={[5/scale, 5/scale]}
                      fill={isL2 ? "rgba(33, 150, 243, 0.1)" : "rgba(76, 175, 80, 0.1)"} 
                      closed 
                    />
                  );
                })}

                {/* 6. Ignored Area (Z 30 equivalent - Rendered Higher) */}
                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIgnored.map((poly, i) => (
                  <Line
                    key={`ig-${i}`}
                    points={poly}
                    fill={IGNORED_GRAY_FILL}
                    stroke={isEditingMask ? '#ff5252' : 'transparent'}
                    strokeWidth={isEditingMask ? 2/scale : 0}
                    dash={isEditingMask ? [6/scale, 4/scale] : undefined}
                    closed
                  />
                ))}

                {/* 9b. Mask (Ignored) Handles */}
                {isEditingMask && resultsMode === 'polygon' && viewMode === 'Composite' && parsedIgnored.map((poly, polyIdx) => (
                  <Group key={`mask-edit-${polyIdx}`}>
                    {/* Edges Midpoints (Add Points) */}
                    {Array.from({ length: poly.length / 2 - 1 }).map((_, pIdx) => {
                        const x1 = poly[pIdx * 2], y1 = poly[pIdx * 2 + 1];
                        const x2 = poly[(pIdx + 1) * 2], y2 = poly[(pIdx + 1) * 2 + 1];
                        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
                        return (
                          <Circle key={`madd-${pIdx}`} x={mx} y={my} radius={4/scale} fill="#ff5252" opacity={0.3}
                            onClick={() => handleMaskEdgeClick(polyIdx, pIdx, mx, my)}
                            onMouseEnter={(e) => { e.target.opacity(1); e.target.getStage().container().style.cursor = 'copy'; }}
                            onMouseLeave={(e) => { e.target.opacity(0.3); e.target.getStage().container().style.cursor = 'default'; }}
                          />
                        );
                    })}
                    {/* Vertices */}
                    {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
                      if (pIdx === (poly.length / 2) - 1) return null;
                      return (
                        <Circle
                          key={`mh-${pIdx}`}
                          x={poly[pIdx * 2]} y={poly[pIdx * 2 + 1]}
                          radius={6/scale}
                          fill="#ff5252"
                          stroke="#fff"
                          strokeWidth={2/scale}
                          draggable
                          onDragStart={() => pushToHistory()}
                          onDragMove={(e) => handleMaskPointDrag(polyIdx, pIdx, e.target.x(), e.target.y())}
                          onContextMenu={(e) => { e.evt.preventDefault(); handleMaskPointDelete(polyIdx, pIdx); }}
                        />
                      );
                    })}
                  </Group>
                ))}

                {viewMode === 'LiDAR View' && parsedLidarClip.map((poly, i) => {
                  const lidarIdx = lidarList.findIndex(l => l.name === activeLidar?.name);
                  const lidarColor = LIDAR_COLORS[lidarIdx % LIDAR_COLORS.length] || FIELD_GOLD_FILL;
                  return (
                    <Line key={`lc-${i}`} points={poly} fill={lidarColor} stroke={lidarColor} strokeWidth={2/scale} closed />
                  );
                })}

                {/* 8. Sensors */}
                {sensors.map((s, i) => {
                  const [tx, ty] = tObj.fn(s.x, s.y);
                  return (
                    <LidarMarker 
                      key={`s-${i}`} 
                      x={tx * SCALE_M} y={-ty * SCALE_M} 
                      rotation={-s.mount + (viewMode === 'LiDAR View' && !retainOri ? (activeLidar?.mount || 0) : 0)}
                      scale={scale} name={s.name} dia={s.dia} 
                      SCALE_M={SCALE_M} 
                    />
                  );
                })}
              </Layer>"""

content = content[:start_idx] + clean_bottom + content[end_idx:]

with open("src/components/Results.js", "w") as f:
    f.write(content)

