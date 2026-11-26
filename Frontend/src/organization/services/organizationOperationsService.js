/**
 * Organization Operations Service for ReliefLink Organization Portal
 *
 * Connects the Organization Portal to real .NET 10 backend endpoints:
 *  - GET   /api/Notifications/my
 *  - PATCH /api/Notifications/{id}/read
 *  - PATCH /api/Notifications/read-all
 *  - GET   /api/Organizations/{id}/members
 *  - PATCH /api/Organizations/{id}/members/{membershipId}/approve
 *  - PATCH /api/Organizations/{id}/members/{membershipId}/reject
 *  - GET   /api/ResourceAllocations (fallback to /api/ResourceAllocations/my on 403)
 *  - GET   /api/WarehouseInventories
 */

import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient.js';
import { mockNotifications } from '../data/mockDashboardData.js';

export function mapOrgNotificationFromApi(dto) {
  const createdAt = dto?.createdAt ?? null;
  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return {
    id: dto?.notificationId ?? dto?.id,
    notificationId: dto?.notificationId ?? null,
    title: dto?.title ?? 'Notification',
    description: dto?.message ?? '',
    message: dto?.message ?? '',
    category: dto?.category ?? 'System',
    severity: dto?.severity ?? 'Info',
    time: timeLabel,
    createdAt,
    unread: !dto?.isRead,
    relatedEntityType: dto?.relatedEntityType ?? null,
    relatedEntityId: dto?.relatedEntityId ?? null,
  };
}

export function mapOrgMemberFromApi(dto) {
  return {
    membershipId: dto?.membershipId,
    userId: dto?.userId,
    fullName: dto?.fullName ?? '',
    email: dto?.email ?? '',
    membershipStatus: dto?.membershipStatus ?? 'Pending',
    joinedAt: dto?.joinedAt ?? null,
    approvedAt: dto?.approvedAt ?? null,
    approvedByUserId: dto?.approvedByUserId ?? null,
    roles: Array.isArray(dto?.roles) ? dto.roles : [],
  };
}

export function mapOrgAllocationFromApi(dto) {
  return {
    allocationId: dto?.allocationId,
    inventoryId: dto?.inventoryId,
    warehouseName: dto?.warehouseName ?? '',
    resourceId: dto?.resourceId,
    resourceName: dto?.resourceName ?? '',
    crisisId: dto?.crisisId,
    crisisName: dto?.crisisName ?? '',
    citizenRequestId: dto?.citizenRequestId ?? null,
    quantityRequested: Number(dto?.quantityRequested ?? 0),
    quantityAllocated: Number(dto?.quantityAllocated ?? 0),
    status: dto?.status ?? 'Pending',
    requestedByUserName: dto?.requestedByUserName ?? '',
    approvedByUserName: dto?.approvedByUserName ?? null,
    referenceNumber: dto?.referenceNumber ?? null,
    createdAt: dto?.createdAt ?? null,
  };
}

export function mapOrgInventoryFromApi(dto) {
  const qty = Number(dto?.quantityAvailable ?? 0);
  const reorder = Number(dto?.reorderLevel ?? 0);
  return {
    inventoryId: dto?.inventoryId,
    warehouseId: dto?.warehouseId,
    warehouseName: dto?.warehouseName ?? '',
    resourceId: dto?.resourceId,
    resourceName: dto?.resourceName ?? '',
    unitOfMeasure: dto?.unitOfMeasure ?? 'units',
    quantityAvailable: qty,
    reorderLevel: reorder,
    isLowStock: reorder > 0 && qty <= reorder,
  };
}

export const organizationOperationsService = {
  async getMyNotifications(limit = 30) {
    if (USE_MOCK_API) {
      return mockNotifications.map((n) => ({ ...n }));
    }
    const response = await axiosClient.get('/Notifications/my', {
      params: { limit },
    });
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapOrgNotificationFromApi);
  },

  async markNotificationRead(notificationId) {
    if (USE_MOCK_API) return { success: true };
    await axiosClient.patch(`/Notifications/${Number(notificationId)}/read`);
    return { success: true };
  },

  async markAllNotificationsRead() {
    if (USE_MOCK_API) return { success: true };
    await axiosClient.patch('/Notifications/read-all');
    return { success: true };
  },

  async getOrganizationMembers(organizationId) {
    if (!organizationId) {
      return { items: [], forbidden: false };
    }
    if (USE_MOCK_API) {
      return {
        items: [
          {
            membershipId: 1,
            userId: 101,
            fullName: 'Mock Org Coordinator',
            email: 'coordinator@org.local',
            membershipStatus: 'Approved',
            joinedAt: new Date().toISOString(),
            roles: ['OrganizationAdmin'],
          },
        ],
        forbidden: false,
      };
    }

    try {
      const response = await axiosClient.get(`/Organizations/${Number(organizationId)}/members`);
      const items = Array.isArray(response.data) ? response.data : [];
      return { items: items.map(mapOrgMemberFromApi), forbidden: false };
    } catch (err) {
      if (err?.status === 403) {
        return { items: [], forbidden: true, detail: err?.detail || err?.message };
      }
      throw err;
    }
  },

  async approveMembership(organizationId, membershipId) {
    const response = await axiosClient.patch(
      `/Organizations/${Number(organizationId)}/members/${Number(membershipId)}/approve`
    );
    return response.data;
  },

  async rejectMembership(organizationId, membershipId) {
    const response = await axiosClient.patch(
      `/Organizations/${Number(organizationId)}/members/${Number(membershipId)}/reject`
    );
    return response.data;
  },

  async addMemberByEmail(organizationId, email) {
    const response = await axiosClient.post(
      `/Organizations/${Number(organizationId)}/members`,
      { email: String(email || '').trim().toLowerCase() }
    );
    return response.data;
  },

  async getOrganizationRoles(organizationId) {
    if (!organizationId || USE_MOCK_API) {
      return { items: [], forbidden: false };
    }
    try {
      const response = await axiosClient.get(`/Organizations/${Number(organizationId)}/roles`);
      const items = Array.isArray(response.data) ? response.data : [];
      return { items, forbidden: false };
    } catch (err) {
      if (err?.status === 403) {
        return { items: [], forbidden: true };
      }
      throw err;
    }
  },

  async createOrganizationRole(organizationId, payload) {
    const response = await axiosClient.post(
      `/Organizations/${Number(organizationId)}/roles`,
      payload
    );
    return response.data;
  },

  async assignMemberRoles(organizationId, membershipId, roleIds) {
    const response = await axiosClient.put(
      `/Organizations/${Number(organizationId)}/members/${Number(membershipId)}/roles`,
      { roleIds }
    );
    return response.data;
  },

  async getDashboard(organizationId) {
    if (USE_MOCK_API || !organizationId) return null;
    const response = await axiosClient.get(`/organizations/${Number(organizationId)}/dashboard`);
    return response.data;
  },

  async getLogistics(organizationId) {
    if (USE_MOCK_API || !organizationId) {
      return { warehouses: [], inventories: [], allocations: [] };
    }
    const response = await axiosClient.get(`/organizations/${Number(organizationId)}/logistics`);
    const data = response.data || {};
    return {
      warehouses: Array.isArray(data.warehouses) ? data.warehouses : [],
      inventories: Array.isArray(data.inventories) ? data.inventories.map(mapOrgInventoryFromApi) : [],
      allocations: Array.isArray(data.allocations) ? data.allocations.map(mapOrgAllocationFromApi) : [],
    };
  },

  async removeOrganizationMember(organizationId, membershipId) {
    if (USE_MOCK_API) return { success: true };
    await axiosClient.delete(`/Organizations/${Number(organizationId)}/members/${Number(membershipId)}`);
    return { success: true };
  },

  async getResourceAllocations() {
    if (USE_MOCK_API) {
      return { items: [], forbidden: false, scope: 'mock' };
    }
    try {
      const response = await axiosClient.get('/ResourceAllocations');
      const items = Array.isArray(response.data) ? response.data : [];
      return { items: items.map(mapOrgAllocationFromApi), forbidden: false, scope: 'all' };
    } catch (err) {
      if (err?.status === 403) {
        try {
          const myRes = await axiosClient.get('/ResourceAllocations/my');
          const myItems = Array.isArray(myRes.data) ? myRes.data : [];
          return { items: myItems.map(mapOrgAllocationFromApi), forbidden: false, scope: 'my' };
        } catch (innerErr) {
          if (innerErr?.status === 403) {
            return { items: [], forbidden: true, scope: 'none' };
          }
          throw innerErr;
        }
      }
      throw err;
    }
  },

  async getWarehouseInventories() {
    if (USE_MOCK_API) {
      return { items: [], forbidden: false };
    }
    try {
      const response = await axiosClient.get('/WarehouseInventories');
      const items = Array.isArray(response.data) ? response.data : [];
      return { items: items.map(mapOrgInventoryFromApi), forbidden: false };
    } catch (err) {
      if (err?.status === 403) {
        return { items: [], forbidden: true };
      }
      throw err;
    }
  },
};
