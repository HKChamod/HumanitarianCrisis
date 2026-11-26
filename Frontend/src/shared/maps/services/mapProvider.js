import { MAPTILER_KEY, ROUTING_API_URL } from './mapConfig.js';
import { parseCoordinates } from '../utils/coordinateUtils.js';

/**
 * Geocoding Provider Abstraction
 * Uses MapTiler Geocoding API when VITE_MAPTILER_KEY is configured.
 * Fails cleanly when unconfigured instead of relying on unreliable public demo scrapers.
 */
export function createGeocodingProvider() {
  return {
    isConfigured: Boolean(MAPTILER_KEY),

    async forwardGeocode(query, { limit = 5, signal } = {}) {
      const trimmed = String(query || '').trim();
      if (!trimmed) return [];
      if (!MAPTILER_KEY) {
        throw new Error('Geocoding requires VITE_MAPTILER_KEY to be configured.');
      }

      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmed)}.json?key=${encodeURIComponent(MAPTILER_KEY)}&limit=${limit}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Geocoding request failed with HTTP ${res.status}.`);
      }

      const data = await res.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      return features
        .map((f) => {
          const [lng, lat] = Array.isArray(f?.center) ? f.center : [];
          const parsed = parseCoordinates(lat, lng);
          if (!parsed) return null;
          return {
            id: String(f.id || f.place_name || `${parsed.latitude},${parsed.longitude}`),
            label: f.place_name || f.text || trimmed,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          };
        })
        .filter(Boolean);
    },

    async reverseGeocode(latitude, longitude, { signal } = {}) {
      const parsed = parseCoordinates(latitude, longitude);
      if (!parsed) {
        throw new Error('Valid latitude and longitude are required for reverse geocoding.');
      }
      if (!MAPTILER_KEY) {
        throw new Error('Reverse geocoding requires VITE_MAPTILER_KEY to be configured.');
      }

      const url = `https://api.maptiler.com/geocoding/${parsed.longitude},${parsed.latitude}.json?key=${encodeURIComponent(MAPTILER_KEY)}&limit=1`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Reverse geocoding request failed with HTTP ${res.status}.`);
      }

      const data = await res.json();
      const top = Array.isArray(data?.features) ? data.features[0] : null;
      return top
        ? {
            label: top.place_name || top.text || `${parsed.latitude.toFixed(5)}, ${parsed.longitude.toFixed(5)}`,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          }
        : null;
    },
  };
}

/**
 * Routing Provider Abstraction
 * Only returns road route geometry, distance, and duration when VITE_ROUTING_API_URL is configured.
 * Never claims a straight line is a road route.
 */
export function createRoutingProvider() {
  return {
    isConfigured: Boolean(ROUTING_API_URL),

    async getRoute({ origin, destination, signal } = {}) {
      const start = parseCoordinates(origin?.latitude, origin?.longitude);
      const end = parseCoordinates(destination?.latitude, destination?.longitude);
      if (!start || !end) {
        return {
          supported: false,
          reason: 'Origin and destination must both have valid coordinates.',
        };
      }

      if (!ROUTING_API_URL) {
        return {
          supported: false,
          reason: 'No routing provider configured (VITE_ROUTING_API_URL not set).',
        };
      }

      const url = `${ROUTING_API_URL.replace(/\/$/, '')}/route?origin=${start.longitude},${start.latitude}&destination=${end.longitude},${end.latitude}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        throw new Error(`Routing request failed with HTTP ${res.status}.`);
      }
      const data = await res.json();
      if (!data?.geometry?.coordinates?.length) {
        return {
          supported: false,
          reason: 'Routing provider did not return route geometry.',
        };
      }

      return {
        supported: true,
        geometry: data.geometry,
        distanceMeters: typeof data.distanceMeters === 'number' ? data.distanceMeters : null,
        durationSeconds: typeof data.durationSeconds === 'number' ? data.durationSeconds : null,
        provider: data.provider || 'configured-router',
      };
    },
  };
}
