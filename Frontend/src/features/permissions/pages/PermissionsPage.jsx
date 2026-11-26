import { useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { permissionService, roleService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';

export function PermissionsPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [permsResult, rolesResult] = await Promise.allSettled([
        permissionService.list(),
        roleService.list(),
      ]);

      if (permsResult.status === 'rejected') {
        throw permsResult.reason;
      }

      const rawPerms = Array.isArray(permsResult.value) ? permsResult.value : [];
      const roles = rolesResult.status === 'fulfilled' && Array.isArray(rolesResult.value)
        ? rolesResult.value
        : [];

      const rolesByPermission = new Map();
      roles.forEach((role) => {
        const roleName = role?.name || role?.roleName;
        if (!roleName) return;
        const rolePerms = Array.isArray(role?.permissions) ? role.permissions : [];
        rolePerms.forEach((permName) => {
          if (!rolesByPermission.has(permName)) {
            rolesByPermission.set(permName, []);
          }
          rolesByPermission.get(permName).push(roleName);
        });
      });

      const enriched = rawPerms.map((p) => {
        const code = p?.code || p?.permissionName || p?.name || '';
        const existingRoles = Array.isArray(p?.assignedRoles) ? p.assignedRoles : [];
        const derivedRoles = rolesByPermission.get(code) || [];
        const assignedRoles = Array.from(new Set([...existingRoles, ...derivedRoles]));
        return {
          ...p,
          code,
          name: p?.name || code,
          category: p?.category || p?.module || 'General',
          description: p?.description || '',
          assignedRoles,
        };
      });

      setPermissions(enriched);
    } catch (err) {
      setError(err);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(permissions.map((p) => p.category || 'General'))),
    [permissions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((p) => {
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (q && !`${p.code} ${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [permissions, search, categoryFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Permission Code',
        cell: ({ getValue }) => (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#0F766E]">
            <Lock className="w-3.5 h-3.5" />
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.name}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.description || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ getValue }) => (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-[#475569]">{getValue() || 'General'}</span>
        ),
      },
      {
        id: 'assignedRoles',
        header: 'Assigned Roles',
        accessorFn: (row) => (Array.isArray(row?.assignedRoles) ? row.assignedRoles : []).join(', '),
        cell: ({ row }) => {
          const rolesList = Array.isArray(row.original?.assignedRoles) ? row.original.assignedRoles : [];
          if (rolesList.length === 0) {
            return <span className="text-[11px] text-[#94A3B8]">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {rolesList.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-[#F0FDFA] border border-teal-200 text-[11px] text-[#0F766E] font-medium">
                  {r}
                </span>
              ))}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Permission Catalogue"
        subtitle="System-wide RBAC permissions and role mappings. All protected endpoints are independently validated by the .NET 10 backend."
      />

      <div className="mb-4 p-3.5 rounded-xl bg-[#F0FDFA] border border-teal-200 flex items-center gap-2.5 text-xs text-[#134E4A]">
        <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
        <span>
          <strong>Security Policy:</strong> Permission visibility in the UI is for operational clarity only. Privilege
          escalation cannot occur from the frontend; every API policy is enforced server-side.
        </span>
      </div>

      <FilterPanel
        hasActiveFilters={Boolean(search || categoryFilter)}
        onReset={() => {
          setSearch('');
          setCategoryFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search permission code or name..." className="w-full sm:w-64" />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </FilterPanel>

      <DataTable data={filtered} columns={columns} loading={loading} error={error} onRetry={loadData} />
    </div>
  );
}
