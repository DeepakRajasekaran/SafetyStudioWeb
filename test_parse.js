const { parse } = require('wellknown');

const wkt = "POLYGON ((-0.54 1.67, 0.55 1.67, 0.55 -0.1, 0.45 0, -0.1 -0.55, -0.55 -0.55, -0.54 1.67))";
const geojson = parse(wkt);
console.log(JSON.stringify(geojson));
