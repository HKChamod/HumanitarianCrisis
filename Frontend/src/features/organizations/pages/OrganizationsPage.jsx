import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Eye, Mail, Phone, Users, XCircle } from 'lucide-react';
import { organizationService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConfirmationDialog, Drawer } from '../../../components/common/Modal';
import { PermissionGate } from '../../../app/providers/AuthProvider';

export function OrganizationsPage({ mode = 'all' }) {
  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(mode === 'applications' ? 'Pending' : '');
  const [typeFilter, setTypeFilter] = useState('');

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatusFilter(mode === 'applications' ? 'Pending' : '');
  }, [mode]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgs, mems] = await Promise.all([
        organizationService.list(),
        organizationService.listMemberships(),
      ]);
      setOrganizations(orgs);
      setMemberships(mems);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return organizations.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (typeFilter && o.type !== typeFilter) return false;
      if (q) {
        const hay = `${o.name} ${o.registrationNumber} ${o.district} ${o.contactPerson}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [organizations, search, statusFilter, typeFilter]);

  const filteredMemberships = useMemo(() => {
    const q = search.trim().toLowerCase();
    return memberships.filter((m) => {
      if (!q) return true;
      return `${m.userName} ${m.organizationName} ${m.scopedRole}`.toLowerCase().includes(q);
    });
  }, [memberships, search]);

  const handleConfirmOrgStatus = async () => {
    if (!confirmAction) return;
    setSaving(true);
    try {
      const updated = await organizationService.updateStatus(confirmAction.org.id, confirmAction.nextStatus);
      setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrg?.id === updated.id) setSelectedOrg(updated);
      setConfirmAction(null);
    } finally {
      setSaving(false);
    }
  };

  const orgColumns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Organization',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.name}</div>
            <div className="text-[11px] text-[#64748B] font-mono">{row.original.registrationNumber}</div>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => <span className="text-xs text-[#475569]">{getValue()}</span>,
      },
      {
        accessorKey: 'district',
        header: 'Location',
        cell: ({ row }) => (
          <div className="text-xs text-[#475569]">
            <div className="font-medium text-[#0F172A]">{row.original.district}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.province}</div>
          </div>
        ),
      },
      {
        accessorKey: 'memberCount',
        header: 'Members',
        cell: ({ getValue }) => <span className="text-xs font-semibold text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedOrg(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F766E] bg-[#F0FDFA] border border-teal-200 hover:bg-teal-100/70"
            >
              <Eye className="w-3.5 h-3.5" />
              Profile
            </button>
            {row.original.status === 'Pending' && (
              <PermissionGate permission="Organizations.Manage">
                <button
                  type="button"
                  onClick={() => setConfirmAction({ org: row.original, nextStatus: 'Active' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve
                </button>
              </PermissionGate>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const membershipColumns = useMemo(
    () => [
      {
        accessorKey: 'userName',
        header: 'Member',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.userName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.userEmail}</div>
          </div>
        ),
      },
      {
        accessorKey: 'organizationName',
        header: 'Organization',
        cell: ({ getValue }) => <span className="text-xs font-medium text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'scopedRole',
        header: 'Scoped Role',
        cell: ({ getValue }) => (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-[#475569]">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'joinedAt',
        header: 'Joined',
        cell: ({ getValue }) => (
          <span className="text-xs text-[#64748B]">{new Date(getValue()).toLocaleDateString('en-LK')}</span>
        ),
      },
    ],
    []
  );

  const title =
    mode === 'applications'
      ? 'Organization Applications'
      : mode === 'memberships'
        ? 'Organization Memberships'
        : 'Organization Management';

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={
          mode === 'memberships'
            ? 'Review organization-scoped user memberships and role assignments across partner organizations.'
            : 'Verify partner organizations, review registration applications, and manage operational status.'
        }
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || (mode !== 'applications' && statusFilter) || typeFilter)}
        onReset={() => {
          setSearch('');
          if (mode !== 'applications') setStatusFilter('');
          setTypeFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, registration, district..." className="w-full sm:w-64" />
        {mode === 'all' && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="">All Statuses</option>
              {['Active', 'Pending', 'Suspended', 'Rejected'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="">All Types</option>
              {['NGO', 'Government Department', 'Hospital', 'Relief Partner', 'Volunteer Network'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </>
        )}
      </FilterPanel>

      {mode === 'memberships' ? (
        <DataTable data={filteredMemberships} columns={membershipColumns} loading={loading} error={error} onRetry={loadData} />
      ) : (
        <DataTable data={filteredOrgs} columns={orgColumns} loading={loading} error={error} onRetry={loadData} />
      )}

      {/* Organization Profile Drawer */}
      <Drawer
        open={Boolean(selectedOrg)}
        onClose={() => setSelectedOrg(null)}
        title={selectedOrg?.name || 'Organization Profile'}
        subtitle={selectedOrg ? `${selectedOrg.type} • ${selectedOrg.registrationNumber}` : ''}
        footer={
          selectedOrg && (
            <PermissionGate permission="Organizations.Manage">
              <div className="flex items-center gap-2">
                {selectedOrg.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ org: selectedOrg, nextStatus: 'Rejected' })}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction({ org: selectedOrg, nextStatus: 'Active' })}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve Organization
                    </button>
                  </>
                )}
                {selectedOrg.status === 'Active' && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction({ org: selectedOrg, nextStatus: 'Suspended' })}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200"
                  >
                    Suspend Organization
                  </button>
                )}
                {selectedOrg.status === 'Suspended' && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction({ org: selectedOrg, nextStatus: 'Active' })}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white"
                  >
                    Reactivate Organization
                  </button>
                )}
              </div>
            </PermissionGate>
          )
        }
      >
        {selectedOrg && (
          <div className="space-y-4 text-xs">
            <StatusBadge status={selectedOrg.status} />

            <div className="p-4 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
                <Building2 className="w-4 h-4 text-[#0F766E]" />
                Primary Contact Information
              </div>
              <div className="text-[#475569]">Contact Person: <strong className="text-[#0F172A]">{selectedOrg.contactPerson}</strong></div>
              <div className="flex items-center gap-1.5 text-[#475569]">
                <Mail className="w-3.5 h-3.5 text-[#0F766E]" />
                {selectedOrg.contactEmail}
              </div>
              <div className="flex items-center gap-1.5 text-[#475569]">
                <Phone className="w-3.5 h-3.5 text-[#0F766E]" />
                {selectedOrg.contactPhone}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0]">
              <div>
                <div className="text-[#64748B]">District</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedOrg.district}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Province</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedOrg.province}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Registered Members</div>
                <div className="font-semibold text-[#0F172A] mt-0.5 inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                  {selectedOrg.memberCount}
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Active Crises</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedOrg.activeCrisisCount}</div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmationDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmOrgStatus}
        loading={saving}
        title="Confirm Organization Status Update"
        message={
          confirmAction
            ? `Are you sure you want to change "${confirmAction.org.name}" to ${confirmAction.nextStatus}?`
            : ''
        }
        confirmLabel={`Set ${confirmAction?.nextStatus || ''}`}
        variant={confirmAction?.nextStatus === 'Rejected' || confirmAction?.nextStatus === 'Suspended' ? 'danger' : 'primary'}
      />
    </div>
  );
}
