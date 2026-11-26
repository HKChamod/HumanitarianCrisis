import { MAP_TYPE_META, SEVERITY_COLOR_MAP } from '../constants/mapConstants.js';

export function MapMarker({ type, severity, size = 12, label }) {
  const color = (severity && SEVERITY_COLOR_MAP[severity]) || MAP_TYPE_META[type]?.color || '#0F766E';
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={label || MAP_TYPE_META[type]?.label || type}
    >
      <span
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '9999px',
          backgroundColor: color,
          border: '2px solid #FFFFFF',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.25)',
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label && <span className="text-xs text-[#334155]">{label}</span>}
    </span>
  );
}
