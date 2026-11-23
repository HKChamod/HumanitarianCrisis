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

// --- Operational Modules DTO Mappers (Shelters, Volunteers, Donations, Users/Roles, Notifications, Audit, Dashboard) ---

export function mapShelterFromApi(dto) {
  const capacity = Number(dto?.capacity ?? 0);
  const currentOccupancy = Number(dto?.currentOccupancy ?? 0);
  return {
    id: String(dto?.shelterId ?? dto?.id ?? ''),
    shelterId: Number(dto?.shelterId ?? dto?.id ?? 0),
    name: dto?.shelterName ?? dto?.name ?? '',
    shelterName: dto?.shelterName ?? dto?.name ?? '',
    areaId: Number(dto?.areaId ?? 0),
    areaName: dto?.areaName ?? '',
    district: dto?.areaName ?? '',
    dsDivision: dto?.areaName ?? '',
    operatorOrganization: dto?.contactName || dto?.areaName || 'ReliefLink Operations',
    address: dto?.address ?? '',
    capacity,
    currentOccupancy,
    availableCapacity: Number(dto?.availableCapacity ?? Math.max(0, capacity - currentOccupancy)),
    status: dto?.status ?? 'Open',
    contactName: dto?.contactName ?? '',
    contactPhone: dto?.contactPhone ?? '',
    facilities: typeof dto?.facilities === 'string'
      ? dto.facilities.split(',').map((f) => f.trim()).filter(Boolean)
      : Array.isArray(dto?.facilities) ? dto.facilities : [],
    facilitiesText: dto?.facilities ?? '',
    isActive: dto?.isActive ?? true,
    createdAt: dto?.createdAt ?? null,
    updatedAt: dto?.updatedAt ?? null,
  };
}

export function mapShelterPlacementFromApi(dto) {
  return {
    id: String(dto?.placementId ?? dto?.id ?? ''),
    placementId: Number(dto?.placementId ?? dto?.id ?? 0),
    shelterId: Number(dto?.shelterId ?? 0),
    shelterName: dto?.shelterName ?? '',
    citizenRequestId: dto?.citizenRequestId ?? null,
    residentName: dto?.residentName ?? '',
    peopleCount: Number(dto?.peopleCount ?? 1),
    status: dto?.status ?? 'Active',
    notes: dto?.notes ?? '',
    assignedByUserId: dto?.assignedByUserId ?? null,
    assignedByUserName: dto?.assignedByUserName ?? '',
    checkedInAt: dto?.checkedInAt ?? null,
    checkedOutAt: dto?.checkedOutAt ?? null,
  };
}

export function mapVolunteerFromApi(dto) {
  const skillsList = typeof dto?.skills === 'string'
    ? dto.skills.split(',').map((s) => s.trim()).filter(Boolean)
    : Array.isArray(dto?.skills) ? dto.skills : [];
  return {
    id: String(dto?.volunteerId ?? dto?.id ?? ''),
    volunteerId: Number(dto?.volunteerId ?? dto?.id ?? 0),
    userId: dto?.userId ?? null,
    fullName: dto?.fullName ?? '',
    name: dto?.fullName ?? '',
    email: dto?.email ?? '',
    phone: dto?.phoneNumber ?? '',
    phoneNumber: dto?.phoneNumber ?? '',
    areaId: dto?.areaId ?? null,
    district: dto?.areaName ?? '',
    areaName: dto?.areaName ?? '',
    skills: skillsList,
    skillsText: dto?.skills ?? '',
    availability: dto?.availabilityStatus ?? 'Available',
    availabilityStatus: dto?.availabilityStatus ?? 'Available',
    approvalStatus: dto?.approvalStatus ?? 'Pending',
    status: dto?.approvalStatus ?? 'Pending',
    isActive: dto?.isActive ?? true,
    activeAssignmentsCount: Number(dto?.activeAssignmentsCount ?? 0),
    createdAt: dto?.createdAt ?? null,
    updatedAt: dto?.updatedAt ?? null,
  };
}

export function mapVolunteerAssignmentFromApi(dto) {
  return {
    id: String(dto?.assignmentId ?? dto?.id ?? ''),
    assignmentId: Number(dto?.assignmentId ?? dto?.id ?? 0),
    volunteerId: String(dto?.volunteerId ?? ''),
    volunteerName: dto?.volunteerName ?? '',
    crisisId: String(dto?.crisisId ?? ''),
    crisisName: dto?.crisisName ?? '',
    roleTitle: dto?.roleTitle ?? '',
    taskTitle: dto?.roleTitle ?? '',
    taskDescription: dto?.taskDescription ?? '',
    status: dto?.status ?? 'Assigned',
    assignedByUserId: dto?.assignedByUserId ?? null,
    assignedByUserName: dto?.assignedByUserName ?? '',
    assignedAt: dto?.assignedAt ?? null,
    completedAt: dto?.completedAt ?? null,
    notes: dto?.notes ?? '',
  };
}

export function mapDonationFromApi(dto) {
  const amount = dto?.amount !== null && dto?.amount !== undefined ? Number(dto.amount) : null;
  const createdAt = dto?.createdAt ?? null;
  return {
    id: String(dto?.donationId ?? dto?.id ?? ''),
    donationId: Number(dto?.donationId ?? dto?.id ?? 0),
    donorName: dto?.donorName ?? '',
    donorType: dto?.donorUserId ? 'Registered Donor' : 'Direct Donor',
    donorEmail: dto?.donorEmail ?? '',
    donorPhone: dto?.donorPhone ?? '',
    donationType: dto?.donationType ?? 'Monetary',
    type: dto?.donationType ?? 'Monetary',
    amount,
    amountLkr: amount,
    currency: dto?.currency ?? 'LKR',
    resourceId: dto?.resourceId ?? null,
    resourceName: dto?.resourceName ?? null,
    itemDescription: dto?.resourceName || dto?.notes || '',
    unit: 'units',
    warehouseId: dto?.warehouseId ?? null,
    warehouseName: dto?.warehouseName ?? null,
    quantity: dto?.quantity !== null && dto?.quantity !== undefined ? Number(dto.quantity) : null,
    inventoryTransactionId: dto?.inventoryTransactionId ?? null,
    crisisId: dto?.crisisId ?? null,
    crisisName: dto?.crisisName ?? null,
    campaignName: dto?.crisisName || 'General Relief Fund',
    referenceNumber: dto?.referenceNumber ?? '',
    status: dto?.status ?? 'Pending',
    verifiedByUserName: dto?.verifiedByUserName ?? null,
    verifiedAt: dto?.verifiedAt ?? null,
    notes: dto?.notes ?? '',
    date: createdAt,
    donatedAt: createdAt,
    createdAt,
  };
}

export function mapUserFromApi(dto) {
  const roles = Array.isArray(dto?.roles) ? dto.roles : [];
  return {
    id: String(dto?.userId ?? dto?.id ?? ''),
    userId: Number(dto?.userId ?? dto?.id ?? 0),
    fullName: dto?.fullName ?? '',
    email: dto?.email ?? '',
    phone: dto?.phoneNumber ?? '',
    phoneNumber: dto?.phoneNumber ?? '',
    isActive: dto?.isActive ?? true,
    status: dto?.isActive ? 'Active' : 'Inactive',
    roles,
    role: roles[0] ?? 'Citizen',
    createdAt: dto?.createdAt ?? null,
  };
}

export function mapRoleFromApi(dto) {
  const perms = Array.isArray(dto?.permissions) ? dto.permissions : [];
  return {
    id: String(dto?.roleId ?? dto?.id ?? ''),
    roleId: Number(dto?.roleId ?? dto?.id ?? 0),
    name: dto?.roleName ?? dto?.name ?? '',
    roleName: dto?.roleName ?? dto?.name ?? '',
    description: dto?.description ?? '',
    userCount: Number(dto?.userCount ?? 0),
    permissions: perms.map((p) => (typeof p === 'string' ? p : p.permissionName)),
    permissionItems: perms,
    isSystemRole: ['Administrator', 'Citizen', 'CrisisManager', 'Responder', 'Donor', 'Volunteer'].includes(dto?.roleName ?? ''),
  };
}

export function mapPermissionFromApi(dto) {
  const name = dto?.permissionName ?? dto?.name ?? '';
  const modulePart = name.includes('.') ? name.split('.')[0] : 'General';
  return {
    id: String(dto?.permissionId ?? dto?.id ?? ''),
    permissionId: Number(dto?.permissionId ?? dto?.id ?? 0),
    key: name,
    name,
    permissionName: name,
    module: modulePart,
    description: dto?.description ?? '',
  };
}

export function mapNotificationFromApi(dto) {
  return {
    id: String(dto?.notificationId ?? dto?.id ?? ''),
    notificationId: Number(dto?.notificationId ?? dto?.id ?? 0),
    userId: Number(dto?.userId ?? 0),
    title: dto?.title ?? '',
    message: dto?.message ?? '',
    category: dto?.category ?? 'System',
    severity: dto?.severity ?? 'Info',
    relatedEntityType: dto?.relatedEntityType ?? null,
    relatedEntityId: dto?.relatedEntityId ?? null,
    isRead: Boolean(dto?.isRead),
    readAt: dto?.readAt ?? null,
    timestamp: dto?.createdAt ?? null,
    createdAt: dto?.createdAt ?? null,
  };
}

export function mapAuditLogFromApi(dto) {
  return {
    id: String(dto?.auditLogId ?? dto?.id ?? ''),
    auditLogId: Number(dto?.auditLogId ?? dto?.id ?? 0),
    actorUserId: dto?.actorUserId ?? null,
    actorName: dto?.actorName ?? dto?.actorEmail ?? 'System',
    actorEmail: dto?.actorEmail ?? '',
    actorRole: dto?.actorUserId ? 'Authenticated User' : 'System',
    action: dto?.action ?? '',
    module: dto?.entityType ?? '',
    entityType: dto?.entityType ?? '',
    recordRef: dto?.entityId ?? '-',
    entityId: dto?.entityId ?? null,
    details: dto?.summary ?? '',
    summary: dto?.summary ?? '',
    status: dto?.status ?? 'Success',
    timestamp: dto?.createdAt ?? null,
    createdAt: dto?.createdAt ?? null,
  };
}
