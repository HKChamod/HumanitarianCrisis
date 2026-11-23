import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import {
  DISTRICTS,
  PROVINCES,
  getDsDivisionsForDistrict,
  getGnDivisionsForDs,
} from '../../data/sriLankaAreas';
import { USE_MOCK_API } from '../../services/api/apiConfig';
import { areaService } from '../../services/api/adminServices';

export function FormField({ label, htmlFor, error, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-[#0F172A]">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] text-[#64748B]">{hint}</p>}
      {error && <p className="text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  required,
  disabled,
  id,
}) {
  return (
    <FormField label={label} htmlFor={id} error={error} required={required}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15 disabled:bg-slate-50 disabled:text-[#64748B]"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function DatePicker({ label, value, onChange, error, required, id }) {
  return (
    <FormField label={label} htmlFor={id} error={error} required={required}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
      />
    </FormField>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search records...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterPanel({ children, onReset, hasActiveFilters }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E]" />
          Filters
        </div>
        <div className="flex-1 flex flex-wrap items-center gap-2.5">{children}</div>
        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-[#0F766E] border border-[#0F766E]/40 bg-[#F0FDFA] hover:bg-[#CCFBF1] hover:text-[#115E59] px-2.5 py-1.5 rounded-md transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable Sri Lankan Cascading Geographic Selector:
 * Province -> District -> DS Division -> GN Division -> Village / Local Area
 */
export function CascadingAreaSelector({
  value = {},
  onChange,
  showVillage = true,
  compact = false,
}) {
  const { provinceId = '', districtId = '', dsDivisionId = '', gnDivisionId = '', village = '' } = value;
  const [liveTree, setLiveTree] = useState(null);

  useEffect(() => {
    if (USE_MOCK_API) return;
    let cancelled = false;
    areaService
      .getHierarchy()
      .then((nodes) => {
        if (!cancelled && Array.isArray(nodes) && nodes.length > 0) {
          setLiveTree(nodes);
        }
      })
      .catch(() => {
        // Fallback to static area config if /api/areas/hierarchy is unavailable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const usingLiveAreas = Array.isArray(liveTree) && liveTree.length > 0;

  const provinces = usingLiveAreas
    ? liveTree.map((n) => ({ id: String(n.areaId), name: n.areaName, children: n.childAreas || [] }))
    : PROVINCES;

  const selectedProvNode = usingLiveAreas ? provinces.find((p) => p.id === String(provinceId)) : null;

  const districts = usingLiveAreas
    ? (selectedProvNode?.children || []).map((n) => ({ id: String(n.areaId), name: n.areaName, children: n.childAreas || [] }))
    : provinceId
      ? DISTRICTS.filter((d) => d.provinceId === provinceId)
      : [];

  const selectedDistNode = usingLiveAreas ? districts.find((d) => d.id === String(districtId)) : null;

  const dsDivisions = usingLiveAreas
    ? (selectedDistNode?.children || []).map((n) => ({ id: String(n.areaId), name: n.areaName, children: n.childAreas || [] }))
    : districtId
      ? getDsDivisionsForDistrict(districtId)
      : [];

  const selectedDsNode = usingLiveAreas ? dsDivisions.find((ds) => ds.id === String(dsDivisionId)) : null;

  const gnDivisions = usingLiveAreas
    ? (selectedDsNode?.children || []).map((n) => ({ id: String(n.areaId), name: n.areaName }))
    : dsDivisionId
      ? getGnDivisionsForDs(dsDivisionId)
      : [];

  const handleProvinceChange = (nextProvinceId) => {
    const prov = provinces.find((p) => p.id === nextProvinceId);
    onChange({
      provinceId: nextProvinceId,
      provinceName: prov?.name || '',
      districtId: '',
      districtName: '',
      dsDivisionId: '',
      dsDivisionName: '',
      gnDivisionId: '',
      gnDivisionName: '',
      village,
    });
  };

  const handleDistrictChange = (nextDistrictId) => {
    const dist = districts.find((d) => d.id === nextDistrictId);
    onChange({
      ...value,
      districtId: nextDistrictId,
      districtName: dist?.name || '',
      dsDivisionId: '',
      dsDivisionName: '',
      gnDivisionId: '',
      gnDivisionName: '',
    });
  };

  const handleDsChange = (nextDsId) => {
    const ds = dsDivisions.find((d) => d.id === nextDsId);
    onChange({
      ...value,
      dsDivisionId: nextDsId,
      dsDivisionName: ds?.name || '',
      gnDivisionId: '',
      gnDivisionName: '',
    });
  };

  const handleGnChange = (nextGnId) => {
    const gn = gnDivisions.find((g) => g.id === nextGnId);
    onChange({
      ...value,
      gnDivisionId: nextGnId,
      gnDivisionName: gn?.name || '',
    });
  };

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
      <SelectField
        label="Province"
        value={provinceId}
        onChange={handleProvinceChange}
        placeholder="All / Select Province"
        options={provinces.map((p) => ({ value: p.id, label: p.name }))}
      />
      <SelectField
        label="District"
        value={districtId}
        onChange={handleDistrictChange}
        disabled={!provinceId}
        placeholder={provinceId ? 'Select District' : 'Select province first'}
        options={districts.map((d) => ({ value: d.id, label: d.name }))}
      />
      <SelectField
        label="DS Division"
        value={dsDivisionId}
        onChange={handleDsChange}
        disabled={!districtId}
        placeholder={districtId ? 'Select DS Division' : 'Select district first'}
        options={dsDivisions.map((ds) => ({ value: ds.id, label: ds.name }))}
      />
      <SelectField
        label="GN Division"
        value={gnDivisionId}
        onChange={handleGnChange}
        disabled={!dsDivisionId}
        placeholder={dsDivisionId ? 'Select GN Division' : 'Select DS division first'}
        options={gnDivisions.map((gn) => ({ value: gn.id, label: gn.name }))}
      />
      {showVillage && (
        <div className="sm:col-span-2 lg:col-span-4">
          <FormField label="Village / Local Area">
            <input
              type="text"
              value={village}
              onChange={(e) => onChange({ ...value, village: e.target.value })}
              placeholder="e.g., Nagoda Lowlands, Wellampitiya Sector 3"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
            />
          </FormField>
        </div>
      )}
    </div>
  );
}
