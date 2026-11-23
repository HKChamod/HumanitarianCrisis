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
    // Frontend-only fields with no backend equivalent (non-fabricated safe defaults)
    phone: '',
    nic: '',
    assignedTeam: null,
    notes: '',
  };
}

export const aidRequestsService = {
  /**
   * Fetch all citizen/aid requests (GET /api/CitizenRequests)
   */
  async getAllAidRequests({ simulateLoading: _simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Aid Requests Management Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    if (USE_MOCK_API) {
      return mockRequestsStore.map((item) => ({ ...item }));
    }

    const response = await axiosClient.get('/CitizenRequests');
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
   * Update request status (PATCH /api/CitizenRequests/{id}/status)
   */
  async updateStatus(id, newStatus) {
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

    const response = await axiosClient.patch(`/CitizenRequests/${id}/status`, {
      status: newStatus,
    });
    return mapCitizenRequestFromApi(response.data);
  },

  /**
   * Assign Response Team (mock-only; no backend endpoint exists)
   */
  async assignTeam(id, teamName) {
    if (USE_MOCK_API) {
      const item = mockRequestsStore.find((r) => String(r.requestId) === String(id));
      if (item) {
        item.assignedTeam = teamName;
        if (item.status === 'Pending Review' && teamName !== 'Unassigned') {
          item.status = 'In Progress';
        }
      }
      return { requestId: id, assignedTeam: teamName };
    }

    const detail =
      'Response team assignment is not supported by the backend CitizenRequests API.';
    throw {
      status: 501,
      title: 'Not Supported',
      detail,
      message: detail,
    };
  },
};
