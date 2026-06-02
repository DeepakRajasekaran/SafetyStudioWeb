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
        if len(pts) < 3: return poly
        return Polygon(pts, poly.interiors)

    @staticmethod
    def prune_collinear_points(poly, tolerance=0.0005):
        if not poly or poly.is_empty: return poly
        # Shapely's simplify with Douglas-Peucker correctly removes collinear and nearly-collinear points
        # without accumulating error that flattens out gentle arcs.
        return poly.simplify(tolerance, preserve_topology=True)

    @staticmethod
    def scale_polygon_outward(poly, margin):
        if not poly or poly.is_empty:
            return poly
        if poly.geom_type == 'Polygon':
            c = poly.centroid
            pts = list(poly.exterior.coords)
            if not pts:
                return poly
            distances = [math.hypot(p[0] - c.x, p[1] - c.y) for p in pts]
            D_avg = sum(distances) / len(distances) if distances else 1.0
            if D_avg < 1e-5:
                D_avg = 1.0
            S = (D_avg + margin) / D_avg
            return scale(poly, xfact=S, yfact=S, origin=c)
        elif poly.geom_type == 'MultiPolygon':
            c = poly.centroid
            scaled_geoms = []
            for g in poly.geoms:
                pts = list(g.exterior.coords)
                distances = [math.hypot(p[0] - c.x, p[1] - c.y) for p in pts]
                D_avg = sum(distances) / len(distances) if distances else 1.0
                if D_avg < 1e-5:
                    D_avg = 1.0
                S = (D_avg + margin) / D_avg
                scaled_geoms.append(scale(g, xfact=S, yfact=S, origin=c))
            return MultiPolygon(scaled_geoms)
        return poly

    @staticmethod
    def patch_turning_notch(poly, v, w):
        if not poly.is_valid or poly.is_empty or poly.geom_type != 'Polygon': return poly
        if abs(w) < 1e-5: return poly
        
        # Enforce Counter-Clockwise coordinate orientation
        if not poly.exterior.is_ccw:
            poly = Polygon(list(poly.exterior.coords)[::-1])
            
        pts = list(poly.exterior.coords)
        if pts[0] == pts[-1]: pts.pop()
        n = len(pts)
        if n < 10: return poly

        # Center of rotation (ICR) in local coordinate system
        x_icr = 0.0
        y_icr = v / w
        
        # Calculate distance of each vertex to the ICR
        dists = np.array([math.hypot(p[0] - x_icr, p[1] - y_icr) for p in pts])
        max_d = np.max(dists)
        
        # Identify the outer curve plateau (points near max distance)
        threshold = max_d - 0.05
        plateau_indices = np.where(dists > threshold)[0]
        if len(plateau_indices) < 5:
            return poly
            
        # Find the longest gap in the plateau to identify the start and end corners
        diffs = np.append((plateau_indices[1:] - plateau_indices[:-1]) % n, (plateau_indices[0] - plateau_indices[-1]) % n)
        max_gap_idx = np.argmax(diffs)
        
        end_corner = plateau_indices[max_gap_idx]
        start_corner = plateau_indices[(max_gap_idx + 1) % len(plateau_indices)]
        
        # Determine the indices that belong to the outer curve
        if start_corner <= end_corner:
            curve_indices = set(range(start_corner, end_corner + 1))
        else:
            curve_indices = set(range(start_corner, n)).union(set(range(0, end_corner + 1)))
            
        # The true outer radius is the 90th percentile of the plateau distances
        outer_dists = dists[list(curve_indices)]
        r_outer = np.percentile(outer_dists, 90)
        
        new_pts = []
        for i in range(n):
            p = pts[i]
            d = dists[i]
            # Check if this point is on the outer curve and deviates from the true arc
            if i in curve_indices and abs(r_outer - d) > 0.001:
                # Reconstruct this point by projecting it back to the true outer radius
                dx = p[0] - x_icr
                dy = p[1] - y_icr
                h = math.hypot(dx, dy)
                if h > 1e-4:
                    new_pt = (x_icr + (dx / h) * r_outer, y_icr + (dy / h) * r_outer)
                    new_pts.append(new_pt)
                else:
                    new_pts.append(p)
            else:
                new_pts.append(p)
                
        return Polygon(new_pts, poly.interiors)

    @staticmethod
    def calc_case(footprint, load_poly, sensors, v, w_input, P, override_poly=None, override_warning_poly=None, entity_meta=None):
        try:
            # 1. Geometry Prep
            def sanitize_geom(geom):
                if not geom: return geom
                if getattr(geom, 'geom_type', None) in ('MultiPolygon', 'GeometryCollection'):
                    from shapely.geometry import GeometryCollection
                    fixed = []
                    for g in getattr(geom, 'geoms', []):
                        fixed.append(g.buffer(0) if not g.is_valid else g)
                    return GeometryCollection(fixed)
                return geom.buffer(0) if not geom.is_valid else geom

            footprint = sanitize_geom(footprint)
            load_poly = sanitize_geom(load_poly)
            override_poly = sanitize_geom(override_poly)
            override_warning_poly = sanitize_geom(override_warning_poly)

            sw_union = None
            raw_footprint_poly = footprint
            lat_scale = P.get('lat_scale', 1.0)
            if lat_scale != 1.0:
                raw_footprint_poly = scale(raw_footprint_poly, xfact=lat_scale, yfact=1.0, origin=(0,0))
            
            if load_poly and P.get('include_load', True):
                unpadded_geom = unary_union([raw_footprint_poly, load_poly])
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
            
            # Sweep base selection:
            # If use_hull_polygon is True, compute convex_hull of (footprint + load) and sweep that.
            # Otherwise sweep the normal union polygon (existing behavior).
            field_method = P.get('field_method', 'union')
            if P.get('use_hull_polygon', False):
                sweep_base = unpadded_geom.convex_hull.buffer(P['pad'], join_style=2)
            else:
                sweep_base = FootPrint
            
            for i in range(len(ts)):
                if i>0:
                    px,py,pth = traj[i-1]
                    traj[i] = [px+v*np.cos(pth)*dt, py+v*np.sin(pth)*dt, pth+ang_vel*dt]
                if override_poly is None:
                    cx,cy,cth = traj[i]; rot_deg = np.degrees(cth - np.pi/2)
                    poly_instance = translate(rotate(sweep_base, rot_deg, origin=(0,0)), cx, cy)
                    sweeps.append(poly_instance)
            
            if override_poly is not None:
                final = override_poly
            else:
                sw_union = unary_union(sweeps)
                if P.get('patch_notch', False) and abs(ang_vel) > 1e-3:
                    if abs(v) < 1e-3:
                        sw_union = SafetyMath.patch_notch(sw_union)
                    else:
                        sw_union = SafetyMath.patch_turning_notch(sw_union, v, ang_vel)
                # field_method controls the post-sweep output shape:
                # 'union'  -> standard union of all sweep instances
                # 'hull'   -> convex hull of the sweep union
                # 'hybrid' -> convex hull only if stopping distance < threshold
                if field_method == 'hull':
                    sw_union = sw_union.convex_hull
                elif field_method == 'hybrid':
                    threshold = float(P.get('hull_threshold', 0.5))
                    if D < threshold:
                        sw_union = sw_union.convex_hull
                final = sw_union.buffer(P.get('smooth',0.05), join_style=1, quad_segs=4).simplify(0.002)
                final = SafetyMath.prune_collinear_points(final)
            

            warning_base = None
            if override_warning_poly is not None:
                warning_base = override_warning_poly
            else:
                warning_strategy = P.get('warning_strategy', 'none')
                if warning_strategy == 'geometric' and final and not final.is_empty:
                    warning_margin = float(P.get('warning_margin', 0.5))
                    warning_base = SafetyMath.scale_polygon_outward(final, warning_margin)
                    warning_base = SafetyMath.prune_collinear_points(warning_base)
                elif warning_strategy == 'kinematic':
                    # Extend reaction time by warning_time — produces D_warn = v*(tr+warning_time) + v²/2a + ds
                    # This is physically correct: warning field = field with longer response time
                    tr_warn = float(P['tr']) + float(P.get('warning_time', 0.5))
                    D_warn = v_ref * tr_warn + (v_ref**2) / (2 * P['ac']) + P['ds'] if P['ac'] > 0 else v_ref * tr_warn + P['ds']
                    T_warn = D_warn / v_ref if v_ref > 0.01 else tr_warn
                    warn_ts = np.arange(0, T_warn + 0.02, 0.02)
                    warn_sweeps = []
                    warn_traj = np.zeros((len(warn_ts), 3)); warn_traj[0] = [0, 0, np.pi/2]
                    for i in range(len(warn_ts)):
                        if i > 0:
                            px, py, pth = warn_traj[i-1]
                            warn_traj[i] = [px + v*np.cos(pth)*0.02, py + v*np.sin(pth)*0.02, pth + ang_vel*0.02]
                        cx, cy, cth = warn_traj[i]; rot_deg = np.degrees(cth - np.pi/2)
                        poly_instance = translate(rotate(sweep_base, rot_deg, origin=(0,0)), cx, cy)
                        warn_sweeps.append(poly_instance)
                    warning_base = unary_union(warn_sweeps)
                    if P.get('patch_notch', False) and abs(ang_vel) > 1e-3:
                        if abs(v) < 1e-3:
                            warning_base = SafetyMath.patch_notch(warning_base)
                        else:
                            warning_base = SafetyMath.patch_turning_notch(warning_base, v, ang_vel)
                    if field_method == 'hull':
                        warning_base = warning_base.convex_hull
                    elif field_method == 'hybrid' and D_warn < float(P.get('hull_threshold', 0.5)):
                        warning_base = warning_base.convex_hull
                    warning_base = warning_base.buffer(P.get('smooth', 0.05), join_style=1, quad_segs=4).simplify(0.002)
                    warning_base = SafetyMath.prune_collinear_points(warning_base)
                # Note: geometric warning is computed AFTER the sensor loop (below)

            composite_w_clips = []
            lid_out = []; all_fovs = []; composite_clips = []
            warning_final = warning_base

            for s in sensors:
                og=(s['x'], s['y']); max_r = s['r']
                mid=np.radians(90+s['mount']); hw=np.radians(s['fov']/2)
                
                FootPrint_pts = [(og[0]+max_r*np.cos(a), og[1]+max_r*np.sin(a)) for a in np.linspace(mid-hw,mid+hw,50)]
                fov = Polygon([og]+FootPrint_pts+[og])
                all_fovs.append(fov)
                
                clip = final.intersection(fov)
                w_clip = warning_base.intersection(fov) if warning_base else None
                lidar_shadows = []
                for other_s in sensors:
                    if other_s is s: continue
                    dia = other_s.get('dia', 0.15)
                    obs_circle = Point(other_s['x'], other_s['y']).buffer(dia/2.0)
                    if fov.intersects(obs_circle):
                        sh = SafetyMath.get_shadow_wedge(og, obs_circle, max_r*1.1)
                        if sh: lidar_shadows.append(sh)
                
                if lidar_shadows: 
                    ls_union = unary_union(lidar_shadows)
                    clip = clip.difference(ls_union)
                    if w_clip: w_clip = w_clip.difference(ls_union)
                # Only clip out load if it is a single polygon that casts shadow, or subtract piece by piece
                # To simplify, we clip FOV by all load polygons (shadow casting ones)
                # Wait, FOV clipping is separate from shadow wedge.
                
                shadows_to_merge = []
                if load_poly:
                    geoms = load_poly.geoms if hasattr(load_poly, 'geoms') else [load_poly]
                    for idx, g in enumerate(geoms):
                        casts_shadow = True
                        if entity_meta and idx < len(entity_meta):
                            meta_item = entity_meta[idx]
                            if isinstance(meta_item, dict):
                                casts_shadow = meta_item.get('castShadow', True)
                        
                        if casts_shadow:
                            shadows_to_merge.append(SafetyMath.get_shadow_wedge(og, g, max_r*1.1))

                # Remove shadow wedges
                valid_shadows = [sh for sh in shadows_to_merge if sh]
                shadow = unary_union(valid_shadows) if valid_shadows else None
                
                composite_clips.append(clip)
                if warning_base and w_clip:
                    composite_w_clips.append(w_clip)
                
                clip_indiv = clip
                if shadow: clip_indiv = clip.difference(shadow)

                if clip_indiv.geom_type in ('MultiPolygon', 'GeometryCollection'):
                    polys = [g for g in getattr(clip_indiv, 'geoms', []) if g.geom_type == 'Polygon']
                    if polys: clip_indiv = max(polys, key=lambda p: p.area)
                if getattr(clip_indiv, 'geom_type', None) == 'Polygon':
                    clip_indiv = Polygon(clip_indiv.exterior.coords)
                    clip_indiv = SafetyMath.prune_collinear_points(clip_indiv)

                w_clip_indiv = w_clip
                if shadow and w_clip_indiv:
                    w_clip_indiv = w_clip_indiv.difference(shadow)

                if w_clip_indiv:
                    if w_clip_indiv.geom_type in ('MultiPolygon', 'GeometryCollection'):
                        polys = [g for g in getattr(w_clip_indiv, 'geoms', []) if g.geom_type == 'Polygon']
                        if polys: w_clip_indiv = max(polys, key=lambda p: p.area)
                    if getattr(w_clip_indiv, 'geom_type', None) == 'Polygon':
                        w_clip_indiv = Polygon(w_clip_indiv.exterior.coords)
                        w_clip_indiv = SafetyMath.prune_collinear_points(w_clip_indiv)

                # To Local
                s_rot=np.radians(90+s['mount']); loc=[]
                if not clip_indiv.is_empty and clip_indiv.geom_type == 'Polygon':
                    c,si=np.cos(-s_rot),np.sin(-s_rot); R=np.array([[c,-si],[si,c]])
                    loc.append( (np.array(clip_indiv.exterior.coords)-np.array(og)) @ R.T )
                
                lid_out.append({
                    'name':s['name'], 
                    'clip':clip_indiv, 
                    'w_clip': w_clip_indiv,
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
                if composite_w_clips: warning_final = unary_union(composite_w_clips)
            elif load_poly:
                final = final.difference(load_poly)
                if warning_base: warning_final = warning_base.difference(load_poly)
            
            # Geometric warning is now computed before the lidar loop
            if final and not final.is_empty:
                # Support MultiPolygons (multiple disconnected field parts)
                if final.geom_type in ('MultiPolygon', 'GeometryCollection'):
                    polys = [g for g in getattr(final, 'geoms', []) if g.geom_type == 'Polygon']
                    if polys: 
                        # Return all polygons as a MultiPolygon instead of picking just the largest
                        final = unary_union(polys)
                
                # Cleanup rings (discard holes if explicitly not wanted, but normally we keep them)
                if final.geom_type == 'Polygon':
                    final = Polygon(final.exterior.coords, final.interiors)
                final = SafetyMath.prune_collinear_points(final)

            if warning_final and not warning_final.is_empty:
                # Support MultiPolygons (multiple disconnected field parts)
                if warning_final.geom_type in ('MultiPolygon', 'GeometryCollection'):
                    polys = [g for g in getattr(warning_final, 'geoms', []) if g.geom_type == 'Polygon']
                    if polys: 
                        warning_final = unary_union(polys)
                
                # Cleanup rings
                if warning_final.geom_type == 'Polygon':
                    warning_final = Polygon(warning_final.exterior.coords, warning_final.interiors)
                warning_final = SafetyMath.prune_collinear_points(warning_final)
            
            front_traj = []
            for i in range(len(traj)):
                cx, cy, cth = traj[i]
                rot_deg = np.degrees(cth - np.pi/2)
                pt_global = translate(rotate(Point(ref_pt), rot_deg, origin=(0,0)), cx, cy)
                front_traj.append((pt_global.x, pt_global.y))
            
            return final, lid_out, traj, sweeps, D, front_traj, ignored_poly, sw_union, warning_final
        except Exception as e:
            import traceback
            traceback.print_exc()
            return None, [], [], [], 0.0, [], None, None, None