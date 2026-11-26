/**
 * Coordinate validation and conversion utilities.
 * Enforces [-90, 90] latitude, [-180, 180] longitude, never defaults missing coordinates to (0, 0),
 * and converts (latitude, longitude) to GeoJSON/MapLibre [longitude, latitude] order.
 */

export function isValidLatitude(lat) {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng) {
  return typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

export function parseCoordinates(latRaw, lngRaw, { rejectZeroZero = true } = {}) {
  if (latRaw === null || latRaw === undefined || latRaw === '') return null;
  if (lngRaw === null || lngRaw === undefined || lngRaw === '') return null;

  const latitude = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const longitude = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  if (rejectZeroZero && latitude === 0 && longitude === 0) {
    return null;
  }

  return { latitude, longitude };
}

export function toLngLatArray(latitude, longitude) {
  const parsed = parseCoordinates(latitude, longitude, { rejectZeroZero: false });
  if (!parsed) {
    throw new Error('Invalid coordinates provided for GeoJSON [longitude, latitude] conversion.');
  }
  return [parsed.longitude, parsed.latitude];
}

export function computeBounds(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let validCount = 0;

  for (const item of items) {
    const parsed = parseCoordinates(item?.latitude, item?.longitude);
    if (!parsed) continue;
    validCount += 1;
    if (parsed.longitude < minLng) minLng = parsed.longitude;
    if (parsed.latitude < minLat) minLat = parsed.latitude;
    if (parsed.longitude > maxLng) maxLng = parsed.longitude;
    if (parsed.latitude > maxLat) maxLat = parsed.latitude;
  }

  if (validCount === 0) return null;

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
