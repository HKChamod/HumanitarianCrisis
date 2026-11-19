import { axiosClient, USE_MOCK_API } from './axiosClient';
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

export const crisisService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/crisisevents');
      return res.data;
    }
    await delay();
    return [...crisisStore];
  },
  async getById(id) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get(`/crisisevents/${id}`);
      return res.data;
    }
    await delay(100);
    return crisisStore.find((c) => c.id === id);
  },
  async create(payload) {
    if (!USE_MOCK_API) {
      const res = await axiosClient.post('/crisisevents', payload);
      return res.data;
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
      const res = await axiosClient.put(`/crisisevents/${id}`, payload);
      return res.data;
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
      return res.data;
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
};

export const assistanceRequestService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/citizenrequests');
      return res.data;
    }
    await delay();
    return [...requestStore];
  },
  async updateStatus(id, status, note, assignedOrganization) {
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
      return res.data;
    }
    await delay();
    return [...orgStore];
  },
  async updateStatus(id, status) {
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
  async listMemberships() {
    await delay();
    return [...membershipStore];
  },
};

export const userService = {
  isMock: true,
  async list() {
    await delay();
    return [...userStore];
  },
  async toggleActive(id) {
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
};

export const roleService = {
  isMock: true,
  async list() {
    await delay();
    return [...roleStore];
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
  isMock: true,
  async list() {
    await delay();
    return [...MOCK_PERMISSIONS];
  },
};

export const resourceService = {
  isMock: USE_MOCK_API,
  async list() {
    if (!USE_MOCK_API) {
      const res = await axiosClient.get('/resources');
      return res.data;
    }
    await delay();
    return [...resourceStore];
  },
  async create(payload) {
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
  async listAllocations() {
    await delay();
    return [...allocationStore];
  },
  async createAllocation(payload) {
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

export const shelterService = {
  isMock: true,
  async list() {
    await delay();
    return [...shelterStore];
  },
};

export const volunteerService = {
  isMock: true,
  async list() {
    await delay();
    return [...volunteerStore];
  },
  async listAssignments() {
    await delay();
    return [...volunteerAssignmentStore];
  },
  async createAssignment(payload) {
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
};

export const donationService = {
  isMock: true,
  async list() {
    await delay();
    return [...donationStore];
  },
  async listCampaigns() {
    await delay();
    return [...campaignStore];
  },
};

export const aiRecommendationService = {
  isMock: true,
  async list() {
    await delay();
    return [...aiRecommendationStore];
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
  isMock: true,
  async list() {
    await delay(100);
    return [...notificationStore];
  },
  async markAsRead(id) {
    notificationStore = notificationStore.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    return [...notificationStore];
  },
  async markAllAsRead() {
    notificationStore = notificationStore.map((n) => ({ ...n, isRead: true }));
    return [...notificationStore];
  },
};

export const auditLogService = {
  isMock: true,
  async list() {
    await delay();
    return [...auditLogStore];
  },
};

export const reportService = {
  isMock: true,
  async getDashboardSnapshot() {
    const [crises, requests, organizations, users, resources, shelters, volunteers, aiRecommendations] =
      await Promise.all([
        crisisService.list(),
        assistanceRequestService.list(),
        organizationService.list(),
        userService.list(),
        resourceService.list(),
        shelterService.list(),
        volunteerService.list(),
        aiRecommendationService.list(),
      ]);

    return {
      isMock: USE_MOCK_API,
      crises,
      requests,
      organizations,
      users,
      resources,
      shelters,
      volunteers,
      aiRecommendations,
      recentActivities: [...activityStore],
    };
  },
};
