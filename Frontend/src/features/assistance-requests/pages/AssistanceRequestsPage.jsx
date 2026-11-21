import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Send, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { assistanceRequestService, organizationService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { SeverityBadge, StatusBadge } from '../../../components/common/StatusBadge';
import { Drawer, Modal } from '../../../components/common/Modal';
import { PermissionGate } from '../../../app/providers/AuthProvider';

const REQUEST_STATUSES = ['Pending', 'Under Review', 'Approved', 'Assigned', 'In Progress', 'Completed', 'Rejected'];
const REQUEST_URGENCIES = ['Critical', 'High', 'Medium', 'Low'];
const REQUEST_CATEGORIES = ['Food', 'Water', 'Medicine', 'Shelter', 'Rescue', 'Transport', 'Other'];

export function AssistanceRequestsPage({ initialStatusFilter = '' }) {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'Approve' | 'Reject' | 'Assign', request }
  const [reviewNote, setReviewNote] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqList, orgList] = await Promise.all([
        assistanceRequestService.list(),
        organizationService.list(),
      ]);
      setRequests(reqList);
      setOrganizations(orgList.filter((o) => o.status === 'Active' || o.status === 'Approved'));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter === 'Pending' && r.status !== 'Pending' && r.status !== 'Under Review') return false;
      if (statusFilter === 'Approved' && r.status !== 'Approved' && r.status !== 'Assigned' && r.status !== 'In Progress') return false;
      if (statusFilter && statusFilter !== 'Pending' && statusFilter !== 'Approved' && r.status !== statusFilter) return false;
      if (urgencyFilter && r.urgency !== urgencyFilter) return false;
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (q) {
        const hay = `${r.referenceNumber} ${r.citizenName} ${r.category} ${r.description} ${r.location?.districtName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter, urgencyFilter, categoryFilter]);

  const openActionModal = (type, request) => {
    setActionModal({ type, request });
    setReviewNote('');
    setSelectedOrg(request.assignedOrganization || organizations[0]?.name || '');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;
    setProcessing(true);
    try {
      const nextStatus =
        actionModal.type === 'Approve'
          ? 'Approved'
          : actionModal.type === 'Reject'
            ? 'Rejected'
            : 'Assigned';
      const note =
        reviewNote.trim() ||
        (actionModal.type === 'Assign'
          ? `Assigned to ${selectedOrg} for field response.`
          : `Request marked as ${nextStatus} by Central Administrator.`);

      const updated = await assistanceRequestService.updateStatus(
        actionModal.request.id,
        nextStatus,
        note,
        actionModal.type === 'Assign' ? selectedOrg : undefined
      );
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedRequest?.id === updated.id) setSelectedRequest(updated);
      setActionModal(null);
    } finally {
      setProcessing(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'referenceNumber',
        header: 'Reference',
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold text-[#0F172A]">{row.original.referenceNumber}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.category}</div>
          </div>
        ),
      },
      {
        accessorKey: 'citizenName',
        header: 'Citizen',
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-[#0F172A]">{row.original.citizenName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.peopleAffected} affected</div>
          </div>
        ),
      },
      {
        id: 'location',
        header: 'Location',
        accessorFn: (row) => `${row.location?.districtName || ''}, ${row.location?.dsDivisionName || ''}`,
        cell: ({ row }) => (
          <div className="text-xs text-[#475569]">
            <div className="font-medium text-[#0F172A]">{row.original.location?.districtName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.location?.dsDivisionName || row.original.location?.provinceName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'urgency',
        header: 'Urgency',
        cell: ({ getValue }) => <SeverityBadge severity={getValue()} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'submittedAt',
        header: 'Submitted',
        cell: ({ getValue }) => (
          <span className="text-xs text-[#64748B] whitespace-nowrap">
            {new Date(getValue()).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })}
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
              onClick={() => setSelectedRequest(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F766E] bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100/70"
            >
              <Eye className="w-3.5 h-3.5" />
              Review
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const pageTitle =
    initialStatusFilter === 'Pending'
      ? 'Pending Assistance Requests'
      : initialStatusFilter === 'Approved'
        ? 'Approved Assistance Requests'
        : initialStatusFilter === 'Rejected'
          ? 'Rejected Assistance Requests'
          : 'Citizen Assistance Requests';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle="Verify citizen assistance requests, prioritize urgent needs, and assign partner organizations for delivery."
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter || urgencyFilter || categoryFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setUrgencyFilter('');
          setCategoryFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search ref, citizen, district..." className="w-full sm:w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Statuses</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Urgencies</option>
          {REQUEST_URGENCIES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Categories</option>
          {REQUEST_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </FilterPanel>

      <DataTable
        data={filteredRequests}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle="No assistance requests found"
      />

      {/* Request Review Drawer */}
      <Drawer
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.referenceNumber || 'Request Details'}
        subtitle={selectedRequest ? `${selectedRequest.category} • Submitted by ${selectedRequest.citizenName}` : ''}
        footer={
          selectedRequest && (
            <PermissionGate permission="CitizenRequests.Manage">
              <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                <button
                  type="button"
                  onClick={() => openActionModal('Reject', selectedRequest)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => openActionModal('Assign', selectedRequest)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#0F766E] border border-teal-200 hover:bg-teal-100"
                >
                  <Send className="w-3.5 h-3.5" />
                  Assign Org
                </button>
                <button
                  type="button"
                  onClick={() => openActionModal('Approve', selectedRequest)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
              </div>
            </PermissionGate>
          )
        }
      >
        {selectedRequest && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <SeverityBadge severity={selectedRequest.urgency} />
              <StatusBadge status={selectedRequest.status} />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2 text-xs">
              <div className="font-semibold text-[#0F172A]">Description of Need</div>
              <p className="text-[#475569] leading-relaxed">{selectedRequest.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-white border border-[#E2E8F0]">
              <div>
                <div className="text-[#64748B]">Citizen Name</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedRequest.citizenName}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Contact Phone</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedRequest.contactPhone}</div>
              </div>
              <div>
                <div className="text-[#64748B]">People Affected</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedRequest.peopleAffected}</div>
              </div>
              <div>
                <div className="text-[#64748B]">District / DS</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">
                  {selectedRequest.location?.districtName} ({selectedRequest.location?.dsDivisionName || '—'})
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[#64748B]">Assigned Organization</div>
                <div className="font-semibold text-[#0F766E] mt-0.5">
                  {selectedRequest.assignedOrganization || 'Not yet assigned'}
                </div>
              </div>
            </div>

            {/* Review History */}
            <div>
              <h4 className="text-xs font-semibold text-[#0F172A] mb-2">Review & Audit History</h4>
              {selectedRequest.reviewHistory.length === 0 ? (
                <p className="text-xs text-[#64748B]">No review actions recorded yet.</p>
              ) : (
                <div className="space-y-2.5 border-l-2 border-teal-200 pl-3 ml-1">
                  {selectedRequest.reviewHistory.map((h) => (
                    <div key={h.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#0F172A]">{h.action}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {new Date(h.timestamp).toLocaleString('en-LK')}
                        </span>
                      </div>
                      <p className="text-[#475569] mt-0.5">{h.note}</p>
                      <div className="text-[10px] text-[#94A3B8]">Actor: {h.actor}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Approve / Reject / Assign Modal */}
      <Modal
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={actionModal ? `${actionModal.type} Assistance Request` : ''}
        subtitle={actionModal?.request?.referenceNumber}
      >
        <form onSubmit={handleConfirmAction} className="space-y-4">
          {actionModal?.type === 'Assign' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">Select Partner Organization</label>
              <select
                required
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
              >
                <option value="">Choose an active organization...</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.name}>
                    {o.name} ({o.district})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Review / Operational Note {actionModal?.type === 'Reject' ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              rows={3}
              required={actionModal?.type === 'Reject'}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter verification rationale or coordination instructions..."
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActionModal(null)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white ${actionModal?.type === 'Reject' ? 'bg-[#DC2626] hover:bg-red-700' : 'bg-[#0F766E] hover:bg-[#115E59]'
                }`}
            >
              {processing ? 'Saving...' : `Confirm ${actionModal?.type}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
