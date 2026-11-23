/**
 * Crisis Events API Service for ReliefLink Organization Portal
 *
 * Connected to .NET 10 ASP.NET Core Web API via centralized axiosClient:
 *  - GET /api/CrisisEvents
 *  - GET /api/CrisisEvents/{id}
 *  - PATCH /api/CrisisEvents/{id}/status
 *
 * Mock data is strictly isolated to USE_MOCK_API === true.
 */

import { mockCrisisEvents } from '../data/mockCrisisEvents';
import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient';

let mockEventsStore = mockCrisisEvents.map((event) => ({ ...event }));

function mapCrisisEventFromApi(item) {
  return {
    crisisId: item?.crisisId,
    crisisName: item?.crisisName ?? '',
    crisisType: item?.crisisType ?? '',
    description: item?.description ?? '',
    severityLevel: item?.severityLevel ?? 'Low',
    startDate: item?.startDate ?? null,
    status: item?.status ?? 'Reported',
    district: item?.district ?? '',
    location: item?.location ?? '',
    affectedPopulation: item?.affectedPopulation ?? null,
    reportedBy: item?.reportedBy ?? '',
    contactNumber: item?.contactNumber ?? '',
    requiredAssistance: Array.isArray(item?.requiredAssistance)
      ? item.requiredAssistance
      : [],
    assignedTeams: Array.isArray(item?.assignedTeams)
      ? item.assignedTeams
      : [],
  };
}

export const crisisEventsService = {
  /**
   * Fetch all crisis incidents (GET /api/CrisisEvents)
   */
  async getAllCrisisEvents({ simulateLoading: _simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Crisis Events Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    if (USE_MOCK_API) {
      return mockEventsStore.map((event) => ({ ...event }));
    }

    const response = await axiosClient.get('/CrisisEvents');
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapCrisisEventFromApi);
  },

  /**
   * Fetch single incident by CrisisId (GET /api/CrisisEvents/{id})
   */
  async getCrisisEventById(id) {
    if (USE_MOCK_API) {
      const found = mockEventsStore.find((c) => c.crisisId === Number(id));
      if (!found) throw new Error(`Crisis event #${id} not found.`);
      return { ...found };
    }

    const response = await axiosClient.get(`/CrisisEvents/${id}`);
    return mapCrisisEventFromApi(response.data);
  },

  /**
   * Update Status (PATCH /api/CrisisEvents/{id}/status)
   */
  async updateCrisisStatus(id, newStatus) {
    if (USE_MOCK_API) {
      const event = mockEventsStore.find((c) => c.crisisId === Number(id));
      if (event) {
        event.status = newStatus;
        event.lastUpdated = new Date().toISOString();
      }
      return { crisisId: Number(id), status: newStatus };
    }

    const response = await axiosClient.patch(`/CrisisEvents/${id}/status`, {
      status: newStatus,
    });
    return mapCrisisEventFromApi(response.data);
  },
};
