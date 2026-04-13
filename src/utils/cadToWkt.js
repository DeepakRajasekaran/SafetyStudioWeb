/**
 * Converts CAD Sketch objects into a WKT Polygon.
 * For now, this samples circles and combines them with lines.
 */
export const sketchesToWkt = (sketches, SCALE_M) => {
  if (!sketches || sketches.length === 0) return null;

  const polygons = [];

  sketches.forEach(sketch => {
    let pts = [];
    if (sketch.type === 'circle') {
      const [cx, cy] = sketch.center;
      const r = sketch.radius;
      const segments = 32;
      for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const x = (cx + r * Math.cos(theta)) / SCALE_M;
          const y = (- (cy + r * Math.sin(theta))) / SCALE_M;
          pts.push(`${x.toFixed(4)} ${y.toFixed(4)}`);
      }
      polygons.push(`((${pts.join(', ')}))`);
    }

    if (sketch.type === 'rect') {
      const [x1, y1] = sketch.start;
      const [x2, y2] = sketch.end;
      const p = [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
      const ptsArr = p.map(([px, py]) => `${(px / SCALE_M).toFixed(4)} ${(-(py / SCALE_M)).toFixed(4)}`);
      polygons.push(`((${ptsArr.join(', ')}))`);
    }
    
    // Lines are ignored for polygon conversion
  });

  if (polygons.length === 0) return null;
  if (polygons.length === 1) return `POLYGON${polygons[0]}`;
  return `MULTIPOLYGON(${polygons.join(', ')})`;
};
