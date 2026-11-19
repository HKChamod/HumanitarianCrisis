import { useEffect, useMemo, useState } from 'react';
import { Eye, Power, Shield } from 'lucide-react';
import { userService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConfirmationDialog, Drawer } from '../../../components/common/Modal';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await userService.list());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allRoles = useMemo(() => Array.from(new Set(users.flatMap((u) => u.roles))), [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === 'Active' && !u.isActive) return false;
      if (statusFilter === 'Inactive' && u.isActive) return false;
      if (roleFilter && !u.roles.includes(roleFilter)) return false;
      if (q) {
        const hay = `${u.fullName} ${u.email} ${u.department || ''} ${u.roles.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, search, statusFilter, roleFilter]);

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    setSaving(true);
    try {
      const updated = await userService.toggleActive(toggleTarget.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (selectedUser?.id === updated.id) setSelectedUser(updated);
      setToggleTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'fullName',
        header: 'User',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.fullName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'department',
        header: 'Department / Org',
        cell: ({ getValue }) => <span className="text-xs text-[#475569]">{getValue() || '—'}</span>,
      },
      {
        id: 'roles',
        header: 'System Roles',
        accessorFn: (row) => row.roles.join(', '),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-teal-200 text-[11px] font-medium text-[#0F766E]">
                <Shield className="w-3 h-3" />
                {r}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue() ? 'Active' : 'Inactive'} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedUser(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F766E] bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100/70"
            >
              <Eye className="w-3.5 h-3.5" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => setToggleTarget(row.original)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border ${
                row.original.isActive
                  ? 'text-[#DC2626] bg-red-50 border-red-200 hover:bg-red-100'
                  : 'text-[#16A34A] bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {row.original.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage registered system accounts, inspect assigned roles, and control account activation status."
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter || roleFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
          setRoleFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, email, department..." className="w-full sm:w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Roles</option>
          {allRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </FilterPanel>

      <DataTable data={filteredUsers} columns={columns} loading={loading} error={error} onRetry={loadData} />

      <Drawer
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.fullName || 'User Profile'}
        subtitle={selectedUser?.email}
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <StatusBadge status={selectedUser.isActive ? 'Active' : 'Inactive'} />
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
              <div>
                <div className="text-[#64748B]">User ID</div>
                <div className="font-mono font-semibold text-[#0F172A] mt-0.5">{selectedUser.id}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Phone</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedUser.phoneNumber || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Department</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedUser.department || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Created At</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">
                  {new Date(selectedUser.createdAt).toLocaleDateString('en-LK')}
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-[#0F172A] mb-2">Assigned System Roles</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedUser.roles.map((r) => (
                  <span key={r} className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#0F766E] font-medium">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmationDialog
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
        loading={saving}
        title={toggleTarget?.isActive ? 'Deactivate User Account' : 'Activate User Account'}
        message={
          toggleTarget
            ? `Are you sure you want to ${toggleTarget.isActive ? 'deactivate' : 'activate'} ${toggleTarget.fullName} (${toggleTarget.email})?`
            : ''
        }
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleTarget?.isActive ? 'danger' : 'primary'}
      />
    </div>
  );
}
