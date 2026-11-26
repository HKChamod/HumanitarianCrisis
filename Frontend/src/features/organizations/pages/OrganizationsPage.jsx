import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Eye, Mail, Map as MapIcon, Phone, Plus, Shield, UserPlus, Users, XCircle } from 'lucide-react';
import { organizationService, permissionService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConfirmationDialog, Drawer, Modal } from '../../../components/common/Modal';
import { PermissionGate } from '../../../app/providers/AuthProvider';
import {
  LocationPickerField,
  MAP_ENTITY_TYPES,
  MapView,
  adaptCollectionToMapItems,
  adaptOrganizationToMapItem,
} from '../../../shared/maps';

const ORG_ADMIN_DEFAULT_PERMISSION_NAMES = [
  'Organizations.View',
  'Organizations.Manage',
  'Organizations.ApproveMembers',
  'Resources.View',
  'Resources.Manage',
  'Resources.Allocate',
  'Reports.View',
];

const GLOBAL_ONLY_PERMISSIONS = new Set([
  'Users.View',
  'Users.Manage',
  'Roles.Manage',
  'Permissions.View',
  'AuditLogs.View',
]);

export function OrganizationsPage({ mode = 'all' }) {
  const [organizations, setOrganizations] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(mode === 'applications' ? 'Pending' : '');
  const [typeFilter, setTypeFilter] = useState('');

  const [selectedOrg, setSelectedOrg] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [orgMembers, setOrgMembers] = useState([]);
  const [orgRoles, setOrgRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [drawerSuccess, setDrawerSuccess] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [busyMembershipId, setBusyMembershipId] = useState(null);
  const [selectedRoleByMembership, setSelectedRoleByMembership] = useState({});
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    roleName: 'OrganizationAdmin',
    description: 'Organization-scoped administrator role',
    permissionIds: [],
  });
  const [creatingRole, setCreatingRole] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'NGO',
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
    district: '',
    latitude: null,
    longitude: null,
    description: '',
  });
  const [createError, setCreateError] = useState('');
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

  const loadOrgDetails = async (org) => {
    if (!org) return;
    setDrawerLoading(true);
    setDrawerError('');
    try {
      const [membersRes, rolesRes, permsRes] = await Promise.allSettled([
        organizationService.getMembers(org.id, org.name),
        organizationService.getRoles(org.id),
        permissionCatalog.length > 0
          ? Promise.resolve(permissionCatalog)
          : permissionService.list(),
      ]);

      setOrgMembers(membersRes.status === 'fulfilled' ? membersRes.value : []);
      setOrgRoles(rolesRes.status === 'fulfilled' ? rolesRes.value : []);
      if (permsRes.status === 'fulfilled') {
        const filtered = (Array.isArray(permsRes.value) ? permsRes.value : []).filter(
          (p) => !GLOBAL_ONLY_PERMISSIONS.has(p.permissionName)
        );
        setPermissionCatalog(filtered);
      }

      if (membersRes.status === 'rejected') {
        setDrawerError(membersRes.reason?.detail || membersRes.reason?.message || 'Unable to load organization members.');
      } else if (rolesRes.status === 'rejected') {
        setDrawerError(rolesRes.reason?.detail || rolesRes.reason?.message || 'Unable to load organization roles.');
      } else if (permsRes.status === 'rejected') {
        setDrawerError(permsRes.reason?.detail || permsRes.reason?.message || 'Unable to load permissions catalog.');
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    if (selectedOrg) {
      setDrawerTab('overview');
      setDrawerError('');
      setDrawerSuccess('');
      setAddMemberEmail('');
      setCreateRoleOpen(false);
      loadOrgDetails(selectedOrg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrg?.id]);

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !addMemberEmail.trim()) return;
    setAddingMember(true);
    setDrawerError('');
    setDrawerSuccess('');
    try {
      await organizationService.addMember(selectedOrg.id, addMemberEmail);
      setAddMemberEmail('');
      setDrawerSuccess('Member added with Pending status. Approve the membership to grant organization access.');
    } catch (err) {
      setDrawerError(err?.detail || err?.message || 'Unable to add member.');
      setAddingMember(false);
      return;
    }

    try {
      await loadOrgDetails(selectedOrg);
      await loadData();
    } catch {
      // Add Member already succeeded; refresh errors are handled inside loadOrgDetails
    } finally {
      setAddingMember(false);
    }
  };

  const handleMembershipDecision = async (membershipId, decision) => {
    if (!selectedOrg) return;
    setBusyMembershipId(membershipId);
    setDrawerError('');
    setDrawerSuccess('');
    try {
      if (decision === 'approve') {
        await organizationService.approveMembership(selectedOrg.id, membershipId);
        setDrawerSuccess('Membership approved.');
      } else {
        await organizationService.rejectMembership(selectedOrg.id, membershipId);
        setDrawerSuccess('Membership rejected.');
      }
      await loadOrgDetails(selectedOrg);
      await loadData();
    } catch (err) {
      setDrawerError(err?.detail || err?.message || `Unable to ${decision} membership.`);
    } finally {
      setBusyMembershipId(null);
    }
  };

  const handleOpenCreateRole = () => {
    const defaultIds = permissionCatalog
      .filter((p) => ORG_ADMIN_DEFAULT_PERMISSION_NAMES.includes(p.permissionName))
      .map((p) => p.permissionId);
    setNewRoleForm({
      roleName: 'OrganizationAdmin',
      description: `Organization-scoped administrator for ${selectedOrg?.name || 'organization'}`,
      permissionIds: defaultIds,
    });
    setDrawerError('');
    setCreateRoleOpen(true);
  };

  const toggleNewRolePermission = (permissionId) => {
    setNewRoleForm((prev) => {
      const exists = prev.permissionIds.includes(permissionId);
      return {
        ...prev,
        permissionIds: exists
          ? prev.permissionIds.filter((id) => id !== permissionId)
          : [...prev.permissionIds, permissionId],
      };
    });
  };

  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !newRoleForm.roleName.trim()) return;
    setCreatingRole(true);
    setDrawerError('');
    setDrawerSuccess('');
    try {
      await organizationService.createRole(selectedOrg.id, {
        roleName: newRoleForm.roleName.trim(),
        description: newRoleForm.description.trim() || null,
        permissionIds: newRoleForm.permissionIds,
      });
      setCreateRoleOpen(false);
      setDrawerSuccess(`Organization role "${newRoleForm.roleName.trim()}" created.`);
      await loadOrgDetails(selectedOrg);
    } catch (err) {
      setDrawerError(err?.detail || err?.message || 'Unable to create organization role.');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleAssignMemberRole = async (membershipId) => {
    const roleId = Number(selectedRoleByMembership[membershipId]);
    if (!selectedOrg || !roleId) return;
    setBusyMembershipId(membershipId);
    setDrawerError('');
    setDrawerSuccess('');
    try {
      await organizationService.assignMemberRoles(selectedOrg.id, membershipId, [roleId]);
      setDrawerSuccess('Organization role assigned to member.');
      await loadOrgDetails(selectedOrg);
      await loadData();
    } catch (err) {
      setDrawerError(err?.detail || err?.message || 'Unable to assign role.');
    } finally {
      setBusyMembershipId(null);
    }
  };

  const handleCreateOrganization = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.type.trim()) {
      setCreateError('Organization name and type are required.');
      return;
    }
    setSaving(true);
    setCreateError('');
    try {
      const created = await organizationService.create(createForm);
      setOrganizations((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateForm({
        name: '',
        type: 'NGO',
        registrationNumber: '',
        contactEmail: '',
        contactPhone: '',
        district: '',
        description: '',
      });
    } catch (err) {
      setCreateError(err?.detail || err?.message || 'Unable to create organization.');
    } finally {
      setSaving(false);
    }
  };

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
        actions={
          mode === 'all' ? (
            <PermissionGate permission="Organizations.Manage">
              <button
                type="button"
                onClick={() => {
                  setCreateError('');
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                New Organization
              </button>
            </PermissionGate>
          ) : null
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
        {mode !== 'memberships' && (
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
        )}
      </FilterPanel>

      {showMap && mode !== 'memberships' && (
        <div className="mb-5 bg-white border border-[#E2E8F0] rounded-xl p-3">
          {(() => {
            const mapped = adaptCollectionToMapItems(filteredOrgs, adaptOrganizationToMapItem);
            return (
              <MapView
                items={mapped.items}
                missingCoordinatesCount={mapped.missingCoordinatesCount}
                onSelectItem={(item) => {
                  const found = filteredOrgs.find((o) => `org-${o.id}` === item?.id);
                  if (found) setSelectedOrg(found);
                }}
                heightClass="h-[360px]"
                showSearch={false}
                showLayerControl={false}
                emptyMessage="No organizations in the current view have valid coordinates."
              />
            );
          })()}
        </div>
      )}

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
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={selectedOrg.status} />
              <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-slate-50 p-0.5">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'members', label: `Members (${orgMembers.length})` },
                  { key: 'roles', label: `Roles (${orgRoles.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDrawerTab(tab.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      drawerTab === tab.key
                        ? 'bg-white text-[#0F766E] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {drawerError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
                {drawerError}
              </div>
            )}
            {drawerSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                {drawerSuccess}
              </div>
            )}

            {drawerTab === 'overview' && (
              <>
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
              </>
            )}

            {drawerTab === 'members' && (
              <div className="space-y-3">
                <PermissionGate permission="Organizations.ApproveMembers">
                  <form onSubmit={handleAddMemberSubmit} className="p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2">
                    <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-[#0F766E]" />
                      Add Member by Email
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={addMemberEmail}
                        onChange={(e) => setAddMemberEmail(e.target.value)}
                        placeholder="e.g., admin@test.com"
                        className="flex-1 px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg"
                      />
                      <button
                        type="submit"
                        disabled={addingMember}
                        className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold hover:bg-[#0D9488] disabled:opacity-60"
                      >
                        {addingMember ? 'Adding...' : 'Add Member'}
                      </button>
                    </div>
                  </form>
                </PermissionGate>

                {drawerLoading ? (
                  <div className="p-4 text-center text-[#64748B]">Loading organization members...</div>
                ) : orgMembers.length === 0 ? (
                  <div className="p-4 text-center rounded-xl border border-dashed border-[#CBD5E1] text-[#64748B]">
                    No members or pending membership requests for this organization yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgMembers.map((m) => {
                      const membershipId = m.membershipId ?? m.id;
                      const isPending = String(m.status).toLowerCase() === 'pending';
                      const isApproved = String(m.status).toLowerCase() === 'approved';
                      return (
                        <div key={m.id} className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-[#0F172A]">{m.userName}</div>
                              <div className="text-[11px] text-[#64748B]">{m.userEmail}</div>
                            </div>
                            <StatusBadge status={m.status} />
                          </div>

                          <div className="text-[11px] text-[#475569]">
                            Roles: <strong className="text-[#0F172A]">{m.scopedRole || 'Member'}</strong>
                          </div>

                          {isPending && (
                            <PermissionGate permission="Organizations.ApproveMembers">
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={busyMembershipId === membershipId}
                                  onClick={() => handleMembershipDecision(membershipId, 'approve')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0F766E] text-white font-semibold"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busyMembershipId === membershipId}
                                  onClick={() => handleMembershipDecision(membershipId, 'reject')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-[#DC2626] border border-red-200 font-semibold"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            </PermissionGate>
                          )}

                          {isApproved && orgRoles.length > 0 && (
                            <PermissionGate permission="Organizations.Manage">
                              <div className="flex items-center gap-2 pt-1">
                                <select
                                  value={selectedRoleByMembership[membershipId] ?? ''}
                                  onChange={(e) =>
                                    setSelectedRoleByMembership((prev) => ({
                                      ...prev,
                                      [membershipId]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 px-2 py-1 bg-white border border-[#CBD5E1] rounded-md"
                                >
                                  <option value="">Select organization role...</option>
                                  {orgRoles.map((r) => (
                                    <option key={r.roleId} value={r.roleId}>
                                      {r.roleName}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  disabled={!selectedRoleByMembership[membershipId] || busyMembershipId === membershipId}
                                  onClick={() => handleAssignMemberRole(membershipId)}
                                  className="px-2.5 py-1 rounded-md bg-[#0F766E] text-white font-semibold disabled:opacity-50"
                                >
                                  Assign Role
                                </button>
                              </div>
                            </PermissionGate>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'roles' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                    Organization-Scoped Roles
                  </div>
                  <PermissionGate permission="Organizations.Manage">
                    <button
                      type="button"
                      onClick={handleOpenCreateRole}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Role
                    </button>
                  </PermissionGate>
                </div>

                {createRoleOpen && (
                  <form onSubmit={handleCreateRoleSubmit} className="p-3 rounded-xl bg-slate-50 border border-[#CBD5E1] space-y-2.5">
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">Role Name *</label>
                      <input
                        type="text"
                        required
                        value={newRoleForm.roleName}
                        onChange={(e) => setNewRoleForm((p) => ({ ...p, roleName: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg"
                        placeholder="OrganizationAdmin"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1">Description</label>
                      <input
                        type="text"
                        value={newRoleForm.description}
                        onChange={(e) => setNewRoleForm((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0F172A] mb-1">
                        Organization-Scoped Permissions ({newRoleForm.permissionIds.length} selected)
                      </div>
                      <div className="max-h-44 overflow-y-auto grid grid-cols-1 gap-1 p-2 bg-white border border-[#E2E8F0] rounded-lg">
                        {permissionCatalog.map((perm) => (
                          <label key={perm.permissionId} className="flex items-center gap-2 cursor-pointer text-[11px] text-[#334155]">
                            <input
                              type="checkbox"
                              checked={newRoleForm.permissionIds.includes(perm.permissionId)}
                              onChange={() => toggleNewRolePermission(perm.permissionId)}
                            />
                            <span className="font-mono">{perm.permissionName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCreateRoleOpen(false)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingRole}
                        className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold"
                      >
                        {creatingRole ? 'Creating...' : 'Save Role'}
                      </button>
                    </div>
                  </form>
                )}

                {drawerLoading ? (
                  <div className="p-4 text-center text-[#64748B]">Loading organization roles...</div>
                ) : orgRoles.length === 0 ? (
                  <div className="p-4 text-center rounded-xl border border-dashed border-[#CBD5E1] text-[#64748B]">
                    No organization-scoped roles created yet. Click <strong>Create Role</strong> to add <code>OrganizationAdmin</code>.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgRoles.map((role) => (
                      <div key={role.roleId} className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#0F172A]">{role.roleName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200 font-semibold">
                            Org-Scoped
                          </span>
                        </div>
                        {role.description && <div className="text-[11px] text-[#64748B]">{role.description}</div>}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(role.permissions || []).map((p) => (
                            <span
                              key={p.permissionId}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-[#334155]"
                            >
                              {p.permissionName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Register New Organization"
      >
        <form onSubmit={handleCreateOrganization} className="space-y-3 text-xs">
          {createError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {createError}
            </div>
          )}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Organization Name *</label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg"
              placeholder="e.g., TEST"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Type *</label>
              <input
                type="text"
                required
                value={createForm.type}
                onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg"
                placeholder="NGO / Government"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Registration Number</label>
              <input
                type="text"
                value={createForm.registrationNumber}
                onChange={(e) => setCreateForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Official Email</label>
              <input
                type="email"
                value={createForm.contactEmail}
                onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Phone</label>
              <input
                type="text"
                value={createForm.contactPhone}
                onChange={(e) => setCreateForm((p) => ({ ...p, contactPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Address / District</label>
            <input
              type="text"
              value={createForm.district}
              onChange={(e) => setCreateForm((p) => ({ ...p, district: e.target.value }))}
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <LocationPickerField
            label="Organization Headquarters Coordinates (Optional)"
            latitude={createForm.latitude}
            longitude={createForm.longitude}
            onChange={({ latitude, longitude }) => setCreateForm((p) => ({ ...p, latitude, longitude }))}
            onAddressSuggested={(addr) =>
              setCreateForm((p) => ({ ...p, district: p.district || addr }))
            }
            entityType={MAP_ENTITY_TYPES.ORGANIZATION}
            heightClass="h-[200px]"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#0F766E] text-white font-semibold"
            >
              {saving ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
