import { union } from 'polygon-clipping';

/**
 * Converts CAD Sketch objects into a WKT Polygon.
 * Now performs a Boolean Union of all non-construction shapes.
 */
export const sketchesToWkt = (sketches, SCALE_M) => {
  if (!sketches || sketches.length === 0) return null;

  // Filter out construction lines & irrelevant types (lines don't form areas)
  const activeSketches = sketches.filter(s => !s.construction && (s.type === 'circle' || s.type === 'rect'));
  if (activeSketches.length === 0) return null;

  const polyCoords = [];

  activeSketches.forEach(sketch => {
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
      pts.push(pts[0]); // Close loop
      polyCoords.push([pts]);
    }

    if (sketch.type === 'rect') {
      const [x1, y1] = sketch.start;
      const [x2, y2] = sketch.end;
      const p = [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
      const pts = p.map(([px, py]) => [
        parseFloat((px / SCALE_M).toFixed(6)), 
        parseFloat((-(py / SCALE_M)).toFixed(6))
      ]);
      polyCoords.push([pts]);
    }
  });

  if (polyCoords.length === 0) return null;

  try {
    // Union all extracted polygons into one Multipolygon structure
    const united = union(...polyCoords);

    if (!united || united.length === 0) return null;

    const formatPolygon = (poly) => {
      const rings = poly.map(ring => 
        `(${ring.map(p => `${p[0].toFixed(4)} ${p[1].toFixed(4)}`).join(', ')})`
      );
      return `(${rings.join(', ')})`;
    };

    if (united.length === 1) {
      return `POLYGON${formatPolygon(united[0])}`;
    }
    return `MULTIPOLYGON(${united.map(formatPolygon).join(', ')})`;
  } catch (err) {
    console.error("Boolean Union failed:", err);
    return null;
  }
};
