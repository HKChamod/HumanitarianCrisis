import { MAP_ENTITY_TYPES } from '../constants/mapConstants.js';
import { parseCoordinates } from '../utils/coordinateUtils.js';

/**
 * Standardized HCMS Map Data Contract:
 * {
 *   id: string,
 *   type: string,
 *   title: string,
 *   latitude: number,
 *   longitude: number,
 *   status: string,
 *   properties: {}
 * }
 */

function extractLatLng(dto) {
  const latRaw =
    dto?.latitude ??
    dto?.lat ??
    dto?.coordinates?.lat ??
    dto?.coordinates?.latitude ??
    dto?.location?.latitude ??
    dto?.location?.lat ??
    null;
  const lngRaw =
    dto?.longitude ??
    dto?.lng ??
    dto?.lon ??
    dto?.coordinates?.lng ??
    dto?.coordinates?.longitude ??
    dto?.location?.longitude ??
    dto?.location?.lng ??
    null;
  return parseCoordinates(latRaw, lngRaw);
}

export function adaptCrisisToMapItem(dto) {
  const coords = extractLatLng(dto);
  if (!coords) return null;

  return {
    id: `crisis-${dto.crisisId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.CRISIS,
    title: dto.crisisName || dto.title || 'Crisis Event',
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.status || 'Active',
    properties: {
      entityId: dto.crisisId ?? dto.id,
      crisisType: dto.crisisType || '',
      severityLevel: dto.severityLevel || dto.severity || 'Medium',
      districtName: dto.districtName || dto.district || dto.location?.districtName || '',
      description: dto.description || '',
      startDate: dto.startDate || null,
    },
  };
}

export function adaptShelterToMapItem(dto) {
  const coords = extractLatLng(dto);
  if (!coords) return null;

  const capacity = Number(dto.capacity ?? dto.totalBeds ?? 0);
  const occupancy = Number(dto.currentOccupancy ?? dto.usedBeds ?? 0);

  return {
    id: `shelter-${dto.shelterId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.SHELTER,
    title: dto.shelterName || dto.name || 'Emergency Shelter',
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.status || 'Open',
    properties: {
      entityId: dto.shelterId ?? dto.id,
      areaName: dto.areaName || dto.districtName || '',
      address: dto.address || '',
      capacity,
      currentOccupancy: occupancy,
      availableCapacity: Math.max(0, capacity - occupancy),
      phone: dto.contactPhone || dto.phone || '',
    },
  };
}

export function adaptOrganizationToMapItem(dto) {
  const coords = extractLatLng(dto);
  if (!coords) return null;

  return {
    id: `org-${dto.organizationId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.ORGANIZATION,
    title: dto.organizationName || dto.name || 'Organization',
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.isActive === false ? 'Inactive' : dto.status || 'Active',
    properties: {
      entityId: dto.organizationId ?? dto.id,
      organizationType: dto.organizationType || dto.type || '',
      address: dto.address || '',
    },
  };
}

export function adaptCitizenRequestToMapItem(dto, { includeAddress = false } = {}) {
  const coords = extractLatLng(dto);
  if (!coords) return null;

  return {
    id: `request-${dto.requestId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.CITIZEN_REQUEST,
    title: `${dto.requestType || dto.category || 'Assistance'} Request #${dto.requestId ?? dto.id}`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.status || 'Pending',
    properties: {
      entityId: dto.requestId ?? dto.id,
      requestType: dto.requestType || dto.category || '',
      urgencyLevel: dto.urgencyLevel || dto.urgency || 'Medium',
      peopleCount: Number(dto.peopleCount ?? dto.peopleAffected ?? 1),
      areaName: dto.areaName || '',
      address: includeAddress ? dto.address || '' : '',
    },
  };
}

export function adaptWarehouseToMapItem(dto) {
  const coords = extractLatLng(dto);
  if (!coords) return null;

  return {
    id: `warehouse-${dto.warehouseId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.WAREHOUSE,
    title: dto.warehouseName || dto.name || 'Warehouse',
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.isActive === false ? 'Inactive' : 'Active',
    properties: {
      entityId: dto.warehouseId ?? dto.id,
      warehouseCode: dto.warehouseCode || '',
      areaName: dto.areaName || '',
      address: dto.address || '',
    },
  };
}

export function adaptVolunteerToMapItem(dto, { allowExact = false } = {}) {
  if (!allowExact) return null;
  const coords = extractLatLng(dto);
  if (!coords) return null;

  return {
    id: `volunteer-${dto.volunteerId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.VOLUNTEER,
    title: dto.fullName || 'Volunteer',
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.availabilityStatus || 'Available',
    properties: {
      entityId: dto.volunteerId ?? dto.id,
      areaName: dto.areaName || '',
      approvalStatus: dto.approvalStatus || '',
    },
  };
}

export function adaptAiRecommendationToMapItem(dto) {
  const coords = extractLatLng(dto);
  if (!coords) return null;

  return {
    id: `ai-rec-${dto.recommendationId ?? dto.id}`,
    type: MAP_ENTITY_TYPES.AI_RECOMMENDATION,
    title: `AI Advisory #${dto.recommendationId ?? dto.id} (${dto.suggestedCategory || 'Triage'})`,
    latitude: coords.latitude,
    longitude: coords.longitude,
    status: dto.reviewStatus || 'PendingReview',
    properties: {
      entityId: dto.recommendationId ?? dto.id,
      citizenRequestId: dto.citizenRequestId ?? null,
      urgencyLevel: dto.suggestedUrgencyLevel || 'Medium',
      confidenceScore: dto.confidenceScore ?? null,
      isAdvisoryRecommendation: true,
    },
  };
}

export function adaptCollectionToMapItems(records = [], adapterFn) {
  if (!Array.isArray(records) || typeof adapterFn !== 'function') {
    return { items: [], missingCoordinatesCount: 0 };
  }

  const items = [];
  let missingCoordinatesCount = 0;

  for (const record of records) {
    const adapted = adapterFn(record);
    if (adapted) {
      items.push(adapted);
    } else {
      missingCoordinatesCount += 1;
    }
  }

  return { items, missingCoordinatesCount };
}
