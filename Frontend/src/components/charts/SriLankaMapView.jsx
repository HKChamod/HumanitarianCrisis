import { useMemo, useState } from 'react';
import { List, Map as MapIcon, MapPin, Users, X } from 'lucide-react';
import { DISTRICTS, PROVINCES } from '../../data/sriLankaAreas';
import { SeverityBadge, StatusBadge } from '../common/StatusBadge';
import { MapView, adaptCollectionToMapItems, adaptCrisisToMapItem } from '../../shared/maps';

export function SriLankaMapView({
  crises = [],
  onSelectCrisis,
  allowViewToggle = true,
  compact = false,
}) {
  const [provinceFilter, setProvinceFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('map');

  const availableDistricts = useMemo(
    () => (provinceFilter ? DISTRICTS.filter((d) => d.provinceId === provinceFilter) : DISTRICTS),
    [provinceFilter]
  );

  const filteredCrises = useMemo(() => {
    return crises.filter((c) => {
      if (provinceFilter && c.location?.provinceId !== provinceFilter) return false;
      if (districtFilter && c.location?.districtId !== districtFilter) return false;
      if (typeFilter && c.crisisType !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [crises, provinceFilter, districtFilter, typeFilter, statusFilter]);

  const crisisTypes = useMemo(() => Array.from(new Set(crises.map((c) => c.crisisType))), [crises]);
  const statuses = useMemo(() => Array.from(new Set(crises.map((c) => c.status))), [crises]);

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">National Crisis Overview — Sri Lanka</h3>
            <p className="text-xs text-[#64748B]">
              Interactive marker overview ({filteredCrises.length} of {crises.length} events shown)
            </p>
          </div>
          {allowViewToggle && (
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md ${
                  viewMode === 'map' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md ${
                  viewMode === 'list' ? 'bg-white text-[#0F766E] shadow-xs' : 'text-[#64748B]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>
          )}
        </div>

        {/* Map Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={provinceFilter}
            onChange={(e) => {
              setProvinceFilter(e.target.value);
              setDistrictFilter('');
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
          >
            <option value="">All Provinces</option>
            {PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
          >
            <option value="">All Districts</option>
            {availableDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
          >
            <option value="">All Crisis Types</option>
            {crisisTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewMode === 'map' ? (
        <div className={`grid grid-cols-1 ${compact ? 'lg:grid-cols-5' : 'lg:grid-cols-12'} bg-[#F0FDFA]/50`}>
          {/* Unified Interactive Map Canvas */}
          <div className={`${compact ? 'lg:col-span-3' : 'lg:col-span-7'} p-3`}>
            {(() => {
              const crisisMapData = adaptCollectionToMapItems(filteredCrises, adaptCrisisToMapItem);
              return (
                <MapView
                  items={crisisMapData.items}
                  missingCoordinatesCount={crisisMapData.missingCoordinatesCount}
                  onSelectItem={(mapItem) => setSelected(mapItem?.properties?.raw || null)}
                  heightClass={compact ? 'h-[340px]' : 'h-[430px]'}
                  showSearch={false}
                  showLayerControl={false}
                  emptyMessage="No crisis events with valid coordinates match the selected filters."
                />
              );
            })()}
          </div>

          {/* Detail Popup / Side Inspector */}
          <div className={`${compact ? 'lg:col-span-2' : 'lg:col-span-5'} border-t lg:border-t-0 lg:border-l border-[#E2E8F0] bg-white p-4 flex flex-col justify-between`}>
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-[#64748B]">{selected.id}</span>
                    <h4 className="text-sm font-semibold text-[#0F172A] mt-0.5">{selected.crisisName}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="p-1 text-[#64748B] hover:text-[#0F172A] rounded"
                    aria-label="Close detail"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <SeverityBadge severity={selected.severity} />
                  <StatusBadge status={selected.status} />
                  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-[#475569]">
                    {selected.crisisType}
                  </span>
                </div>

                <p className="text-xs text-[#475569] leading-relaxed">{selected.description}</p>

                <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0] text-xs text-[#475569]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                    <span>
                      {selected.location?.districtName}, {selected.location?.provinceName}
                      {selected.location?.dsDivisionName ? ` (${selected.location.dsDivisionName} DS)` : ''}
                    </span>
                  </div>
                  {selected.affectedPeopleEstimate !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>Est. {selected.affectedPeopleEstimate.toLocaleString()} affected people</span>
                    </div>
                  )}
                </div>

                {onSelectCrisis && (
                  <button
                    type="button"
                    onClick={() => onSelectCrisis(selected)}
                    className="w-full mt-2 px-3 py-2 text-xs font-medium rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] transition-colors"
                  >
                    Open Crisis Management View
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Select a marker or event
                </p>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {filteredCrises.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelected(c)}
                      className="w-full text-left p-2.5 rounded-lg border border-[#E2E8F0] hover:border-[#0F766E] hover:bg-[#F0FDFA]/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#0F172A] truncate">{c.crisisName}</span>
                        <SeverityBadge severity={c.severity} />
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-1">
                        {c.location?.districtName} • {c.crisisType} • {c.status}
                      </div>
                    </button>
                  ))}
                  {filteredCrises.length === 0 && (
                    <p className="text-xs text-[#64748B] py-4 text-center">No crises match the selected filters.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 divide-y divide-[#E2E8F0]">
          {filteredCrises.map((c) => (
            <div key={c.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#0F172A]">{c.crisisName}</div>
                <div className="text-xs text-[#64748B]">
                  {c.location?.districtName}, {c.location?.provinceName} • {c.crisisType}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={c.severity} />
                <StatusBadge status={c.status} />
                {onSelectCrisis && (
                  <button
                    type="button"
                    onClick={() => onSelectCrisis(c)}
                    className="px-2.5 py-1 text-xs font-medium text-[#0F766E] hover:bg-[#F0FDFA] rounded-md border border-teal-200"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredCrises.length === 0 && (
            <p className="text-xs text-[#64748B] py-6 text-center">No crisis events match the selected filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
