import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Plus } from 'lucide-react';
import { resourceService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, FormField, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';
import { PermissionGate } from '../../../app/providers/AuthProvider';

const resourceSchema = z.object({
  name: z.string().min(3, 'Resource name is required'),
  category: z.string().min(2, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  availableQuantity: z.coerce.number().min(0, 'Must be 0 or greater'),
  reorderThreshold: z.coerce.number().min(1, 'Must be at least 1'),
  warehouseName: z.string().min(3, 'Warehouse name is required'),
  organizationName: z.string().min(2, 'Organization is required'),
  district: z.string().min(2, 'District is required'),
  condition: z.enum(['Good', 'Fair', 'Expiring Soon']),
});

export function ResourceInventoryPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: { category: 'Food', condition: 'Good', unit: 'Units', availableQuantity: 100, reorderThreshold: 50 },
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setResources(await resourceService.list());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => Array.from(new Set(resources.map((r) => r.category))), [resources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (lowStockOnly && r.availableQuantity >= r.reorderThreshold) return false;
      if (q && !`${r.name} ${r.category} ${r.warehouseName} ${r.district}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, search, categoryFilter, lowStockOnly]);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const created = await resourceService.create({
        ...values,
        allocatedQuantity: 0,
      });
      setResources((prev) => [created, ...prev]);
      setCreateOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Resource Item',
        cell: ({ row }) => {
          const isLow = row.original.availableQuantity < row.original.reorderThreshold;
          return (
            <div>
              <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                {row.original.name}
                {isLow && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800">
                    <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                    Low Stock
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#64748B]">{row.original.category}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'availableQuantity',
        header: 'Available',
        cell: ({ row }) => (
          <span className="font-semibold text-[#0F766E] tabular-nums">
            {row.original.availableQuantity.toLocaleString()} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'allocatedQuantity',
        header: 'Allocated',
        cell: ({ row }) => (
          <span className="text-xs text-[#475569] tabular-nums">
            {row.original.allocatedQuantity.toLocaleString()} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'warehouseName',
        header: 'Warehouse / Location',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-medium text-[#0F172A]">{row.original.warehouseName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.district} • {row.original.organizationName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'condition',
        header: 'Condition',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Resource Inventory"
        subtitle="Monitor national disaster relief supplies, warehouse stock levels, condition, and low-stock alerts."
        actions={
          <PermissionGate permission="Resources.Manage">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Resource Record
            </button>
          </PermissionGate>
        }
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || categoryFilter || lowStockOnly)}
        onReset={() => {
          setSearch('');
          setCategoryFilter('');
          setLowStockOnly(false);
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search resource, warehouse, district..." className="w-full sm:w-64" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A] cursor-pointer px-2">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="accent-[#0F766E]"
          />
          Low-stock only
        </label>
      </FilterPanel>

      <DataTable data={filtered} columns={columns} loading={loading} error={error} onRetry={loadData} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Resource Record" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <FormField label="Resource Name" required error={errors.name?.message}>
                <input {...register('name')} placeholder="e.g., Hygiene Kits" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
              </FormField>
            </div>
            <FormField label="Category" required error={errors.category?.message}>
              <select {...register('category')} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white">
                {['Food', 'Water & Sanitation', 'Medical', 'Shelter Supplies', 'Equipment'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Unit" required error={errors.unit?.message}>
              <input {...register('unit')} placeholder="e.g., Packs, Bottles, Kits" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
            </FormField>
            <FormField label="Available Quantity" required error={errors.availableQuantity?.message}>
              <input type="number" {...register('availableQuantity')} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
            </FormField>
            <FormField label="Reorder Threshold" required error={errors.reorderThreshold?.message}>
              <input type="number" {...register('reorderThreshold')} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
            </FormField>
            <FormField label="Warehouse" required error={errors.warehouseName?.message}>
              <input {...register('warehouseName')} placeholder="e.g., Colombo Central Depot" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
            </FormField>
            <FormField label="District" required error={errors.district?.message}>
              <input {...register('district')} placeholder="e.g., Colombo" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
            </FormField>
            <FormField label="Managing Organization" required error={errors.organizationName?.message}>
              <input {...register('organizationName')} placeholder="e.g., National Relief Corps" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
            </FormField>
            <FormField label="Condition" required error={errors.condition?.message}>
              <select {...register('condition')} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white">
                {['Good', 'Fair', 'Expiring Soon'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white">
              {saving ? 'Saving...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
