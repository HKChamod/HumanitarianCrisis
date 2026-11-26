import { useMemo, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { MAP_ENTITY_TYPES } from '../constants/mapConstants.js';
import { createGeocodingProvider } from '../services/mapProvider.js';
import { parseCoordinates } from '../utils/coordinateUtils.js';
import { MapView } from './MapView.jsx';

export function LocationPickerField({
  label = 'Geographic Location (Optional)',
  latitude,
  longitude,
  onChange,
  onAddressSuggested,
  entityType = MAP_ENTITY_TYPES.CRISIS,
  heightClass = 'h-[240px]',
}) {
  const [showMap, setShowMap] = useState(false);
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const geocoder = useMemo(() => createGeocodingProvider(), []);
  const parsed = useMemo(() => parseCoordinates(latitude, longitude), [latitude, longitude]);

  const items = useMemo(
    () =>
      parsed
        ? [
            {
              id: 'picked-location',
              type: entityType,
              title: 'Selected Location',
              latitude: parsed.latitude,
              longitude: parsed.longitude,
              status: 'Selected',
              properties: {},
            },
          ]
        : [],
    [parsed, entityType],
  );

  const handleMapClick = async (coords) => {
    onChange?.({
      latitude: Number(coords.latitude.toFixed(6)),
      longitude: Number(coords.longitude.toFixed(6)),
    });
    if (geocoder.isConfigured && onAddressSuggested) {
      try {
        const rev = await geocoder.reverseGeocode(coords.latitude, coords.longitude);
        if (rev?.label) {
          onAddressSuggested(rev.label);
        }
      } catch {
        // Reverse geocoding is optional; never block manual coordinate selection
      }
    }
  };

  const handleSearchGeocode = async () => {
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    setGeoError('');
    try {
      const results = await geocoder.forwardGeocode(geoQuery.trim(), { limit: 5 });
      setGeoResults(results);
      if (results.length === 0) {
        setGeoError('No matching places found.');
      }
    } catch (err) {
      setGeoError(err?.message || 'Unable to search location.');
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-[#334155]">{label}</label>
        <div className="flex items-center gap-2">
          {parsed && (
            <button
              type="button"
              onClick={() => onChange?.({ latitude: null, longitude: null })}
              className="inline-flex items-center gap-1 text-[11px] text-[#64748B] hover:text-[#DC2626]"
            >
              <X className="w-3 h-3" />
              Clear coordinates
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMap((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" />
            {showMap ? 'Hide Map Picker' : 'Pick on Map'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <input
            type="number"
            step="0.000001"
            min="-90"
            max="90"
            value={latitude ?? ''}
            onChange={(e) =>
              onChange?.({
                latitude: e.target.value === '' ? null : Number(e.target.value),
                longitude: longitude ?? null,
              })
            }
            placeholder="Latitude (-90 to 90)"
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          />
        </div>
        <div>
          <input
            type="number"
            step="0.000001"
            min="-180"
            max="180"
            value={longitude ?? ''}
            onChange={(e) =>
              onChange?.({
                latitude: latitude ?? null,
                longitude: e.target.value === '' ? null : Number(e.target.value),
              })
            }
            placeholder="Longitude (-180 to 180)"
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          />
        </div>
      </div>

      {showMap && (
        <div className="space-y-2 p-2.5 rounded-xl border border-[#E2E8F0] bg-slate-50">
          {geocoder.isConfigured && (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchGeocode();
                    }
                  }}
                  placeholder="Search place or address (MapTiler Geocoding)..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleSearchGeocode}
                  disabled={geoLoading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-60"
                >
                  <Search className="w-3.5 h-3.5" />
                  {geoLoading ? 'Searching...' : 'Find'}
                </button>
              </div>
              {geoError && <p className="text-[11px] text-[#DC2626]">{geoError}</p>}
              {geoResults.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0] max-h-28 overflow-y-auto">
                  {geoResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        onChange?.({
                          latitude: Number(r.latitude.toFixed(6)),
                          longitude: Number(r.longitude.toFixed(6)),
                        });
                        onAddressSuggested?.(r.label);
                        setGeoResults([]);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-slate-50 text-[#0F172A]"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <MapView
            items={items}
            onMapClick={handleMapClick}
            heightClass={heightClass}
            showSearch={false}
            showLayerControl={false}
            showLegend={false}
            emptyMessage="Click anywhere on the map to set coordinates."
          />
        </div>
      )}
    </div>
  );
}
