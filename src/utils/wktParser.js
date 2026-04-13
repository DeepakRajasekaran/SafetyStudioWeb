import { parse } from 'wellknown';

const SCALE = 100.0; // 1m = 100px

/**
 * Converts a WKT string to an array of coordinate arrays suitable for Konva.
 * GeoJSON format returned by wellknown:
 * Polygon: { type: "Polygon", coordinates: [ [ [x,y], ... ] ] } 
 * MultiPolygon: { type: "MultiPolygon", coordinates: [ [ [ [x,y], ... ] ] ] }
 * 
 * Returns an array of flat arrays: [[x1, y1, x2, y2, ...], [x1, y1, x2, y2, ...]]
 * where each flat array corresponds to a polygonal ring.
 */
export const parseWktToKonva = (wktString) => {
    if (!wktString) return [];

    try {
        const geojson = parse(wktString);
        if (!geojson) return [];

        const resultPolys = [];

        const processCoordinateRing = (ring) => {
            if (!Array.isArray(ring)) return;
            const flat = [];
            for (const pt of ring) {
                const x = parseFloat(Array.isArray(pt) ? pt[0] : (pt.x || 0));
                const y = parseFloat(Array.isArray(pt) ? pt[1] : (pt.y || 0));
                if (!isNaN(x) && !isNaN(y)) {
                    flat.push(Number(x.toFixed(4)) * SCALE);
                    flat.push(Number(y.toFixed(4)) * -SCALE);
                }
            }
            if (flat.length >= 4) {
                resultPolys.push(flat);
            }
        };

        const traverse = (obj) => {
            if (!obj) return;
            // console.log("WKT Geometry:", obj.type); // Diagnosing invisibility
            switch (obj.type) {
                case 'Point': break;
                case 'LineString':
                    processCoordinateRing(obj.coordinates);
                    break;
                case 'Polygon':
                    if (obj.coordinates) {
                        for (const ring of obj.coordinates) processCoordinateRing(ring);
                    }
                    break;
                case 'MultiLineString':
                    if (obj.coordinates) {
                        for (const line of obj.coordinates) processCoordinateRing(line);
                    }
                    break;
                case 'MultiPolygon':
                    if (obj.coordinates) {
                        for (const polygon of obj.coordinates) {
                            for (const ring of polygon) processCoordinateRing(ring);
                        }
                    }
                    break;
                case 'GeometryCollection':
                    if (obj.geometries) {
                        for (const geom of obj.geometries) traverse(geom);
                    }
                    break;
                default:
                    console.warn("Unsupported GeoJSON type for Konva rendering:", obj.type);
            }
        };

        traverse(geojson);
        if (resultPolys.length === 0 && wktString) {
            console.warn("WKT parsed but resulted in 0 polygons:", wktString);
        }
        return resultPolys;
    } catch (e) {
        console.error("WKT Parse Error:", e, wktString);
        return [];
    }
};
