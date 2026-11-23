import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, Plus, Send, Truck, XCircle, Ban } from 'lucide-react';
import {
  crisisService,
  resourceAllocationService,
  resourceService,
  warehouseInventoryService,
} from '../../../services/api/adminServices';
import { getEligibleAllocationCrises } from '../../../services/api/backendMappers';
import { USE_MOCK_API } from '../../../services/api/apiConfig';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, FormField, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Drawer, Modal } from '../../../components/common/Modal';
import { PermissionGate, useAuth } from '../../../app/providers/AuthProvider';

export function ResourceAllocationPage({ mode = 'allocations' }) {
  const { hasPermission } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [resources, setResources] = useState([]);
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const loadSeqRef = useRef(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(mode === 'requests' ? 'Pending' : '');
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state (live uses inventoryId + crisisId + quantityRequested + referenceNumber + notes)
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [selectedCrisisId, setSelectedCrisisId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  // Mock-only fields
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationType, setDestinationType] = useState('Shelter');
  const [crisisName, setCrisisName] = useState('');

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Selected allocation details & lifecycle action modal
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject'|'dispatch'|'deliver'|'cancel', allocation }
  const [actionQuantity, setActionQuantity] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  useEffect(() => {
    setStatusFilter(mode === 'requests' ? 'Pending' : '');
  }, [mode]);

  const loadData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      if (USE_MOCK_API) {
        const [allocs, resList, crisisList] = await Promise.all([
          resourceService.listAllocations(),
          resourceService.list(),
          crisisService.list(),
        ]);
        if (loadSeqRef.current !== seq) return;
        setAllocations(allocs);
        setResources(resList);
        setCrises(crisisList);
        return;
      }

      const [allocsResult, invResult, crisesResult] = await Promise.allSettled([
        resourceAllocationService.list(),
        warehouseInventoryService.list(),
        crisisService.list(),
      ]);

      if (loadSeqRef.current !== seq) return;

      if (allocsResult.status === 'rejected') {
        setError(allocsResult.reason);
        setAllocations([]);
      } else {
        setAllocations(allocsResult.value);
      }

      setInventories(invResult.status === 'fulfilled' ? invResult.value : []);
      setCrises(crisesResult.status === 'fulfilled' ? crisesResult.value : []);
    } catch (err) {
      if (loadSeqRef.current !== seq) return;
      setError(err);
    } finally {
      if (loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadData]);

  const eligibleCrises = useMemo(() => getEligibleAllocationCrises(crises), [crises]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allocations.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (
        q &&
        !`${a.id} ${a.resourceName} ${a.warehouseName || ''} ${a.destination || ''} ${a.crisisName || ''} ${a.referenceNumber || ''}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [allocations, search, statusFilter]);

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError('');

    if (USE_MOCK_API) {
      const resItem = resources.find((r) => r.id === selectedResourceId);
      const qty = Number(quantity);
      if (!resItem) {
        setFormError('Select a resource item.');
        return;
      }
      if (!qty || qty <= 0) {
        setFormError('Quantity must be greater than zero.');
        return;
      }
      if (qty > resItem.availableQuantity) {
        setFormError(`Requested quantity exceeds available stock (${resItem.availableQuantity} ${resItem.unit}).`);
        return;
      }
      setSaving(true);
      try {
        const created = await resourceService.createAllocation({
          resourceId: resItem.id,
          resourceName: resItem.name,
          quantity: qty,
          unit: resItem.unit,
          destination: destination.trim(),
          destinationType,
          crisisName: crisisName || undefined,
          status: 'Dispatched',
        });
        setAllocations((prev) => [created, ...prev]);
        setResources(await resourceService.list());
        setCreateOpen(false);
        setSelectedResourceId('');
        setDestination('');
        setQuantity('');
      } finally {
        setSaving(false);
      }
      return;
    }

    const qty = Number(quantity);
    if (!selectedInventoryId) {
      setFormError('Select a warehouse inventory item.');
      return;
    }
    if (!selectedCrisisId) {
      setFormError(
        eligibleCrises.length === 0
          ? 'No eligible open/active crisis events exist. Closed and Resolved crises cannot receive new allocations.'
          : 'Select an eligible target crisis event.'
      );
      return;
    }
    const selectedCrisis = eligibleCrises.find((c) => String(c.id) === String(selectedCrisisId));
    if (!selectedCrisis) {
      setFormError('Selected crisis event is closed or resolved and cannot receive new resource allocations.');
      return;
    }
    if (!qty || qty <= 0) {
      setFormError('Requested quantity must be greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await resourceAllocationService.create({
        inventoryId: Number(selectedInventoryId),
        crisisId: Number(selectedCrisisId),
        quantityRequested: qty,
        referenceNumber,
        notes,
      });
      setCreateOpen(false);
      setSelectedInventoryId('');
      setSelectedCrisisId('');
      setQuantity('');
      setReferenceNumber('');
      setNotes('');
      setActionError('');
      setActionSuccess('Resource allocation request created (Status: Pending).');
      await loadData();
    } catch (err) {
      setFormError(err?.detail || err?.message || 'Failed to create resource allocation.');
    } finally {
      setSaving(false);
    }
  };

  const openActionModal = (type, allocation) => {
    setActionError('');
    setActionSuccess('');
    setActionModal({ type, allocation });
    setActionQuantity(String(allocation.quantityRequested || ''));
    setActionNotes('');
  };

  const handleLifecycleSubmit = async (e) => {
    e.preventDefault();
    if (!actionModal || actionSubmitting) return;

    const { type, allocation } = actionModal;
    setActionError('');
    setActionSuccess('');

    if (type === 'approve') {
      const qty = Number(actionQuantity);
      if (!qty || qty <= 0 || qty > allocation.quantityRequested) {
        setActionError(`Allocated quantity must be between 0.01 and ${allocation.quantityRequested}.`);
        return;
      }
    }

    setActionSubmitting(true);
    try {
      let updated;
      if (type === 'approve') {
        updated = await resourceAllocationService.approve(allocation.allocationId, {
          quantityAllocated: Number(actionQuantity),
          notes: actionNotes,
        });
      } else if (type === 'reject') {
        updated = await resourceAllocationService.reject(allocation.allocationId, { notes: actionNotes });
      } else if (type === 'dispatch') {
        updated = await resourceAllocationService.dispatch(allocation.allocationId, { notes: actionNotes });
      } else if (type === 'deliver') {
        updated = await resourceAllocationService.deliver(allocation.allocationId, { notes: actionNotes });
      } else if (type === 'cancel') {
        updated = await resourceAllocationService.cancel(allocation.allocationId, { notes: actionNotes });
      }

      setActionModal(null);
      if (updated && selectedAllocation?.id === updated.id) {
        setSelectedAllocation(updated);
      }
      setActionSuccess(`Allocation #${allocation.allocationId} updated to ${updated?.status || type}.`);
      await loadData();
    } catch (err) {
      setActionError(err?.detail || err?.message || `Failed to ${type} allocation.`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const canManageAllocations = !USE_MOCK_API && hasPermission('ResourceAllocations.Manage');

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Allocation ID',
        cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-[#0F172A]">#{getValue()}</span>,
      },
      {
        accessorKey: 'resourceName',
        header: 'Resource & Warehouse',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.resourceName}</div>
            <div className="text-[11px] text-[#64748B]">
              {USE_MOCK_API ? row.original.crisisName || 'General Reserve' : row.original.warehouseName || '—'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'crisisName',
        header: USE_MOCK_API ? 'Destination' : 'Target Crisis',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-medium text-[#0F172A]">
              {USE_MOCK_API ? row.original.destination : row.original.crisisName || '—'}
            </div>
            {!USE_MOCK_API && row.original.referenceNumber && (
              <div className="text-[11px] text-[#64748B] font-mono">{row.original.referenceNumber}</div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: USE_MOCK_API ? 'Quantity' : 'Requested / Allocated',
        cell: ({ row }) =>
          USE_MOCK_API ? (
            <span className="font-semibold text-[#0F766E] tabular-nums">
              {row.original.quantity.toLocaleString()} {row.original.unit}
            </span>
          ) : (
            <div className="text-xs tabular-nums">
              <div className="font-semibold text-[#0F766E]">Req: {row.original.quantityRequested.toLocaleString()}</div>
              <div className="text-[11px] text-[#64748B]">Alloc: {row.original.quantityAllocated.toLocaleString()}</div>
            </div>
          ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'allocatedDate',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-xs text-[#64748B]">
            {getValue() ? new Date(getValue()).toLocaleDateString('en-LK') : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedAllocation(item)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-[#E2E8F0] bg-white text-[#334155] hover:bg-slate-50"
              >
                <Eye className="w-3 h-3" /> Details
              </button>
              {canManageAllocations && item.status === 'Pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => openActionModal('approve', item)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => openActionModal('reject', item)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100"
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </>
              )}
              {canManageAllocations && item.status === 'Approved' && (
                <button
                  type="button"
                  onClick={() => openActionModal('dispatch', item)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Send className="w-3 h-3" /> Dispatch
                </button>
              )}
              {canManageAllocations && item.status === 'Dispatched' && (
                <button
                  type="button"
                  onClick={() => openActionModal('deliver', item)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Truck className="w-3 h-3" /> Deliver
                </button>
              )}
              {canManageAllocations && (item.status === 'Pending' || item.status === 'Approved' || item.status === 'Dispatched') && (
                <button
                  type="button"
                  onClick={() => openActionModal('cancel', item)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  <Ban className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [canManageAllocations]
  );

  const statusOptions = USE_MOCK_API
    ? ['Pending', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled']
    : ['Pending', 'Approved', 'Dispatched', 'Delivered', 'Rejected', 'Cancelled'];

  return (
    <div>
      <PageHeader
        title={mode === 'requests' ? 'Resource Allocation Requests' : 'Resource Allocations'}
        subtitle="Coordinate stock allocations from warehouse inventories to active crisis events with full approve, dispatch, and delivery tracking."
        actions={
          <PermissionGate permission={USE_MOCK_API ? 'Resources.Manage' : 'Resources.Allocate'}>
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Allocation
            </button>
          </PermissionGate>
        }
      />

      {actionSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {actionSuccess}
        </div>
      )}
      {actionError && !actionModal && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#991B1B]">
          {actionError}
        </div>
      )}

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search allocation, resource, warehouse, crisis, ref..."
          className="w-full sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </FilterPanel>

      <DataTable
        data={filtered}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={loadData}
        emptyTitle={mode === 'requests' ? 'No pending resource requests' : 'No allocations found'}
      />

      {/* Create Allocation Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Resource Allocation">
        <form onSubmit={handleCreateAllocation} className="space-y-4">
          {USE_MOCK_API ? (
            <>
              <FormField label="Select Resource" required>
                <select
                  required
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
                >
                  <option value="">Choose resource...</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.availableQuantity.toLocaleString()} {r.unit} available ({r.warehouseName})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Destination Type" required>
                  <select
                    value={destinationType}
                    onChange={(e) => setDestinationType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
                  >
                    <option value="Shelter">Shelter</option>
                    <option value="Organization">Organization</option>
                    <option value="Crisis">Crisis Zone</option>
                  </select>
                </FormField>
                <FormField label="Quantity" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                  />
                </FormField>
              </div>

              <FormField label="Destination Name / Location" required>
                <input
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Kalutara Central College Shelter"
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                />
              </FormField>

              <FormField label="Related Crisis Event (Optional)">
                <select
                  value={crisisName}
                  onChange={(e) => setCrisisName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white text-[#0F172A]"
                >
                  <option value="">None / General Reserve</option>
                  {eligibleCrises.map((c) => (
                    <option key={c.id} value={c.crisisName}>
                      {c.crisisName} ({c.status})
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Warehouse Inventory Stock" required>
                <select
                  required
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white text-[#0F172A]"
                >
                  <option value="">Select warehouse inventory...</option>
                  {inventories.map((inv) => (
                    <option key={inv.inventoryId} value={inv.inventoryId}>
                      {inv.resourceName} — {inv.warehouseName} ({inv.quantityAvailable.toLocaleString()} available)
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Target Crisis Event" required>
                {eligibleCrises.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900">
                    <strong>No eligible crisis events available.</strong> Closed and Resolved crisis events are excluded from new resource allocations. Create or activate a crisis event first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCrisisId}
                    onChange={(e) => setSelectedCrisisId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded-lg bg-white text-[#0F172A]"
                  >
                    <option value="">Select eligible crisis event...</option>
                    {eligibleCrises.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} — {c.crisisName} ({c.status})
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Quantity Requested" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                  />
                </FormField>
                <FormField label="Reference Number (Optional)">
                  <input
                    maxLength={100}
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g., ALLOC-2026-001"
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                  />
                </FormField>
              </div>

              <FormField label="Operational Notes (Optional)">
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Delivery or staging notes..."
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                />
              </FormField>
            </>
          )}

          {formError && <p className="text-xs text-[#DC2626]">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#94A3B8] bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!USE_MOCK_API && eligibleCrises.length === 0)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:bg-[#E2E8F0] disabled:text-[#64748B] disabled:border disabled:border-[#CBD5E1]"
            >
              <Truck className="w-3.5 h-3.5" />
              {saving ? 'Submitting...' : USE_MOCK_API ? 'Dispatch Allocation' : 'Create Allocation Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lifecycle Action Modal (Approve / Reject / Dispatch / Deliver / Cancel) */}
      <Modal
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={
          actionModal
            ? `${actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)} Allocation #${actionModal.allocation.allocationId}`
            : ''
        }
      >
        {actionModal && (
          <form onSubmit={handleLifecycleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs space-y-1">
              <div>
                <strong>Resource:</strong> {actionModal.allocation.resourceName} ({actionModal.allocation.warehouseName})
              </div>
              <div>
                <strong>Crisis:</strong> {actionModal.allocation.crisisName}
              </div>
              <div>
                <strong>Requested:</strong> {actionModal.allocation.quantityRequested} |{' '}
                <strong>Allocated:</strong> {actionModal.allocation.quantityAllocated}
              </div>
            </div>

            {actionModal.type === 'approve' && (
              <FormField label="Quantity Allocated" required>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={actionModal.allocation.quantityRequested}
                  required
                  value={actionQuantity}
                  onChange={(e) => setActionQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                />
              </FormField>
            )}

            <FormField label="Notes (Optional)">
              <textarea
                rows={3}
                maxLength={1000}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Add dispatch, approval, or cancellation remarks..."
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>

            {actionError && <p className="text-xs text-[#DC2626]">{actionError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={actionSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-50"
              >
                {actionSubmitting ? 'Processing...' : `Confirm ${actionModal.type}`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Details Drawer */}
      <Drawer
        open={Boolean(selectedAllocation)}
        onClose={() => setSelectedAllocation(null)}
        title={selectedAllocation ? `Allocation #${selectedAllocation.id}` : 'Allocation Details'}
        subtitle={selectedAllocation ? `${selectedAllocation.resourceName} • ${selectedAllocation.status}` : ''}
      >
        {selectedAllocation && (
          <div className="space-y-4 text-xs">
            <StatusBadge status={selectedAllocation.status} />
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
              <div>
                <div className="text-[#64748B]">Resource</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedAllocation.resourceName}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Warehouse</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedAllocation.warehouseName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Target Crisis</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedAllocation.crisisName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Reference Number</div>
                <div className="font-mono font-semibold text-[#0F172A] mt-0.5">{selectedAllocation.referenceNumber || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Quantity Requested</div>
                <div className="font-semibold text-[#0F766E] mt-0.5">{selectedAllocation.quantityRequested}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Quantity Allocated</div>
                <div className="font-semibold text-[#0F766E] mt-0.5">{selectedAllocation.quantityAllocated}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Requested By</div>
                <div className="font-medium text-[#0F172A] mt-0.5">{selectedAllocation.requestedByUserName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Approved By</div>
                <div className="font-medium text-[#0F172A] mt-0.5">{selectedAllocation.approvedByUserName || '—'}</div>
              </div>
            </div>
            {selectedAllocation.notes && (
              <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0]">
                <div className="font-semibold text-[#0F172A] mb-1">Notes</div>
                <p className="text-[#475569] leading-relaxed">{selectedAllocation.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
