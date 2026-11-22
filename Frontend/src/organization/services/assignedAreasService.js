/**
 * Geographic Areas / Assigned Areas Service for ReliefLink Organization Portal
 *
 * Connected to .NET 10 ASP.NET Core Web API via centralized axiosClient:
 *  - GET /api/Areas
 *  - GET /api/Areas/{id}
 *
 * Note: The backend Areas API stores geographical hierarchy records (Province, District,
 * DS Division, GN Division, Custom), not organization-level operational assignments.
 * Unsupported operational mutations fail cleanly with a normalized 501 error in live mode.
 * Mock operational behavior is strictly isolated to USE_MOCK_API === true.
 */

import { initialAssignedAreas } from '../data/mockAssignedAreas';
import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient';

function cloneMockAreas() {
  return initialAssignedAreas.map((area) => ({
    ...area,
    assignedTeams: Array.isArray(area.assignedTeams) ? [...area.assignedTeams] : [],
    coordinates: Array.isArray(area.coordinates) ? [...area.coordinates] : null,
  }));
}

let inMemoryAreas = cloneMockAreas();

function mapAreaFromApi(item) {
  return {
    areaId: item?.areaId,
    areaName: item?.areaName ?? '',
    areaType: item?.areaType ?? '',
    parentAreaId: item?.parentAreaId ?? null,
    parentAreaName: item?.parentAreaName ?? null,
    code: item?.code ?? null,
    isActive: Boolean(item?.isActive),
  };
}

function createUnsupportedError(detail) {
  return {
    status: 501,
    title: 'Not Supported',
    detail,
    message: detail,
  };
}

export const assignedAreasService = {
  /**
   * Fetch all geographic areas (GET /api/Areas)
   */
  async getAllAssignedAreas({ simulateLoading: _simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Geographic Areas Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    if (USE_MOCK_API) {
      return inMemoryAreas.map((a) => ({
        ...a,
        assignedTeams: Array.isArray(a.assignedTeams) ? [...a.assignedTeams] : [],
      }));
    }

    const response = await axiosClient.get('/Areas');
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapAreaFromApi);
  },

  /**
   * Get single area by ID (GET /api/Areas/{id})
   */
  async getAreaById(id) {
    if (USE_MOCK_API) {
      const found = inMemoryAreas.find((a) => String(a.areaId) === String(id));
      if (!found) throw new Error(`Area ${id} not found.`);
      return {
        ...found,
        assignedTeams: Array.isArray(found.assignedTeams) ? [...found.assignedTeams] : [],
      };
    }

    const response = await axiosClient.get(`/Areas/${id}`);
    return mapAreaFromApi(response.data);
  },

  /**
   * Assign a new area record (mock-only; no backend organization assignment endpoint exists)
   */
  async assignNewArea(areaData) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Organization area assignment is not supported by the backend Areas API. Backend Areas stores geographical hierarchy records only.'
      );
    }

    const nextNum = 100 + inMemoryAreas.length + 1;
    const newArea = {
      areaId: `AREA-${nextNum}`,
      areaName: areaData.areaName.trim(),
      district: areaData.district,
      province: areaData.province || 'Western',
      coordinates: areaData.coordinates || [6.9271, 79.8612],
      crisisType: areaData.crisisType || 'Flood',
      riskLevel: areaData.riskLevel || 'Medium',
      affectedCitizens: Number(areaData.affectedCitizens) || 0,
      assignedTeams: Array.isArray(areaData.assignedTeams) ? [...areaData.assignedTeams] : [],
      responseStatus: areaData.responseStatus || 'Awaiting Assignment',
      primaryContact: areaData.primaryContact?.trim() || 'District Disaster Officer (+94 11 269 4487)',
      shelterCount: Number(areaData.shelterCount) || 1,
      shelterCapacity: Number(areaData.shelterCapacity) || 500,
      linkedIncident: areaData.linkedIncident?.trim() || 'Active Humanitarian Operation',
      notes: areaData.notes?.trim() || 'Initial field coverage registration.',
      lastAssessmentDate: new Date().toISOString()
    };

    inMemoryAreas = [newArea, ...inMemoryAreas];
    return { ...newArea };
  },

  /**
   * Update operational area details (mock-only; operational fields are not stored in backend Areas)
   */
  async updateArea(id, updateData) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Updating operational area assignments is not supported by the backend Areas API.'
      );
    }

    const idx = inMemoryAreas.findIndex((a) => String(a.areaId) === String(id));
    if (idx === -1) throw new Error(`Area ${id} not found.`);

    const updated = {
      ...inMemoryAreas[idx],
      ...updateData,
      affectedCitizens: Number(updateData.affectedCitizens) || inMemoryAreas[idx].affectedCitizens,
      lastAssessmentDate: new Date().toISOString()
    };

    inMemoryAreas[idx] = updated;
    return { ...updated };
  },

  /**
   * Assign teams to an area (mock-only; unsupported in backend)
   */
  async assignTeamsToArea(id, teamNames) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Assigning response teams to areas is not supported by the backend Areas API.'
      );
    }

    const idx = inMemoryAreas.findIndex((a) => String(a.areaId) === String(id));
    if (idx === -1) throw new Error(`Area ${id} not found.`);

    inMemoryAreas[idx] = {
      ...inMemoryAreas[idx],
      assignedTeams: [...teamNames],
      responseStatus: teamNames.length > 0 ? 'Active Response' : 'Awaiting Assignment',
      lastAssessmentDate: new Date().toISOString()
    };

    return { ...inMemoryAreas[idx] };
  },

  /**
   * Update operational status & risk level (mock-only; unsupported in backend)
   */
  async updateStatusAndRisk(id, newStatus, newRiskLevel) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Updating operational response status and risk levels is not supported by the backend Areas API.'
      );
    }

    const idx = inMemoryAreas.findIndex((a) => String(a.areaId) === String(id));
    if (idx === -1) throw new Error(`Area ${id} not found.`);

    inMemoryAreas[idx] = {
      ...inMemoryAreas[idx],
      responseStatus: newStatus || inMemoryAreas[idx].responseStatus,
      riskLevel: newRiskLevel || inMemoryAreas[idx].riskLevel,
      lastAssessmentDate: new Date().toISOString()
    };

    return { ...inMemoryAreas[idx] };
  },

  /**
   * Reset in-memory mock data (mock-only)
   */
  resetToDefaults() {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Resetting default mock areas is only available when mock mode is enabled.'
      );
    }

    inMemoryAreas = cloneMockAreas();
    return inMemoryAreas.map((a) => ({ ...a }));
  }
};
