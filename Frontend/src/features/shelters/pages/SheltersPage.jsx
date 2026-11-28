import { useEffect, useMemo, useState } from 'react';
import { Home, LogOut, Map as MapIcon, MapPin, Phone, UserPlus, Users } from 'lucide-react';
import { assistanceRequestService, shelterService } from '../../../services/api/adminServices';
import { useAuth } from '../../../app/providers/AuthProvider';
import { PageHeader } from '../../../components/common/PageHeader';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ErrorState, LoadingState } from '../../../components/common/States';
import { Modal } from '../../../components/common/Modal';
import { MapView, adaptCollectionToMapItems, adaptShelterToMapItem } from '../../../shared/maps';

export function SheltersPage({ mode = 'all' }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('Shelters.Manage');

  const [shelters, setShelters] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [activeView, setActiveView] = useState('shelters'); // 'shelters' | 'placements'

  // Allocate Shelter (Placement) Modal State
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({
    shelterId: '',
    citizenRequestId: '',
    residentName: '',
    peopleCount: 1,
    notes: '',
  });
  const [allocSaving, setAllocSaving] = useState(false);
  const [allocFeedback, setAllocFeedback] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [shelterList, placementList, reqList] = await Promise.all([
        shelterService.list(),
        shelterService.listPlacements().catch(() => []),
        assistanceRequestService.list().catch(() => []),
      ]);
      setShelters(shelterList);
      setPlacements(placementList);
      setRequests(reqList);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAllocateModal = (shelterId = '') => {
    setAllocFeedback(null);
    setAllocForm({
      shelterId: shelterId ? String(shelterId) : (shelters[0]?.id ? String(shelters[0].id) : ''),
      citizenRequestId: '',
      residentName: '',
      peopleCount: 1,
      notes: '',
    });
    setAllocateOpen(true);
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocForm.shelterId || !allocForm.residentName.trim()) {
      setAllocFeedback({ type: 'error', text: 'Please select a shelter and enter resident name.' });
      return;
    }
    setAllocSaving(true);
    setAllocFeedback(null);
    try {
      await shelterService.createPlacement({
        shelterId: Number(allocForm.shelterId),
        citizenRequestId: allocForm.citizenRequestId ? Number(allocForm.citizenRequestId) : null,
        residentName: allocForm.residentName.trim(),
        peopleCount: Number(allocForm.peopleCount) || 1,
        notes: allocForm.notes.trim() || null,
      });
      setAllocateOpen(false);
      setAllocFeedback({ type: 'success', text: 'Shelter allocated and occupancy updated.' });
      await loadData();
    } catch (err) {
      setAllocFeedback({ type: 'error', text: err?.detail || err?.message || 'Unable to allocate shelter.' });
    } finally {
      setAllocSaving(false);
    }
  };

  const handleCheckOut = async (placementId) => {
    setAllocFeedback(null);
    try {
      await shelterService.checkOutPlacement(placementId);
      setAllocFeedback({ type: 'success', text: 'Resident checked out and shelter occupancy updated.' });
      await loadData();
    } catch (err) {
      setAllocFeedback({ type: 'error', text: err?.detail || err?.message || 'Unable to check out placement.' });
    }
  };

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
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveView((v) => (v === 'shelters' ? 'placements' : 'shelters'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
            >
              <Users className="w-3.5 h-3.5 text-[#0F766E]" />
              {activeView === 'shelters' ? `Placements (${placements.length})` : 'View Shelters'}
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => openAllocateModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Allocate Shelter
              </button>
            )}
          </div>
        }
      />

      {allocFeedback && (
        <div
          className={`mb-4 px-4 py-2.5 rounded-lg border text-xs font-medium ${
            allocFeedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {allocFeedback.text}
        </div>
      )}

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
        <button
          type="button"
          onClick={() => setShowMap((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border ${
            showMap
              ? 'bg-[#0F766E] text-white border-[#0F766E]'
              : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-slate-50'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          {showMap ? 'Hide Map' : 'Map Overview'}
        </button>
      </FilterPanel>

      {showMap && (
        <div className="mb-5 bg-white border border-[#E2E8F0] rounded-xl p-3">
          {(() => {
            const mapped = adaptCollectionToMapItems(filtered, adaptShelterToMapItem);
            return (
              <MapView
                items={mapped.items}
                missingCoordinatesCount={mapped.missingCoordinatesCount}
                heightClass="h-[360px]"
                showSearch={false}
                showLayerControl={false}
                emptyMessage="No shelter records in the current view have valid coordinates."
              />
            );
          })()}
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading shelter records..." />
      ) : error ? (
        <ErrorState message={error.detail} onRetry={loadData} />
      ) : activeView === 'placements' ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0F172A]">Shelter Placements ({placements.length})</h2>
          </div>
          {placements.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">No shelter placements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#475569]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Resident</th>
                    <th className="px-4 py-3 font-semibold">Shelter</th>
                    <th className="px-4 py-3 font-semibold">People</th>
                    <th className="px-4 py-3 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{p.residentName}</td>
                      <td className="px-4 py-3 text-[#475569]">{p.shelterName}</td>
                      <td className="px-4 py-3 text-[#0F172A]">{p.peopleCount}</td>
                      <td className="px-4 py-3 text-[#64748B]">{p.citizenRequestId ? `#${p.citizenRequestId}` : '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {canManage && p.status === 'CheckedIn' ? (
                          <button
                            type="button"
                            onClick={() => handleCheckOut(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[11px] font-semibold text-[#0F172A] hover:bg-slate-50"
                          >
                            <LogOut className="w-3 h-3" />
                            Check Out
                          </button>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                      {s.contactPhone}
                    </span>
                    {canManage && available > 0 && s.status !== 'Closed' && (
                      <button
                        type="button"
                        onClick={() => openAllocateModal(s.id)}
                        className="px-2.5 py-1 rounded-md bg-[#F0FDFA] border border-teal-200 text-[11px] font-semibold text-[#0F766E] hover:bg-teal-100"
                      >
                        Allocate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={allocateOpen} onClose={() => setAllocateOpen(false)} title="Allocate Shelter (Check-In)" maxWidth="max-w-lg">
        <form onSubmit={handleAllocateSubmit} className="space-y-3.5">
          {allocFeedback?.type === 'error' && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{allocFeedback.text}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Shelter *</label>
            <select
              required
              value={allocForm.shelterId}
              onChange={(e) => setAllocForm((p) => ({ ...p, shelterId: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">-- Select Shelter --</option>
              {shelters.map((s) => {
                const avail = Math.max(0, s.capacity - s.currentOccupancy);
                return (
                  <option key={s.id} value={s.id} disabled={avail === 0 || s.status === 'Closed'}>
                    {s.name} ({avail} spaces left)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Resident / Family Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Nimal Perera"
                value={allocForm.residentName}
                onChange={(e) => setAllocForm((p) => ({ ...p, residentName: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">People Count *</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={allocForm.peopleCount}
                onChange={(e) => setAllocForm((p) => ({ ...p, peopleCount: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Link Citizen Request (Optional)</label>
            <select
              value={allocForm.citizenRequestId}
              onChange={(e) => setAllocForm((p) => ({ ...p, citizenRequestId: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">-- None / Walk-in --</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  REQ-{r.id}: {r.citizenName || r.category} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Medical or accessibility notes..."
              value={allocForm.notes}
              onChange={(e) => setAllocForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAllocateOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-white text-[#475569]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={allocSaving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-60"
            >
              {allocSaving ? 'Allocating...' : 'Confirm Check-In'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
