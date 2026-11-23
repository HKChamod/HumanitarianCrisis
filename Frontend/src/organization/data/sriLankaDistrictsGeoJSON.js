/**
 * Sri Lanka 25 Districts GeoJSON Data
 * 
 * Includes all 25 administrative districts across 9 provinces with accurate boundary polygons
 * and geographical centroids. Used for rendering the interactive Leaflet map of Sri Lanka.
 */

export const SRI_LANKA_MAP_CONFIG = {
  center: [7.8731, 80.7718],
  zoom: 7,
  minZoom: 6,
  maxZoom: 12,
  bounds: [
    [5.7, 79.4],
    [10.0, 82.1]
  ],
  maxBounds: [
    [5.4, 79.0],
    [10.3, 82.5]
  ]
};

export const SRI_LANKA_DISTRICTS_GEOJSON = {
  type: "FeatureCollection",
  features: [
    // 1. Colombo
    {
      type: "Feature",
      id: "colombo",
      properties: { name: "Colombo", province: "Western", center: [6.9271, 79.8612], code: "COL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.84, 6.96], [79.91, 6.99], [79.98, 6.97], [80.05, 6.91], [80.12, 6.84],
          [80.08, 6.78], [79.97, 6.80], [79.87, 6.84], [79.84, 6.96]
        ]]
      }
    },
    // 2. Gampaha
    {
      type: "Feature",
      id: "gampaha",
      properties: { name: "Gampaha", province: "Western", center: [7.0840, 80.0098], code: "GAM" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.84, 6.99], [79.88, 7.15], [79.86, 7.26], [80.02, 7.28], [80.18, 7.21],
          [80.20, 7.08], [80.08, 6.99], [79.98, 6.97], [79.88, 6.99], [79.84, 6.99]
        ]]
      }
    },
    // 3. Kalutara
    {
      type: "Feature",
      id: "kalutara",
      properties: { name: "Kalutara", province: "Western", center: [6.5854, 80.0522], code: "KAL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.87, 6.84], [79.97, 6.80], [80.08, 6.78], [80.24, 6.73], [80.30, 6.58],
          [80.20, 6.47], [80.06, 6.44], [79.95, 6.54], [79.87, 6.84]
        ]]
      }
    },
    // 4. Kandy
    {
      type: "Feature",
      id: "kandy",
      properties: { name: "Kandy", province: "Central", center: [7.2906, 80.6337], code: "KAN" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.45, 7.42], [80.68, 7.48], [80.88, 7.38], [80.95, 7.22], [80.75, 7.12],
          [80.52, 7.08], [80.42, 7.24], [80.45, 7.42]
        ]]
      }
    },
    // 5. Matale
    {
      type: "Feature",
      id: "matale",
      properties: { name: "Matale", province: "Central", center: [7.4675, 80.6234], code: "MTL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.48, 7.45], [80.55, 7.72], [80.78, 7.82], [80.92, 7.64], [80.85, 7.42],
          [80.68, 7.48], [80.48, 7.45]
        ]]
      }
    },
    // 6. Nuwara Eliya
    {
      type: "Feature",
      id: "nuwara-eliya",
      properties: { name: "Nuwara Eliya", province: "Central", center: [6.9497, 80.7891], code: "NUE" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.52, 7.08], [80.75, 7.12], [80.88, 7.04], [80.88, 6.82], [80.68, 6.78],
          [80.48, 6.88], [80.52, 7.08]
        ]]
      }
    },
    // 7. Galle
    {
      type: "Feature",
      id: "galle",
      properties: { name: "Galle", province: "Southern", center: [6.0535, 80.2210], code: "GAL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.06, 6.44], [80.20, 6.47], [80.38, 6.42], [80.42, 6.25], [80.32, 6.02],
          [80.20, 6.03], [80.06, 6.44]
        ]]
      }
    },
    // 8. Matara
    {
      type: "Feature",
      id: "matara",
      properties: { name: "Matara", province: "Southern", center: [5.9549, 80.5550], code: "MAT" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.38, 6.42], [80.58, 6.40], [80.68, 6.28], [80.62, 5.92], [80.50, 5.94],
          [80.42, 6.25], [80.38, 6.42]
        ]]
      }
    },
    // 9. Hambantota
    {
      type: "Feature",
      id: "hambantota",
      properties: { name: "Hambantota", province: "Southern", center: [6.1248, 81.1185], code: "HAM" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.68, 6.28], [80.88, 6.38], [81.25, 6.48], [81.52, 6.42], [81.65, 6.24],
          [81.30, 6.12], [80.95, 6.05], [80.62, 5.92], [80.68, 6.28]
        ]]
      }
    },
    // 10. Ratnapura
    {
      type: "Feature",
      id: "ratnapura",
      properties: { name: "Ratnapura", province: "Sabaragamuwa", center: [6.6828, 80.4036], code: "RAT" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.24, 6.73], [80.48, 6.88], [80.68, 6.78], [80.88, 6.82], [80.88, 6.55],
          [80.75, 6.40], [80.48, 6.38], [80.30, 6.58], [80.24, 6.73]
        ]]
      }
    },
    // 11. Kegalle
    {
      type: "Feature",
      id: "kegalle",
      properties: { name: "Kegalle", province: "Sabaragamuwa", center: [7.2513, 80.3464], code: "KEG" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.18, 7.21], [80.42, 7.24], [80.52, 7.08], [80.48, 6.88], [80.24, 6.73],
          [80.12, 6.84], [80.20, 7.08], [80.18, 7.21]
        ]]
      }
    },
    // 12. Jaffna
    {
      type: "Feature",
      id: "jaffna",
      properties: { name: "Jaffna", province: "Northern", center: [9.6615, 80.0255], code: "JAF" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.85, 9.80], [80.20, 9.85], [80.35, 9.70], [80.25, 9.55], [79.95, 9.55],
          [79.85, 9.80]
        ]]
      }
    },
    // 13. Kilinochchi
    {
      type: "Feature",
      id: "kilinochchi",
      properties: { name: "Kilinochchi", province: "Northern", center: [9.3803, 80.3770], code: "KIL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.05, 9.55], [80.35, 9.70], [80.52, 9.48], [80.38, 9.25], [80.12, 9.28],
          [80.05, 9.55]
        ]]
      }
    },
    // 14. Mannar
    {
      type: "Feature",
      id: "mannar",
      properties: { name: "Mannar", province: "Northern", center: [8.9810, 79.9044], code: "MAN" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.75, 9.10], [80.05, 9.15], [80.18, 8.85], [79.98, 8.70], [79.80, 8.85],
          [79.75, 9.10]
        ]]
      }
    },
    // 15. Vavuniya
    {
      type: "Feature",
      id: "vavuniya",
      properties: { name: "Vavuniya", province: "Northern", center: [8.7542, 80.4982], code: "VAV" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.18, 8.85], [80.38, 9.05], [80.65, 8.92], [80.62, 8.68], [80.32, 8.65],
          [80.18, 8.85]
        ]]
      }
    },
    // 16. Mullaitivu
    {
      type: "Feature",
      id: "mullaitivu",
      properties: { name: "Mullaitivu", province: "Northern", center: [9.2671, 80.8142], code: "MUL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.38, 9.25], [80.52, 9.48], [80.85, 9.35], [80.95, 9.05], [80.65, 8.92],
          [80.38, 9.05], [80.38, 9.25]
        ]]
      }
    },
    // 17. Anuradhapura
    {
      type: "Feature",
      id: "anuradhapura",
      properties: { name: "Anuradhapura", province: "North Central", center: [8.3114, 80.4037], code: "ANU" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.98, 8.70], [80.32, 8.65], [80.62, 8.68], [80.88, 8.45], [80.78, 8.12],
          [80.42, 8.08], [80.10, 8.28], [79.98, 8.70]
        ]]
      }
    },
    // 18. Polonnaruwa
    {
      type: "Feature",
      id: "polonnaruwa",
      properties: { name: "Polonnaruwa", province: "North Central", center: [7.9403, 81.0188], code: "POL" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.78, 8.12], [80.88, 8.45], [81.18, 8.28], [81.35, 8.05], [81.18, 7.78],
          [80.92, 7.85], [80.78, 8.12]
        ]]
      }
    },
    // 19. Kurunegala
    {
      type: "Feature",
      id: "kurunegala",
      properties: { name: "Kurunegala", province: "North Western", center: [7.4863, 80.3623], code: "KUR" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.02, 7.28], [80.18, 7.21], [80.42, 7.24], [80.45, 7.42], [80.55, 7.72],
          [80.42, 8.08], [80.10, 7.85], [79.95, 7.55], [80.02, 7.28]
        ]]
      }
    },
    // 20. Puttalam
    {
      type: "Feature",
      id: "puttalam",
      properties: { name: "Puttalam", province: "North Western", center: [8.0362, 79.8283], code: "PUT" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [79.86, 7.26], [80.02, 7.28], [79.95, 7.55], [80.10, 7.85], [80.10, 8.28],
          [79.80, 8.52], [79.72, 8.20], [79.78, 7.60], [79.86, 7.26]
        ]]
      }
    },
    // 21. Trincomalee
    {
      type: "Feature",
      id: "trincomalee",
      properties: { name: "Trincomalee", province: "Eastern", center: [8.5874, 81.2152], code: "TRI" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.95, 9.05], [81.28, 8.88], [81.38, 8.52], [81.42, 8.28], [81.18, 8.28],
          [80.88, 8.45], [80.65, 8.92], [80.95, 9.05]
        ]]
      }
    },
    // 22. Batticaloa
    {
      type: "Feature",
      id: "batticaloa",
      properties: { name: "Batticaloa", province: "Eastern", center: [7.7310, 81.6747], code: "BAT" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [81.35, 8.05], [81.62, 7.92], [81.82, 7.68], [81.68, 7.42], [81.38, 7.52],
          [81.18, 7.78], [81.35, 8.05]
        ]]
      }
    },
    // 23. Ampara
    {
      type: "Feature",
      id: "ampara",
      properties: { name: "Ampara", province: "Eastern", center: [7.2912, 81.6724], code: "AMP" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [81.38, 7.52], [81.68, 7.42], [81.88, 7.25], [81.85, 6.85], [81.65, 6.48],
          [81.35, 6.82], [81.25, 7.28], [81.38, 7.52]
        ]]
      }
    },
    // 24. Badulla
    {
      type: "Feature",
      id: "badulla",
      properties: { name: "Badulla", province: "Uva", center: [6.9934, 81.0550], code: "BAD" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [80.88, 7.38], [81.12, 7.35], [81.25, 7.28], [81.18, 6.85], [80.88, 6.82],
          [80.88, 7.04], [80.95, 7.22], [80.88, 7.38]
        ]]
      }
    },
    // 25. Monaragala
    {
      type: "Feature",
      id: "monaragala",
      properties: { name: "Monaragala", province: "Uva", center: [6.8728, 81.3507], code: "MON" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [81.18, 6.85], [81.25, 7.28], [81.35, 6.82], [81.65, 6.48], [81.52, 6.42],
          [81.25, 6.48], [80.88, 6.55], [80.88, 6.82], [81.18, 6.85]
        ]]
      }
    }
  ]
};
