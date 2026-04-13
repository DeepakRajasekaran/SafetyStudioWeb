const SCALE = 100.0;
const wktStr = "POLYGON ((-0.54 1.67, 0.55 1.67, 0.55 -0.1, 0.45 0, -0.1 -0.55, -0.55 -0.55, -0.54 1.67))";

const { parse } = require('wellknown');
function parseWktToKonva(wkt) {
    const geojson = parse(wkt);
    const resultPolys = [];
    // simplified traverse
    if (geojson.type === 'Polygon') {
        for (const ring of geojson.coordinates) {
            const flat = [];
            for (const pt of ring) {
                const x = parseFloat(pt[0]);
                const y = parseFloat(pt[1]);
                flat.push(Number(x.toFixed(4)) * SCALE);
                flat.push(Number(y.toFixed(4)) * -SCALE);
            }
            resultPolys.push(flat);
        }
    }
    return resultPolys;
}

const raw = parseWktToKonva(wktStr);
console.log("Raw from parseWktToKonva:");
console.log(raw);

const tfFn = (x, y) => [x, y];
const pts = [];
for (let i = 0; i < raw[0].length; i += 2) {
    const orig_x = raw[0][i] / SCALE;
    const orig_y = -raw[0][i + 1] / SCALE;
    const t = tfFn(orig_x, orig_y);
    pts.push(t[0] * SCALE, -t[1] * SCALE);
}
console.log("Transformed points:");
console.log(pts);
console.log("Are they equal?", JSON.stringify(raw[0]) === JSON.stringify(pts));
