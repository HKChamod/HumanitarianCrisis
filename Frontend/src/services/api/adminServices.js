import { axiosClient, USE_MOCK_API } from './axiosClient';
import {
  mapAiProviderStatusFromApi,
  mapAiRecommendationFromApi,
  mapAiReviewDecisionToApi,
  mapAuditLogFromApi,
  mapCrisisCreateToApi,
  mapCrisisFromApi,
  mapDonationFromApi,
  mapInventoryTransactionCreateToApi,
  mapInventoryTransactionFromApi,
  mapInventoryTransferToApi,
  mapMemberFromApi,
  mapNotificationFromApi,
  mapOrganizationCreateToApi,
  mapOrganizationFromApi,
  mapOrganizationUpdateToApi,
  mapPermissionFromApi,
  mapRequestFromApi,
  mapRequestStatusToApi,
  mapResourceAllocationCreateToApi,
  mapResourceAllocationFromApi,
  mapResourceAllocationStatusToApi,
  mapResourceCreateToApi,
  mapResourceFromApi,
  mapResourceUpdateToApi,
  mapRoleFromApi,
  mapShelterFromApi,
  mapShelterPlacementFromApi,
  mapUserFromApi,
  mapVolunteerAssignmentFromApi,
  mapVolunteerFromApi,
  mapWarehouseCreateToApi,
  mapWarehouseFromApi,
  mapWarehouseInventoryCreateToApi,
  mapWarehouseInventoryFromApi,
  mapWarehouseUpdateToApi,
} from './backendMappers';
import {
  MOCK_AI_RECOMMENDATIONS,
  MOCK_ASSISTANCE_REQUESTS,
  MOCK_AUDIT_LOGS,
  MOCK_CRISIS_EVENTS,
  MOCK_DONATIONS,
  MOCK_DONATION_CAMPAIGNS,
  MOCK_MEMBERSHIPS,
  MOCK_NOTIFICATIONS,
  MOCK_ORGANIZATIONS,
  MOCK_PERMISSIONS,
  MOCK_RECENT_ACTIVITIES,
  MOCK_RESOURCES,
  MOCK_RESOURCE_ALLOCATIONS,
  MOCK_ROLES,
  MOCK_SHELTERS,
  MOCK_USERS,
  MOCK_VOLUNTEERS,
  MOCK_VOLUNTEER_ASSIGNMENTS,
} from '../mock/adminMockData';

const delay = (ms = 160) => new Promise((resolve) => setTimeout(resolve, ms));

let crisisStore = [...MOCK_CRISIS_EVENTS];
let requestStore = [...MOCK_ASSISTANCE_REQUESTS];
let orgStore = [...MOCK_ORGANIZATIONS];
let membershipStore = [...MOCK_MEMBERSHIPS];
let userStore = [...MOCK_USERS];
let roleStore = [...MOCK_ROLES];
let resourceStore = [...MOCK_RESOURCES];
let allocationStore = [...MOCK_RESOURCE_ALLOCATIONS];
let shelterStore = [...MOCK_SHELTERS];
let volunteerStore = [...MOCK_VOLUNTEERS];
let volunteerAssignmentStore = [...MOCK_VOLUNTEER_ASSIGNMENTS];
let donationStore = [...MOCK_DONATIONS];
let campaignStore = [...MOCK_DONATION_CAMPAIGNS];
let aiRecommendationStore = [...MOCK_AI_RECOMMENDATIONS];
let notificationStore = [...MOCK_NOTIFICATIONS];
let auditLogStore = [...MOCK_AUDIT_LOGS];
let activityStore = [...MOCK_RECENT_ACTIVITIES];

function recordAudit(actorName, action, module, recordRef, details) {
  const now = new Date().toISOString();
  auditLogStore = [
    {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      actorName,
      actorRole: 'Central Administrator',
      action,
      module,
      recordRef,
      details,
      timestamp: now,
    },
    ...auditLogStore,
  ];
  activityStore = [
    {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      title: action.replace(/_/g, ' '),
      description: details,
      actor: actorName,
      category: module.includes('Crisis')
        ? 'Crisis'
        : module.includes('Organization')
          ? 'Organization'
          : module.includes('Request')
            ? 'Request'
            : module.includes('Resource')
              ? 'Resource'
              : module.includes('AI')
                ? 'AI'
                : 'User',
      timestamp: now,
    },
    ...activityStore,
  ];
}

export const authService = {
  isMock: USE_MOCK_API,
  async login(email, password) {
    const res = await axiosClient.post('/auth/login', { email, password });
    return res.data;
  },
  async getMe() {
    const res = await axiosClient.get('/auth/me');
    return res.data;
  },
};

export const crisisService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/crisisevents');
      return (Array.isArray(res.data) ? res.data : []).map(mapCrisisFromApi);
    }
    await delay();
    return [...crisisStore];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/crisisevents/${id}`);
      return mapCrisisFromApi(res.data);
    }
    await delay(100);
    return crisisStore.find((c) => c.id === id);
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/crisisevents', mapCrisisCreateToApi(payload));
      return mapCrisisFromApi(res.data);
    }
    await delay();
    const created = {
      ...payload,
      id: `CR-2026-${String(crisisStore.length + 1).padStart(3, '0')}`,
      reportedDate: new Date().toISOString(),
      relatedRequestCount: 0,
      assignedOrganizations: [],
      sourceNote: 'Created in session (Mock)',
    };
    crisisStore = [created, ...crisisStore];
    recordAudit(
      'Central Administrator',
      'CRISIS_CREATED',
      'Crisis Management',
      created.id,
      `Created crisis "${created.crisisName}" (${created.severity}).`
    );
    return created;
  },
  async update(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/crisisevents/${id}`, mapCrisisCreateToApi(payload));
      return mapCrisisFromApi(res.data);
    }
    await delay();
    crisisStore = crisisStore.map((c) => (c.id === id ? { ...c, ...payload } : c));
    const updated = crisisStore.find((c) => c.id === id);
    if (updated) {
      recordAudit('Central Administrator', 'CRISIS_UPDATED', 'Crisis Management', id, `Updated crisis "${updated.crisisName}".`);
    }
    return updated;
  },
  async updateStatus(id, status) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/crisisevents/${id}/status`, { status });
      return mapCrisisFromApi(res.data);
    }
    await delay();
    crisisStore = crisisStore.map((c) => (c.id === id ? { ...c, status } : c));
    const updated = crisisStore.find((c) => c.id === id);
    if (updated) {
      recordAudit(
        'Central Administrator',
        'CRISIS_STATUS_UPDATED',
        'Crisis Management',
        id,
        `Updated "${updated.crisisName}" status to ${status}.`
      );
    }
    return updated;
  },
  async delete(id) {
    if (!USE_MOCK_API) {
      await axiosClient.delete(`/crisisevents/${id}`);
      return true;
    }
    await delay();
    crisisStore = crisisStore.filter((c) => c.id !== id);
    recordAudit('Central Administrator', 'CRISIS_DELETED', 'Crisis Management', id, `Deleted crisis ${id}.`);
    return true;
  },
};

export const assistanceRequestService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/citizenrequests');
      return (Array.isArray(res.data) ? res.data : []).map(mapRequestFromApi);
    }
    await delay();
    return [...requestStore];
  },
  async getMy() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/citizenrequests/my');
      return (Array.isArray(res.data) ? res.data : []).map(mapRequestFromApi);
    }
    await delay();
    return [...requestStore];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/citizenrequests/${id}`);
      return mapRequestFromApi(res.data);
    }
    await delay(100);
    return requestStore.find((r) => r.id === id);
  },
  async updateStatus(id, status, note, assignedOrganization) {
    if (!USE_MOCK_API) {
      const apiStatus = mapRequestStatusToApi(status);
      const res = await axiosClient.patch(`/citizenrequests/${id}/status`, { status: apiStatus });
      return mapRequestFromApi(res.data);
    }
    await delay();
    const now = new Date().toISOString();
    requestStore = requestStore.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        status,
        assignedOrganization: assignedOrganization ?? r.assignedOrganization,
        updatedAt: now,
        reviewHistory: [
          ...r.reviewHistory,
          {
            id: `H-${Date.now()}`,
            action: status,
            actor: 'Central Administrator',
            note,
            timestamp: now,
          },
        ],
      };
    });
    const updated = requestStore.find((r) => r.id === id);
    if (updated) {
      recordAudit(
        'Central Administrator',
        `REQUEST_${status.toUpperCase()}`,
        'Citizen Assistance',
        updated.referenceNumber,
        note
      );
    }
    return updated;
  },
};

export const organizationService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/organizations');
      return (Array.isArray(res.data) ? res.data : []).map(mapOrganizationFromApi);
    }
    await delay();
    return [...orgStore];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/organizations/${id}`);
      return mapOrganizationFromApi(res.data);
    }
    await delay(100);
    return orgStore.find((o) => o.id === id);
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/organizations', mapOrganizationCreateToApi(payload));
      return mapOrganizationFromApi(res.data);
    }
    await delay();
    const created = { ...payload, id: `ORG-${String(orgStore.length + 1).padStart(3, '0')}`, status: 'Active', memberCount: 0, activeCrisisCount: 0, registeredAt: new Date().toISOString() };
    orgStore = [created, ...orgStore];
    return created;
  },
  async updateStatus(id, status) {
    if (!USE_MOCK_API) {
      const current = await this.getById(id);
      const isActive = status === 'Active' || status === 'Approved';
      const res = await axiosClient.put(`/organizations/${id}`, mapOrganizationUpdateToApi(current, isActive));
      return mapOrganizationFromApi(res.data);
    }
    await delay();
    orgStore = orgStore.map((o) => (o.id === id ? { ...o, status } : o));
    const updated = orgStore.find((o) => o.id === id);
    if (updated) {
      recordAudit(
        'Central Administrator',
        'ORGANIZATION_STATUS_UPDATED',
        'Organization Management',
        id,
        `Set "${updated.name}" status to ${status}.`
      );
    }
    return updated;
  },
  async delete(id) {
    if (!USE_MOCK_API) {
      await axiosClient.delete(`/organizations/${id}`);
      return true;
    }
    await delay();
    orgStore = orgStore.filter((o) => o.id !== id);
    return true;
  },
  async getMembers(orgId, orgName = '') {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/organizations/${orgId}/members`);
      return (Array.isArray(res.data) ? res.data : []).map((m) => mapMemberFromApi(m, orgId, orgName));
    }
    await delay();
    return membershipStore.filter((m) => m.organizationId === orgId);
  },
  async approveMembership(orgId, membershipId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/organizations/${orgId}/members/${membershipId}/approve`);
      return res.data;
    }
    await delay();
    membershipStore = membershipStore.map((m) => (m.id === membershipId ? { ...m, status: 'Active' } : m));
    return membershipStore.find((m) => m.id === membershipId);
  },
  async rejectMembership(orgId, membershipId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/organizations/${orgId}/members/${membershipId}/reject`);
      return res.data;
    }
    await delay();
    membershipStore = membershipStore.map((m) => (m.id === membershipId ? { ...m, status: 'Suspended' } : m));
    return membershipStore.find((m) => m.id === membershipId);
  },
  async addMember(orgId, email) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post(`/organizations/${orgId}/members`, {
        email: String(email || '').trim().toLowerCase(),
      });
      return res.data;
    }
    await delay();
    const created = {
      id: String(Date.now()),
      membershipId: Date.now(),
      userId: '999',
      userName: email,
      userEmail: email,
      organizationId: String(orgId),
      organizationName: '',
      roles: [],
      scopedRole: 'Member',
      status: 'Pending',
      joinedAt: new Date().toISOString(),
    };
    membershipStore = [created, ...membershipStore];
    return created;
  },
  async getRoles(orgId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/organizations/${orgId}/roles`);
      return Array.isArray(res.data) ? res.data : [];
    }
    await delay();
    return [];
  },
  async createRole(orgId, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post(`/organizations/${orgId}/roles`, payload);
      return res.data;
    }
    await delay();
    return {
      roleId: Date.now(),
      organizationId: Number(orgId),
      roleName: payload.roleName,
      description: payload.description || '',
      isSystemDefined: false,
      permissions: [],
    };
  },
  async assignMemberRoles(orgId, membershipId, roleIds) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/organizations/${orgId}/members/${membershipId}/roles`, {
        roleIds,
      });
      return res.data;
    }
    await delay();
    return { membershipId, roles: [] };
  },
  async listMemberships() {
    if (!USE_MOCK_API) {
      const orgs = await this.list();
      const memberLists = await Promise.allSettled(orgs.map((o) => this.getMembers(o.id, o.name)));
      return memberLists
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value);
    }
    await delay();
    return [...membershipStore];
  },
  async getMyMemberships() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/organizations/my-memberships');
      return Array.isArray(res.data) ? res.data : [];
    }
    await delay();
    return [
      {
        membershipId: 1,
        organizationId: 1,
        organizationName: 'Sri Lanka Red Cross Society (Demo)',
        registrationNumber: 'NGO-SL-1936-001',
        isOrganizationActive: true,
        membershipStatus: 'Approved',
        joinedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        roles: ['Demo Organization Coordinator'],
      },
    ];
  },
  async getMyOrganizationAccess(orgId) {
    const normalizedOrgId = Number(orgId);
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/organizations/${normalizedOrgId}/my-access`, {
        headers: {
          'X-Organization-Id': String(normalizedOrgId),
        },
      });
      return res.data;
    }
    await delay();
    return {
      organizationId: normalizedOrgId,
      organizationName: 'Sri Lanka Red Cross Society (Demo)',
      membershipId: 1,
      membershipStatus: 'Approved',
      roles: ['Demo Organization Coordinator'],
      permissions: [
        'Organizations.View',
        'Organizations.Manage',
        'Organizations.ApproveMembers',
      ],
    };
  },
};

export const userService = {
  isMock: USE_MOCK_API,
  async list(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Users', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapUserFromApi);
    }
    await delay();
    return [...userStore];
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Users', payload);
      return mapUserFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async update(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/Users/${Number(id)}`, payload);
      return mapUserFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async toggleActive(id, currentIsActive) {
    if (!USE_MOCK_API) {
      const nextActive = currentIsActive !== undefined ? !currentIsActive : true;
      const res = await axiosClient.patch(`/Users/${Number(id)}/status`, null, {
        params: { isActive: nextActive },
      });
      return mapUserFromApi(res.data);
    }
    await delay();
    userStore = userStore.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u));
    const updated = userStore.find((u) => u.id === id);
    if (updated) {
      recordAudit(
        'Central Administrator',
        'USER_STATUS_TOGGLED',
        'User Management',
        id,
        `${updated.isActive ? 'Activated' : 'Deactivated'} ${updated.fullName}.`
      );
    }
    return updated;
  },
  async updateRoles(id, roleIds) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/Users/${Number(id)}/roles`, { roleIds });
      return mapUserFromApi(res.data);
    }
    await delay();
    return { id, roleIds };
  },
};

export const roleService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Roles');
      return (Array.isArray(res.data) ? res.data : []).map(mapRoleFromApi);
    }
    await delay();
    return [...roleStore];
  },
  async updatePermissions(roleId, permissionIds) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/Roles/${Number(roleId)}/permissions`, { permissionIds });
      return mapRoleFromApi(res.data);
    }
    await delay();
    return { roleId, permissionIds };
  },
  async create(payload) {
    await delay();
    const created = {
      ...payload,
      id: `ROLE-${String(roleStore.length + 1).padStart(2, '0')}`,
      userCount: 0,
      isSystemRole: false,
    };
    roleStore = [...roleStore, created];
    recordAudit('Central Administrator', 'ROLE_CREATED', 'Role Management', created.id, `Created role "${created.name}".`);
    return created;
  },
};

export const permissionService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Roles/permissions');
      return (Array.isArray(res.data) ? res.data : []).map(mapPermissionFromApi);
    }
    await delay();
    return [...MOCK_PERMISSIONS];
  },
};

export const resourceService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/resources');
      return (Array.isArray(res.data) ? res.data : []).map(mapResourceFromApi);
    }
    await delay();
    return [...resourceStore];
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/resources', mapResourceCreateToApi(payload));
      return mapResourceFromApi(res.data);
    }
    await delay();
    const created = {
      ...payload,
      id: `RES-${String(resourceStore.length + 1).padStart(3, '0')}`,
      updatedAt: new Date().toISOString(),
    };
    resourceStore = [created, ...resourceStore];
    recordAudit(
      'Central Administrator',
      'RESOURCE_CREATED',
      'Resource Inventory',
      created.id,
      `Added ${created.availableQuantity} ${created.unit} of ${created.name}.`
    );
    return created;
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/resources/${id}`);
      return mapResourceFromApi(res.data);
    }
    await delay(100);
    return resourceStore.find((r) => r.id === id);
  },
  async update(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/resources/${id}`, mapResourceUpdateToApi(payload));
      return mapResourceFromApi(res.data);
    }
    await delay();
    resourceStore = resourceStore.map((r) => (r.id === id ? { ...r, ...payload } : r));
    return resourceStore.find((r) => r.id === id);
  },
  async delete(id) {
    if (!USE_MOCK_API) {
      await axiosClient.delete(`/resources/${id}`);
      return true;
    }
    await delay();
    resourceStore = resourceStore.filter((r) => r.id !== id);
    return true;
  },
  async listAllocations() {
    if (!USE_MOCK_API) {
      return resourceAllocationService.list();
    }
    await delay();
    return [...allocationStore];
  },
  async createAllocation(payload) {
    if (!USE_MOCK_API) {
      return resourceAllocationService.create(payload);
    }
    await delay();
    const created = {
      ...payload,
      id: `ALLOC-${String(allocationStore.length + 1).padStart(3, '0')}`,
      allocatedDate: new Date().toISOString(),
      allocatedBy: 'Central Administrator',
    };
    allocationStore = [created, ...allocationStore];
    resourceStore = resourceStore.map((r) =>
      r.id === payload.resourceId
        ? {
            ...r,
            availableQuantity: Math.max(0, r.availableQuantity - payload.quantity),
            allocatedQuantity: r.allocatedQuantity + payload.quantity,
          }
        : r
    );
    recordAudit(
      'Central Administrator',
      'RESOURCE_ALLOCATED',
      'Resource Allocation',
      created.id,
      `Allocated ${created.quantity} ${created.unit} of ${created.resourceName} to ${created.destination}.`
    );
    return created;
  },
};

export const warehouseService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Warehouses');
      return (Array.isArray(res.data) ? res.data : []).map(mapWarehouseFromApi);
    }
    await delay();
    return [];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/Warehouses/${Number(id)}`);
      return mapWarehouseFromApi(res.data);
    }
    await delay();
    return null;
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Warehouses', mapWarehouseCreateToApi(payload));
      return mapWarehouseFromApi(res.data);
    }
    await delay();
    return { ...payload, id: `WH-${Date.now()}`, warehouseId: Date.now(), isActive: true };
  },
  async update(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/Warehouses/${Number(id)}`, mapWarehouseUpdateToApi(payload));
      return mapWarehouseFromApi(res.data);
    }
    await delay();
    return { ...payload, id: String(id), warehouseId: Number(id) };
  },
  async delete(id) {
    if (!USE_MOCK_API) {
      await axiosClient.delete(`/Warehouses/${Number(id)}`);
      return true;
    }
    await delay();
    return true;
  },
};

export const warehouseInventoryService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/WarehouseInventories');
      return (Array.isArray(res.data) ? res.data : []).map(mapWarehouseInventoryFromApi);
    }
    await delay();
    return [];
  },
  async listByWarehouse(warehouseId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/WarehouseInventories/warehouse/${Number(warehouseId)}`);
      return (Array.isArray(res.data) ? res.data : []).map(mapWarehouseInventoryFromApi);
    }
    await delay();
    return [];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/WarehouseInventories/${Number(id)}`);
      return mapWarehouseInventoryFromApi(res.data);
    }
    await delay();
    return null;
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/WarehouseInventories', mapWarehouseInventoryCreateToApi(payload));
      return mapWarehouseInventoryFromApi(res.data);
    }
    await delay();
    return { ...payload, id: `INV-${Date.now()}`, inventoryId: Date.now(), quantityAvailable: 0 };
  },
  async updateReorderLevel(id, reorderLevel) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/WarehouseInventories/${Number(id)}/reorder-level`, {
        reorderLevel: Number(reorderLevel),
      });
      return mapWarehouseInventoryFromApi(res.data);
    }
    await delay();
    return { id: String(id), reorderLevel: Number(reorderLevel) };
  },
  async delete(id) {
    if (!USE_MOCK_API) {
      await axiosClient.delete(`/WarehouseInventories/${Number(id)}`);
      return true;
    }
    await delay();
    return true;
  },
};

export const inventoryTransactionService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/InventoryTransactions');
      return (Array.isArray(res.data) ? res.data : []).map(mapInventoryTransactionFromApi);
    }
    await delay();
    return [];
  },
  async listByInventory(inventoryId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/InventoryTransactions/inventory/${Number(inventoryId)}`);
      return (Array.isArray(res.data) ? res.data : []).map(mapInventoryTransactionFromApi);
    }
    await delay();
    return [];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/InventoryTransactions/${Number(id)}`);
      return mapInventoryTransactionFromApi(res.data);
    }
    await delay();
    return null;
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/InventoryTransactions', mapInventoryTransactionCreateToApi(payload));
      return mapInventoryTransactionFromApi(res.data);
    }
    await delay();
    return { ...payload, id: `TXN-${Date.now()}` };
  },
  async transfer(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/InventoryTransactions/transfer', mapInventoryTransferToApi(payload));
      return Array.isArray(res.data) ? res.data.map(mapInventoryTransactionFromApi) : res.data;
    }
    await delay();
    return [];
  },
};

export const resourceAllocationService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/ResourceAllocations');
      return (Array.isArray(res.data) ? res.data : []).map(mapResourceAllocationFromApi);
    }
    await delay();
    return [...allocationStore];
  },
  async listMy() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/ResourceAllocations/my');
      return (Array.isArray(res.data) ? res.data : []).map(mapResourceAllocationFromApi);
    }
    await delay();
    return [...allocationStore];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/ResourceAllocations/${Number(id)}`);
      return mapResourceAllocationFromApi(res.data);
    }
    await delay();
    return allocationStore.find((a) => a.id === String(id)) || null;
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/ResourceAllocations', mapResourceAllocationCreateToApi(payload));
      return mapResourceAllocationFromApi(res.data);
    }
    return resourceService.createAllocation(payload);
  },
  async approve(id, payload) {
    const res = await axiosClient.patch(
      `/ResourceAllocations/${Number(id)}/approve`,
      mapResourceAllocationStatusToApi(payload)
    );
    return mapResourceAllocationFromApi(res.data);
  },
  async reject(id, payload = {}) {
    const res = await axiosClient.patch(
      `/ResourceAllocations/${Number(id)}/reject`,
      mapResourceAllocationStatusToApi(payload)
    );
    return mapResourceAllocationFromApi(res.data);
  },
  async dispatch(id, payload = {}) {
    const res = await axiosClient.patch(
      `/ResourceAllocations/${Number(id)}/dispatch`,
      mapResourceAllocationStatusToApi(payload)
    );
    return mapResourceAllocationFromApi(res.data);
  },
  async deliver(id, payload = {}) {
    const res = await axiosClient.patch(
      `/ResourceAllocations/${Number(id)}/deliver`,
      mapResourceAllocationStatusToApi(payload)
    );
    return mapResourceAllocationFromApi(res.data);
  },
  async cancel(id, payload = {}) {
    const res = await axiosClient.patch(
      `/ResourceAllocations/${Number(id)}/cancel`,
      mapResourceAllocationStatusToApi(payload)
    );
    return mapResourceAllocationFromApi(res.data);
  },
};

export const shelterService = {
  isMock: USE_MOCK_API,
  async list(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Shelters', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapShelterFromApi);
    }
    await delay();
    return [...shelterStore];
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Shelters', {
        shelterName: payload.shelterName || payload.name,
        areaId: Number(payload.areaId),
        address: payload.address,
        capacity: Number(payload.capacity),
        currentOccupancy: Number(payload.currentOccupancy ?? 0),
        status: payload.status || 'Open',
        contactName: payload.contactName || null,
        contactPhone: payload.contactPhone || null,
        facilities: payload.facilities || null,
      });
      return mapShelterFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async update(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.put(`/Shelters/${Number(id)}`, {
        shelterName: payload.shelterName || payload.name,
        areaId: Number(payload.areaId),
        address: payload.address,
        capacity: Number(payload.capacity),
        currentOccupancy: Number(payload.currentOccupancy ?? 0),
        status: payload.status || 'Open',
        contactName: payload.contactName || null,
        contactPhone: payload.contactPhone || null,
        facilities: payload.facilities || null,
        isActive: payload.isActive ?? true,
      });
      return mapShelterFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async listPlacements(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Shelters/placements', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapShelterPlacementFromApi);
    }
    await delay();
    return [];
  },
  async createPlacement(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Shelters/placements', {
        shelterId: Number(payload.shelterId),
        citizenRequestId: payload.citizenRequestId ? Number(payload.citizenRequestId) : null,
        residentName: payload.residentName,
        peopleCount: Number(payload.peopleCount ?? 1),
        notes: payload.notes || null,
      });
      return mapShelterPlacementFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async checkOutPlacement(placementId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/Shelters/placements/${Number(placementId)}/checkout`);
      return mapShelterPlacementFromApi(res.data);
    }
    await delay();
    return { placementId, status: 'CheckedOut' };
  },
};

export const volunteerService = {
  isMock: USE_MOCK_API,
  async list(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Volunteers', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapVolunteerFromApi);
    }
    await delay();
    return [...volunteerStore];
  },
  async register(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Volunteers', {
        fullName: payload.fullName || payload.name,
        email: payload.email,
        phoneNumber: payload.phoneNumber || payload.phone || null,
        areaId: payload.areaId ? Number(payload.areaId) : null,
        skills: Array.isArray(payload.skills) ? payload.skills.join(', ') : (payload.skills || ''),
        availabilityStatus: payload.availabilityStatus || payload.availability || 'Available',
      });
      return mapVolunteerFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async updateApproval(id, approvalStatus) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/Volunteers/${Number(id)}/approval`, { approvalStatus });
      return mapVolunteerFromApi(res.data);
    }
    await delay();
    return { id, approvalStatus };
  },
  async listAssignments(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Volunteers/assignments', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapVolunteerAssignmentFromApi);
    }
    await delay();
    return [...volunteerAssignmentStore];
  },
  async createAssignment(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Volunteers/assignments', {
        volunteerId: Number(payload.volunteerId),
        crisisId: Number(payload.crisisId),
        roleTitle: payload.roleTitle || payload.taskTitle || 'Field Responder',
        taskDescription: payload.taskDescription || null,
        notes: payload.notes || null,
      });
      return mapVolunteerAssignmentFromApi(res.data);
    }
    await delay();
    const created = {
      ...payload,
      id: `VA-${String(volunteerAssignmentStore.length + 1).padStart(3, '0')}`,
      assignedAt: new Date().toISOString(),
    };
    volunteerAssignmentStore = [created, ...volunteerAssignmentStore];
    volunteerStore = volunteerStore.map((v) =>
      v.id === payload.volunteerId ? { ...v, availability: 'Assigned', currentAssignment: payload.taskTitle } : v
    );
    recordAudit(
      'Central Administrator',
      'VOLUNTEER_ASSIGNED',
      'Volunteer Management',
      created.id,
      `Assigned ${created.volunteerName} to ${created.crisisName}.`
    );
    return created;
  },
  async updateAssignmentStatus(assignmentId, status, notes = null) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/Volunteers/assignments/${Number(assignmentId)}/status`, {
        status,
        notes,
      });
      return mapVolunteerAssignmentFromApi(res.data);
    }
    await delay();
    return { assignmentId, status };
  },
};

export const donationService = {
  isMock: USE_MOCK_API,
  async list(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Donations', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapDonationFromApi);
    }
    await delay();
    return [...donationStore];
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/Donations', {
        donorName: payload.donorName,
        donorEmail: payload.donorEmail || null,
        donorPhone: payload.donorPhone || null,
        donationType: payload.donationType || 'Monetary',
        amount: payload.amount ? Number(payload.amount) : null,
        currency: payload.currency || 'LKR',
        resourceId: payload.resourceId ? Number(payload.resourceId) : null,
        warehouseId: payload.warehouseId ? Number(payload.warehouseId) : null,
        quantity: payload.quantity ? Number(payload.quantity) : null,
        crisisId: payload.crisisId ? Number(payload.crisisId) : null,
        referenceNumber: payload.referenceNumber || null,
        notes: payload.notes || null,
      });
      return mapDonationFromApi(res.data);
    }
    await delay();
    return payload;
  },
  async verify(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(`/Donations/${Number(id)}/verify`, {
        decision: payload.decision || 'Verified',
        warehouseId: payload.warehouseId ? Number(payload.warehouseId) : null,
        notes: payload.notes || null,
      });
      return mapDonationFromApi(res.data);
    }
    await delay();
    return { id, status: payload.decision };
  },
  async listCampaigns() {
    if (!USE_MOCK_API) {
      const crises = await crisisService.list();
      return crises.map((c) => ({
        id: c.id,
        title: c.crisisName,
        crisisName: c.crisisName,
        status: c.status,
        severity: c.severity,
      }));
    }
    await delay();
    return [...campaignStore];
  },
};

export const aiRecommendationService = {
  isMock: USE_MOCK_API,
  async getStatus() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/AiRecommendations/status');
      return mapAiProviderStatusFromApi(res.data);
    }
    await delay(80);
    return {
      isConfigured: true,
      providerName: 'Mock Demo Engine',
      status: 'Available',
      message: 'Mock mode active — displaying sample advisory recommendations.',
    };
  },
  async list({ reviewStatus, citizenRequestId } = {}) {
    if (!USE_MOCK_API) {
      const params = {};
      if (reviewStatus) params.reviewStatus = reviewStatus;
      if (citizenRequestId) params.citizenRequestId = Number(citizenRequestId);
      const res = await axiosClient.get('/AiRecommendations', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapAiRecommendationFromApi);
    }
    await delay();
    return [...aiRecommendationStore];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/AiRecommendations/${Number(id)}`);
      return mapAiRecommendationFromApi(res.data);
    }
    await delay(80);
    return aiRecommendationStore.find((r) => String(r.id) === String(id)) || null;
  },
  async analyzeCitizenRequest(citizenRequestId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post(`/AiRecommendations/analyze/${Number(citizenRequestId)}`);
      return mapAiRecommendationFromApi(res.data);
    }
    throw {
      status: 501,
      title: 'Mock Mode',
      detail: 'Live AI analysis endpoint is only called when VITE_USE_MOCK_API=false.',
      message: 'Live AI analysis endpoint is only called when VITE_USE_MOCK_API=false.',
    };
  },
  async review(id, payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.patch(
        `/AiRecommendations/${Number(id)}/review`,
        mapAiReviewDecisionToApi(payload)
      );
      return mapAiRecommendationFromApi(res.data);
    }
    return this.submitHumanDecision(id, payload.decision, payload.humanDecisionNote || '');
  },
  async submitHumanDecision(id, reviewStatus, humanDecisionNote) {
    await delay();
    const now = new Date().toISOString();
    aiRecommendationStore = aiRecommendationStore.map((rec) =>
      rec.id === id
        ? {
            ...rec,
            reviewStatus,
            humanDecisionNote,
            reviewedBy: 'Central Administrator',
            reviewedAt: now,
          }
        : rec
    );
    const updated = aiRecommendationStore.find((rec) => rec.id === id);
    if (updated) {
      recordAudit(
        'Central Administrator',
        'AI_RECOMMENDATION_REVIEWED',
        'AI Decision Support',
        id,
        `Decision: ${reviewStatus}. Note: ${humanDecisionNote}`
      );
    }
    return updated;
  },
};

export const notificationService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Notifications');
      return (Array.isArray(res.data) ? res.data : []).map(mapNotificationFromApi);
    }
    await delay(100);
    return [...notificationStore];
  },
  async listMy(unreadOnly = false) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Notifications/my', { params: { unreadOnly } });
      return (Array.isArray(res.data) ? res.data : []).map(mapNotificationFromApi);
    }
    await delay(100);
    return [...notificationStore];
  },
  async markAsRead(id) {
    if (!USE_MOCK_API) {
      await axiosClient.patch(`/Notifications/${Number(id)}/read`);
      return this.list();
    }
    notificationStore = notificationStore.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    return [...notificationStore];
  },
  async markAllAsRead() {
    if (!USE_MOCK_API) {
      await axiosClient.patch('/Notifications/read-all');
      return this.list();
    }
    notificationStore = notificationStore.map((n) => ({ ...n, isRead: true }));
    return [...notificationStore];
  },
};

export const auditLogService = {
  isMock: USE_MOCK_API,
  async list(params = {}) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/AuditLogs', { params });
      return (Array.isArray(res.data) ? res.data : []).map(mapAuditLogFromApi);
    }
    await delay();
    return [...auditLogStore];
  },
};

export const areaService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/areas');
      return Array.isArray(res.data) ? res.data : [];
    }
    await delay(100);
    return [];
  },
  async getHierarchy() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/areas/hierarchy');
      return Array.isArray(res.data) ? res.data : [];
    }
    await delay(100);
    return [];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/areas/${id}`);
      return res.data;
    }
    await delay(100);
    return null;
  },
};

export const reportService = {
  isMock: USE_MOCK_API,
  async getSystemOverview() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/Dashboard/overview');
      return res.data;
    }
    return null;
  },
  async getOrganizationOverview(organizationId) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/Dashboard/organizations/${Number(organizationId)}`);
      return res.data;
    }
    return null;
  },
  async getDashboardSnapshot() {
    const results = await Promise.allSettled([
      crisisService.list(),
      assistanceRequestService.list(),
      organizationService.list(),
      userService.list(),
      resourceService.list(),
      shelterService.list(),
      volunteerService.list(),
      aiRecommendationService.list(),
      donationService.list(),
      auditLogService.list({ limit: 20 }),
      !USE_MOCK_API ? this.getSystemOverview() : Promise.resolve(null),
    ]);

    const getVal = (idx, fallback = []) => (results[idx].status === 'fulfilled' ? results[idx].value : fallback);
    const liveAuditLogs = getVal(9);

    return {
      isMock: USE_MOCK_API,
      crises: getVal(0),
      requests: getVal(1),
      organizations: getVal(2),
      users: getVal(3),
      resources: getVal(4),
      shelters: getVal(5),
      volunteers: getVal(6),
      aiRecommendations: getVal(7),
      donations: getVal(8),
      overview: getVal(10, null),
      recentActivities: !USE_MOCK_API
        ? liveAuditLogs.map((a) => ({
            id: a.id,
            title: a.action,
            description: a.details,
            actor: a.actorName,
            category: a.entityType,
            timestamp: a.timestamp,
          }))
        : [...activityStore],
    };
  },
};

export const systemSettingsService = {
  async getSettings() {
    const res = await axiosClient.get('/SystemSettings');
    return res.data;
  },
  async updateSettings(payload) {
    const res = await axiosClient.put('/SystemSettings', payload);
    return res.data;
  },
  async getSystemInformation() {
    const res = await axiosClient.get('/SystemSettings/system-info');
    return res.data;
  },
  async getAiConfiguration() {
    const res = await axiosClient.get('/SystemSettings/ai-config');
    return res.data;
  },
  async runAiDiagnostic() {
    const res = await axiosClient.post('/AiRecommendations/diagnostic');
    return res.data;
  },
};
