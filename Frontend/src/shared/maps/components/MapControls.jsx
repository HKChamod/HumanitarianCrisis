import { Maximize2 } from 'lucide-react';

export function MapControls({
  onFitBounds,
  hasValidPoints = false,
  stylePresets = [],
  activeStyleUrl = '',
  onChangeStyle,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasValidPoints && onFitBounds && (
        <button
          type="button"
          onClick={onFitBounds}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
          title="Fit map view to visible markers"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#0F766E]" />
          Fit to results
        </button>
      )}

      {stylePresets.length > 1 && onChangeStyle && (
        <select
          aria-label="Map style"
          value={activeStyleUrl}
          onChange={(e) => onChangeStyle(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-[#E2E8F0] text-[#0F172A]"
        >
          {stylePresets.map((preset) => (
            <option key={preset.id} value={preset.url}>
              {preset.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
