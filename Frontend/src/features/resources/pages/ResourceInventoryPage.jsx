import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowLeftRight, Building2, History, Map as MapIcon, Package, Plus, SlidersHorizontal } from 'lucide-react';
import {
  areaService,
  inventoryTransactionService,
  resourceService,
  warehouseInventoryService,
  warehouseService,
} from '../../../services/api/adminServices';
import { USE_MOCK_API } from '../../../services/api/apiConfig';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, FormField, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';
import { PermissionGate, useAuth } from '../../../app/providers/AuthProvider';
import {
  LocationPickerField,
  MAP_ENTITY_TYPES,
  MapView,
  adaptCollectionToMapItems,
  adaptWarehouseToMapItem,
} from '../../../shared/maps';

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
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(USE_MOCK_API ? 'catalogue' : 'stock');
  const [resources, setResources] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bannerSuccess, setBannerSuccess] = useState('');
  const [bannerError, setBannerError] = useState('');
  const loadSeqRef = useRef(0);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [createResourceOpen, setCreateResourceOpen] = useState(false);
  const [createWarehouseOpen, setCreateWarehouseOpen] = useState(false);
  const [showWarehouseMap, setShowWarehouseMap] = useState(false);
  const [createInventoryOpen, setCreateInventoryOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Warehouse form
  const [whForm, setWhForm] = useState({
    warehouseName: '',
    warehouseCode: '',
    address: '',
    latitude: null,
    longitude: null,
    areaId: '',
    contactPerson: '',
    contactNumber: '',
    description: '',
  });

  // Warehouse Inventory form
  const [invForm, setInvForm] = useState({
    warehouseId: '',
    resourceId: '',
    reorderLevel: '25',
  });

  // Stock In / Stock Out / Adjustment transaction form
  const [txnForm, setTxnForm] = useState({
    inventoryId: '',
    transactionType: 'StockIn',
    quantity: '',
    referenceNumber: '',
    notes: '',
  });

  // Warehouse transfer form
  const [transferForm, setTransferForm] = useState({
    sourceInventoryId: '',
    destinationInventoryId: '',
    quantity: '',
    referenceNumber: '',
    notes: '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      category: 'Food',
      condition: 'Good',
      unit: 'Units',
      availableQuantity: 100,
      reorderThreshold: 50,
    },
  });

  const loadData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      if (USE_MOCK_API) {
        const resList = await resourceService.list();
        if (loadSeqRef.current !== seq) return;
        setResources(resList);
        return;
      }

      const [resRes, whRes, invRes, txnRes, areaRes] = await Promise.allSettled([
        resourceService.list(),
        hasPermission('Warehouses.View') ? warehouseService.list() : Promise.resolve([]),
        hasPermission('Inventory.View') ? warehouseInventoryService.list() : Promise.resolve([]),
        hasPermission('Inventory.View') ? inventoryTransactionService.list() : Promise.resolve([]),
        hasPermission('Areas.View') ? areaService.list() : Promise.resolve([]),
      ]);

      if (loadSeqRef.current !== seq) return;

      if (resRes.status === 'rejected' && invRes.status === 'rejected') {
        setError(invRes.reason || resRes.reason);
      }

      setResources(resRes.status === 'fulfilled' ? resRes.value : []);
      setWarehouses(whRes.status === 'fulfilled' ? whRes.value : []);
      setInventories(invRes.status === 'fulfilled' ? invRes.value : []);
      setTransactions(txnRes.status === 'fulfilled' ? txnRes.value : []);
      setAreas(
        areaRes.status === 'fulfilled' && Array.isArray(areaRes.value)
          ? areaRes.value.filter((a) => a.isActive)
          : []
      );
    } catch (err) {
      if (loadSeqRef.current !== seq) return;
      setError(err);
    } finally {
      if (loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }, [hasPermission]);

  useEffect(() => {
    loadData();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadData]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          (activeTab === 'stock' && !USE_MOCK_API ? inventories.map((i) => i.resourceCategory) : resources.map((r) => r.category)).filter(Boolean)
        )
      ),
    [activeTab, inventories, resources]
  );

  const filteredResources = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (lowStockOnly && r.availableQuantity >= r.reorderThreshold) return false;
      if (q && !`${r.name} ${r.category} ${r.warehouseName} ${r.district}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [resources, search, categoryFilter, lowStockOnly]);

  const filteredInventories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventories.filter((inv) => {
      if (categoryFilter && inv.resourceCategory !== categoryFilter) return false;
      if (lowStockOnly && !inv.isLowStock) return false;
      if (q && !`${inv.resourceName} ${inv.resourceCategory} ${inv.warehouseName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [inventories, search, categoryFilter, lowStockOnly]);

  const filteredWarehouses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return warehouses.filter((w) => {
      if (q && !`${w.warehouseName} ${w.warehouseCode} ${w.areaName} ${w.address}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [warehouses, search]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (
        q &&
        !`${t.resourceName} ${t.warehouseName} ${t.transactionTypeLabel} ${t.referenceNumber} ${t.performedByUserName}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, search]);

  const onSubmitResource = async (values) => {
    if (saving) return;
    setSaving(true);
    setModalError('');
    try {
      await resourceService.create({ ...values, allocatedQuantity: 0 });
      setCreateResourceOpen(false);
      reset();
      setBannerSuccess('Resource catalogue record created.');
      setBannerError('');
      await loadData();
    } catch (err) {
      setModalError(err?.detail || err?.message || 'Failed to add resource.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!whForm.areaId) {
      setModalError('Select an active geographic area.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await warehouseService.create(whForm);
      setCreateWarehouseOpen(false);
      setWhForm({
        warehouseName: '',
        warehouseCode: '',
        address: '',
        areaId: '',
        contactPerson: '',
        contactNumber: '',
        description: '',
      });
      setBannerSuccess('Warehouse created successfully.');
      setBannerError('');
      await loadData();
    } catch (err) {
      setModalError(err?.detail || err?.message || 'Failed to create warehouse.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInventory = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setModalError('');
    try {
      await warehouseInventoryService.create(invForm);
      setCreateInventoryOpen(false);
      setInvForm({ warehouseId: '', resourceId: '', reorderLevel: '25' });
      setBannerSuccess('Warehouse inventory slot initialized (starting stock: 0). Use Stock In to record supply.');
      setBannerError('');
      await loadData();
    } catch (err) {
      setModalError(err?.detail || err?.message || 'Failed to create warehouse inventory record.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    if (saving) return;
    const qty = Number(txnForm.quantity);
    if (!txnForm.inventoryId || Number.isNaN(qty) || qty === 0) {
      setModalError('Select an inventory item and enter a valid non-zero quantity.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await inventoryTransactionService.create({
        inventoryId: Number(txnForm.inventoryId),
        transactionType: txnForm.transactionType,
        quantity: qty,
        referenceNumber: txnForm.referenceNumber,
        notes: txnForm.notes,
      });
      setTransactionModalOpen(false);
      setTxnForm({ inventoryId: '', transactionType: 'StockIn', quantity: '', referenceNumber: '', notes: '' });
      setBannerSuccess('Inventory transaction recorded and stock updated from backend.');
      setBannerError('');
      await loadData();
    } catch (err) {
      setModalError(err?.detail || err?.message || 'Failed to record inventory transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleTransferStock = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!transferForm.sourceInventoryId || !transferForm.destinationInventoryId) {
      setModalError('Select both source and destination warehouse inventories.');
      return;
    }
    if (transferForm.sourceInventoryId === transferForm.destinationInventoryId) {
      setModalError('Source and destination inventory records must be different.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await inventoryTransactionService.transfer(transferForm);
      setTransferModalOpen(false);
      setTransferForm({ sourceInventoryId: '', destinationInventoryId: '', quantity: '', referenceNumber: '', notes: '' });
      setBannerSuccess('Stock transfer completed and paired inventory transactions recorded.');
      setBannerError('');
      await loadData();
    } catch (err) {
      setModalError(err?.detail || err?.message || 'Failed to transfer stock.');
    } finally {
      setSaving(false);
    }
  };

  const resourceColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Resource Item',
        cell: ({ row }) => {
          const isLow = USE_MOCK_API && row.original.availableQuantity < row.original.reorderThreshold;
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
        accessorKey: 'unit',
        header: 'Unit of Measure',
        cell: ({ getValue }) => <span className="text-xs text-[#334155] font-medium">{getValue()}</span>,
      },
      ...(USE_MOCK_API
        ? [
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
              accessorKey: 'warehouseName',
              header: 'Warehouse / Location',
              cell: ({ row }) => (
                <div className="text-xs">
                  <div className="font-medium text-[#0F172A]">{row.original.warehouseName}</div>
                  <div className="text-[11px] text-[#64748B]">{row.original.district}</div>
                </div>
              ),
            },
          ]
        : []),
      {
        accessorKey: 'condition',
        header: USE_MOCK_API ? 'Condition' : 'Perishability / Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
    ],
    []
  );

  const inventoryColumns = useMemo(
    () => [
      {
        accessorKey: 'resourceName',
        header: 'Resource & Category',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
              {row.original.resourceName}
              {row.original.isLowStock && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800">
                  <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                  Low Stock
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#64748B]">{row.original.resourceCategory}</div>
          </div>
        ),
      },
      {
        accessorKey: 'warehouseName',
        header: 'Warehouse',
        cell: ({ getValue }) => <span className="text-xs font-medium text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'quantityAvailable',
        header: 'Quantity Available',
        cell: ({ getValue }) => <span className="font-semibold text-[#0F766E] tabular-nums">{Number(getValue()).toLocaleString()}</span>,
      },
      {
        accessorKey: 'reorderLevel',
        header: 'Reorder Level',
        cell: ({ getValue }) => <span className="text-xs text-[#475569] tabular-nums">{Number(getValue()).toLocaleString()}</span>,
      },
      {
        accessorKey: 'lastUpdatedAt',
        header: 'Last Updated',
        cell: ({ getValue }) => (
          <span className="text-xs text-[#64748B]">{getValue() ? new Date(getValue()).toLocaleString('en-LK') : '—'}</span>
        ),
      },
    ],
    []
  );

  const warehouseColumns = useMemo(
    () => [
      {
        accessorKey: 'warehouseCode',
        header: 'Code',
        cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'warehouseName',
        header: 'Warehouse',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.warehouseName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.address}</div>
          </div>
        ),
      },
      {
        accessorKey: 'areaName',
        header: 'Geographic Area',
        cell: ({ getValue }) => <span className="text-xs text-[#334155]">{getValue() || '—'}</span>,
      },
      {
        accessorKey: 'contactPerson',
        header: 'Contact',
        cell: ({ row }) => (
          <div className="text-xs text-[#475569]">
            <div>{row.original.contactPerson || '—'}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.contactNumber || ''}</div>
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Inactive'} />,
      },
    ],
    []
  );

  const transactionColumns = useMemo(
    () => [
      {
        accessorKey: 'inventoryTransactionId',
        header: 'Txn ID',
        cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">#{getValue()}</span>,
      },
      {
        accessorKey: 'transactionTypeLabel',
        header: 'Type',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'resourceName',
        header: 'Resource & Warehouse',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-semibold text-[#0F172A]">{row.original.resourceName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.warehouseName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'quantity',
        header: 'Delta (Prev -> New)',
        cell: ({ row }) => (
          <div className="text-xs tabular-nums">
            <span className="font-semibold text-[#0F766E]">{row.original.quantity}</span>
            <span className="text-[#64748B] ml-1.5">
              ({row.original.previousQuantity} &rarr; {row.original.newQuantity})
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'performedByUserName',
        header: 'Performed By',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="text-[#0F172A]">{row.original.performedByUserName || '—'}</div>
            {row.original.referenceNumber && <div className="text-[11px] font-mono text-[#64748B]">{row.original.referenceNumber}</div>}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Timestamp',
        cell: ({ getValue }) => (
          <span className="text-xs text-[#64748B]">{getValue() ? new Date(getValue()).toLocaleString('en-LK') : '—'}</span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Logistics, Warehouses & Resource Inventory"
        subtitle={
          USE_MOCK_API
            ? 'Monitor disaster relief supplies and mock warehouse stock levels.'
            : 'Live .NET 10 logistics management: warehouse stock levels, depots, stock in/out/adjustment/transfers, and resource catalogue.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!USE_MOCK_API && (
              <>
                <PermissionGate permission="Inventory.Manage">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError('');
                      setTransactionModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E]" />
                    Stock Movement
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalError('');
                      setTransferModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[#0F766E]" />
                    Transfer Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalError('');
                      setCreateInventoryOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0F766E]" />
                    Add Stock Slot
                  </button>
                </PermissionGate>
                <PermissionGate permission="Warehouses.Manage">
                  <button
                    type="button"
                    onClick={() => {
                      setModalError('');
                      setCreateWarehouseOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                    Add Warehouse
                  </button>
                </PermissionGate>
              </>
            )}
            <PermissionGate permission="Resources.Manage">
              <button
                type="button"
                onClick={() => {
                  setModalError('');
                  setCreateResourceOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Resource
              </button>
            </PermissionGate>
          </div>
        }
      />

      {bannerSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">{bannerSuccess}</div>
      )}
      {bannerError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#991B1B]">{bannerError}</div>
      )}

      {!USE_MOCK_API && (
        <div className="flex flex-wrap gap-2 mb-4 border-b border-[#E2E8F0] pb-2">
          {[
            { id: 'stock', label: `Warehouse Stock (${inventories.length})`, icon: Package },
            { id: 'warehouses', label: `Warehouses (${warehouses.length})`, icon: Building2 },
            { id: 'transactions', label: `Transactions (${transactions.length})`, icon: History },
            { id: 'catalogue', label: `Resource Catalogue (${resources.length})`, icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch('');
                  setCategoryFilter('');
                  setLowStockOnly(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <FilterPanel
        hasActiveFilters={Boolean(search || categoryFilter || lowStockOnly)}
        onReset={() => {
          setSearch('');
          setCategoryFilter('');
          setLowStockOnly(false);
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search..." className="w-full sm:w-64" />
        {(activeTab === 'stock' || activeTab === 'catalogue') && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        {(activeTab === 'stock' || USE_MOCK_API) && (
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A] cursor-pointer px-2">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="accent-[#0F766E]"
            />
            Low-stock only
          </label>
        )}
        {activeTab === 'warehouses' && !USE_MOCK_API && (
          <button
            type="button"
            onClick={() => setShowWarehouseMap((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border ${
              showWarehouseMap
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-slate-50'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            {showWarehouseMap ? 'Hide Map' : 'Warehouse Map'}
          </button>
        )}
      </FilterPanel>

      {activeTab === 'warehouses' && showWarehouseMap && !USE_MOCK_API && (
        <div className="mb-5 bg-white border border-[#E2E8F0] rounded-xl p-3">
          {(() => {
            const mapped = adaptCollectionToMapItems(filteredWarehouses, adaptWarehouseToMapItem);
            return (
              <MapView
                items={mapped.items}
                missingCoordinatesCount={mapped.missingCoordinatesCount}
                heightClass="h-[340px]"
                showSearch={false}
                showLayerControl={false}
                emptyMessage="No warehouses in the current view have valid coordinates."
              />
            );
          })()}
        </div>
      )}

      {activeTab === 'stock' && !USE_MOCK_API && (
        <DataTable data={filteredInventories} columns={inventoryColumns} loading={loading} error={error} onRetry={loadData} emptyTitle="No warehouse stock records yet" />
      )}
      {activeTab === 'warehouses' && !USE_MOCK_API && (
        <DataTable data={filteredWarehouses} columns={warehouseColumns} loading={loading} error={error} onRetry={loadData} emptyTitle="No warehouses registered yet" />
      )}
      {activeTab === 'transactions' && !USE_MOCK_API && (
        <DataTable data={filteredTransactions} columns={transactionColumns} loading={loading} error={error} onRetry={loadData} emptyTitle="No inventory transactions recorded yet" />
      )}
      {(activeTab === 'catalogue' || USE_MOCK_API) && (
        <DataTable data={filteredResources} columns={resourceColumns} loading={loading} error={error} onRetry={loadData} emptyTitle="No resources in catalogue" />
      )}

      {/* Create Resource Modal */}
      <Modal open={createResourceOpen} onClose={() => setCreateResourceOpen(false)} title="Add Resource Record" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmitResource)} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <FormField label="Resource Name" required error={errors.name?.message}>
                <input {...register('name')} placeholder="e.g., Hygiene Kits" className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg" />
              </FormField>
            </div>
            <FormField label="Category" required error={errors.category?.message}>
              <select {...register('category')} className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white">
                {['Food', 'Water & Sanitation', 'Medical', 'Shelter Supplies', 'Equipment'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
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
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {modalError && <p className="text-xs text-[#DC2626]">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateResourceOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white">
              {saving ? 'Saving...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Warehouse Modal */}
      <Modal open={createWarehouseOpen} onClose={() => setCreateWarehouseOpen(false)} title="Create Warehouse">
        <form onSubmit={handleCreateWarehouse} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Warehouse Name" required>
              <input
                required
                minLength={2}
                maxLength={200}
                value={whForm.warehouseName}
                onChange={(e) => setWhForm((p) => ({ ...p, warehouseName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
            <FormField label="Warehouse Code" required>
              <input
                required
                minLength={2}
                maxLength={50}
                value={whForm.warehouseCode}
                onChange={(e) => setWhForm((p) => ({ ...p, warehouseCode: e.target.value }))}
                placeholder="e.g., WH-MAT-01"
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
          </div>
          <FormField label="Geographic Area" required>
            <select
              required
              value={whForm.areaId}
              onChange={(e) => setWhForm((p) => ({ ...p, areaId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Select active area...</option>
              {areas.map((a) => (
                <option key={a.areaId} value={a.areaId}>
                  {a.areaName} ({a.areaType})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Address" required>
            <input
              required
              minLength={2}
              maxLength={500}
              value={whForm.address}
              onChange={(e) => setWhForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>
          <LocationPickerField
            label="Warehouse Coordinates (Optional)"
            latitude={whForm.latitude}
            longitude={whForm.longitude}
            onChange={({ latitude, longitude }) => setWhForm((p) => ({ ...p, latitude, longitude }))}
            onAddressSuggested={(addr) => setWhForm((p) => ({ ...p, address: p.address || addr }))}
            entityType={MAP_ENTITY_TYPES.WAREHOUSE}
            heightClass="h-[190px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person">
              <input
                maxLength={150}
                value={whForm.contactPerson}
                onChange={(e) => setWhForm((p) => ({ ...p, contactPerson: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
            <FormField label="Contact Number">
              <input
                maxLength={20}
                value={whForm.contactNumber}
                onChange={(e) => setWhForm((p) => ({ ...p, contactNumber: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
          </div>
          {modalError && <p className="text-xs text-[#DC2626]">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateWarehouseOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white">
              {saving ? 'Saving...' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Warehouse Inventory Slot Modal */}
      <Modal open={createInventoryOpen} onClose={() => setCreateInventoryOpen(false)} title="Initialize Warehouse Stock Slot">
        <form onSubmit={handleCreateInventory} className="space-y-3.5">
          <FormField label="Warehouse" required>
            <select
              required
              value={invForm.warehouseId}
              onChange={(e) => setInvForm((p) => ({ ...p, warehouseId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Select warehouse...</option>
              {warehouses.filter((w) => w.isActive).map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.warehouseName} ({w.warehouseCode})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Resource" required>
            <select
              required
              value={invForm.resourceId}
              onChange={(e) => setInvForm((p) => ({ ...p, resourceId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Select resource...</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category} • {r.unit})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Reorder Level" required>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={invForm.reorderLevel}
              onChange={(e) => setInvForm((p) => ({ ...p, reorderLevel: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>
          {modalError && <p className="text-xs text-[#DC2626]">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateInventoryOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white">
              {saving ? 'Saving...' : 'Initialize Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock In / Stock Out / Adjustment Modal */}
      <Modal open={transactionModalOpen} onClose={() => setTransactionModalOpen(false)} title="Record Stock Movement">
        <form onSubmit={handleRecordTransaction} className="space-y-3.5">
          <FormField label="Warehouse Stock Item" required>
            <select
              required
              value={txnForm.inventoryId}
              onChange={(e) => setTxnForm((p) => ({ ...p, inventoryId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Select inventory...</option>
              {inventories.map((inv) => (
                <option key={inv.inventoryId} value={inv.inventoryId}>
                  {inv.resourceName} — {inv.warehouseName} (Current: {inv.quantityAvailable})
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Transaction Type" required>
              <select
                value={txnForm.transactionType}
                onChange={(e) => setTxnForm((p) => ({ ...p, transactionType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
              >
                <option value="StockIn">Stock In (+)</option>
                <option value="StockOut">Stock Out (-)</option>
                <option value="Adjustment">Adjustment (+/-)</option>
              </select>
            </FormField>
            <FormField label="Quantity" required>
              <input
                type="number"
                step="0.01"
                required
                value={txnForm.quantity}
                onChange={(e) => setTxnForm((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
          </div>
          <FormField label="Reference Number (Optional)">
            <input
              maxLength={100}
              value={txnForm.referenceNumber}
              onChange={(e) => setTxnForm((p) => ({ ...p, referenceNumber: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>
          <FormField label="Notes (Optional)">
            <textarea
              rows={2}
              maxLength={1000}
              value={txnForm.notes}
              onChange={(e) => setTxnForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>
          {modalError && <p className="text-xs text-[#DC2626]">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTransactionModalOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white">
              {saving ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Warehouse Transfer Modal */}
      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Stock Between Warehouses">
        <form onSubmit={handleTransferStock} className="space-y-3.5">
          <FormField label="Source Inventory" required>
            <select
              required
              value={transferForm.sourceInventoryId}
              onChange={(e) => setTransferForm((p) => ({ ...p, sourceInventoryId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Select source...</option>
              {inventories.map((inv) => (
                <option key={inv.inventoryId} value={inv.inventoryId}>
                  {inv.resourceName} — {inv.warehouseName} (Avail: {inv.quantityAvailable})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Destination Inventory" required>
            <select
              required
              value={transferForm.destinationInventoryId}
              onChange={(e) => setTransferForm((p) => ({ ...p, destinationInventoryId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Select destination (same resource)...</option>
              {inventories.map((inv) => (
                <option key={inv.inventoryId} value={inv.inventoryId}>
                  {inv.resourceName} — {inv.warehouseName} (Avail: {inv.quantityAvailable})
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity" required>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={transferForm.quantity}
                onChange={(e) => setTransferForm((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
            <FormField label="Reference Number (Optional)">
              <input
                maxLength={100}
                value={transferForm.referenceNumber}
                onChange={(e) => setTransferForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
          </div>
          <FormField label="Notes (Optional)">
            <textarea
              rows={2}
              maxLength={1000}
              value={transferForm.notes}
              onChange={(e) => setTransferForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>
          {modalError && <p className="text-xs text-[#DC2626]">{modalError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTransferModalOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white">
              {saving ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
