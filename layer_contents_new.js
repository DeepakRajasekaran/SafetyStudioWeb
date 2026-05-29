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
  1111	                {viewMode === 'LiDAR View' && (
  1112	          <>
  1113	            <div style={{ width: 1, height: 16, background: '#333' }} />
  1114	            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  1115	            <div className="segmented-control">
  1116	                {lidarList.map((l, idx) => (
  1117	                  <button 
  1118	                    key={l.name} 
  1119	                    onClick={() => setSelectedLidar(l.name)}
  1120	                    className={`segmented-btn ${activeLidar?.name === l.name ? 'active' : ''}`}
  1121	                    style={{ background: activeLidar?.name === l.name ? '#1a4a25' : 'transparent' }}
  1122	                  >
  1123	                    {l.name}
  1124	                  </button>
  1125	                ))}
  1126	              </div>
  1127	              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', paddingLeft: 10, fontWeight: '500' }}>
  1128	                <input type="checkbox" checked={wrtLidar} onChange={e => setWrtLidar(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> w.r.t Lidar
  1129	              </label>
  1130	              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
  1131	                <input type="checkbox" checked={retainOri} onChange={e => setRetainOri(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> Original Orientation
  1132	              </label>
  1133	              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#aaa', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '500' }}>
  1134	                <input type="checkbox" checked={showComposite} onChange={e => setShowComposite(e.target.checked)} style={{ accentColor: '#00e5ff', width: 14, height: 14 }} /> Composite Field
  1135	              </label>
  1136	            </div>
  1137	          </>
  1138	        )}
  1139	
  1140	        <div style={{ width: 1, background: '#333', height: 16 }} />
  1141	
  1142	        {/* Visibility Toggles */}
  1143	        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.2)', padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
  1144	          {[
  1145	            { id: 'FP', label: 'FP', state: showFootprint, set: setShowFootprint, col: '#fff' },
  1146	            { id: 'L1', label: 'L1', state: showLoad1, set: setShowLoad1, col: '#4CAF50' },
  1147	            { id: 'L2', label: 'L2', state: showLoad2, set: setShowLoad2, col: '#2196F3' }
  1148	          ].map(t => (
  1149	            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.state ? t.col : '#555', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '800', transition: 'all 0.2s' }}>
  1150	              <input type="checkbox" checked={t.state} onChange={e => t.set(e.target.checked)} style={{ accentColor: t.col, width: 12, height: 12, cursor: 'pointer' }} />
  1151	              {t.label}
  1152	            </label>
  1153	          ))}
  1154	          {viewMode === 'Sweep Steps' && (
  1155	            <>
  1156	               <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 12, margin: '0 4px' }} />
  1157	               <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: fillSweeps ? '#ff9800' : '#555', fontSize: '0.65rem', cursor: 'pointer', fontWeight: '800' }}>
  1158	                 <input type="checkbox" checked={fillSweeps} onChange={e => setFillSweeps(e.target.checked)} style={{ accentColor: '#ff9800', width: 12, height: 12, cursor: 'pointer' }} />
  1159	                 SHADE
  1160	               </label>
  1161	            </>
  1162	          )}
  1163	        </div>
  1164	
  1165	        {(viewMode === 'Composite' || viewMode === 'LiDAR View') && !isEditingMask && (
  1166	          <div className="segmented-control" style={{ marginBottom: 4 }}>
  1167	             <button onClick={() => setEditingTarget('protective')} className={`segmented-btn ${editingTarget === 'protective' ? 'active' : ''}`} style={{ background: editingTarget === 'protective' ? '#1a4a25' : 'transparent', fontSize: '0.65rem' }}>
  1168	               PROTECTIVE
  1169	             </button>
  1170	             <button onClick={() => setEditingTarget('warning')} className={`segmented-btn ${editingTarget === 'warning' ? 'active' : ''}`} style={{ background: editingTarget === 'warning' ? '#ff9800' : 'transparent', color: editingTarget === 'warning' ? '#000' : '#aaa', fontSize: '0.65rem' }}>
  1171	               WARNING
  1172	             </button>
  1173	          </div>
  1174	        )}
  1175	        {viewMode === 'Composite' && (isEditMode || isEditingMask) && (
  1176	          <div className="segmented-control">
  1177	             <button onClick={() => setResultsMode('polygon')} className={`segmented-btn ${resultsMode === 'polygon' ? 'active' : ''}`}>
  1178	               POLYGON
  1179	             </button>
  1180	             <button onClick={() => setResultsMode('cad')} className={`segmented-btn ${resultsMode === 'cad' ? 'active' : ''}`}>
  1181	               CAD
  1182	             </button>
  1183	          </div>
  1184	        )}
  1185	
  1186	        {(isEditMode || isEditingMask) && resultsMode === 'cad' && viewMode === 'Composite' && (
  1187	          <div style={{ marginLeft: 10 }}>
  1188	            <CADToolbar
  1189	              activeTool={activeTool}
  1190	              setActiveTool={setActiveTool}
  1191	              isConstructionMode={isConstructionMode}
  1192	              setIsConstructionMode={setIsConstructionMode}
  1193	              isSubtractionMode={isSubtractionMode}
  1194	              setIsSubtractionMode={setIsSubtractionMode}
  1195	              undo={(isEditMode || isEditingMask) && resultsMode === 'cad' ? (isEditMode ? handleCadUndo : handleMaskCadUndo) : undo}
  1196	              handleClearSketch={handleClearSketch}
  1197	              onConstructionClick={() => {
  1198	                if (cadRef.current && cadRef.current.hasSelection) {
  1199	                  cadRef.current.toggleConstruction();
  1200	                } else {
  1201	                  setIsConstructionMode(!isConstructionMode);
  1202	                }
  1203	              }}
  1204	            >
  1205	              {!isEditingMask && (
  1206	                <button onClick={async () => {
  1207	                const finalWkt = previewFieldWkt;
  1208	                if (!finalWkt) {
  1209	                  alert("No sketches found to finalize.");
  1210	                  return;
  1211	                }
  1212	
  1213	                // 1. Auto-save sketches session to cadData
  1214	                if (draftCad) {
  1215	                   const saveKey = editingTarget === 'warning' ? `${selectedCaseId}_warning` : selectedCaseId;
  1216	                   setCadFieldSafe('Overrides', saveKey, 'sketches', draftCad.sketches);
  1217	                   setCadFieldSafe('Overrides', saveKey, 'dimensions', draftCad.dimensions);
  1218	                   setCadFieldSafe('Overrides', saveKey, 'constraints', draftCad.constraints);
  1219	                   setCadFieldSafe('Overrides', saveKey, 'fixedPoints', draftCad.fixedPoints);
  1220	                }
  1221	
  1222	                // 2. Prepare updated case with custom_dxf
  1223	                const updatedCases = [...evaluationCases];
  1224	                const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
  1225	                if (idx !== -1) {
  1226	                  if (editingTarget === 'warning') {
  1227	                      updatedCases[idx] = { ...updatedCases[idx], custom_warning_dxf: finalWkt };
  1228	                  } else {
  1229	                      updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };
  1230	                  }
  1231	                  pushToHistory();
  1232	                  setEvaluationCases(updatedCases);
  1233	                  
  1234	                  // 3. Trigger immediate calculation with updated case to avoid race condition
  1235	                  await handleCalculate(updatedCases[idx]);
  1236	                }
  1237	
  1238	                setIsEditMode(false);
  1239	              }} style={{ background: '#1a4a25', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
  1240	                Finalize
  1241	              </button>
  1242	              )}
  1243	          </CADToolbar>
  1244	          </div>
  1245	        )}
  1246	
  1247	        <div style={{ flex: 1 }} />
  1248	
  1249	        {/* Edit Mask button — only in Composite view */}
  1250	        {viewMode === 'Composite' && currentResult && !isEditMode && (
  1251	          <button
  1252	            onClick={() => {
  1253	              if (!isEditingMask) {
  1254	                originalMaskWkt.current = currentResult.ignored_wkt;
  1255	                setMaskCad({ sketches: [], dimensions: [], fixedPoints: [], constraints: [] });
  1256	                setIsEditingMask(true);
  1257	                setIsEditMode(false);
  1258	              } else {
  1259	                if (resultsMode === 'cad' && previewFieldWkt) {
  1260	                  setResults(prev => {
  1261	                    const updated = { ...prev };
  1262	                    Object.keys(updated).forEach(id => {
  1263	                      if (updated[id]) updated[id] = { ...updated[id], ignored_wkt: previewFieldWkt };
  1264	                    });
  1265	                    return updated;
  1266	                  });
  1267	                  // Clear mask sketches after baking them into the ignored_wkt
  1268	                  setMaskCad(null);
  1269	                }
  1270	                originalMaskWkt.current = null;
  1271	                setIsEditingMask(false);
  1272	              }
  1273	            }}
  1274	            title="Edit Mask (Gray No-FOV Region)"
  1275	            style={{
  1276	              background: isEditingMask ? '#4a1a1a' : '#222',
  1277	              color: isEditingMask ? '#ff5252' : '#888',
  1278	              border: isEditingMask ? '1px solid #ff5252' : '1px solid transparent',
  1279	              padding: '4px 10px',
  1280	              borderRadius: 4,
  1281	              cursor: 'pointer',
  1282	              fontSize: '0.65rem',
  1283	              fontWeight: 'bold',
  1284	              display: 'flex',
  1285	              alignItems: 'center',
  1286	              gap: 4
  1287	            }}
  1288	          >
  1289	            <span style={{ fontSize: '0.75rem' }}>⬛</span> {isEditingMask ? 'Done' : 'Edit Mask'}
  1290	          </button>
  1291	        )}
  1292	
  1293	        <div style={{ display: 'flex', gap: 6 }}>
  1294	          <button onClick={undo} title="Global Undo (Ctrl+Z)" className="toolbar-action-btn" style={{ background: 'rgba(0,0,0,0.2)', color: '#666', border: 'none', padding: '6px' }}>
  1295	            <ArrowUUpLeft size={14} weight="bold" />
  1296	          </button>
  1297	          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 16, margin: '0 4px' }} />
  1298	          <button onClick={() => setCaseListOpen(!caseListOpen)} title="Toggle Case List" className="toolbar-action-btn" style={{ background: caseListOpen ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: caseListOpen ? '#fff' : '#666', border: 'none', padding: '6px' }}><List size={14} weight="bold" /></button>
  1299	          <button onClick={() => setInspectorOpen(!inspectorOpen)} title="Toggle Inspector" className="toolbar-action-btn" style={{ background: inspectorOpen ? 'var(--primary)' : 'rgba(0,0,0,0.2)', color: inspectorOpen ? '#fff' : '#666', border: 'none', padding: '6px' }}><Info size={14} weight="bold" /></button>
  1300	        </div>
  1301	
  1302	        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', height: 16, marginLeft: 4, marginRight: 4 }} />
  1303	
  1304	        {viewMode === 'Composite' && !isEditingMask && (
  1305	          <button onClick={async () => {
  1306	            if (isEditMode && resultsMode === 'polygon') {
  1307	                const finalWkt = editingTarget === 'warning' ? currentResult?.warning_field_wkt : currentResult?.final_field_wkt;
  1308	                if (finalWkt) {
  1309	                  const updatedCases = [...evaluationCases];
  1310	                  const idx = updatedCases.findIndex(c => c.id === selectedCaseId);
  1311	                  if (idx !== -1) {
  1312	                    if (editingTarget === 'warning') {
  1313	                        updatedCases[idx] = { ...updatedCases[idx], custom_warning_dxf: finalWkt };
  1314	                    } else {
  1315	                        updatedCases[idx] = { ...updatedCases[idx], custom_dxf: finalWkt };
  1316	                    }
  1317	                    pushToHistory();
  1318	                    setEvaluationCases(updatedCases);
