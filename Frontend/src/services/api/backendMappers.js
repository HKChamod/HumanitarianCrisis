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

// --- Logistics & Warehouse DTO Mappers (Phase 5A) ---

export const INVENTORY_TRANSACTION_TYPE_LABELS = {
  1: 'StockIn',
  2: 'StockOut',
  3: 'Adjustment',
  4: 'TransferIn',
  5: 'TransferOut',
};

export const INVENTORY_TRANSACTION_TYPE_VALUES = {
  StockIn: 1,
  StockOut: 2,
  Adjustment: 3,
  TransferIn: 4,
  TransferOut: 5,
};

export function mapWarehouseFromApi(dto) {
  return {
    id: String(dto.warehouseId ?? dto.id),
    warehouseId: Number(dto.warehouseId ?? dto.id),
    warehouseName: dto.warehouseName ?? '',
    warehouseCode: dto.warehouseCode ?? '',
    description: dto.description ?? '',
    address: dto.address ?? '',
    areaId: Number(dto.areaId ?? 0),
    areaName: dto.areaName ?? '',
    contactPerson: dto.contactPerson ?? '',
    contactNumber: dto.contactNumber ?? '',
    isActive: typeof dto.isActive === 'boolean' ? dto.isActive : true,
    createdAt: dto.createdAt ?? null,
  };
}

export function mapWarehouseCreateToApi(payload) {
  return {
    warehouseName: (payload.warehouseName ?? '').trim(),
    warehouseCode: (payload.warehouseCode ?? '').trim(),
    description: (payload.description ?? '').trim() || null,
    address: (payload.address ?? '').trim(),
    areaId: Number(payload.areaId),
    contactPerson: (payload.contactPerson ?? '').trim() || null,
    contactNumber: (payload.contactNumber ?? '').trim() || null,
  };
}

export function mapWarehouseUpdateToApi(payload) {
  return {
    ...mapWarehouseCreateToApi(payload),
    isActive: typeof payload.isActive === 'boolean' ? payload.isActive : true,
  };
}

export function mapWarehouseInventoryFromApi(dto) {
  return {
    id: String(dto.inventoryId ?? dto.id),
    inventoryId: Number(dto.inventoryId ?? dto.id),
    warehouseId: Number(dto.warehouseId ?? 0),
    warehouseName: dto.warehouseName ?? '',
    resourceId: Number(dto.resourceId ?? 0),
    resourceName: dto.resourceName ?? '',
    resourceCategory: dto.resourceCategory ?? '',
    quantityAvailable: Number(dto.quantityAvailable ?? 0),
    reorderLevel: Number(dto.reorderLevel ?? 0),
    isLowStock: Boolean(dto.isLowStock),
    lastUpdatedAt: dto.lastUpdatedAt ?? null,
  };
}

export function mapWarehouseInventoryCreateToApi(payload) {
  return {
    warehouseId: Number(payload.warehouseId),
    resourceId: Number(payload.resourceId),
    reorderLevel: Number(payload.reorderLevel ?? 0),
  };
}

export function mapInventoryTransactionFromApi(dto) {
  const rawType = dto.transactionType;
  const typeLabel =
    typeof rawType === 'number'
      ? INVENTORY_TRANSACTION_TYPE_LABELS[rawType] || `Type-${rawType}`
      : String(rawType ?? '');

  return {
    id: String(dto.inventoryTransactionId ?? dto.id),
    inventoryTransactionId: Number(dto.inventoryTransactionId ?? dto.id),
    inventoryId: Number(dto.inventoryId ?? 0),
    warehouseName: dto.warehouseName ?? '',
    resourceName: dto.resourceName ?? '',
    transactionType: rawType,
    transactionTypeLabel: typeLabel,
    quantity: Number(dto.quantity ?? 0),
    previousQuantity: Number(dto.previousQuantity ?? 0),
    newQuantity: Number(dto.newQuantity ?? 0),
    referenceNumber: dto.referenceNumber ?? '',
    notes: dto.notes ?? '',
    performedByUserId: Number(dto.performedByUserId ?? 0),
    performedByUserName: dto.performedByUserName ?? '',
    transferGroupId: dto.transferGroupId ?? null,
    createdAt: dto.createdAt ?? null,
  };
}

export function mapInventoryTransactionCreateToApi(payload) {
  const rawType = payload.transactionType;
  const numericType =
    typeof rawType === 'number'
      ? rawType
      : INVENTORY_TRANSACTION_TYPE_VALUES[rawType] ?? Number(rawType);

  return {
    inventoryId: Number(payload.inventoryId),
    transactionType: numericType,
    quantity: Number(payload.quantity),
    referenceNumber: (payload.referenceNumber ?? '').trim() || null,
    notes: (payload.notes ?? '').trim() || null,
  };
}

export function mapInventoryTransferToApi(payload) {
  return {
    sourceInventoryId: Number(payload.sourceInventoryId),
    destinationInventoryId: Number(payload.destinationInventoryId),
    quantity: Number(payload.quantity),
    referenceNumber: (payload.referenceNumber ?? '').trim() || null,
    notes: (payload.notes ?? '').trim() || null,
  };
}

export function mapResourceAllocationFromApi(dto) {
  return {
    id: String(dto.allocationId ?? dto.id),
    allocationId: Number(dto.allocationId ?? dto.id),
    inventoryId: Number(dto.inventoryId ?? 0),
    warehouseName: dto.warehouseName ?? '',
    resourceId: Number(dto.resourceId ?? 0),
    resourceName: dto.resourceName ?? '',
    crisisId: Number(dto.crisisId ?? 0),
    crisisName: dto.crisisName ?? '',
    quantityRequested: Number(dto.quantityRequested ?? 0),
    quantityAllocated: Number(dto.quantityAllocated ?? 0),
    quantity: Number(dto.quantityAllocated > 0 ? dto.quantityAllocated : dto.quantityRequested ?? 0),
    unit: dto.unit || 'Units',
    destination: dto.crisisName || dto.warehouseName || '',
    destinationType: 'Crisis',
    status: dto.status ?? 'Pending',
    requestedByUserId: Number(dto.requestedByUserId ?? 0),
    requestedByUserName: dto.requestedByUserName ?? '',
    approvedByUserId: dto.approvedByUserId ?? null,
    approvedByUserName: dto.approvedByUserName ?? '',
    referenceNumber: dto.referenceNumber ?? '',
    notes: dto.notes ?? '',
    allocatedDate: dto.createdAt ?? null,
    createdAt: dto.createdAt ?? null,
    updatedAt: dto.updatedAt ?? null,
  };
}

export function mapResourceAllocationCreateToApi(payload) {
  return {
    inventoryId: Number(payload.inventoryId),
    crisisId: Number(payload.crisisId),
    quantityRequested: Number(payload.quantityRequested ?? payload.quantity),
    referenceNumber: (payload.referenceNumber ?? '').trim() || null,
    notes: (payload.notes ?? '').trim() || null,
  };
}

export function mapResourceAllocationStatusToApi(payload = {}) {
  const body = {
    notes: (payload.notes ?? '').trim() || null,
  };
  if (payload.quantityAllocated !== undefined && payload.quantityAllocated !== null && payload.quantityAllocated !== '') {
    body.quantityAllocated = Number(payload.quantityAllocated);
  }
  return body;
}

export const INELIGIBLE_ALLOCATION_CRISIS_STATUSES = ['Closed', 'Resolved'];

export function isCrisisEligibleForAllocation(crisis) {
  if (!crisis || !crisis.status) return false;
  const normalized = String(crisis.status).trim().toLowerCase();
  return !INELIGIBLE_ALLOCATION_CRISIS_STATUSES.some((s) => s.toLowerCase() === normalized);
}

export function getEligibleAllocationCrises(crises = []) {
  if (!Array.isArray(crises)) return [];
  return crises.filter(isCrisisEligibleForAllocation);
}

// --- AI Decision Support DTO Mappers (Phase 5B-UI) ---

export const AI_REVIEW_STATUSES = ['PendingReview', 'Approved', 'Overridden', 'Rejected'];
export const AI_REVIEW_DECISIONS = ['Approved', 'Overridden', 'Rejected'];

export function isAiProviderUnavailableError(err) {
  return Number(err?.status) === 503;
}

export function mapAiProviderStatusFromApi(dto) {
  const isConfigured = Boolean(dto?.isConfigured);
  return {
    isConfigured,
    providerName: dto?.providerName ?? 'None',
    status: dto?.status ?? (isConfigured ? 'Available' : 'Unavailable'),
    message:
      dto?.message ??
      (isConfigured
        ? 'AI Decision Support provider is active.'
        : 'No AI provider is configured. Configure an AI provider before running analysis.'),
  };
}

export function mapAiRecommendationFromApi(dto) {
  return {
    id: String(dto?.recommendationId ?? dto?.id ?? ''),
    recommendationId: Number(dto?.recommendationId ?? dto?.id ?? 0),
    citizenRequestId: Number(dto?.citizenRequestId ?? 0),
    currentRequestType: dto?.currentRequestType ?? '',
    currentUrgencyLevel: dto?.currentUrgencyLevel ?? '',
    currentRequestStatus: dto?.currentRequestStatus ?? '',
    areaName: dto?.areaName ?? '',
    crisisId: dto?.crisisId ?? null,
    crisisName: dto?.crisisName ?? null,
    suggestedCategory: dto?.suggestedCategory ?? '',
    suggestedUrgencyLevel: dto?.suggestedUrgencyLevel ?? '',
    isPotentialDuplicate: Boolean(dto?.isPotentialDuplicate),
    duplicateOfRequestId: dto?.duplicateOfRequestId ?? null,
    suggestedInventoryId: dto?.suggestedInventoryId ?? null,
    suggestedWarehouseName: dto?.suggestedWarehouseName ?? null,
    suggestedResourceName: dto?.suggestedResourceName ?? null,
    suggestedInventoryAvailableQuantity:
      dto?.suggestedInventoryAvailableQuantity !== undefined && dto?.suggestedInventoryAvailableQuantity !== null
        ? Number(dto.suggestedInventoryAvailableQuantity)
        : null,
    suggestedResourceQuantity:
      dto?.suggestedResourceQuantity !== undefined && dto?.suggestedResourceQuantity !== null
        ? Number(dto.suggestedResourceQuantity)
        : null,
    confidenceScore:
      dto?.confidenceScore !== undefined && dto?.confidenceScore !== null
        ? Number(dto.confidenceScore)
        : null,
    explanation: dto?.explanation ?? '',
    providerName: dto?.providerName ?? '',
    modelVersion: dto?.modelVersion ?? null,
    reviewStatus: dto?.reviewStatus ?? 'PendingReview',
    reviewedByUserId: dto?.reviewedByUserId ?? null,
    reviewedByUserName: dto?.reviewedByUserName ?? null,
    reviewedAt: dto?.reviewedAt ?? null,
    humanDecisionNote: dto?.humanDecisionNote ?? null,
    overriddenCategory: dto?.overriddenCategory ?? null,
    overriddenUrgencyLevel: dto?.overriddenUrgencyLevel ?? null,
    createdAt: dto?.createdAt ?? null,
    updatedAt: dto?.updatedAt ?? null,
  };
}

export function mapAiReviewDecisionToApi(payload = {}) {
  const decision = String(payload.decision ?? '').trim();
  const note = (payload.humanDecisionNote ?? '').trim() || null;

  if (decision === 'Overridden') {
    const overriddenCategory = (payload.overriddenCategory ?? '').trim() || null;
    const overriddenUrgencyLevel = (payload.overriddenUrgencyLevel ?? '').trim() || null;
    return {
      decision,
      humanDecisionNote: note,
      overriddenCategory,
      overriddenUrgencyLevel,
    };
  }

  return {
    decision,
    humanDecisionNote: note,
    overriddenCategory: null,
    overriddenUrgencyLevel: null,
  };
}
