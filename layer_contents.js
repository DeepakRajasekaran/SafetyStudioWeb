  1052	              <Layer ref={layerRef}>
  1053	                {/* 1. Static Sweeps (Z -10 equivalent) */}
  1054	                {viewMode === 'Sweep Steps' && parsedSweeps.map((poly, i) => (
  1055	                  <Line key={`sw-${i}`} points={poly} fill={fillSweeps ? "rgba(255,165,0,0.05)" : "transparent"} stroke="rgba(255,165,0,0.4)" strokeWidth={1/scale} closed />
  1056	                ))}
  1057	
  1058	                {/* 1b. Sweep Convex Hull Outline */}
  1059	                {viewMode === 'Sweep Steps' && sweepHullPoints && (
  1060	                  <Line points={sweepHullPoints} stroke="#00e5ff" strokeWidth={2/scale} fill="rgba(0,229,255,0.04)" dash={[6/scale, 4/scale]} closed />
  1061	                )}
  1062	
  1063	                {/* 2. Ghost Field (Reference) */}
  1064	                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIdeal.map((poly, i) => (
  1065	                  <Line key={`ideal-${i}`} points={poly} stroke="#444" strokeWidth={1/scale} dash={[5/scale, 5/scale]} closed />
  1066	                ))}
  1067	
  1068	                {/* 3a. CAD Preview Field (live boolean result — shown in CAD edit mode, replaces gold field) */}
  1069	                {isEditMode && resultsMode === 'cad' && previewFieldWkt && (() => {
  1070	                  // For the preview, if we are in LiDAR View (local), we need the inverse transform 
  1071	                  // because previewFieldWkt is generated in Robot frame (by combining with base gold field)
  1072	                  const transformFn = viewMode === 'LiDAR View' ? tObj.inv : tObj.fn;
  1073	                  return parseWktWithTransform(previewFieldWkt, transformFn).map((poly, i) => (
  1074	                    <Line
  1075	                      key={`preview-${i}`}
  1076	                      points={poly}
  1077	                      fill="rgba(0, 230, 118, 0.35)"
  1078	                      stroke="#00e676"
  1079	                      strokeWidth={2/scale}
  1080	                      closed
  1081	                      dash={[6/scale, 3/scale]}
  1082	                      listening={false}
  1083	                    />
  1084	                  ));
  1085	                })()}
  1086	
  1087	                {/* 2. Inactive Field (rendered first / bottom) */}
  1088	                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (
  1089	                  <>
  1090	                    {editingTarget !== 'protective' && parsedField.map((poly, i) => (
  1091	                      <Line key={`field-inact-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
  1092	                    ))}
  1093	                    {editingTarget !== 'warning' && parsedWarning.map((poly, i) => (
  1094	                      <Line key={`warn-inact-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.2} listening={false} />
  1095	                    ))}
  1096	                  </>
  1097	                )}
  1098	
  1099	                {/* 3. Active Field (rendered above inactive, but below handles) */}
  1100	                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && (
  1101	                  <>
  1102	                    {editingTarget === 'protective' && parsedField.map((poly, i) => (
  1103	                      <Line key={`field-act-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
  1104	                    ))}
  1105	                    {editingTarget === 'warning' && parsedWarning.map((poly, i) => (
  1106	                      <Line key={`warn-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={isEditMode && resultsMode === 'cad' ? 0.4 : 0.6} listening={false} />
  1107	                    ))}
  1108	                  </>
  1109	                )}
  1110	
  1111	                {/* 9a. Safety Field Handles */}
  1112	                {isEditMode && resultsMode === 'polygon' && viewMode === 'Composite' && (editingTarget === 'warning' ? parsedWarning : parsedField).map((poly, polyIdx) => {
  1113	                   if (polyIdx !== 0) return null; // only edit main polygon for now
  1114	                   return (
  1115	                     <Group key={`edit-${polyIdx}`}>
  1116	                       {/* Edges Midpoints (Add Points) */}
  1117	                       {Array.from({ length: poly.length / 2 - 1 }).map((_, pIdx) => {
  1118	                          const x1 = poly[pIdx*2], y1 = poly[pIdx*2+1];
  1119	                          const x2 = poly[(pIdx+1)*2], y2 = poly[(pIdx+1)*2+1];
  1120	                          const mx = (x1+x2)/2, my = (y1+y2)/2;
  1121	                          return (
  1122	                            <Circle key={`add-${pIdx}`} x={mx} y={my} radius={4/scale} fill="#00e676" opacity={0.3} 
  1123	                              onClick={() => handleEdgeClick(polyIdx, pIdx, mx, my)}
  1124	                              onMouseEnter={(e) => { e.target.opacity(1); e.target.getStage().container().style.cursor = 'copy'; }}
  1125	                              onMouseLeave={(e) => { e.target.opacity(0.3); e.target.getStage().container().style.cursor = 'default'; }}
  1126	                            />
  1127	                          );
  1128	                       })}
  1129	                       {/* Vertices */}
  1130	                       {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
  1131	                         if (pIdx === (poly.length / 2) - 1) return null;
  1132	                         return (
  1133	                           <Circle key={`h-${pIdx}`} x={poly[pIdx*2]} y={poly[pIdx*2+1]} radius={6/scale} fill="#ff1744" stroke="#fff" strokeWidth={2/scale} draggable
  1134	                             onDragStart={(e) => { pushToHistory(); e.target.moveToTop(); }}
  1135	                             onDragEnd={(e) => { e.target.position({ x: poly[pIdx*2], y: poly[pIdx*2+1] }); }}
  1136	                             onDragMove={(e) => handlePointDrag(polyIdx, pIdx, e.target.x(), e.target.y())}
  1137	                             onContextMenu={(e) => { e.evt.preventDefault(); handlePointDelete(polyIdx, pIdx); }}
  1138	                           />
  1139	                         );
  1140	                       })}
  1141	                     </Group>
  1142	                   );
  1143	                })}
  1144	
  1145	                {/* 10. CAD Sketcher */}
  1146	                {(isEditMode || isEditingMask) && resultsMode === 'cad' && (isEditMode ? draftCad : maskCad) && (() => {
  1147	                  const activeCad = isEditMode ? draftCad : maskCad;
  1148	                  const setActiveCad = isEditMode ? setDraftCad : setMaskCad;
  1149	                  const activeUndoHistory = isEditMode ? cadHistory : maskCadHistory;
  1150	                  const setActiveUndoHistory = isEditMode ? setCadHistory : setMaskCadHistory;
  1151	                  let refs = [];
  1152	                  const addRef = (parsedArr, lName) => {
  1153	                    parsedArr.forEach((poly, polyIdx) => {
  1154	                       for(let i=0; i<poly.length; i+=2) refs.push({ x: poly[i], y: poly[i+1], sketchId: `ref-${lName}-${polyIdx}-${i}`, part: 'point', type: 'reference', snapped: true });
  1155	                    });
  1156	                  };
  1157	                  if (currentResult?.footprint_wkt) addRef(parseWktToKonva(currentResult.footprint_wkt), 'FP');
  1158	                  if (currentResult?.load_wkt) addRef(parseWktToKonva(currentResult.load_wkt), 'Load');
  1159	
  1160	                  return (
  1161	                    <CADSketcher 
  1162	                      ref={cadRef}
  1163	                      sketches={activeCad.sketches} 
  1164	                      setSketches={(v) => {
  1165	                         const updated = typeof v === 'function' ? v(activeCad.sketches) : v;
  1166	                         setActiveCad(prev => ({ ...prev, sketches: updated }));
  1167	                      }} 
  1168	                      dimensions={activeCad.dimensions}
  1169	                      setDimensions={(v) => {
  1170	                         const updated = typeof v === 'function' ? v(activeCad.dimensions) : v;
  1171	                         setActiveCad(prev => ({ ...prev, dimensions: updated }));
  1172	                      }}
  1173	                      fixedPoints={activeCad.fixedPoints}
  1174	                      setFixedPoints={(v) => {
  1175	                         const updated = typeof v === 'function' ? v(activeCad.fixedPoints) : v;
  1176	                         setActiveCad(prev => ({ ...prev, fixedPoints: updated }));
  1177	                      }}
  1178	                      constraints={activeCad.constraints}
  1179	                      setConstraints={(v) => {
  1180	                         const updated = typeof v === 'function' ? v(activeCad.constraints) : v;
  1181	                         setActiveCad(prev => ({ ...prev, constraints: updated }));
  1182	                      }}
  1183	                      referenceVertices={refs}
  1184	                       pushToHistory={() => {
  1185	                         setActiveUndoHistory(prev => [JSON.stringify(activeCad), ...prev].slice(0, 30));
  1186	                       }}
  1187	                      scale={scale} 
  1188	                      SCALE_M={SCALE_M} 
  1189	                      activeTool={activeTool}
  1190	                      setOverlay={setOverlay}
  1191	                      isConstructionMode={isConstructionMode}
  1192	                      isSubtractionMode={isSubtractionMode}
  1193	                    />
  1194	                  );
  1195	                })()}
  1196	
  1197	                {/* 4. Base Footprint Outline (Z 10 equivalent) */}
  1198	                {showFootprint && geometry.FootPrint && parseWktWithTransform(geometry.FootPrint, tObj.fn).map((poly, i) => (
  1199	                  <Line key={`fp-${i}`} points={poly} stroke="#fff" strokeWidth={1/scale} dash={[5/scale, 5/scale]} opacity={0.6} closed />
  1200	                ))}
  1201	
  1202	                {/* 5. Trajectories (Z 15 equivalent) */}
  1203	                {trajCanvas && (
  1204	                   <Group>
  1205	                     <Line points={trajCanvas} stroke="cyan" strokeWidth={2/scale} dash={[8/scale, 4/scale]} />
  1206	                     <Circle x={trajCanvas[trajCanvas.length-2]} y={trajCanvas[trajCanvas.length-1]} radius={4/scale} fill="cyan" />
  1207	                   </Group>
  1208	                )}
  1209	                {frontTrajCanvas && (
  1210	                   <Group>
  1211	                     <Line points={frontTrajCanvas} stroke="lime" strokeWidth={2/scale} dash={[8/scale, 4/scale]} />
  1212	                     <Circle x={frontTrajCanvas[frontTrajCanvas.length-2]} y={frontTrajCanvas[frontTrajCanvas.length-1]} radius={4/scale} fill="lime" />
  1213	                   </Group>
  1214	                )}
  1215	
  1216	                {/* 6. Active Evaluated Load Outline (Z 20) */}
  1217	                {currentResult?.load_wkt && (
  1218	                  (currentResult.load === 'Load1' && showLoad1) || 
  1219	                  (currentResult.load === 'Load2' && showLoad2)
  1220	                ) && parseWktWithTransform(currentResult.load_wkt, tObj.fn).map((poly, i) => {
  1221	                  const isL2 = currentResult.load === 'Load2';
  1222	                  return (
  1223	                    <Line 
  1224	                      key={`load-${i}`} 
  1225	                      points={poly} 
  1226	                      stroke={isL2 ? "#2196F3" : "#4CAF50"} 
  1227	                      strokeWidth={2/scale} 
  1228	                      dash={[5/scale, 5/scale]}
  1229	                      fill={isL2 ? "rgba(33, 150, 243, 0.1)" : "rgba(76, 175, 80, 0.1)"} 
  1230	                      closed 
  1231	                    />
  1232	                  );
  1233	                })}
  1234	
  1235	                {/* 6. Ignored Area (Z 30 equivalent - Rendered Higher) */}
  1236	                {(viewMode === 'Composite' || (viewMode === 'LiDAR View' && showComposite)) && parsedIgnored.map((poly, i) => (
  1237	                  <Line
  1238	                    key={`ig-${i}`}
  1239	                    points={poly}
  1240	                    fill={IGNORED_GRAY_FILL}
  1241	                    stroke={isEditingMask ? '#ff5252' : 'transparent'}
  1242	                    strokeWidth={isEditingMask ? 2/scale : 0}
  1243	                    dash={isEditingMask ? [6/scale, 4/scale] : undefined}
  1244	                    closed
  1245	                  />
  1246	                ))}
  1247	
  1248	                {/* 9b. Mask (Ignored) Handles */}
  1249	                {isEditingMask && resultsMode === 'polygon' && viewMode === 'Composite' && parsedIgnored.map((poly, polyIdx) => (
  1250	                  <Group key={`mask-edit-${polyIdx}`}>
  1251	                    {/* Edges Midpoints (Add Points) */}
  1252	                    {Array.from({ length: poly.length / 2 - 1 }).map((_, pIdx) => {
  1253	                        const x1 = poly[pIdx * 2], y1 = poly[pIdx * 2 + 1];
  1254	                        const x2 = poly[(pIdx + 1) * 2], y2 = poly[(pIdx + 1) * 2 + 1];
  1255	                        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  1256	                        return (
  1257	                          <Circle key={`madd-${pIdx}`} x={mx} y={my} radius={4/scale} fill="#ff5252" opacity={0.3}
  1258	                            onClick={() => handleMaskEdgeClick(polyIdx, pIdx, mx, my)}
  1259	                            onMouseEnter={(e) => { e.target.opacity(1); e.target.getStage().container().style.cursor = 'copy'; }}
  1260	                            onMouseLeave={(e) => { e.target.opacity(0.3); e.target.getStage().container().style.cursor = 'default'; }}
  1261	                          />
  1262	                        );
  1263	                    })}
  1264	                    {/* Vertices */}
  1265	                    {Array.from({ length: poly.length / 2 }).map((_, pIdx) => {
  1266	                      if (pIdx === (poly.length / 2) - 1) return null;
  1267	                      return (
  1268	                        <Circle
  1269	                          key={`mh-${pIdx}`}
  1270	                          x={poly[pIdx * 2]} y={poly[pIdx * 2 + 1]}
  1271	                          radius={6/scale}
  1272	                          fill="#ff5252"
  1273	                          stroke="#fff"
  1274	                          strokeWidth={2/scale}
  1275	                          draggable
  1276	                          onDragStart={() => pushToHistory()}
  1277	                          onDragMove={(e) => handleMaskPointDrag(polyIdx, pIdx, e.target.x(), e.target.y())}
  1278	                          onContextMenu={(e) => { e.evt.preventDefault(); handleMaskPointDelete(polyIdx, pIdx); }}
  1279	                        />
  1280	                      );
  1281	                    })}
  1282	                  </Group>
  1283	                ))}
  1284	
  1285	                {viewMode === 'LiDAR View' && (
  1286	                  <>
  1287	                    {/* Inactive Lidar Field */}
  1288	                    {editingTarget !== 'protective' && parsedLidarClip.map((poly, i) => (
  1289	                      <Line key={`lc-inact-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.2} />
  1290	                    ))}
  1291	                    {editingTarget !== 'warning' && parsedLidarWarningClip.map((poly, i) => (
  1292	                      <Line key={`lwc-inact-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.2} />
  1293	                    ))}
  1294	                    
  1295	                    {/* Active Lidar Field */}
  1296	                    {editingTarget === 'protective' && parsedLidarClip.map((poly, i) => (
  1297	                      <Line key={`lc-act-${i}`} points={poly} fill={FIELD_PROTECTIVE_COLOR} stroke={FIELD_PROTECTIVE_COLOR} strokeWidth={1/scale} closed opacity={0.6} />
  1298	                    ))}
  1299	                    {editingTarget === 'warning' && parsedLidarWarningClip.map((poly, i) => (
  1300	                      <Line key={`lwc-act-${i}`} points={poly} fill={FIELD_WARNING_COLOR} stroke={FIELD_WARNING_COLOR} strokeWidth={1/scale} closed opacity={0.6} />
  1301	                    ))}
  1302	                  </>
  1303	                )}
  1304	
  1305	                {/* 8. Sensors */}
  1306	                {sensors.map((s, i) => {
  1307	                  const [tx, ty] = tObj.fn(s.x, s.y);
  1308	                  return (
  1309	                    <LidarMarker 
  1310	                      key={`s-${i}`} 
  1311	                      x={tx * SCALE_M} y={-ty * SCALE_M} 
  1312	                      rotation={-s.mount + (viewMode === 'LiDAR View' && !retainOri ? (activeLidar?.mount || 0) : 0)}
  1313	                      scale={scale} name={s.name} dia={s.dia} 
  1314	                      SCALE_M={SCALE_M} 
  1315	                    />
  1316	                  );
  1317	                })}
  1318	              </Layer>
