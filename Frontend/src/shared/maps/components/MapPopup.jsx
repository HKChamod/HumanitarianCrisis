import { X, MapPin } from 'lucide-react';
import { MapMarker } from './MapMarker.jsx';

export function MapPopup({ item, onClose }) {
  if (!item) return null;

  const props = item.properties || {};

  return (
    <div
      role="dialog"
      aria-label={`Selected location: ${item.title}`}
      className="bg-white/95 backdrop-blur-xs border border-[#E2E8F0] rounded-xl shadow-lg p-3.5 text-xs max-w-xs w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
          <MapMarker type={item.type} severity={props.severityLevel || props.urgencyLevel} />
          <span>{item.title}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close map popup"
            className="p-0.5 text-[#64748B] hover:text-[#0F172A]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="text-[11px] text-[#475569] space-y-1">
        <div>
          Status: <strong className="text-[#0F172A]">{item.status}</strong>
          {props.isAdvisoryRecommendation && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-semibold">
              AI Advisory
            </span>
          )}
        </div>
        {(props.areaName || props.districtName) && (
          <div className="flex items-center gap-1 text-[#64748B]">
            <MapPin className="w-3 h-3 text-[#0F766E]" />
            <span>{props.areaName || props.districtName}</span>
          </div>
        )}
        {typeof props.capacity === 'number' && props.capacity > 0 && (
          <div>
            Capacity: <strong>{props.currentOccupancy}</strong> / {props.capacity} ({props.availableCapacity} available)
          </div>
        )}
        <div className="font-mono text-[10px] text-[#64748B]">
          {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
