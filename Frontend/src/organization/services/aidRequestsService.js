/**
 * Aid Requests / Citizen Requests API Service for ReliefLink Organization Portal
 *
 * Connected to .NET 10 ASP.NET Core Web API via centralized axiosClient:
 *  - GET /api/CitizenRequests
 *  - GET /api/CitizenRequests/{id}
 *  - PATCH /api/CitizenRequests/{id}/status
 *
 * Note: Team assignment has no backend endpoint and fails cleanly in live mode.
 * Mock data is strictly isolated to USE_MOCK_API === true.
 */

import { mockAidRequests } from '../data/mockAidRequests';
import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient';

export const BACKEND_REQUEST_STATUSES = [
  'Pending',
  'Verified',
  'Assigned',
  'Fulfilled',
  'Rejected',
];

export const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ['Verified', 'Rejected'],
  Verified: ['Assigned', 'Rejected'],
  Assigned: ['Fulfilled'],
  Fulfilled: [],
  Rejected: [],
};

let mockRequestsStore = mockAidRequests.map((item) => ({ ...item }));

function mapCitizenRequestFromApi(item) {
  return {
    requestId: item?.requestId,
    userId: item?.userId ?? null,
    requester: item?.citizenName ?? '',
    crisisId: item?.crisisId ?? null,
    crisisName: item?.crisisName ?? '',
    areaId: item?.areaId ?? null,
    areaName: item?.areaName ?? '',
    district: item?.areaName ?? '',
    aidCategory: item?.requestType ?? '',
    description: item?.description ?? '',
    priority: item?.urgencyLevel ?? 'Medium',
    affectedPersons: item?.peopleCount ?? 0,
    status: item?.status ?? 'Pending',
    location: item?.address ?? '',
    latitude: item?.latitude ?? null,
    longitude: item?.longitude ?? null,
    requestedDate: item?.createdAt ?? null,
    updatedAt: item?.updatedAt ?? null,
    isInAssignedArea: Boolean(item?.isInAssignedArea),
    assignedTeamId: item?.assignedTeamId ?? null,
    assignedTeam: item?.assignedTeamName ?? null,
    activeDeploymentId: item?.activeDeploymentId ?? null,
    phone: '',
    nic: '',
    notes: '',
  };
}

export const aidRequestsService = {
  /**
   * Fetch organization-scoped citizen/aid requests (GET /api/organizations/{orgId}/aid-requests)
   */
  async getAllAidRequests({ organizationId, simulateLoading: _simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Aid Requests Management Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    if (USE_MOCK_API) {
      return mockRequestsStore.map((item) => ({ ...item }));
    }

    const endpoint = organizationId
      ? `/organizations/${Number(organizationId)}/aid-requests`
      : '/CitizenRequests';
    const response = await axiosClient.get(endpoint);
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapCitizenRequestFromApi);
  },

  /**
   * Fetch single request by ID (GET /api/CitizenRequests/{id})
   */
  async getAidRequestById(id) {
    if (USE_MOCK_API) {
      const found = mockRequestsStore.find((r) => String(r.requestId) === String(id));
      if (!found) throw new Error(`Aid request ${id} not found.`);
      return { ...found };
    }

    const response = await axiosClient.get(`/CitizenRequests/${id}`);
    return mapCitizenRequestFromApi(response.data);
  },

  /**
   * Update request status (PATCH /api/organizations/{orgId}/aid-requests/{id}/status)
   */
  async updateStatus(id, newStatus, organizationId = null) {
    if (USE_MOCK_API) {
      const item = mockRequestsStore.find((r) => String(r.requestId) === String(id));
      if (item) {
        item.status = newStatus;
      }
      return { requestId: id, status: newStatus };
    }

    if (!BACKEND_REQUEST_STATUSES.includes(newStatus)) {
      const detail = `Unsupported status "${newStatus}". Allowed backend statuses: ${BACKEND_REQUEST_STATUSES.join(', ')}.`;
      throw {
        status: 400,
        title: 'Invalid Status',
        detail,
        message: detail,
      };
    }

    const endpoint = organizationId
      ? `/organizations/${Number(organizationId)}/aid-requests/${Number(id)}/status`
      : `/CitizenRequests/${Number(id)}/status`;
    const response = await axiosClient.patch(endpoint, {
      status: newStatus,
    });
    return mapCitizenRequestFromApi(response.data);
  },

  /**
   * Assign Response Team (POST /api/organizations/{orgId}/aid-requests/{id}/assign-team)
   */
  async assignTeam(id, teamIdOrName, organizationId = null, notes = '') {
    if (USE_MOCK_API) {
      const item = mockRequestsStore.find((r) => String(r.requestId) === String(id));
      if (item) {
        item.assignedTeam = teamIdOrName;
        if (item.status === 'Pending Review' && teamIdOrName !== 'Unassigned') {
          item.status = 'In Progress';
        }
      }
      return { requestId: id, assignedTeam: teamIdOrName };
    }

    if (!organizationId) {
      throw {
        status: 400,
        title: 'No Active Organization',
        detail: 'An active organization is required to assign a response team.',
        message: 'An active organization is required to assign a response team.',
      };
    }

    const response = await axiosClient.post(
      `/organizations/${Number(organizationId)}/aid-requests/${Number(id)}/assign-team`,
      {
        responseTeamId: Number(teamIdOrName),
        notes: notes?.trim() || null,
      }
    );
    return mapCitizenRequestFromApi(response.data);
  },
};
