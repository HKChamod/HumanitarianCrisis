/**
 * DTO mappers aligning the React frontend models with the verified .NET 10 backend DTOs:
 * - CrisisEventResponse / CreateCrisisEventRequest
 * - CitizenRequestResponse
 * - OrganizationResponse
 * - ResourceResponse
 */

export function mapCrisisFromApi(dto) {
  return {
    id: String(dto.crisisId ?? dto.id),
    crisisName: dto.crisisName || '',
    crisisType: dto.crisisType || 'Flood',
    description: dto.description || '',
    severity: dto.severityLevel || dto.severity || 'Medium',
    status: dto.status || 'Active',
    startDate: dto.startDate || new Date().toISOString(),
    reportedDate: dto.startDate || new Date().toISOString(),
    location: dto.location || {
      provinceId: '',
      provinceName: 'Sri Lanka',
      districtId: '',
      districtName: 'National',
    },
    relatedRequestCount: dto.relatedRequestCount ?? 0,
    assignedOrganizations: dto.assignedOrganizations ?? [],
  };
}

export function mapCrisisCreateToApi(payload) {
  return {
    crisisName: payload.crisisName,
    crisisType: payload.crisisType,
    description: payload.description,
    severityLevel: payload.severity,
    startDate: payload.startDate,
    status: payload.status || 'Active',
  };
}

export function mapRequestFromApi(dto) {
  return {
    id: String(dto.requestId ?? dto.id),
    referenceNumber: dto.referenceNumber || `REQ-${dto.requestId}`,
    citizenName: dto.citizenName || 'Citizen',
    contactPhone: dto.contactPhone || '—',
    category: dto.requestType || dto.category || 'Other',
    description: dto.description || '',
    peopleAffected: dto.peopleCount ?? dto.peopleAffected ?? 1,
    urgency: dto.urgencyLevel || dto.urgency || 'Medium',
    status: dto.status || 'Pending',
    crisisId: dto.crisisId ? String(dto.crisisId) : undefined,
    crisisName: dto.crisisName || undefined,
    location: {
      provinceId: '',
      provinceName: '',
      districtId: '',
      districtName: dto.areaName || 'Unspecified Area',
      dsDivisionName: dto.address || '',
      latitude: dto.latitude ?? undefined,
      longitude: dto.longitude ?? undefined,
    },
    submittedAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || dto.createdAt || new Date().toISOString(),
    reviewHistory: dto.reviewHistory ?? [],
  };
}

export function mapOrganizationFromApi(dto) {
  return {
    id: String(dto.organizationId ?? dto.id),
    name: dto.organizationName || dto.name || '',
    type: dto.organizationType || dto.type || 'NGO',
    registrationNumber: dto.registrationNumber || '—',
    status: dto.status || (dto.isActive ? 'Active' : 'Suspended'),
    contactPerson: dto.contactPerson || 'Primary Coordinator',
    contactEmail: dto.email || dto.contactEmail || '—',
    contactPhone: dto.phoneNumber || dto.contactPhone || '—',
    province: dto.province || 'Sri Lanka',
    district: dto.address || dto.district || '—',
    memberCount: dto.memberCount ?? 0,
    activeCrisisCount: dto.activeCrisisCount ?? 0,
    registeredAt: dto.createdAt || new Date().toISOString(),
  };
}

export function mapResourceFromApi(dto) {
  return {
    id: String(dto.resourceId ?? dto.id),
    name: dto.resourceName || dto.name || '',
    category: dto.resourceCategory || dto.category || 'General',
    unit: dto.unitOfMeasure || dto.unit || 'Units',
    availableQuantity: dto.availableQuantity ?? 0,
    allocatedQuantity: dto.allocatedQuantity ?? 0,
    reorderThreshold: dto.reorderThreshold ?? 50,
    warehouseName: dto.warehouseName || 'Central Catalogue',
    organizationName: dto.organizationName || 'HCMS Registry',
    district: dto.district || 'National',
    condition: dto.condition || (dto.isPerishable ? 'Fair' : 'Good'),
    updatedAt: dto.createdAt || new Date().toISOString(),
  };
}

export function mapResourceCreateToApi(payload) {
  return {
    resourceName: payload.name,
    resourceCategory: payload.category,
    description: `${payload.name} (${payload.warehouseName || 'Central Depot'})`,
    unitOfMeasure: payload.unit,
    isPerishable: payload.condition === 'Expiring Soon',
  };
}

export function mapResourceUpdateToApi(payload) {
  return {
    resourceName: payload.name,
    resourceCategory: payload.category,
    description: payload.description || `${payload.name} (${payload.warehouseName || 'Central Depot'})`,
    unitOfMeasure: payload.unit,
    isPerishable: payload.condition === 'Expiring Soon',
    isActive: payload.isActive ?? true,
  };
}

export function mapOrganizationCreateToApi(payload) {
  return {
    organizationName: payload.name,
    organizationType: payload.type || 'NGO',
    registrationNumber: payload.registrationNumber || null,
    description: payload.description || null,
    email: payload.contactEmail || null,
    phoneNumber: payload.contactPhone || null,
    address: payload.district || payload.address || null,
  };
}

export function mapOrganizationUpdateToApi(org, isActive) {
  return {
    organizationName: org.name,
    organizationType: org.type || 'NGO',
    registrationNumber: org.registrationNumber === '—' ? null : org.registrationNumber,
    description: org.description || null,
    email: org.contactEmail === '—' ? null : org.contactEmail,
    phoneNumber: org.contactPhone === '—' ? null : org.contactPhone,
    address: org.district === '—' ? null : org.district,
    isActive,
  };
}

export function mapRequestStatusToApi(status) {
  if (status === 'Approved') return 'Verified';
  if (status === 'Completed') return 'Fulfilled';
  if (['Pending', 'Verified', 'Assigned', 'Fulfilled', 'Rejected'].includes(status)) return status;
  return 'Pending';
}

export function mapMemberFromApi(dto, orgId, orgName) {
  return {
    id: String(dto.membershipId ?? dto.id),
    userId: String(dto.userId ?? ''),
    userName: dto.fullName || dto.userName || 'Member',
    userEmail: dto.email || dto.userEmail || '—',
    organizationId: String(orgId),
    organizationName: orgName,
    scopedRole: Array.isArray(dto.roles) && dto.roles.length > 0 ? dto.roles.join(', ') : dto.scopedRole || 'Member',
    status: dto.status || 'Active',
    joinedAt: dto.joinedAt || dto.createdAt || new Date().toISOString(),
  };
}
