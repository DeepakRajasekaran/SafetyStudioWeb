const { parse } = require('wellknown');

const wkt = "MULTIPOLYGON (((-0.6490392640201614 1.729754516100807, -0.6366050570377017 1.7457788102377464, -0.6225324317112001 1.759756191630138)))";
const geojson = parse(wkt);
console.log("Geojson type:", geojson.type);
console.log("Coords:", JSON.stringify(geojson.coordinates));

const resultPolys = [];
const processCoordinateRing = (ring) => {
    if (!Array.isArray(ring)) return;
    const flat = [];
    for (const pt of ring) {
        const x = parseFloat(Array.isArray(pt) ? pt[0] : (pt.x || 0));
        const y = parseFloat(Array.isArray(pt) ? pt[1] : (pt.y || 0));
        if (!isNaN(x) && !isNaN(y)) {
            flat.push(x * 100);
            flat.push(y * -100);
        }
    }
    if (flat.length >= 4) {
        resultPolys.push(flat);
    }
};

if (geojson.coordinates) {
    for (const polygon of geojson.coordinates) {
        for (const ring of polygon) processCoordinateRing(ring);
    }
}
console.log("Polys:", resultPolys.length);

