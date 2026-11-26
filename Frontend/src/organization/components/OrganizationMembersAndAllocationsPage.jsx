import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { organizationOperationsService } from '../services/organizationOperationsService';
import {
  IconUsers,
  IconPackage,
  IconCheckCircle,
  IconAlertTriangle,
  IconShieldCheck,
} from './Icons';

export const OrganizationMembersAndAllocationsPage = () => {
  const { activeOrganizationId, activeOrganizationAccess, orgRoles, refreshMemberships } =
    useOrganization();

  const [membersState, setMembersState] = useState({
    loading: true,
    items: [],
    forbidden: false,
    error: null,
  });
  const [rolesState, setRolesState] = useState({
    loading: true,
    items: [],
    forbidden: false,
  });
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRoleByMembership, setSelectedRoleByMembership] = useState({});
  const [allocationsState, setAllocationsState] = useState({
    loading: true,
    items: [],
    forbidden: false,
    scope: 'all',
    error: null,
  });
  const [inventoryState, setInventoryState] = useState({
    loading: true,
    items: [],
    forbidden: false,
    error: null,
  });
  const [actionFeedback, setActionFeedback] = useState(null);
  const [busyMembershipId, setBusyMembershipId] = useState(null);

  const loadData = useCallback(async () => {
    setMembersState((prev) => ({ ...prev, loading: true, error: null }));
    setAllocationsState((prev) => ({ ...prev, loading: true, error: null }));
    setInventoryState((prev) => ({ ...prev, loading: true, error: null }));

    const [membersRes, rolesRes, allocRes, invRes] = await Promise.allSettled([
      organizationOperationsService.getOrganizationMembers(activeOrganizationId),
      organizationOperationsService.getOrganizationRoles(activeOrganizationId),
      organizationOperationsService.getResourceAllocations(),
      organizationOperationsService.getWarehouseInventories(),
    ]);

    if (rolesRes.status === 'fulfilled') {
      setRolesState({
        loading: false,
        items: rolesRes.value.items,
        forbidden: rolesRes.value.forbidden,
      });
    } else {
      setRolesState({ loading: false, items: [], forbidden: false });
    }

    if (membersRes.status === 'fulfilled') {
      setMembersState({
        loading: false,
        items: membersRes.value.items,
        forbidden: membersRes.value.forbidden,
        error: null,
      });
    } else {
      setMembersState({
        loading: false,
        items: [],
        forbidden: false,
        error: membersRes.reason?.detail || membersRes.reason?.message || 'Unable to load organization members.',
      });
    }

    if (allocRes.status === 'fulfilled') {
      setAllocationsState({
        loading: false,
        items: allocRes.value.items,
        forbidden: allocRes.value.forbidden,
        scope: allocRes.value.scope,
        error: null,
      });
    } else {
      setAllocationsState({
        loading: false,
        items: [],
        forbidden: false,
        scope: 'none',
        error: allocRes.reason?.detail || allocRes.reason?.message || 'Unable to load resource allocations.',
      });
    }

    if (invRes.status === 'fulfilled') {
      setInventoryState({
        loading: false,
        items: invRes.value.items,
        forbidden: invRes.value.forbidden,
        error: null,
      });
    } else {
      setInventoryState({
        loading: false,
        items: [],
        forbidden: false,
        error: invRes.reason?.detail || invRes.reason?.message || 'Unable to load warehouse inventory.',
      });
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMembershipAction = async (membershipId, action, fullName) => {
    if (!activeOrganizationId) return;
    const label = action === 'approve' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${label} membership for ${fullName}?`)) {
      return;
    }

    setBusyMembershipId(membershipId);
    setActionFeedback(null);
    try {
      if (action === 'approve') {
        await organizationOperationsService.approveMembership(activeOrganizationId, membershipId);
      } else {
        await organizationOperationsService.rejectMembership(activeOrganizationId, membershipId);
      }
      setActionFeedback({
        type: 'success',
        message: `Membership for ${fullName} has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
      await loadData();
      try {
        await refreshMemberships({ preserveError: true });
      } catch {
        // non-blocking
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err?.detail || err?.message || `Unable to ${label} membership.`,
      });
    } finally {
      setBusyMembershipId(null);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!activeOrganizationId || !newMemberEmail.trim()) return;
    setActionFeedback(null);
    try {
      await organizationOperationsService.addMemberByEmail(activeOrganizationId, newMemberEmail);
      setNewMemberEmail('');
      setActionFeedback({
        type: 'success',
        message: 'Member added with Pending membership status. Approve to grant organization access.',
      });
      await loadData();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err?.detail || err?.message || 'Unable to add member.',
      });
    }
  };

  const handleCreateOrgAdminRole = async () => {
    if (!activeOrganizationId) return;
    setActionFeedback(null);
    try {
      await organizationOperationsService.createOrganizationRole(activeOrganizationId, {
        roleName: 'OrganizationAdmin',
        description: 'Organization-scoped administrator role',
        permissionIds: [],
      });
      setActionFeedback({
        type: 'success',
        message: 'OrganizationAdmin role created with organization-scoped permissions.',
      });
      await loadData();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err?.detail || err?.message || 'Unable to create OrganizationAdmin role.',
      });
    }
  };

  const handleAssignRole = async (membershipId) => {
    const roleId = Number(selectedRoleByMembership[membershipId]);
    if (!activeOrganizationId || !roleId) return;
    setBusyMembershipId(membershipId);
    setActionFeedback(null);
    try {
      await organizationOperationsService.assignMemberRoles(activeOrganizationId, membershipId, [roleId]);
      setActionFeedback({
        type: 'success',
        message: 'Organization role assigned successfully.',
      });
      await loadData();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err?.detail || err?.message || 'Unable to assign role.',
      });
    } finally {
      setBusyMembershipId(null);
    }
  };

  const orgDisplayName =
    activeOrganizationAccess?.organizationName || 'Active Organization';
  const effectivePermissions = Array.isArray(activeOrganizationAccess?.permissions)
    ? activeOrganizationAccess.permissions
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="org-section-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Organization Memberships &amp; Resource Logistics
            </h1>
            <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0' }}>
              Workspace: <strong>{orgDisplayName}</strong>
              {orgRoles.length > 0 ? ` • Roles: ${orgRoles.join(', ')}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="org-btn-secondary"
            onClick={loadData}
            style={{ fontSize: '12px', padding: '7px 14px' }}
          >
            Refresh Live Data
          </button>
        </div>

        {actionFeedback && (
          <div
            style={{
              marginTop: '14px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: actionFeedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${actionFeedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
              color: actionFeedback.type === 'success' ? '#065F46' : '#991B1B',
            }}
          >
            {actionFeedback.type === 'success' ? (
              <IconCheckCircle size={16} color="#065F46" />
            ) : (
              <IconAlertTriangle size={16} color="#991B1B" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Section 0: Effective Organization Permissions */}
      <section className="org-section-card" aria-label="Effective Organization Permissions">
        <div className="org-section-header">
          <div className="org-section-title-wrap">
            <h2 className="org-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconShieldCheck size={18} color="#10756F" />
              <span>Your Organization-Scoped Permissions</span>
            </h2>
            <p className="org-section-subtitle">
              Loaded from <code>GET /api/Organizations/{activeOrganizationId || '{id}'}/my-access</code>
            </p>
          </div>
        </div>
        <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {effectivePermissions.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>
              No organization-scoped permissions assigned to your membership yet.
            </span>
          ) : (
            effectivePermissions.map((perm) => (
              <span
                key={perm}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: '#F0FDFA',
                  border: '1px solid #99F6E4',
                  color: '#0F766E',
                }}
              >
                {perm}
              </span>
            ))
          )}
        </div>
      </section>

      {/* Section 1: Organization Memberships */}
      <section className="org-section-card" aria-label="Organization Members">
        <div className="org-section-header">
          <div className="org-section-title-wrap">
            <h2 className="org-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconUsers size={18} color="#10756F" />
              <span>Organization Members &amp; Pending Applications</span>
            </h2>
            <p className="org-section-subtitle">
              Scoped to <code>GET /api/Organizations/{activeOrganizationId || '{id}'}/members</code>
            </p>
          </div>
          {activeOrganizationId && !rolesState.items.some((r) => r.roleName === 'OrganizationAdmin') && !rolesState.forbidden && (
            <button
              type="button"
              className="org-btn-secondary"
              onClick={handleCreateOrgAdminRole}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              + Create OrganizationAdmin Role
            </button>
          )}
        </div>

        <div style={{ padding: '16px 20px' }}>
          {activeOrganizationId && !membersState.forbidden && (
            <form
              onSubmit={handleAddMember}
              style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}
            >
              <input
                type="email"
                required
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Add registered user by email (e.g., admin@test.com)"
                style={{
                  flex: '1 1 260px',
                  padding: '7px 10px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                }}
              />
              <button
                type="submit"
                className="org-btn-primary"
                style={{ fontSize: '12px', padding: '7px 14px' }}
              >
                Add Member
              </button>
            </form>
          )}
          {!activeOrganizationId ? (
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Select an active organization to inspect memberships.
            </div>
          ) : membersState.loading ? (
            <div style={{ fontSize: '13px', color: '#64748B' }}>Loading organization members...</div>
          ) : membersState.forbidden ? (
            <div style={{ fontSize: '13px', color: '#B45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconShieldCheck size={16} color="#B45309" />
              <span>
                Your current role does not grant <code>Organizations.View</code> for this organization&apos;s full member roster.
              </span>
            </div>
          ) : membersState.error ? (
            <div style={{ fontSize: '13px', color: '#DC2626' }}>{membersState.error}</div>
          ) : membersState.items.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#64748B' }}>No memberships found for this organization.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '8px 10px' }}>Member</th>
                    <th style={{ padding: '8px 10px' }}>Email</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px' }}>Roles</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {membersState.items.map((m) => {
                    const isPending = String(m.membershipStatus).toLowerCase() === 'pending';
                    return (
                      <tr key={m.membershipId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#0F172A' }}>{m.fullName}</td>
                        <td style={{ padding: '10px', color: '#475569' }}>{m.email}</td>
                        <td style={{ padding: '10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              backgroundColor: isPending ? '#FEF3C7' : '#DCFCE7',
                              color: isPending ? '#B45309' : '#15803D',
                            }}
                          >
                            {m.membershipStatus}
                          </span>
                        </td>
                        <td style={{ padding: '10px', color: '#475569' }}>
                          {m.roles.length > 0 ? m.roles.join(', ') : 'Member'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {isPending ? (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                disabled={busyMembershipId === m.membershipId}
                                onClick={() => handleMembershipAction(m.membershipId, 'approve', m.fullName)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#10756F',
                                  color: '#FFFFFF',
                                  cursor: 'pointer',
                                }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busyMembershipId === m.membershipId}
                                onClick={() => handleMembershipAction(m.membershipId, 'reject', m.fullName)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: '1px solid #FCA5A5',
                                  backgroundColor: '#FFFFFF',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : rolesState.items.length > 0 ? (
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <select
                                value={selectedRoleByMembership[m.membershipId] ?? ''}
                                onChange={(e) =>
                                  setSelectedRoleByMembership((prev) => ({
                                    ...prev,
                                    [m.membershipId]: e.target.value,
                                  }))
                                }
                                style={{ fontSize: '12px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                              >
                                <option value="">Select role...</option>
                                {rolesState.items.map((r) => (
                                  <option key={r.roleId} value={r.roleId}>
                                    {r.roleName}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!selectedRoleByMembership[m.membershipId] || busyMembershipId === m.membershipId}
                                onClick={() => handleAssignRole(m.membershipId)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: 'none',
                                  backgroundColor: '#0F766E',
                                  color: '#FFFFFF',
                                  cursor: 'pointer',
                                }}
                              >
                                Assign
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Resource Allocations Visibility */}
      <section className="org-section-card" aria-label="Resource Allocations">
        <div className="org-section-header">
          <div className="org-section-title-wrap">
            <h2 className="org-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconPackage size={18} color="#10756F" />
              <span>Resource Allocations &amp; Warehouse Stock</span>
            </h2>
            <p className="org-section-subtitle">
              Live visibility from <code>/api/ResourceAllocations</code> and <code>/api/WarehouseInventories</code>
            </p>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
              Active &amp; Recent Allocations
            </h3>
            {allocationsState.loading ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>Loading resource allocations...</div>
            ) : allocationsState.forbidden ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Allocation records require <code>ResourceAllocations.View</code> or <code>Resources.Allocate</code> permission.
              </div>
            ) : allocationsState.error ? (
              <div style={{ fontSize: '13px', color: '#DC2626' }}>{allocationsState.error}</div>
            ) : allocationsState.items.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>No resource allocations recorded yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '8px 10px' }}>ID</th>
                      <th style={{ padding: '8px 10px' }}>Resource</th>
                      <th style={{ padding: '8px 10px' }}>Warehouse</th>
                      <th style={{ padding: '8px 10px' }}>Crisis</th>
                      <th style={{ padding: '8px 10px' }}>Qty (Alloc / Req)</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationsState.items.slice(0, 15).map((a) => (
                      <tr key={a.allocationId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>#{a.allocationId}</td>
                        <td style={{ padding: '8px 10px' }}>{a.resourceName}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{a.warehouseName}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{a.crisisName}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {a.quantityAllocated} / {a.quantityRequested}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0F766E' }}>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
              Warehouse Inventory Snapshot
            </h3>
            {inventoryState.loading ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>Loading warehouse inventory...</div>
            ) : inventoryState.forbidden ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Inventory stock levels require <code>Inventory.View</code> permission.
              </div>
            ) : inventoryState.error ? (
              <div style={{ fontSize: '13px', color: '#DC2626' }}>{inventoryState.error}</div>
            ) : inventoryState.items.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>No warehouse inventory records found.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {inventoryState.items.slice(0, 8).map((inv) => (
                  <div
                    key={inv.inventoryId}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `1px solid ${inv.isLowStock ? '#FECACA' : '#E2E8F0'}`,
                      backgroundColor: inv.isLowStock ? '#FEF2F2' : '#F8FAFC',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{inv.resourceName}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{inv.warehouseName}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '6px', color: inv.isLowStock ? '#DC2626' : '#10756F' }}>
                      {inv.quantityAvailable} {inv.unitOfMeasure}
                      {inv.isLowStock ? ' • Low Stock' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
