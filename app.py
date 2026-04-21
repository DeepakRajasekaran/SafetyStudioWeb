from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from core import DxfHandler, SafetyMath
import os
import io
import zipfile
import numpy as np
import math
import xml.etree.ElementTree as ET
from shapely import wkt
from shapely.ops import unary_union
from caseExport import generate_casesxml

app = Flask(__name__)
CORS(app)

XML_TEMPLATE_PATH = "assets/exampleLidar.xml"

@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({"status": "SafetyStudioWeb Backend is running"})

@app.route('/api/upload_dxf', methods=['POST'])
def upload_dxf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    import tempfile
    
    try:
        fd, temp_path = tempfile.mkstemp(suffix=".dxf")
        with os.fdopen(fd, 'wb') as t:
            file.save(t)
        poly = DxfHandler.load(temp_path)
        os.remove(temp_path)
        return jsonify({"wkt": poly.wkt})
    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

@app.route('/api/calculate', methods=['POST'])
def calculate_case():
    data = request.json
    try:
        import json
        with open('last_payload.json', 'w') as f:
            json.dump(data, f, indent=2)
    except:
        pass
    
    try:
        footprint_wkt = data['footprint_wkt']
        load_key = data.get('load', 'NoLoad')
        load_wkt_ret = None
        if load_key == 'Load1':
            load_wkt_ret = data.get('load_wkt')
        elif load_key == 'Load2':
            load_wkt_ret = data.get('load2_wkt')
            
        load_poly = wkt.loads(load_wkt_ret) if load_wkt_ret else None
        
        sensors = data.get('sensors', [])
        v = data.get('v', 0.0)
        w_input = data.get('w', 0.0)
        P = data.get('physics_params', {})
        
        footprint = wkt.loads(footprint_wkt)
        
        custom_wkt = data.get('custom_field_wkt')
        override_poly = None
        if custom_wkt:
            try:
                override_poly = wkt.loads(custom_wkt)
            except Exception as e:
                print(f"ERROR: Failed to load custom_field_wkt: {e}")

        print(f"DEBUG: Processing {load_key} case with P: {P} | Custom: {bool(override_poly)}")
        
        try:
            final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union = SafetyMath.calc_case(
                footprint, load_poly, sensors, v, w_input, P, override_poly=override_poly
            )
        except Exception as solver_err:
            print(f"CRITICAL: Solver failed: {solver_err}")
            import traceback
            traceback.print_exc()
            # Safety Fallback: recalculate without override if merge failed
            final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union = SafetyMath.calc_case(
                footprint, load_poly, sensors, v, w_input, P
            )
            print("INFO: Reverted to physics fallback field.")

        lidar_data = []
        if lid_out:
            for l in lid_out:
                clip = l.get('clip')
                lidar_data.append({
                    'name': l.get('name', ''),
                    'origin': list(l.get('origin', [0, 0])),
                    'mount': l.get('mount', 0),
                    'flipped': l.get('flipped', False),
                    'dia': l.get('dia', 0.15),
                    'r': l.get('r', 10.0),
                    'clip_wkt': clip.wkt if clip and not clip.is_empty else None
                })
        
        traj_pts = [[p[0], p[1]] for p in traj] if (traj is not None and len(traj) > 0) else []
        front_traj_pts = [[p[0], p[1]] for p in front_traj] if (front_traj is not None and len(front_traj) > 0) else []
        sweep_wkts = [s.wkt for s in sweeps if s and not s.is_empty] if (sweeps is not None and len(sweeps) > 0) else []
        ignored_wkt = ignored_poly.wkt if ignored_poly and not ignored_poly.is_empty else None
        ideal_field_wkt = sw_union.wkt if sw_union and not sw_union.is_empty else None
        
        return jsonify({
            "success": True,
            "final_field_wkt": final.wkt if final else None,
            "ideal_field_wkt": ideal_field_wkt,
            "lidars": lidar_data,
            "traj": traj_pts,
            "front_traj": front_traj_pts,
            "sweeps": sweep_wkts,
            "dist_d": D,
            "ignored_wkt": ignored_wkt,
            "load": load_key,
            "load_wkt": load_wkt_ret
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/api/export_sick', methods=['POST'])
def export_sick():
    data = request.json
    try:
        if not os.path.exists(XML_TEMPLATE_PATH):
            return jsonify({"error": "Template XML not found inside container."}), 500
            
        XML_CASES_TEMPLATE_PATH = "assets/exampleCases.casesxml"
        if not os.path.exists(XML_CASES_TEMPLATE_PATH):
            return jsonify({"error": "Cases Template XML not found."}), 500
        
        tree = ET.parse(XML_TEMPLATE_PATH)
        root = tree.getroot()
        
        s = data['sensor']
        fieldsets = data['fieldsets']
        results = data['results']
        evaluationCases = data.get('evaluationCases', [])
        case_dict = {str(c['id']): c for c in evaluationCases}
        
        # 1. Update Device
        devs = root.find('Devices')
        if devs is not None:
            d = devs.find('Device')
            if d is not None:
                sx, sy = float(s.get('x', 0)), float(s.get('y', 0))
                smount = float(s.get('mount', 0))
                d.set('PositionX', str(int(sx * 1000)))
                d.set('PositionY', str(int(sy * 1000)))
                d.set('Rotation', str(smount % 360))
                d.set('StandingUpsideDown', "true" if s.get('flipped', False) else "false")
        
        # 2. Global Geometry (Ignored regions across all used cases)
        ign_polys = []
        for fs in fieldsets:
            for fld in fs['fields']:
                res = results.get(str(fld['caseId']))
                if res and res.get('ignored_wkt'):
                    ign_polys.append(wkt.loads(res['ignored_wkt']))
        
        if ign_polys:
            u_ign = unary_union(ign_polys)
            gg = root.find('.//GlobalGeometry')
            if gg is None and devs is not None and devs.find('Device') is not None:
                gg = ET.SubElement(devs.find('Device'), 'GlobalGeometry')
            
            if gg is not None:
                gg.set('UseGlobalGeometry', 'true')
                for c in list(gg): gg.remove(c)
                geoms = u_ign.geoms if hasattr(u_ign, 'geoms') else [u_ign]
                for g in geoms:
                    if g.geom_type == 'Polygon':
                        x_p = ET.SubElement(gg, 'Polygon'); x_p.set('Type', 'CutOut')
                        pts = list(g.exterior.coords)
                        if len(pts) > 1 and pts[0] == pts[-1]: pts.pop()
                        for pt in pts:
                            ET.SubElement(x_p, 'Point', {'X':str(int(pt[0]*1000)), 'Y':str(int(pt[1]*1000))})

        # 3. Fieldsets and Case generation
        sdxml_fields = []
        
        fs_node = root.find('Fieldsets')
        if fs_node is None: fs_node = ET.SubElement(root, 'Fieldsets')
        for c in list(fs_node): fs_node.remove(c)
        
        for fs_idx, fs_item in enumerate(fieldsets):
            x_fs = ET.SubElement(fs_node, 'Fieldset'); x_fs.set('Name', fs_item['name'])
            for f_idx, fld_item in enumerate(fs_item['fields']):
                caseId_str = str(fld_item['caseId'])
                if caseId_str in case_dict:
                    c = case_dict[caseId_str]
                    field_name = f"{c['load']}_{c['v']},{c['w']}"
                else:
                    field_name = fld_item['name']
                    
                sdxml_fields.append({
                    "fieldset_name": fs_item['name'],
                    "fieldset_index": fs_idx,
                    "field_index_in_set": f_idx,
                    "field_name": field_name,
                    "fieldtype": 'ProtectiveSafeBlanking',
                    "multiple_sampling": 2,
                    "resolution": 70,
                    "tolerance_positive": 0,
                    "tolerance_negative": 0
                })
                
                x_f = ET.SubElement(x_fs, 'Field')
                x_f.set('Name', field_name)
                # Default SICK attrs
                for k,v in {'Fieldtype':'ProtectiveSafeBlanking', 'MultipleSampling':'2', 'Resolution':'70', 'TolerancePositive':'0', 'ToleranceNegative':'0'}.items():
                    x_f.set(k,v)
                
                res = results.get(caseId_str)
                if res:
                    lid_data = next((l for l in res['lidars'] if l['name'] == s['name']), None)
                    if lid_data and lid_data.get('clip_wkt'):
                        poly = wkt.loads(lid_data['clip_wkt'])
                        geoms = poly.geoms if hasattr(poly, 'geoms') else [poly]
                        for g in geoms:
                            if g.geom_type == 'Polygon':
                                x_p = ET.SubElement(x_f, 'Polygon'); x_p.set('Type', 'Field')
                                pts = list(g.exterior.coords)
                                if len(pts) > 1 and pts[0] == pts[-1]: pts.pop()
                                for pt in pts:
                                    ET.SubElement(x_p, 'Point', {'X':str(int(pt[0]*1000)), 'Y':str(int(pt[1]*1000))})
            
        sdxml_out = io.BytesIO()
        tree.write(sdxml_out, encoding='utf-8', xml_declaration=True)
        sdxml_str = sdxml_out.getvalue().decode('utf-8')
        
        # 4. Generate Cases XML string
        casesxml_str = generate_casesxml(sdxml_fields, XML_CASES_TEMPLATE_PATH, None)
        
        # 5. Pack into ZIP
        out_zip = io.BytesIO()
        with zipfile.ZipFile(out_zip, 'w') as z:
            z.writestr(f"{s['name']}.sdxml", sdxml_str)
            z.writestr(f"{s['name']}.casesxml", casesxml_str)
            
        out_zip.seek(0)
        return send_file(out_zip, mimetype="application/zip", as_attachment=True, download_name=f"{s['name']}.zip")
        
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

@app.route('/api/export_leuze', methods=['POST'])
def export_leuze():
    data = request.json
    try:
        s = data['sensor']
        results = data['results']
        # Map front-end 'evaluationCases' to local variable
        evaluation_cases = data.get('evaluationCases', [])
        
        out_zip = io.BytesIO()
        with zipfile.ZipFile(out_zip, 'w') as z:
            for k in evaluation_cases:
                res = results.get(str(k['id']))
                if not res: continue
                
                lid = next((l for l in res['lidars'] if l['name'] == s['name']), None)
                if lid and lid.get('clip_wkt'):
                    poly = wkt.loads(lid.get('clip_wkt'))
                    
                    # Leuze CSV: coordinates relative to sensor in mm
                    og = np.array(lid['origin'])
                    tf_rot = np.radians(float(lid.get('mount', 0)))
                    c, si = np.cos(-tf_rot), np.sin(-tf_rot)
                    R = np.array([[c, -si], [si, c]])
                    
                    csv_io = io.StringIO()
                    csv_io.write("x;y\n")
                    
                    geoms = poly.geoms if hasattr(poly, 'geoms') else [poly]
                    for g in geoms:
                        if g.geom_type == 'Polygon':
                            pts = np.array(g.exterior.coords)
                            tf_pts = (pts - og) @ R.T
                            if s.get('flipped', False): tf_pts[:, 0] = -tf_pts[:, 0]
                            for p in tf_pts:
                                xm, ym = p[0], p[1]
                                x_mm = xm * 1000.0
                                y_mm = ym * 1000.0
                                if math.hypot(x_mm, y_mm) > 1.0: # Filter center point
                                    csv_io.write(f"{x_mm:.2f};{y_mm:.2f}\n")
                    
                    # Use descriptive name matching Python tool behavior
                    safe_desc = "".join(c for c in k.get('desc', f"{k['id']}") if c.isalnum() or c in (' ','_','-','(',')','.',',')).strip()
                    z.writestr(f"{safe_desc}.csv", csv_io.getvalue())
        
        out_zip.seek(0)
        return send_file(out_zip, mimetype="application/zip", as_attachment=True, download_name=f"{s['name']}_leuze.zip")
        
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)