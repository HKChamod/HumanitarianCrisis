import { MAP_TYPE_META, SEVERITY_COLOR_MAP } from '../constants/mapConstants.js';
import { parseCoordinates, toLngLatArray } from './coordinateUtils.js';

export function resolveMarkerColor(item) {
  const severity = item?.properties?.severityLevel || item?.properties?.urgencyLevel;
  if (severity && SEVERITY_COLOR_MAP[severity]) {
    return SEVERITY_COLOR_MAP[severity];
  }
  return MAP_TYPE_META[item?.type]?.color || '#0F766E';
}

export function filterMapItems(items = [], { visibleTypes = null, searchQuery = '', statusFilter = '' } = {}) {
  const q = String(searchQuery || '').trim().toLowerCase();
  const status = String(statusFilter || '').trim().toLowerCase();

  return items.filter((item) => {
    if (!item || !parseCoordinates(item.latitude, item.longitude)) {
      return false;
    }
    if (visibleTypes && visibleTypes instanceof Set && !visibleTypes.has(item.type)) {
      return false;
    }
    if (status && String(item.status || '').toLowerCase() !== status) {
      return false;
    }
    if (q) {
      const hay = [
        item.title,
        item.type,
        item.status,
        item.properties?.areaName,
        item.properties?.districtName,
        item.properties?.address,
        item.properties?.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function mapItemsToGeoJson(items = []) {
  const features = [];

  for (const item of items) {
    const parsed = parseCoordinates(item?.latitude, item?.longitude);
    if (!parsed) continue;

    features.push({
      type: 'Feature',
      id: item.id,
      geometry: {
        type: 'Point',
        coordinates: toLngLatArray(parsed.latitude, parsed.longitude),
      },
      properties: {
        id: String(item.id),
        type: String(item.type),
        title: String(item.title || ''),
        status: String(item.status || ''),
        color: resolveMarkerColor(item),
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        metaJson: JSON.stringify(item.properties || {}),
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildRouteGeoJson(routeResult) {
  const coords = routeResult?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        properties: {
          distanceMeters: routeResult.distanceMeters ?? null,
          durationSeconds: routeResult.durationSeconds ?? null,
          provider: routeResult.provider || 'configured-router',
        },
      },
    ],
  };
}
