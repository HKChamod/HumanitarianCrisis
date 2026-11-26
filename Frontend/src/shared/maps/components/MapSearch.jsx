import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export function MapSearch({ value = '', onChange, placeholder = 'Filter map locations...' }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (onChange && localValue !== value) {
        onChange(localValue);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [localValue, value, onChange]);

  return (
    <div className="relative flex items-center w-full sm:w-64">
      <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-2.5 pointer-events-none" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0F766E]"
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue('');
            onChange?.('');
          }}
          aria-label="Clear map search"
          className="absolute right-2 text-[#94A3B8] hover:text-[#475569]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
