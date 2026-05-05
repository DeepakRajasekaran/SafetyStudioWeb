const { parse } = require('wellknown');
const pc = require('polygon-clipping');

const baseWkt = "POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))";
const subWkt = "POLYGON((2 2, 8 2, 8 8, 2 8, 2 2))";

const wktToRings = (wktStr) => {
  const geojson = parse(wktStr);
  const results = [];
  const processPolygon = (poly) => {
    results.push(poly.map(ring => ring.map(pt => [pt[0], pt[1]])));
  };
  if (geojson.type === 'Polygon') processPolygon(geojson.coordinates);
  return results;
};

const baseRings = wktToRings(baseWkt);
const subRings = wktToRings(subWkt);

try {
  const res = pc.difference(baseRings, subRings);
  console.log("Difference Result:", JSON.stringify(res));
} catch (e) {
  console.log("Error:", e);
}
