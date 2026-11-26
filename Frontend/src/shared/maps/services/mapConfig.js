const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const MAPTILER_KEY = (metaEnv.VITE_MAPTILER_KEY || '').trim();
export const MAP_STYLE_URL = (metaEnv.VITE_MAP_STYLE_URL || '').trim();
export const ROUTING_API_URL = (metaEnv.VITE_ROUTING_API_URL || '').trim();

export function getMapStylePresets() {
  if (MAPTILER_KEY) {
    const encodedKey = encodeURIComponent(MAPTILER_KEY);
    return [
      {
        id: 'streets',
        label: 'Streets',
        url: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodedKey}`,
      },
      {
        id: 'topo',
        label: 'Topographic',
        url: `https://api.maptiler.com/maps/topo-v2/style.json?key=${encodedKey}`,
      },
      {
        id: 'hybrid',
        label: 'Satellite',
        url: `https://api.maptiler.com/maps/hybrid/style.json?key=${encodedKey}`,
      },
      ...(MAP_STYLE_URL
        ? [{ id: 'custom', label: 'Custom Style', url: MAP_STYLE_URL }]
        : []),
    ];
  }

  if (MAP_STYLE_URL) {
    return [
      {
        id: 'custom',
        label: 'Configured Map Style',
        url: MAP_STYLE_URL,
      },
    ];
  }

  return [];
}

export function getMapConfiguration() {
  const presets = getMapStylePresets();
  const isConfigured = presets.length > 0;

  return {
    isConfigured,
    defaultStyleUrl: isConfigured ? presets[0].url : null,
    stylePresets: presets,
    hasMapTilerKey: Boolean(MAPTILER_KEY),
    hasCustomStyleUrl: Boolean(MAP_STYLE_URL),
    configurationError: isConfigured
      ? null
      : 'Map provider is not configured. Set VITE_MAPTILER_KEY or VITE_MAP_STYLE_URL in Frontend/.env to enable interactive vector maps.',
  };
}
