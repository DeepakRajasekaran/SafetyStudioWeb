import { union, difference } from 'polygon-clipping';

/**
 * Converts CAD Sketch objects into a WKT Polygon.
 * Performs a Boolean Union of additive shapes, then subtracts removal shapes.
 */
export const sketchesToWkt = (sketches, SCALE_M) => {
  if (!sketches || sketches.length === 0) return { wkt: null, error: "No sketches found." };

  // Filter out construction lines
  const activeSketches = sketches.filter(s => !s.construction);
  if (activeSketches.length === 0) return { wkt: null, error: "No non-construction geometry found." };

  const linesToPolys = (lines) => {
    if (!lines.length) return [];
    let segments = lines.map(l => ({
      p1: [l.points[0], l.points[1]],
      p2: [l.points[2], l.points[3]],
      used: false
    }));

    const polys = [];
    const TOL = 0.05; // Increased tolerance to be resilient to solver precision drift (canvas units)

    const findMatch = (pt) => {
      for (let s of segments) {
        if (s.used) continue;
        const d1 = vec.dist({x: pt[0], y: pt[1]}, {x: s.p1[0], y: s.p1[1]});
        const d2 = vec.dist({x: pt[0], y: pt[1]}, {x: s.p2[0], y: s.p2[1]});
        if (d1 < TOL) return { seg: s, flip: false };
        if (d2 < TOL) return { seg: s, flip: true };
      }
      return null;
    };

    for (let i = 0; i < segments.length; i++) {
      if (segments[i].used) continue;

      let currentPoly = [segments[i].p1, segments[i].p2];
      segments[i].used = true;
      let head = segments[i].p1;
      let tail = segments[i].p2;

      let found = true;
      while (found) {
        found = false;
        const match = findMatch(tail);
        if (match) {
           const nextPt = match.flip ? match.seg.p1 : match.seg.p2;
           currentPoly.push(nextPt);
           match.seg.used = true;
           tail = nextPt;
           found = true;
           // Stop if we've closed the loop
           if (vec.dist({x: tail[0], y: tail[1]}, {x: head[0], y: head[1]}) < TOL) {
              found = false;
           }
        }
      }

      // Ensure the loop is closed and has meaningful size
      const isClosed = vec.dist({x: tail[0], y: tail[1]}, {x: head[0], y: head[1]}) < TOL;
      if (currentPoly.length >= 3 && isClosed) {
        // Force exact closure for WKT
        if (vec.dist({x: tail[0], y: tail[1]}, {x: head[0], y: head[1]}) > 0) {
           currentPoly[currentPoly.length - 1] = head; 
        }
        
        const pts = currentPoly.map(p => [
           parseFloat((p[0] / SCALE_M).toFixed(6)),
           parseFloat((-(p[1] / SCALE_M)).toFixed(6))
        ]);
        polys.push([[pts]]);
      }
    }

    if (polys.length === 0 && lines.length > 0) {
       console.warn("CAD To WKT: Lines found but no closed loops detected. Check for gaps larger than", TOL);
    }

    return polys;
  };

  const vec = { dist: (a, b) => Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2) };

  const getPolyCoords = (sketch) => {
    if (sketch.type === 'circle') {
      const [cx, cy] = sketch.center;
      const r = sketch.radius;
      const segments = 64; 
      const pts = [];
      for (let i = 0; i < segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const x = (cx + r * Math.cos(theta)) / SCALE_M;
          const y = (- (cy + r * Math.sin(theta))) / SCALE_M;
          pts.push([parseFloat(x.toFixed(6)), parseFloat(y.toFixed(6))]);
      }
      pts.push(pts[0]);
      return [[pts]]; // MultiPolygon
    }
    if (sketch.type === 'rect') {
      const [x1, y1] = sketch.start;
      const [x2, y2] = sketch.end;
      const p = [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
      const pts = p.map(([px, py]) => [
        parseFloat((px / SCALE_M).toFixed(6)), 
        parseFloat((-(py / SCALE_M)).toFixed(6))
      ]);
      return [[pts]]; // MultiPolygon
    }
    return null;
  };

  const getLinesFromShape = (s) => {
    if (s.type === 'rect') {
      const [x1, y1] = s.start;
      const [x2, y2] = s.end;
      return [
        { points: [x1, y1, x2, y1], construction: s.construction, op: s.op },
        { points: [x2, y1, x2, y2], construction: s.construction, op: s.op },
        { points: [x2, y2, x1, y2], construction: s.construction, op: s.op },
        { points: [x1, y2, x1, y1], construction: s.construction, op: s.op }
      ];
    }
    return [];
  };

  const additiveSketches = activeSketches.filter(s => s.op !== 'subtract');
  const subtractiveSketches = activeSketches.filter(s => s.op === 'subtract');

  const allAdditiveLines = [
    ...additiveSketches.filter(s => s.type === 'line'),
    ...additiveSketches.flatMap(getLinesFromShape)
  ];

  const allSubtractiveLines = [
    ...subtractiveSketches.filter(s => s.type === 'line'),
    ...subtractiveSketches.flatMap(getLinesFromShape)
  ];

  const additive = [
    // 1. Standard shapes (robust handling)
    ...additiveSketches.filter(s => s.type === 'circle' || s.type === 'rect').map(getPolyCoords).filter(Boolean),
    // 2. Custom line loops
    ...linesToPolys(allAdditiveLines)
  ];

  const subtractive = [
    // 1. Standard shapes (robust handling)
    ...subtractiveSketches.filter(s => s.type === 'circle' || s.type === 'rect').map(getPolyCoords).filter(Boolean),
    // 2. Custom line loops
    ...linesToPolys(allSubtractiveLines)
  ];

  if (additive.length === 0 && subtractive.length === 0) {
    if (sketches.some(s => s.construction)) {
       return { wkt: null, error: "No closed loops found. (Note: Construction lines are ignored for field boundaries; try converting them to standard lines if they are part of the perimeter.)" };
    }
    return { wkt: null, error: "No closed polygons found. If using lines, ensure they form a complete closed loop with overlapping start/end points." };
  }

  try {
    // 1. Union all additive shapes, or initialize empty if none
    let result = additive.length > 0 ? union(...additive) : [];

    // 2. Iteratively subtract removal shapes
    subtractive.forEach(subPoly => {
      if (result.length > 0) {
        result = difference(result, subPoly);
      } else {
        // If no additive shapes, the union of subtractive shapes themselves becomes the result
        // This is useful for callers like Results.js that perform their own secondary booleans
        result = result.length === 0 ? subPoly : union(result, subPoly);
      }
    });

    if (!result || result.length === 0) {
      if (additive.length > 0) return { wkt: null, error: "The resulting polygon is empty (everything might have been subtracted)." };
      // If we only had subtractive shapes and result is still empty, it shouldn't happen due to loop above, but safety check:
      return { wkt: null, error: "No valid geometry resolved." };
    }

    // 3. Simplification / Formatting
    const formatPolygon = (poly) => {
      const rings = poly.map(ring => {
        const simplified = ring.filter((p, i) => {
          if (i === 0 || i === ring.length - 1) return true;
          const prev = ring[i - 1];
          const next = ring[i + 1];
          const area = Math.abs(prev[0]*(p[1]-next[1]) + p[0]*(next[1]-prev[1]) + next[0]*(prev[1]-p[1]));
          return area > 1e-9;
        });
        return `(${simplified.map(p => `${p[0].toFixed(4)} ${p[1].toFixed(4)}`).join(', ')})`;
      });
      return `(${rings.join(', ')})`;
    };

    let finalWkt;
    if (result.length === 1) finalWkt = `POLYGON${formatPolygon(result[0])}`;
    else finalWkt = `MULTIPOLYGON(${result.map(formatPolygon).join(', ')})`;
    
    return { wkt: finalWkt, error: null };

  } catch (err) {
    console.error("Boolean Operation failed:", err);
    return { wkt: null, error: "Geometry Error: Could not resolve overlapping shapes. Ensure your sketch isn't overly complex or self-intersecting." };
  }
};
