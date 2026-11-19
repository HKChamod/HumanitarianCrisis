import { useEffect, useMemo, useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { crisisService, resourceService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, FormField, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';
import { PermissionGate } from '../../../app/providers/AuthProvider';

export function ResourceAllocationPage({ mode = 'allocations' }) {
  const [allocations, setAllocations] = useState([]);
  const [resources, setResources] = useState([]);
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(mode === 'requests' ? 'Pending' : '');
  const [createOpen, setCreateOpen] = useState(false);

  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationType, setDestinationType] = useState('Shelter');
  const [crisisName, setCrisisName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatusFilter(mode === 'requests' ? 'Pending' : '');
  }, [mode]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allocs, resList, crisisList] = await Promise.all([
        resourceService.listAllocations(),
        resourceService.list(),
        crisisService.list(),
      ]);
      setAllocations(allocs);
      setResources(resList);
      setCrises(crisisList);
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
    return allocations.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (q && !`${a.resourceName} ${a.destination} ${a.crisisName || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allocations, search, statusFilter]);

  const handleCreateAllocation = async (e) => {
    e.preventDefault();
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
    setFormError('');
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
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Allocation ID',
        cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'resourceName',
        header: 'Resource',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.resourceName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.crisisName || 'General Reserve'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        cell: ({ row }) => (
          <span className="font-semibold text-[#0F766E] tabular-nums">
            {row.original.quantity.toLocaleString()} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'destination',
        header: 'Destination',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-medium text-[#0F172A]">{row.original.destination}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.destinationType}</div>
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
          <span className="text-xs text-[#64748B]">{new Date(getValue()).toLocaleDateString('en-LK')}</span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title={mode === 'requests' ? 'Resource Requests' : 'Resource Allocation'}
        subtitle="Coordinate stock allocations from national depots to active crises, partner organizations, and shelters."
        actions={
          <PermissionGate permission="Resources.Manage">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Allocation
            </button>
          </PermissionGate>
        }
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search resource, destination, crisis..." className="w-full sm:w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Statuses</option>
          {['Pending', 'Dispatched', 'In Transit', 'Delivered', 'Cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Resource Allocation">
        <form onSubmit={handleCreateAllocation} className="space-y-4">
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
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">None / General Reserve</option>
              {crises.map((c) => (
                <option key={c.id} value={c.crisisName}>{c.crisisName}</option>
              ))}
            </select>
          </FormField>

          {formError && <p className="text-xs text-[#DC2626]">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              <Truck className="w-3.5 h-3.5" />
              {saving ? 'Allocating...' : 'Dispatch Allocation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
