/**
 * Geographic Areas / Assigned Areas Service for ReliefLink Organization Portal
 *
 * Live Mode (USE_MOCK_API === false):
 *  - GET    /api/Areas (global area catalog for selection)
 *  - GET    /api/organizations/{orgId}/areas
 *  - POST   /api/organizations/{orgId}/areas
 *  - PUT    /api/organizations/{orgId}/areas/{organizationAreaId}
 *  - DELETE /api/organizations/{orgId}/areas/{organizationAreaId}
 */

import { initialAssignedAreas } from '../data/mockAssignedAreas.js';
import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient.js';

function cloneMockAreas() {
  return initialAssignedAreas.map((area) => ({
    ...area,
    assignedTeams: Array.isArray(area.assignedTeams) ? [...area.assignedTeams] : [],
    coordinates: Array.isArray(area.coordinates) ? [...area.coordinates] : null,
  }));
}

let inMemoryAreas = cloneMockAreas();

export function mapAssignedAreaFromApi(item) {
  const lat = item?.latitude != null ? Number(item.latitude) : null;
  const lng = item?.longitude != null ? Number(item.longitude) : null;
  return {
    organizationAreaId: item?.organizationAreaId ?? null,
    areaId: item?.areaId,
    areaName: item?.areaName ?? '',
    areaType: item?.areaType ?? '',
    district: item?.parentAreaName || item?.areaName || '',
    parentAreaName: item?.parentAreaName ?? null,
    code: item?.code ?? null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null,
    assignmentStatus: item?.assignmentStatus ?? 'Active',
    responseStatus: item?.assignmentStatus ?? 'Active',
    primaryContact: item?.primaryContact ?? '',
    notes: item?.notes ?? '',
    assignedAt: item?.assignedAt ?? null,
    activeCrisesCount: Number(item?.activeCrisesCount ?? 0),
    openRequestsCount: Number(item?.openRequestsCount ?? 0),
    assignedTeamsCount: Number(item?.assignedTeamsCount ?? 0),
    isActive: item?.assignmentStatus === 'Active',
  };
}

function mapCatalogAreaFromApi(item) {
  return {
    areaId: item?.areaId,
    areaName: item?.areaName ?? '',
    areaType: item?.areaType ?? '',
    parentAreaId: item?.parentAreaId ?? null,
    parentAreaName: item?.parentAreaName ?? null,
    code: item?.code ?? null,
    latitude: item?.latitude ?? null,
    longitude: item?.longitude ?? null,
    isActive: Boolean(item?.isActive),
  };
}

function requireOrgId(organizationId) {
  const id = Number(organizationId);
  if (!id || Number.isNaN(id)) {
    throw {
      status: 400,
      title: 'No Active Organization',
      detail: 'Select an active organization before managing assigned areas.',
      message: 'Select an active organization before managing assigned areas.',
    };
  }
  return id;
}

export const assignedAreasService = {
  async getAvailableAreas() {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await axiosClient.get('/Areas');
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapCatalogAreaFromApi).filter((a) => a.isActive);
  },

  async getAllAssignedAreas({ organizationId, simulateError = false, simulateEmpty = false } = {}) {
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

    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.get(`/organizations/${orgId}/areas`);
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapAssignedAreaFromApi);
  },

  async assignNewArea(organizationId, areaData) {
    if (USE_MOCK_API) {
      const nextNum = 100 + inMemoryAreas.length + 1;
      const newArea = {
        areaId: `AREA-${nextNum}`,
        areaName: areaData.areaName?.trim() || 'Assigned Zone',
        district: areaData.district || '',
        assignmentStatus: areaData.assignmentStatus || 'Active',
        responseStatus: areaData.assignmentStatus || 'Active',
        primaryContact: areaData.primaryContact?.trim() || '',
        notes: areaData.notes?.trim() || '',
        assignedAt: new Date().toISOString(),
      };
      inMemoryAreas = [newArea, ...inMemoryAreas];
      return { ...newArea };
    }

    const orgId = requireOrgId(organizationId);
    const payload = {
      areaId: Number(areaData.areaId),
      assignmentStatus: areaData.assignmentStatus || 'Active',
      primaryContact: areaData.primaryContact?.trim() || null,
      notes: areaData.notes?.trim() || null,
    };
    const response = await axiosClient.post(`/organizations/${orgId}/areas`, payload);
    return mapAssignedAreaFromApi(response.data);
  },

  async updateArea(organizationId, organizationAreaId, updateData) {
    if (USE_MOCK_API) {
      const idx = inMemoryAreas.findIndex((a) => String(a.areaId) === String(organizationAreaId));
      if (idx === -1) throw new Error(`Area ${organizationAreaId} not found.`);
      inMemoryAreas[idx] = { ...inMemoryAreas[idx], ...updateData };
      return { ...inMemoryAreas[idx] };
    }

    const orgId = requireOrgId(organizationId);
    const payload = {
      assignmentStatus: updateData.assignmentStatus || 'Active',
      primaryContact: updateData.primaryContact?.trim() || null,
      notes: updateData.notes?.trim() || null,
    };
    const response = await axiosClient.put(
      `/organizations/${orgId}/areas/${Number(organizationAreaId)}`,
      payload
    );
    return mapAssignedAreaFromApi(response.data);
  },

  async removeArea(organizationId, organizationAreaId) {
    if (USE_MOCK_API) {
      inMemoryAreas = inMemoryAreas.filter((a) => String(a.areaId) !== String(organizationAreaId));
      return { success: true };
    }

    const orgId = requireOrgId(organizationId);
    await axiosClient.delete(`/organizations/${orgId}/areas/${Number(organizationAreaId)}`);
    return { success: true };
  },

  resetToDefaults() {
    inMemoryAreas = cloneMockAreas();
    return inMemoryAreas.map((a) => ({ ...a }));
  },
};
