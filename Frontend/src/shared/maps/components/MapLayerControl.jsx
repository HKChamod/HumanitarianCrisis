import { Layers } from 'lucide-react';
import { MAP_TYPE_META } from '../constants/mapConstants.js';

export function MapLayerControl({ availableTypes = [], visibleTypes, onToggleType }) {
  if (!availableTypes.length || !visibleTypes || !onToggleType) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Map Layers">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#475569] mr-1">
        <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
        Layers:
      </span>
      {availableTypes.map((type) => {
        const meta = MAP_TYPE_META[type];
        if (!meta) return null;
        const active = visibleTypes.has(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleType(type)}
            aria-pressed={active}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
              active
                ? 'bg-[#F0FDFA] border-[#0F766E] text-[#0F766E]'
                : 'bg-white border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
