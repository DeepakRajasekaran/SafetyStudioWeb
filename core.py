import math
import ezdxf
import numpy as np
from shapely.geometry import Polygon, Point, MultiPolygon, LineString
from shapely.ops import unary_union, polygonize, linemerge
from shapely.affinity import rotate, translate, scale

class DxfHandler:
    @staticmethod
    def snap_lines(lines, tol=1e-3):
        snapped = []
        for line in lines:
            raw_coords = [(round(x, 4), round(y, 4)) for x, y in line.coords]
            new_coords = [raw_coords[0]]
            for p in raw_coords[1:]:
                if p != new_coords[-1]: new_coords.append(p)
            if len(new_coords) >= 2:
                snapped.append(LineString(new_coords))
        return snapped

    @staticmethod
    def load(filename):
        try:
            doc = ezdxf.readfile(filename)
            msp = doc.modelspace()
            polys = []
            lines = []
            
            for e in msp.query('LWPOLYLINE'):
                pts = []
                try:
                    if hasattr(e, 'get_points'): pts = e.get_points(format='xy')
                    else: pts = [(v[0], v[1]) for v in e]
                except:
                    if hasattr(e, 'vertices'): pts = [(v[0], v[1]) for v in e.vertices()]
                
                if len(pts)>=2:
                    if e.closed or (len(pts)>=3 and math.hypot(pts[0][0]-pts[-1][0], pts[0][1]-pts[-1][1]) < 1e-3):
                        if len(pts)>=3: polys.append(Polygon(pts))
                    else:
                        lines.append(LineString(pts))
            for e in msp.query('POLYLINE'):
                pts=[(float(v.dxf.location.x),float(v.dxf.location.y)) for v in e.vertices()]
                if len(pts)>=2:
                    if e.is_closed or (len(pts)>=3 and math.hypot(pts[0][0]-pts[-1][0], pts[0][1]-pts[-1][1]) < 1e-3):
                        if len(pts)>=3: polys.append(Polygon(pts))
                    else:
                        lines.append(LineString(pts))
            for e in msp.query('LINE'):
                p_s, p_e = (e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)
                lines.append(LineString([p_s, p_e]))
            
            for e in msp.query('ARC'):
                c = e.dxf.center; r = e.dxf.radius
                sa = e.dxf.start_angle; ea = e.dxf.end_angle
                if ea < sa: ea += 360
                angles = np.linspace(np.radians(sa), np.radians(ea), max(2, int(abs(ea-sa)/5)+1))
                arc_pts = [(c.x + r*np.cos(a), c.y + r*np.sin(a)) for a in angles]
                lines.append(LineString(arc_pts))
            
            for e in msp.query('CIRCLE'):
                c = e.dxf.center; r = e.dxf.radius
                angles = np.linspace(0, 2*np.pi, 73)
                pts = [(c.x + r*np.cos(a), c.y + r*np.sin(a)) for a in angles]
                polys.append(Polygon(pts))
            
            if lines:
                lines = DxfHandler.snap_lines(lines)
                merged = linemerge(lines)
                if merged.geom_type == 'LineString': merged_lines = [merged]
                elif merged.geom_type == 'MultiLineString': merged_lines = list(merged.geoms)
                else: merged_lines = []
                for p in polygonize(merged_lines): polys.append(p)
                polys.extend(merged_lines)
            
            if not polys: raise Exception("No geometry found in DXF.")
            return unary_union(polys)
        except Exception as e:
            raise Exception(f"{str(e)}")

class SafetyMath:
    @staticmethod
    def get_shadow_wedge(og, load_poly, r):
        if not load_poly or load_poly.is_empty: return None
        try:
            sensor = Point(og)
            if load_poly.distance(sensor) < 1e-3: return None

            shadows = []
            def process_geom(geom):
                if geom.geom_type == 'Polygon':
                    if not geom.exterior.is_ccw:
                        geom = Polygon(list(geom.exterior.coords)[::-1])
                    pts = list(geom.exterior.coords)
                    
                    chains = []
                    current_chain = []
                    for i in range(len(pts) - 1):
                        p1 = pts[i]; p2 = pts[i+1]
                        cp = (p2[0]-p1[0])*(og[1]-p1[1]) - (p2[1]-p1[1])*(og[0]-p1[0])
                        if cp < -1e-6:
                            if not current_chain: current_chain.append(p1)
                            current_chain.append(p2)
                        else:
                            if current_chain:
                                chains.append(current_chain)
                                current_chain = []
                    if current_chain:
                        if chains and current_chain[-1] == chains[0][0]:
                            chains[0] = current_chain[:-1] + chains[0]
                        else:
                            chains.append(current_chain)
                    
                    for chain in chains:
                        if len(chain) < 2: continue
                        poly_pts = list(chain)
                        for p in reversed(chain):
                            dx = p[0] - og[0]; dy = p[1] - og[1]
                            d = math.hypot(dx, dy)
                            if d < 1e-4: continue
                            poly_pts.append((og[0] + dx/d * r, og[1] + dy/d * r))
                        if len(poly_pts) >= 3:
                            shadows.append(Polygon(poly_pts).buffer(0.001))
                elif geom.geom_type in ['MultiPolygon', 'GeometryCollection']:
                    for g in geom.geoms: process_geom(g)
            
            process_geom(load_poly)
            if not shadows: return None
            return unary_union(shadows)
        except Exception as e:
            return None

    @staticmethod
    def patch_notch(poly):
        if not poly.is_valid or poly.is_empty or poly.geom_type != 'Polygon': return poly
        if not poly.exterior.is_ccw:
            poly = Polygon(list(poly.exterior.coords)[::-1])
            
        pts = list(poly.exterior.coords)
        if pts[0] == pts[-1]: pts.pop()
        n = len(pts)
        if n < 10: return poly
        
        radii = np.array([math.hypot(p[0], p[1]) for p in pts])
        max_r = np.max(radii)
        min_r = np.min(radii)
        
        keep_indices = []
        for i in range(n):
            p_prev = pts[(i-1)%n]; p_curr = pts[i]; p_next = pts[(i+1)%n]
            cp = (p_curr[0]-p_prev[0])*(p_next[1]-p_curr[1]) - (p_curr[1]-p_prev[1])*(p_next[0]-p_curr[0])
            is_outer = radii[i] > (max_r * 0.85)
            is_dent = cp < -1e-4 
            if is_outer and is_dent: continue
            keep_indices.append(i)
            
        pts = [pts[i] for i in keep_indices]
        n = len(pts)
        if n < 5: return Polygon(pts)
        radii = np.array([math.hypot(p[0], p[1]) for p in pts])
        
        max_idx = np.argmax(radii)
        pts = pts[max_idx:] + pts[:max_idx]
        radii = np.roll(radii, -max_idx)
        
        thresh = min_r + (max_r - min_r) * 0.4
        inner_indices = [i for i, r in enumerate(radii) if r < thresh]
        if not inner_indices: return Polygon(pts)
        
        segments = []; curr = [inner_indices[0]]
        for x in inner_indices[1:]:
            if x == curr[-1] + 1: curr.append(x)
            else: segments.append(curr); curr = [x]
        segments.append(curr)
        inner_seg = max(segments, key=len)
        
        seg_radii = radii[inner_seg]
        base_r = np.min(seg_radii)
        notch_thresh = base_r * 1.2
        bad_sub = [i for i in range(len(inner_seg)) if seg_radii[i] > notch_thresh]
        
        if bad_sub and bad_sub[0] > 0 and bad_sub[-1] < len(inner_seg) - 1:
            first_bad = inner_seg[bad_sub[0]]
            last_bad = inner_seg[bad_sub[-1]]
            idx_start = first_bad - 1
            idx_end = last_bad + 1
            if idx_start >= 0 and idx_end < len(pts):
                p_s = pts[idx_start]; p_e = pts[idx_end]
                r_fit = (math.hypot(p_s[0], p_s[1]) + math.hypot(p_e[0], p_e[1])) / 2.0
                a_s = math.atan2(p_s[1], p_s[0]); a_e = math.atan2(p_e[1], p_e[0])
                diff = a_e - a_s
                if diff < -math.pi: diff += 2*math.pi
                if diff > math.pi: diff -= 2*math.pi
                steps = int(abs(diff) * r_fit / 0.05) + 1
                new_arc = []
                for s in range(steps + 1):
                    t = s / steps; ang = a_s + diff * t
                    new_arc.append((r_fit*math.cos(ang), r_fit*math.sin(ang)))
                pts = pts[:idx_start] + new_arc + pts[idx_end+1:]
        return Polygon(pts)

    @staticmethod
    def calc_case(footprint, load_poly, sensors, v, w_input, P, override_poly=None):
        try:
            # 1. Geometry Prep
            raw_footprint_poly = footprint
            lat_scale = P.get('lat_scale', 1.0)
            if lat_scale != 1.0:
                raw_footprint_poly = scale(raw_footprint_poly, xfact=lat_scale, yfact=1.0, origin=(0,0))
            
            if load_poly and P.get('include_load', True):
                unpadded_geom = unary_union([raw_footprint_poly, load_poly]).convex_hull
            else:
                unpadded_geom = raw_footprint_poly

            FootPrint = unpadded_geom.buffer(P['pad'], join_style=2)
            ang_vel = w_input
            
            if hasattr(unpadded_geom, 'geoms'):
                pts = []
                for g in unpadded_geom.geoms: 
                    if hasattr(g, 'exterior'): pts.extend(list(g.exterior.coords))
                    elif hasattr(g, 'coords'): pts.extend(list(g.coords))
            else:
                if hasattr(unpadded_geom, 'exterior'): pts = list(unpadded_geom.exterior.coords)
                elif hasattr(unpadded_geom, 'coords'): pts = list(unpadded_geom.coords)
                else: pts = []
            if not pts: pts = [(0,0)]
            pts.sort(key=lambda p: (p[0], p[1]))
            
            EPS_W = 1e-5
            if abs(ang_vel) < EPS_W:
                ref_pt = max(pts, key=lambda p: p[1]) if v >= -1e-9 else min(pts, key=lambda p: p[1])
                v_ref = abs(v)
            else:
                sign_w = 1.0 if ang_vel >= 0 else -1.0
                v_eff = v if abs(v) > 1e-6 else 1e-6
                sign_v = 1.0 if v_eff >= 0 else -1.0
                def score(p):
                    lat_score = -sign_w * p[0] * 1000.0
                    long_score = sign_v * p[1]
                    return lat_score + long_score
                ref_pt = max(pts, key=score)
                vx_real = -ang_vel * ref_pt[1]
                vy_real = v + ang_vel * ref_pt[0]
                v_ref = math.sqrt(vx_real**2 + vy_real**2)
            
            D = v_ref * P['tr'] + (v_ref**2) / (2 * P['ac']) + P['ds'] if P['ac'] > 0 else v_ref * P['tr'] + P['ds']
            T = D / v_ref if v_ref > 0.01 else P['tr']
            
            dt=0.02; ts=np.arange(0,T+dt,dt); sweeps=[]
            traj=np.zeros((len(ts),3)); traj[0]=[0,0,np.pi/2]
            
            for i in range(len(ts)):
                if i>0:
                    px,py,pth = traj[i-1]
                    traj[i] = [px+v*np.cos(pth)*dt, py+v*np.sin(pth)*dt, pth+ang_vel*dt]
                if override_poly is None:
                    cx,cy,cth = traj[i]; rot_deg = np.degrees(cth - np.pi/2)
                    poly_instance = translate(rotate(FootPrint, rot_deg, origin=(0,0)), cx, cy)
                    sweeps.append(poly_instance)
            
            if override_poly is not None:
                final = override_poly
            else:
                sw_union = unary_union(sweeps)
                if abs(v) < 1e-3 and abs(ang_vel) > 1e-3 and P.get('patch_notch', False):
                    sw_union = SafetyMath.patch_notch(sw_union)
                field_method = P.get('field_method', 'union')
                if field_method == 'hull':
                    sw_union = sw_union.convex_hull
                elif field_method == 'hybrid':
                    threshold = float(P.get('hull_threshold', 0.5))
                    if D < threshold:
                        sw_union = sw_union.convex_hull
                final = sw_union.buffer(P.get('smooth',0.05), join_style=1).simplify(0.01)
            
            lid_out = []; all_fovs = []; composite_clips = []
            for s in sensors:
                og=(s['x'], s['y']); max_r = s['r']
                mid=np.radians(90+s['mount']); hw=np.radians(s['fov']/2)
                
                FootPrint_pts = [(og[0]+max_r*np.cos(a), og[1]+max_r*np.sin(a)) for a in np.linspace(mid-hw,mid+hw,50)]
                fov = Polygon([og]+FootPrint_pts+[og])
                all_fovs.append(fov)
                
                clip = final.intersection(fov)
                lidar_shadows = []
                for other_s in sensors:
                    if other_s is s: continue
                    dia = other_s.get('dia', 0.15)
                    obs_circle = Point(other_s['x'], other_s['y']).buffer(dia/2.0)
                    if fov.intersects(obs_circle):
                        sh = SafetyMath.get_shadow_wedge(og, obs_circle, max_r*1.1)
                        if sh: lidar_shadows.append(sh)
                
                if lidar_shadows: clip = clip.difference(unary_union(lidar_shadows))
                if load_poly and P.get('shadow', True): clip = clip.difference(load_poly)
                
                composite_clips.append(clip)
                
                shadow = None
                clip_indiv = clip
                if load_poly and P.get('shadow', True):
                    shadow = SafetyMath.get_shadow_wedge(og, load_poly, max_r*1.1)
                    if shadow: clip_indiv = clip.difference(shadow)

                if clip_indiv.geom_type in ('MultiPolygon', 'GeometryCollection'):
                    polys = [g for g in getattr(clip_indiv, 'geoms', []) if g.geom_type == 'Polygon']
                    if polys: clip_indiv = max(polys, key=lambda p: p.area)
                if getattr(clip_indiv, 'geom_type', None) == 'Polygon':
                    clip_indiv = Polygon(clip_indiv.exterior.coords)

                # To Local
                s_rot=np.radians(90+s['mount']); loc=[]
                if not clip_indiv.is_empty and clip_indiv.geom_type == 'Polygon':
                    c,si=np.cos(-s_rot),np.sin(-s_rot); R=np.array([[c,-si],[si,c]])
                    loc.append( (np.array(clip_indiv.exterior.coords)-np.array(og)) @ R.T )
                
                lid_out.append({
                    'name':s['name'], 
                    'clip':clip_indiv, 
                    'origin':og, 
                    'local':loc, 
                    'fov_poly':fov, 
                    'shadow_poly':shadow, 
                    'mount':s['mount'], 
                    'flipped':s.get('flipped', False), 
                    'r':max_r, 
                    'dia':s.get('dia',0.15)
                })
                
            ignored_poly = None
            if all_fovs:
                ignored_poly = final.difference(unary_union(all_fovs))
            
            if composite_clips:
                final = unary_union(composite_clips)
            elif load_poly:
                final = final.difference(load_poly)
                
            if final.geom_type in ('MultiPolygon', 'GeometryCollection'):
                polys = [g for g in getattr(final, 'geoms', []) if g.geom_type == 'Polygon']
                if polys: final = max(polys, key=lambda p: p.area)
            if getattr(final, 'geom_type', None) == 'Polygon':
                final = Polygon(final.exterior.coords)
            
            front_traj = []
            for i in range(len(traj)):
                cx, cy, cth = traj[i]
                rot_deg = np.degrees(cth - np.pi/2)
                pt_global = translate(rotate(Point(ref_pt), rot_deg, origin=(0,0)), cx, cy)
                front_traj.append((pt_global.x, pt_global.y))
            
            return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union
        except Exception as e:
            import traceback
            traceback.print_exc()
            return None, str(e), [], [], 0.0, [], None