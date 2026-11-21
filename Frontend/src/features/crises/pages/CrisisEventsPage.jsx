import { useEffect, useMemo, useState } from 'react';
import { Eye, MapPin, Plus, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { assistanceRequestService, crisisService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { SeverityBadge, StatusBadge } from '../../../components/common/StatusBadge';
import { ConfirmationDialog, Drawer } from '../../../components/common/Modal';
import { PermissionGate } from '../../../app/providers/AuthProvider';
import { PROVINCES } from '../../../data/sriLankaAreas';

const CRISIS_STATUSES = ['Draft', 'Active', 'Monitoring', 'Resolved', 'Closed'];
const CRISIS_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

export function CrisisEventsPage({ initialStatusFilter = '' }) {
  const [searchParams] = useSearchParams();
  const [crises, setCrises] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [severityFilter, setSeverityFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');

  const [selectedCrisis, setSelectedCrisis] = useState(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [crisisData, reqData] = await Promise.all([
        crisisService.list(),
        assistanceRequestService.list(),
      ]);
      setCrises(crisisData);
      setRequests(reqData);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCrises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return crises.filter((c) => {
      if (statusFilter === 'Active' && c.status !== 'Active' && c.status !== 'Monitoring') return false;
      if (statusFilter && statusFilter !== 'Active' && c.status !== statusFilter) return false;
      if (severityFilter && c.severity !== severityFilter) return false;
      if (provinceFilter && c.location?.provinceId !== provinceFilter) return false;
      if (q) {
        const hay = `${c.id} ${c.crisisName} ${c.crisisType} ${c.location?.districtName || ''} ${c.location?.provinceName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [crises, search, statusFilter, severityFilter, provinceFilter]);

  const relatedRequests = useMemo(() => {
    if (!selectedCrisis) return [];
    return requests.filter((r) => r.crisisId === selectedCrisis.id);
  }, [selectedCrisis, requests]);

  const handleConfirmStatusChange = async () => {
    if (!statusChangeTarget) return;
    setUpdating(true);
    try {
      const updated = await crisisService.updateStatus(statusChangeTarget.crisis.id, statusChangeTarget.nextStatus);
      setCrises((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedCrisis?.id === updated.id) setSelectedCrisis(updated);
      setStatusChangeTarget(null);
    } finally {
      setUpdating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'crisisName',
        header: 'Crisis Event',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.crisisName}</div>
            <div className="text-[11px] text-[#64748B] font-mono">{row.original.id}</div>
          </div>
        ),
      },
      {
        accessorKey: 'crisisType',
        header: 'Type',
        cell: ({ getValue }) => <span className="text-xs font-medium text-[#475569]">{getValue()}</span>,
      },
      {
        id: 'location',
        header: 'Location',
        accessorFn: (row) => `${row.location?.districtName || ''}, ${row.location?.provinceName || ''}`,
        cell: ({ row }) => (
          <div className="text-xs text-[#475569]">
            <div className="font-medium text-[#0F172A]">{row.original.location?.districtName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.location?.provinceName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        cell: ({ getValue }) => <SeverityBadge severity={getValue()} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'reportedDate',
        header: 'Reported',
        cell: ({ getValue }) => (
          <span className="text-xs text-[#64748B] whitespace-nowrap">
            {new Date(getValue()).toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCrisis(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F766E] bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100/70"
            >
              <Eye className="w-3.5 h-3.5" />
              Details
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const hasFilters = Boolean(search || statusFilter || severityFilter || provinceFilter);

  return (
    <div>
      <PageHeader
        title={initialStatusFilter === 'Active' ? 'Active Crisis Events' : 'Crisis Events Management'}
        subtitle="Monitor national crisis events, update lifecycle status, and inspect affected areas and related assistance requests."
        actions={
          <>
            <Link
              to="/admin/crises/map"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
            >
              <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
              Crisis Map
            </Link>
            <PermissionGate permission="CrisisEvents.Create">
              <Link
                to="/admin/crises/create"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Crisis Event
              </Link>
            </PermissionGate>
          </>
        }
      />

      <FilterPanel
        hasActiveFilters={hasFilters}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setSeverityFilter('');
          setProvinceFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search crisis name, ID, district..." className="w-full sm:w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
        >
          <option value="">All Statuses</option>
          {CRISIS_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
        >
          <option value="">All Severities</option>
          {CRISIS_SEVERITIES.map((sev) => (
            <option key={sev} value={sev}>{sev}</option>
          ))}
        </select>
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A]"
        >
          <option value="">All Provinces</option>
          {PROVINCES.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </FilterPanel>

      <DataTable
        data={filteredCrises}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No crisis events found"
        emptyDescription="No crisis events match your current search and filter criteria."
      />

      {/* Crisis Detail Drawer */}
      <Drawer
        open={Boolean(selectedCrisis)}
        onClose={() => setSelectedCrisis(null)}
        title={selectedCrisis?.crisisName || 'Crisis Event Details'}
        subtitle={selectedCrisis ? `${selectedCrisis.id} • ${selectedCrisis.crisisType}` : ''}
      >
        {selectedCrisis && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={selectedCrisis.severity} />
              <StatusBadge status={selectedCrisis.status} />
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">{selectedCrisis.description}</p>

            {/* Lifecycle Status Update */}
            <PermissionGate permission="CrisisEvents.Update">
              <div className="p-3.5 rounded-xl bg-[#F0FDFA] border border-teal-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0F766E]" />
                  Update Crisis Lifecycle Status
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CRISIS_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={selectedCrisis.status === st}
                      onClick={() => setStatusChangeTarget({ crisis: selectedCrisis, nextStatus: st })}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        selectedCrisis.status === st
                          ? 'bg-[#0F766E] text-white border-[#0F766E]'
                          : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0F766E]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </PermissionGate>

            {/* Geographic Details */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs">
              <div>
                <div className="text-[#64748B]">Province</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.provinceName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">District</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.districtName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">DS Division</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.dsDivisionName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">GN Division</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.gnDivisionName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Coordinates</div>
                <div className="font-mono text-[11px] text-[#0F172A] mt-0.5">
                  {selectedCrisis.location?.latitude
                    ? `${selectedCrisis.location.latitude}, ${selectedCrisis.location.longitude}`
                    : 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Start Date</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">
                  {new Date(selectedCrisis.startDate).toLocaleDateString('en-LK')}
                </div>
              </div>
            </div>

            {/* Related Assistance Requests */}
            <div>
              <h4 className="text-xs font-semibold text-[#0F172A] mb-2">
                Related Assistance Requests ({relatedRequests.length})
              </h4>
              {relatedRequests.length === 0 ? (
                <p className="text-xs text-[#64748B] p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                  No citizen assistance requests linked to this crisis yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {relatedRequests.map((req) => (
                    <div key={req.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {req.referenceNumber} — {req.category}
                        </span>
                        <StatusBadge status={req.status} />
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1">{req.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmationDialog
        open={Boolean(statusChangeTarget)}
        onClose={() => setStatusChangeTarget(null)}
        onConfirm={handleConfirmStatusChange}
        loading={updating}
        title="Confirm Crisis Status Change"
        message={
          statusChangeTarget
            ? `Change status of "${statusChangeTarget.crisis.crisisName}" from ${statusChangeTarget.crisis.status} to ${statusChangeTarget.nextStatus}? This action will be recorded in the system audit log.`
            : ''
        }
        confirmLabel="Update Status"
        variant={statusChangeTarget?.nextStatus === 'Closed' ? 'warning' : 'primary'}
      />
    </div>
  );
}
