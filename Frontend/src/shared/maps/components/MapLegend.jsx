import { MAP_TYPE_META } from '../constants/mapConstants.js';
import { MapMarker } from './MapMarker.jsx';

export function MapLegend({ types = [] }) {
  const uniqueTypes = Array.from(new Set(types)).filter((t) => MAP_TYPE_META[t]);
  if (uniqueTypes.length === 0) return null;

  return (
    <div
      aria-label="Map Legend"
      className="bg-white/95 backdrop-blur-xs border border-[#E2E8F0] rounded-xl shadow-xs px-3 py-2 flex flex-wrap items-center gap-3"
    >
      {uniqueTypes.map((t) => (
        <MapMarker key={t} type={t} size={10} label={MAP_TYPE_META[t].label} />
      ))}
    </div>
  );
}
