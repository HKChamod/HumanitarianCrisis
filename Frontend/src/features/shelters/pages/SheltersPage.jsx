import { useEffect, useMemo, useState } from 'react';
import { Home, MapPin, Phone } from 'lucide-react';
import { shelterService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ErrorState, LoadingState } from '../../../components/common/States';

export function SheltersPage({ mode = 'all' }) {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setShelters(await shelterService.list());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shelters.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (q && !`${s.name} ${s.district} ${s.dsDivision} ${s.operatorOrganization}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [shelters, search, statusFilter]);

  const totals = useMemo(() => {
    const cap = shelters.reduce((sum, s) => sum + s.capacity, 0);
    const occ = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
    return { cap, occ, avail: Math.max(0, cap - occ), pct: cap ? Math.round((occ / cap) * 100) : 0 };
  }, [shelters]);

  return (
    <div>
      <PageHeader
        title={mode === 'occupancy' ? 'Shelter Occupancy Monitor' : 'Shelter Management'}
        subtitle="Track emergency shelter capacity, live occupancy rates, available spaces, and on-site facilities."
      />

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Total Capacity</div>
          <div className="text-xl font-bold text-[#0F172A] mt-0.5">{totals.cap} beds</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Current Occupancy</div>
          <div className="text-xl font-bold text-[#0F766E] mt-0.5">{totals.occ} residents</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Available Capacity</div>
          <div className="text-xl font-bold text-[#16A34A] mt-0.5">{totals.avail} spaces</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">National Utilization</div>
          <div className="text-xl font-bold text-[#0F172A] mt-0.5">{totals.pct}%</div>
        </div>
      </div>

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search shelter, district, operator..." className="w-full sm:w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Statuses</option>
          {['Open', 'Near Capacity', 'Full', 'Closed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FilterPanel>

      {loading ? (
        <LoadingState message="Loading shelter records..." />
      ) : error ? (
        <ErrorState message={error.detail} onRetry={loadData} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => {
            const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
            const available = Math.max(0, s.capacity - s.currentOccupancy);
            const barColor = pct >= 95 ? 'bg-[#DC2626]' : pct >= 80 ? 'bg-[#F59E0B]' : 'bg-[#0F766E]';
            return (
              <div key={s.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#0F766E] flex items-center justify-center shrink-0">
                        <Home className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#0F172A]">{s.name}</h3>
                        <p className="text-[11px] text-[#64748B]">{s.operatorOrganization}</p>
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#0F172A]">
                        Occupancy: {s.currentOccupancy} / {s.capacity} ({pct}%)
                      </span>
                      <span className="text-[#64748B]">{available} available</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.facilities.map((f) => (
                      <span key={f} className="px-2 py-0.5 rounded-md bg-slate-50 border border-[#E2E8F0] text-[11px] text-[#475569]">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                    {s.dsDivision}, {s.district}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                    {s.contactPhone}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
