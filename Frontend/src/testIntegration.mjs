/**
 * Automated HCMS Frontend-Backend Integration Test Suite
 * Verifies:
 * 1. Translations completeness across English, Sinhala, Tamil
 * 2. DTO Mappers correctness
 * 3. RBAC & Admin Permission check functions
 * 4. Live API Authentication and Endpoint Integration with .NET 10 Backend
 */

import { TRANSLATIONS } from './data/translations.js';
import {
  isValidLatitude,
  isValidLongitude,
  parseCoordinates,
  toLngLatArray,
  computeBounds,
} from './shared/maps/utils/coordinateUtils.js';
import {
  filterMapItems,
  mapItemsToGeoJson,
  buildRouteGeoJson,
} from './shared/maps/utils/geoJsonUtils.js';
import {
  adaptCrisisToMapItem,
  adaptShelterToMapItem,
  adaptOrganizationToMapItem,
  adaptCitizenRequestToMapItem,
  adaptWarehouseToMapItem,
  adaptVolunteerToMapItem,
  adaptAiRecommendationToMapItem,
  adaptCollectionToMapItems,
} from './shared/maps/services/mapDataAdapter.js';
import { getMapConfiguration } from './shared/maps/services/mapConfig.js';
import { createRoutingProvider } from './shared/maps/services/mapProvider.js';
import {
  mapCrisisFromApi,
  mapCrisisCreateToApi,
  mapRequestFromApi,
  mapOrganizationFromApi,
  mapMemberFromApi,
  mapPermissionFromApi,
  mapResourceFromApi,
  mapWarehouseFromApi,
  mapWarehouseInventoryFromApi,
  mapInventoryTransactionFromApi,
  mapInventoryTransactionCreateToApi,
  mapInventoryTransferToApi,
  mapResourceAllocationFromApi,
  mapResourceAllocationCreateToApi,
  isCrisisEligibleForAllocation,
  getEligibleAllocationCrises,
  mapAiProviderStatusFromApi,
  mapAiRecommendationFromApi,
  mapAiReviewDecisionToApi,
  isAiProviderUnavailableError,
} from './services/api/backendMappers.js';
import { normalizeApiError } from './services/api/apiConfig.js';
import {
  mapCitizenNotificationFromApi,
  mapCitizenShelterFromApi,
  mapCitizenCrisisAlertFromApi,
  buildCitizenRequestPayload,
} from './services/api/citizenApi.js';
import {
  mapOrgNotificationFromApi,
  mapOrgMemberFromApi,
  mapOrgAllocationFromApi,
  mapOrgInventoryFromApi,
} from './organization/services/organizationOperationsService.js';
import { mapResponseTeamFromApi } from './organization/services/responseTeamsService.js';
import { mapAssignedAreaFromApi } from './organization/services/assignedAreasService.js';
import {
  getDefaultRouteForUser,
  canAccessPath,
  resolvePostLoginRoute,
} from './app/authRouting.js';
// Simplified admin check matching AuthProvider.jsx logic
const ADMIN_PORTAL_ENTRY_PERMISSIONS = [
  'Users.View',
  'Users.Manage',
  'Organizations.View',
  'Organizations.Manage',
  'CrisisEvents.Create',
  'CrisisEvents.Update',
  'CrisisEvents.Manage',
  'CitizenRequests.View',
  'CitizenRequests.Manage',
  'Resources.View',
  'Resources.Manage',
  'Reports.View',
];

function isAdminUser(user) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return user.permissions.some((p) => ADMIN_PORTAL_ENTRY_PERMISSIONS.includes(p));
}

const API_BASE_URL = 'http://localhost:5107/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🚀 RUNNING HCMS AUTOMATED VERIFICATION TEST SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  function skip(message) {
    console.warn(`  ⏭️ SKIPPED (BLOCKED): ${message}`);
    skipped++;
  }

  async function readResponseSafely(res) {
    let rawText = '';
    try {
      rawText = await res.text();
    } catch {
      return { rawText: '', json: null, safeSummary: '(unable to read response body)' };
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      return { rawText: '', json: null, safeSummary: '(empty response body)' };
    }

    try {
      const parsed = JSON.parse(trimmed);
      const safeParts = [];
      if (parsed && typeof parsed === 'object') {
        if (parsed.title) safeParts.push(String(parsed.title));
        if (parsed.detail) safeParts.push(String(parsed.detail));
        if (parsed.message) safeParts.push(String(parsed.message));
        if (parsed.errors && typeof parsed.errors === 'object') {
          safeParts.push(`Validation errors: ${JSON.stringify(parsed.errors)}`);
        }
      }
      return {
        rawText,
        json: parsed,
        safeSummary: safeParts.length > 0 ? safeParts.join(' — ') : '(JSON response without error details)',
      };
    } catch {
      const sanitized = trimmed
        .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
        .slice(0, 300);
      return { rawText, json: null, safeSummary: sanitized };
    }
  }

  // --- TEST 1: TRILINGUAL LOCALIZATION COMPLETENESS ---
  console.log('--- TEST GROUP 1: Localization & Trilingual Dictionary ---');
  const enKeys = Object.keys(TRANSLATIONS.en);
  const siKeys = new Set(Object.keys(TRANSLATIONS.si));
  const taKeys = new Set(Object.keys(TRANSLATIONS.ta));

  assert(enKeys.length > 300, `English has comprehensive key coverage (${enKeys.length} keys)`);
  
  const missingSi = enKeys.filter(k => !siKeys.has(k));
  assert(missingSi.length === 0, `Sinhala dictionary has 100% key parity (0 missing, ${siKeys.size} keys)`);

  const missingTa = enKeys.filter(k => !taKeys.has(k));
  assert(missingTa.length === 0, `Tamil dictionary has 100% key parity (0 missing, ${taKeys.size} keys)`);

  // Verify critical public emergency keys
  assert(TRANSLATIONS.si.emergencyPortalTitle === 'හදිසි සහය ඉල්ලා සිටීම', 'Sinhala emergency portal title translated');
  assert(TRANSLATIONS.ta.emergencyPortalTitle === 'அவசர உதவி கோருங்கள்', 'Tamil emergency portal title translated');

  // --- TEST 2: DTO MAPPERS ---
  console.log('\n--- TEST GROUP 2: DTO Mappers ---');
  const mockApiCrisis = {
    crisisId: 101,
    crisisName: 'Kelani River Flood 2026',
    crisisType: 'Flood',
    severityLevel: 'Critical',
    status: 'Active',
    description: 'Heavy precipitation causing rapid water rise in Western Province.',
    startDate: '2026-11-20T10:00:00Z',
  };
  const mappedCrisis = mapCrisisFromApi(mockApiCrisis);
  assert(mappedCrisis.id === '101', 'mapCrisisFromApi maps crisisId to string id');
  assert(mappedCrisis.severity === 'Critical', 'mapCrisisFromApi maps severityLevel to severity');
  assert(mappedCrisis.status === 'Active', 'mapCrisisFromApi preserves status');

  const mappedCreate = mapCrisisCreateToApi(mappedCrisis);
  assert(mappedCreate.crisisName === 'Kelani River Flood 2026', 'mapCrisisCreateToApi formats payload for backend');
  assert(mappedCreate.severityLevel === 'Critical', 'mapCrisisCreateToApi preserves severityLevel');

  const mockApiRequest = {
    requestId: 42,
    requestType: 'Food',
    description: 'Rations needed for 4 family members',
    urgencyLevel: 'High',
    peopleCount: 4,
    areaName: 'Kalutara District',
    status: 'Pending',
    createdAt: '2026-11-21T18:00:00Z',
  };
  const mappedRequest = mapRequestFromApi(mockApiRequest);
  assert(mappedRequest.id === '42', 'mapRequestFromApi maps requestId to string id');
  assert(mappedRequest.category === 'Food', 'mapRequestFromApi maps requestType to category');
  assert(mappedRequest.urgency === 'High', 'mapRequestFromApi maps urgencyLevel to urgency');
  assert(mappedRequest.peopleAffected === 4, 'mapRequestFromApi maps peopleCount to peopleAffected');

  // Phase 5A Logistics DTO Mapper checks
  const mappedWh = mapWarehouseFromApi({
    warehouseId: 7,
    warehouseName: 'Matale Central Depot',
    warehouseCode: 'WH-MAT-01',
    address: 'Main Rd, Matale',
    areaId: 2,
    areaName: 'Matale District',
    isActive: true,
  });
  assert(mappedWh.warehouseId === 7 && mappedWh.areaId === 2, 'mapWarehouseFromApi maps warehouseId and areaId');

  const mappedInv = mapWarehouseInventoryFromApi({
    inventoryId: 12,
    warehouseId: 7,
    warehouseName: 'Matale Central Depot',
    resourceId: 3,
    resourceName: 'Drinking Water',
    resourceCategory: 'Water',
    quantityAvailable: 150,
    reorderLevel: 200,
    isLowStock: true,
  });
  assert(mappedInv.inventoryId === 12 && mappedInv.isLowStock === true, 'mapWarehouseInventoryFromApi maps stock & low-stock flag');

  const mappedTxnCreate = mapInventoryTransactionCreateToApi({
    inventoryId: '12',
    transactionType: 'StockIn',
    quantity: '50',
    referenceNumber: 'IN-001',
  });
  assert(mappedTxnCreate.transactionType === 1 && mappedTxnCreate.quantity === 50, 'mapInventoryTransactionCreateToApi maps StockIn enum to integer 1');

  const mappedTxn = mapInventoryTransactionFromApi({
    inventoryTransactionId: 99,
    inventoryId: 12,
    transactionType: 5,
    quantity: 20,
    previousQuantity: 150,
    newQuantity: 130,
  });
  assert(mappedTxn.transactionTypeLabel === 'TransferOut', 'mapInventoryTransactionFromApi maps enum 5 to TransferOut');

  const mappedTransfer = mapInventoryTransferToApi({
    sourceInventoryId: '12',
    destinationInventoryId: '15',
    quantity: '20',
  });
  assert(mappedTransfer.sourceInventoryId === 12 && mappedTransfer.destinationInventoryId === 15, 'mapInventoryTransferToApi maps source/destination IDs');

  const mappedAlloc = mapResourceAllocationFromApi({
    allocationId: 5,
    inventoryId: 12,
    warehouseName: 'Matale Central Depot',
    resourceId: 3,
    resourceName: 'Drinking Water',
    crisisId: 3,
    crisisName: 'Monsoon Flood',
    quantityRequested: 40,
    quantityAllocated: 35,
    status: 'Approved',
  });
  assert(mappedAlloc.allocationId === 5 && mappedAlloc.quantityAllocated === 35 && mappedAlloc.status === 'Approved', 'mapResourceAllocationFromApi maps allocation fields');

  const mappedAllocCreate = mapResourceAllocationCreateToApi({
    inventoryId: '12',
    crisisId: '3',
    quantityRequested: '40',
    referenceNumber: 'ALLOC-005',
  });
  assert(mappedAllocCreate.inventoryId === 12 && mappedAllocCreate.crisisId === 3 && mappedAllocCreate.quantityRequested === 40, 'mapResourceAllocationCreateToApi formats numeric DTO payload');

  // Resource Allocation crisis eligibility filtering checks
  assert(isCrisisEligibleForAllocation({ id: '1', status: 'Active' }) === true, 'isCrisisEligibleForAllocation allows Active crisis');
  assert(isCrisisEligibleForAllocation({ id: '2', status: 'Reported' }) === true, 'isCrisisEligibleForAllocation allows Reported crisis');
  assert(isCrisisEligibleForAllocation({ id: '3', status: 'Closed' }) === false, 'isCrisisEligibleForAllocation excludes Closed crisis');
  assert(isCrisisEligibleForAllocation({ id: '4', status: 'Resolved' }) === false, 'isCrisisEligibleForAllocation excludes Resolved crisis');
  const eligibleFiltered = getEligibleAllocationCrises([
    { id: '1', status: 'Active' },
    { id: '2', status: 'Reported' },
    { id: '3', status: 'Closed' },
    { id: '4', status: 'Resolved' },
  ]);
  assert(
    eligibleFiltered.length === 2 && eligibleFiltered.every((c) => c.status !== 'Closed' && c.status !== 'Resolved'),
    'getEligibleAllocationCrises keeps only Active/Reported crises and excludes Closed/Resolved'
  );

  // Phase 5B-UI AI Decision Support DTO mapper & 503 checks
  const mappedAiStatus = mapAiProviderStatusFromApi({
    isConfigured: false,
    providerName: 'None',
    status: 'Unavailable',
    message: 'No AI provider is configured.',
  });
  assert(
    mappedAiStatus.isConfigured === false && mappedAiStatus.status === 'Unavailable' && mappedAiStatus.providerName === 'None',
    'mapAiProviderStatusFromApi maps unconfigured Unavailable state accurately'
  );

  const mappedAiRec = mapAiRecommendationFromApi({
    recommendationId: 11,
    citizenRequestId: 1,
    currentRequestType: 'Food',
    currentUrgencyLevel: 'High',
    currentRequestStatus: 'Fulfilled',
    areaName: 'Central Province',
    suggestedCategory: 'Food',
    suggestedUrgencyLevel: 'Critical',
    isPotentialDuplicate: false,
    confidenceScore: 0.87,
    explanation: 'High household impact reported.',
    providerName: 'TestProvider',
    reviewStatus: 'PendingReview',
  });
  assert(
    mappedAiRec.recommendationId === 11 && mappedAiRec.citizenRequestId === 1 && mappedAiRec.confidenceScore === 0.87 && mappedAiRec.reviewStatus === 'PendingReview',
    'mapAiRecommendationFromApi separates verified facts and AI suggestions accurately'
  );

  const mappedOverride = mapAiReviewDecisionToApi({
    decision: 'Overridden',
    humanDecisionNote: 'Adjusted to Medical',
    overriddenCategory: 'Medical',
    overriddenUrgencyLevel: 'Critical',
  });
  assert(
    mappedOverride.decision === 'Overridden' && mappedOverride.overriddenCategory === 'Medical' && mappedOverride.overriddenUrgencyLevel === 'Critical',
    'mapAiReviewDecisionToApi formats Overridden payload matching ReviewAiRecommendationRequest'
  );

  const mappedApprove = mapAiReviewDecisionToApi({
    decision: 'Approved',
    humanDecisionNote: 'Confirmed',
    overriddenCategory: 'Ignored',
  });
  assert(
    mappedApprove.decision === 'Approved' && mappedApprove.overriddenCategory === null && mappedApprove.overriddenUrgencyLevel === null,
    'mapAiReviewDecisionToApi clears override fields for Approved/Rejected decisions'
  );

  assert(isAiProviderUnavailableError({ status: 503 }) === true, 'isAiProviderUnavailableError detects HTTP 503');
  assert(isAiProviderUnavailableError({ status: 500 }) === false, 'isAiProviderUnavailableError ignores non-503 errors');

  // Citizen Portal live mappers & request payload validation
  const mappedCitNotif = mapCitizenNotificationFromApi({
    notificationId: 77,
    title: 'Request REQ-42: Verified',
    message: 'Your Food assistance request status changed to Verified.',
    severity: 'Success',
    relatedEntityType: 'CitizenRequest',
    relatedEntityId: 42,
    isRead: false,
    createdAt: '2026-11-25T10:00:00Z',
  });
  assert(
    mappedCitNotif.id === '77' &&
      mappedCitNotif.type === 'success' &&
      mappedCitNotif.referenceNumber === 'REQ-42' &&
      mappedCitNotif.read === false,
    'mapCitizenNotificationFromApi maps live notification & REQ reference link'
  );

  const mappedCitShelter = mapCitizenShelterFromApi({
    shelterId: 5,
    shelterName: 'Kalutara Relief Center',
    areaName: 'Kalutara District',
    capacity: 120,
    currentOccupancy: 45,
    status: 'Open',
    facilities: 'Water, Medical, Power',
    isActive: true,
  });
  assert(
    mappedCitShelter.used === 45 &&
      mappedCitShelter.total === 120 &&
      mappedCitShelter.facilities.length === 3,
    'mapCitizenShelterFromApi maps live shelter occupancy and comma-separated facilities'
  );

  const mappedCitAlert = mapCitizenCrisisAlertFromApi({
    crisisId: 9,
    crisisName: 'Kalu Ganga Flood Warning',
    crisisType: 'Flood',
    severityLevel: 'Critical',
    status: 'Active',
    description: 'Evacuate low-lying zones immediately.',
  });
  assert(
    mappedCitAlert.severity === 'Critical' && mappedCitAlert.title === 'Kalu Ganga Flood Warning',
    'mapCitizenCrisisAlertFromApi maps live crisis alert fields'
  );

  const validCitPayload = buildCitizenRequestPayload({
    category: 'Medical',
    description: 'Insulin and first-aid supplies needed.',
    urgencyLevel: 'Standard',
    peopleAffected: '3',
    areaId: '4',
    addressLine: 'Temple Rd',
  });
  assert(
    validCitPayload.requestType === 'Medical' &&
      validCitPayload.urgencyLevel === 'Medium' &&
      validCitPayload.peopleCount === 3 &&
      validCitPayload.areaId === 4,
    'buildCitizenRequestPayload normalizes Standard urgency to Medium and parses numeric fields'
  );

  let missingAreaRejected = false;
  try {
    buildCitizenRequestPayload({ category: 'Food', description: 'Need food', areaId: '' });
  } catch (err) {
    missingAreaRejected = err?.status === 400;
  }
  assert(missingAreaRejected, 'buildCitizenRequestPayload rejects missing areaId with status 400');

  // Organization Portal live operations mappers & API error normalization
  const mappedOrgNotif = mapOrgNotificationFromApi({
    notificationId: 88,
    title: 'Allocation Approved',
    message: '30 kits approved.',
    severity: 'Info',
    isRead: true,
    createdAt: '2026-11-25T11:00:00Z',
  });
  assert(
    mappedOrgNotif.id === 88 && mappedOrgNotif.unread === false && mappedOrgNotif.description === '30 kits approved.',
    'mapOrgNotificationFromApi maps read/unread state and description'
  );

  const mappedOrgMember = mapOrgMemberFromApi({
    membershipId: 12,
    userId: 501,
    fullName: 'Nimal Perera',
    email: 'nimal@org.lk',
    membershipStatus: 'Pending',
    roles: ['OrgCoordinator'],
  });
  assert(
    mappedOrgMember.membershipId === 12 &&
      mappedOrgMember.membershipStatus === 'Pending' &&
      mappedOrgMember.roles[0] === 'OrgCoordinator',
    'mapOrgMemberFromApi maps membership status and organization roles'
  );

  const mappedOrgAlloc = mapOrgAllocationFromApi({
    allocationId: 31,
    resourceName: 'Dry Rations',
    warehouseName: 'Colombo Hub',
    crisisName: 'Western Flood',
    quantityRequested: 50,
    quantityAllocated: 40,
    status: 'Dispatched',
  });
  assert(
    mappedOrgAlloc.allocationId === 31 &&
      mappedOrgAlloc.quantityAllocated === 40 &&
      mappedOrgAlloc.status === 'Dispatched',
    'mapOrgAllocationFromApi maps allocation quantities and status'
  );

  const mappedOrgInv = mapOrgInventoryFromApi({
    inventoryId: 19,
    resourceName: 'Medical Kits',
    warehouseName: 'Colombo Hub',
    quantityAvailable: 8,
    reorderLevel: 15,
  });
  assert(
    mappedOrgInv.isLowStock === true && mappedOrgInv.quantityAvailable === 8,
    'mapOrgInventoryFromApi flags low stock when quantityAvailable <= reorderLevel'
  );

  const err401 = normalizeApiError(401, null, 'Fallback');
  const err403 = normalizeApiError(403, { detail: 'Missing AI.Review permission.' }, 'Fallback');
  const errNet = normalizeApiError(0, null, 'Fallback');
  assert(
    err401.title === 'Unauthorized' &&
      err403.title === 'Access Denied' &&
      err403.detail === 'Missing AI.Review permission.' &&
      errNet.title === 'Network Unavailable',
    'normalizeApiError normalizes 401, 403, and offline status=0 responses consistently'
  );

  const mappedAdminMember = mapMemberFromApi(
    {
      membershipId: 55,
      userId: 12,
      fullName: 'TEST Org Admin',
      email: 'admin@test.com',
      membershipStatus: 'Pending',
      roles: [],
    },
    10,
    'TEST'
  );
  assert(
    mappedAdminMember.membershipId === 55 &&
      mappedAdminMember.status === 'Pending' &&
      mappedAdminMember.userEmail === 'admin@test.com',
    'mapMemberFromApi maps backend membershipStatus Pending accurately'
  );

  const mappedPerm = mapPermissionFromApi({
    permissionId: 3,
    permissionName: 'Organizations.View',
    description: 'View organizations',
  });
  assert(
    mappedPerm.code === 'Organizations.View' &&
      mappedPerm.category === 'Organizations' &&
      Array.isArray(mappedPerm.assignedRoles) &&
      mappedPerm.assignedRoles.length === 0,
    'mapPermissionFromApi provides code, category, and safe empty assignedRoles array'
  );

  const mappedTeam = mapResponseTeamFromApi({
    responseTeamId: 12,
    organizationId: 4,
    teamName: 'Colombo Rapid Medical',
    teamType: 'Medical',
    leaderName: 'Dr. Perera',
    areaName: 'Colombo',
    status: 'Deployed',
    membersCount: 5,
    specializedEquipment: 'Trauma Kits, Stretchers',
    activeDeployment: { deploymentId: 9, missionTitle: 'Flood Aid #10', status: 'Active' },
  });
  assert(
    mappedTeam.teamId === 12 &&
      mappedTeam.teamLeader === 'Dr. Perera' &&
      mappedTeam.status === 'Deployed' &&
      mappedTeam.specializedEquipment.length === 2 &&
      mappedTeam.deployedIncident === 'Flood Aid #10',
    'mapResponseTeamFromApi maps backend ResponseTeamDto fields and active deployment'
  );

  const mappedOrgArea = mapAssignedAreaFromApi({
    organizationAreaId: 7,
    areaId: 3,
    areaName: 'Colombo',
    areaType: 'District',
    parentAreaName: 'Western',
    latitude: 6.9271,
    longitude: 79.8612,
    assignmentStatus: 'Active',
    openRequestsCount: 4,
    assignedTeamsCount: 2,
  });
  assert(
    mappedOrgArea.organizationAreaId === 7 &&
      mappedOrgArea.latitude === 6.9271 &&
      mappedOrgArea.openRequestsCount === 4 &&
      mappedOrgArea.isActive === true,
    'mapAssignedAreaFromApi maps OrganizationAreaDto coordinates and live counts'
  );

  // --- TEST 3: RBAC & ADMIN PERMISSION GUARD ---
  console.log('\n--- TEST GROUP 3: RBAC & Permission Verification ---');
  const citizenUser = {
    roles: ['Citizen'],
    permissions: ['CrisisEvents.View', 'Areas.View'],
  };
  assert(!isAdminUser(citizenUser), 'Citizen user is correctly barred from admin entry (isAdminUser === false)');

  const adminUser = {
    roles: ['Administrator'],
    permissions: ['CrisisEvents.Create', 'CrisisEvents.Manage', 'Users.Manage', 'Users.View', 'CitizenRequests.View'],
  };
  assert(isAdminUser(adminUser), 'Administrator user with administrative permissions is granted access (isAdminUser === true)');

  const crisisManagerUser = {
    roles: ['CrisisManager'],
    permissions: ['CrisisEvents.View', 'CrisisEvents.Create', 'CrisisEvents.Manage', 'CitizenRequests.View', 'Organizations.View'],
  };
  const responderUser = {
    roles: ['Responder'],
    permissions: ['CrisisEvents.View', 'CitizenRequests.View', 'CitizenRequests.Manage', 'Resources.View', 'ResourceAllocations.View'],
  };
  const orgAdminUser = {
    roles: ['Citizen'],
    permissions: ['Areas.View', 'CrisisEvents.View', 'Notifications.View'],
  };
  const approvedOrgMemberships = [
    { membershipId: 1, organizationId: 10, membershipStatus: 'Approved', isOrganizationActive: true, roles: ['OrganizationAdmin'] },
  ];
  const pendingOrgMemberships = [
    { membershipId: 2, organizationId: 11, membershipStatus: 'Pending', isOrganizationActive: true, roles: ['Member'] },
  ];
  const multiRoleUser = {
    roles: ['Citizen', 'Responder', 'CrisisManager'],
    permissions: ['CrisisEvents.View', 'CrisisEvents.Manage', 'CitizenRequests.View'],
  };

  assert(getDefaultRouteForUser(adminUser) === '/admin', 'Administrator defaults to /admin');
  assert(getDefaultRouteForUser(citizenUser) === '/citizen', 'Citizen defaults to /citizen');
  assert(getDefaultRouteForUser(crisisManagerUser) === '/admin', 'CrisisManager defaults to /admin');
  assert(getDefaultRouteForUser(responderUser) === '/admin', 'Responder defaults to /admin');
  assert(
    getDefaultRouteForUser(orgAdminUser, approvedOrgMemberships) === '/organization',
    'Approved OrganizationAdmin member defaults to /organization'
  );
  assert(
    getDefaultRouteForUser(orgAdminUser, pendingOrgMemberships) === '/citizen',
    'User with only Pending org membership defaults to /citizen'
  );
  assert(
    getDefaultRouteForUser(multiRoleUser) === '/admin',
    'Multi-role user (Citizen + Responder + CrisisManager) prioritizes operational portal /admin'
  );

  // Requested protected path allowed only if authorized
  assert(
    resolvePostLoginRoute({ user: adminUser, requestedPath: '/admin/users' }) === '/admin/users',
    'Admin requesting /admin/users before login is redirected to /admin/users'
  );
  assert(
    resolvePostLoginRoute({ user: responderUser, requestedPath: '/admin/requests' }) === '/admin/requests',
    'Responder requesting authorized /admin/requests before login is redirected to /admin/requests'
  );
  assert(
    resolvePostLoginRoute({ user: orgAdminUser, requestedPath: '/organization/dashboard', memberships: approvedOrgMemberships }) === '/organization/dashboard',
    'Approved org member requesting /organization/dashboard before login is redirected there'
  );

  // Unauthorized requested path falls back to role default dashboard
  assert(
    resolvePostLoginRoute({ user: citizenUser, requestedPath: '/admin/users' }) === '/citizen',
    'Citizen requesting unauthorized /admin/users falls back to /citizen'
  );
  assert(
    resolvePostLoginRoute({ user: responderUser, requestedPath: '/admin/users' }) === '/admin',
    'Responder lacking Users.View requesting /admin/users falls back to /admin'
  );
  assert(
    resolvePostLoginRoute({ user: citizenUser, requestedPath: '/organization', memberships: [] }) === '/citizen',
    'Citizen without approved org requesting /organization falls back to /citizen'
  );
  assert(
    resolvePostLoginRoute({ user: adminUser, requestedPath: '/citizen' }) === '/admin',
    'Administrator previously on /citizen is never redirected to Citizen Portal'
  );
  assert(
    resolvePostLoginRoute({ user: crisisManagerUser, requestedPath: '/citizen/dashboard' }) === '/admin',
    'CrisisManager previously on /citizen/dashboard is never redirected to Citizen Portal'
  );
  assert(
    resolvePostLoginRoute({ user: responderUser, requestedPath: '/citizen' }) === '/admin',
    'Responder previously on /citizen is never redirected to Citizen Portal'
  );
  assert(
    !canAccessPath('/login', adminUser) && !canAccessPath('//evil.example', adminUser),
    'Auth/loop paths (/login) and external paths are rejected by canAccessPath'
  );

  // Role switch simulation (logout -> login as different role)
  const firstSessionRoute = resolvePostLoginRoute({ user: citizenUser, requestedPath: null });
  const switchedSessionRoute = resolvePostLoginRoute({ user: adminUser, requestedPath: firstSessionRoute });
  assert(
    firstSessionRoute === '/citizen' && switchedSessionRoute === '/admin',
    'Switching from Citizen session to Admin login routes to /admin rather than stale /citizen'
  );

  // --- TEST 4: BACKEND LIVE ENDPOINTS INTEGRATION ---
  // Requires HCMS_TEST_ADMIN_EMAIL and HCMS_TEST_ADMIN_PASSWORD in the environment.
  console.log('\n--- TEST GROUP 4: Backend Live API Integration (http://localhost:5107) ---');
  const testAdminEmail = process.env.HCMS_TEST_ADMIN_EMAIL?.trim();
  const testAdminPassword = process.env.HCMS_TEST_ADMIN_PASSWORD;
  const hasAdminEmail = Boolean(testAdminEmail);
  const hasAdminPassword = Boolean(testAdminPassword);

  const dependentAuthenticatedEndpoints = [
    'GET /api/Auth/me',
    'GET /api/CrisisEvents',
    'GET /api/CitizenRequests',
    'GET /api/Organizations',
    'GET /api/Organizations/my-memberships',
    'GET /api/Areas',
    'GET /api/Resources',
    'GET /api/Warehouses',
    'GET /api/WarehouseInventories',
    'GET /api/AiRecommendations/status',
    'GET /api/AiRecommendations',
  ];

  const requireLiveApi = process.env.HCMS_REQUIRE_LIVE_API_TESTS === 'true';

  if (!hasAdminEmail || !hasAdminPassword) {
    if (requireLiveApi) {
      console.error(
        `❌ Missing required environment variables (HCMS_TEST_ADMIN_EMAIL set: ${hasAdminEmail}, HCMS_TEST_ADMIN_PASSWORD set: ${hasAdminPassword}).`
      );
      failed++;
    } else {
      console.warn(
        `  ℹ️ Opt-in live HTTP checks skipped (set HCMS_TEST_ADMIN_EMAIL and HCMS_TEST_ADMIN_PASSWORD to run against http://localhost:5107).`
      );
    }
    dependentAuthenticatedEndpoints.forEach((ep) =>
      skip(`${ep} — opt-in live check skipped (login credentials not provided in env)`)
    );
  } else {
    let authHeaders = null;

    // 4.1 Login (payload matches backend LoginRequest: { Email, Password })
    try {
      const loginRes = await fetch(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdminEmail,
          password: testAdminPassword,
        }),
      });
      const loginBody = await readResponseSafely(loginRes);
      const loginSucceeded = loginRes.status === 200;
      assert(loginSucceeded, `POST /api/Auth/login returns HTTP 200 OK (actual: HTTP ${loginRes.status})`);

      const hasAccessToken = Boolean(loginSucceeded && loginBody.json?.accessToken);
      assert(hasAccessToken, 'Login response contains valid JWT accessToken');

      if (!loginSucceeded || !hasAccessToken) {
        console.error(
          `  ℹ️ Login diagnostics -> HTTP ${loginRes.status} | Response: ${loginBody.safeSummary} | Env vars present -> HCMS_TEST_ADMIN_EMAIL: ${hasAdminEmail}, HCMS_TEST_ADMIN_PASSWORD: ${hasAdminPassword}`
        );
        dependentAuthenticatedEndpoints.forEach((ep) =>
          skip(`${ep} — blocked because POST /api/Auth/login failed (HTTP ${loginRes.status})`)
        );
      } else {
        authHeaders = {
          Authorization: `Bearer ${loginBody.json.accessToken}`,
          'Content-Type': 'application/json',
        };
      }
    } catch (err) {
      console.error(`  ❌ FAIL: POST /api/Auth/login network/request error: ${err?.message || err}`);
      failed++;
      dependentAuthenticatedEndpoints.forEach((ep) =>
        skip(`${ep} — blocked because POST /api/Auth/login could not complete`)
      );
    }

    if (authHeaders) {
      // 4.2 /api/Auth/me
      try {
        const meRes = await fetch(`${API_BASE_URL}/Auth/me`, { headers: authHeaders });
        const meBody = await readResponseSafely(meRes);
        assert(meRes.status === 200, `GET /api/Auth/me returns HTTP 200 OK (actual: HTTP ${meRes.status})`);
        if (meRes.status === 200 && meBody.json) {
          const roles = Array.isArray(meBody.json.roles) ? meBody.json.roles : [];
          const permissions = Array.isArray(meBody.json.permissions) ? meBody.json.permissions : [];
          assert(roles.includes('Administrator'), 'Current user contains Administrator role');
          assert(permissions.length > 20, `Current user has all permissions populated (${permissions.length} permissions)`);
        } else {
          console.error(`  ℹ️ /api/Auth/me diagnostics -> HTTP ${meRes.status} | Response: ${meBody.safeSummary}`);
        }
      } catch (err) {
        console.error(`  ❌ FAIL: GET /api/Auth/me error: ${err?.message || err}`);
        failed++;
      }

      // 4.3–4.9 Authenticated read-only endpoint checks (isolated so one failure does not abort the rest)
      const readOnlyChecks = [
        { path: '/CrisisEvents', label: 'GET /api/CrisisEvents' },
        { path: '/CitizenRequests', label: 'GET /api/CitizenRequests' },
        { path: '/Organizations', label: 'GET /api/Organizations' },
        { path: '/Organizations/my-memberships', label: 'GET /api/Organizations/my-memberships', expectArray: true },
        { path: '/Areas', label: 'GET /api/Areas', expectArray: true },
        { path: '/Resources', label: 'GET /api/Resources' },
        { path: '/Warehouses', label: 'GET /api/Warehouses' },
        { path: '/WarehouseInventories', label: 'GET /api/WarehouseInventories' },
        { path: '/AiRecommendations/status', label: 'GET /api/AiRecommendations/status' },
        { path: '/AiRecommendations', label: 'GET /api/AiRecommendations', expectArray: true },
      ];

      for (const check of readOnlyChecks) {
        try {
          const res = await fetch(`${API_BASE_URL}${check.path}`, { headers: authHeaders });
          const body = await readResponseSafely(res);
          assert(res.status === 200, `${check.label} returns HTTP 200 OK (actual: HTTP ${res.status})`);
          if (check.expectArray && res.status === 200) {
            assert(Array.isArray(body.json), `${check.label} returns a JSON array`);
          } else if (res.status !== 200) {
            console.error(`  ℹ️ ${check.label} diagnostics -> HTTP ${res.status} | Response: ${body.safeSummary}`);
          }
        } catch (err) {
          console.error(`  ❌ FAIL: ${check.label} error: ${err?.message || err}`);
          failed++;
        }
      }
    }
  }

  console.log('\n📋 [Test 5] Unified Interactive Mapping System (Coordinates, GeoJSON, Adapters, Config, Routing)...');

  // 5.1 Coordinate validation & [lng, lat] order
  assert(isValidLatitude(6.9271) === true && isValidLatitude(95) === false, 'isValidLatitude enforces [-90, 90]');
  assert(isValidLongitude(79.8612) === true && isValidLongitude(-181) === false, 'isValidLongitude enforces [-180, 180]');
  assert(parseCoordinates(null, 79.86) === null, 'parseCoordinates rejects null latitude');
  assert(parseCoordinates(0, 0) === null, 'parseCoordinates rejects (0, 0) placeholder by default');
  const parsedColombo = parseCoordinates('6.9271', '79.8612');
  assert(
    parsedColombo && parsedColombo.latitude === 6.9271 && parsedColombo.longitude === 79.8612,
    'parseCoordinates parses valid numeric strings'
  );
  const lngLat = toLngLatArray(6.9271, 79.8612);
  assert(
    Array.isArray(lngLat) && lngLat[0] === 79.8612 && lngLat[1] === 6.9271,
    'toLngLatArray enforces GeoJSON [lng, lat] coordinate order'
  );
  const bounds = computeBounds([
    { latitude: 6.9271, longitude: 79.8612 },
    { latitude: 7.2906, longitude: 80.6337 },
  ]);
  assert(
    bounds && bounds[0][0] === 79.8612 && bounds[0][1] === 6.9271 && bounds[1][0] === 80.6337 && bounds[1][1] === 7.2906,
    'computeBounds returns [[minLng, minLat], [maxLng, maxLat]]'
  );

  // 5.2 DTO adapters & missing coordinate counting
  const adaptedCrisis = adaptCrisisToMapItem({
    id: 'C-1',
    crisisName: 'Kelani Flood',
    severity: 'Critical',
    status: 'Active',
    location: { districtName: 'Colombo', latitude: 6.9271, longitude: 79.8612 },
  });
  assert(
    adaptedCrisis && adaptedCrisis.id === 'crisis-C-1' && adaptedCrisis.type === 'crisis' && adaptedCrisis.longitude === 79.8612,
    'adaptCrisisToMapItem produces unified map item'
  );
  assert(
    adaptCrisisToMapItem({ id: 'C-2', crisisName: 'No Coords', location: { districtName: 'Galle' } }) === null,
    'adaptCrisisToMapItem returns null when coordinates are missing (never invents coordinates)'
  );

  const adaptedShelter = adaptShelterToMapItem({
    id: 'S-1',
    name: 'Town Hall Shelter',
    district: 'Colombo',
    capacity: 200,
    currentOccupancy: 120,
    coordinates: { lat: 6.915, lng: 79.863 },
  });
  assert(
    adaptedShelter && adaptedShelter.type === 'shelter' && adaptedShelter.properties.availableCapacity === 80,
    'adaptShelterToMapItem computes availableCapacity and normalizes coordinates'
  );

  const adaptedOrg = adaptOrganizationToMapItem({
    organizationId: 5,
    name: 'Relief Lanka',
    status: 'Active',
    latitude: 7.2906,
    longitude: 80.6337,
  });
  assert(adaptedOrg && adaptedOrg.type === 'organization', 'adaptOrganizationToMapItem adapts valid organization coordinates');

  const adaptedReq = adaptCitizenRequestToMapItem({
    requestId: 88,
    requestType: 'Food',
    urgencyLevel: 'Critical',
    status: 'Pending',
    latitude: 6.5854,
    longitude: 79.9607,
  });
  assert(adaptedReq && adaptedReq.type === 'citizen_request', 'adaptCitizenRequestToMapItem adapts citizen request coordinates');

  const adaptedWh = adaptWarehouseToMapItem({
    warehouseId: 9,
    warehouseName: 'Central Depot',
    latitude: 7.4863,
    longitude: 80.3623,
    isActive: true,
  });
  assert(adaptedWh && adaptedWh.type === 'warehouse', 'adaptWarehouseToMapItem adapts warehouse coordinates');

  assert(
    adaptVolunteerToMapItem({ volunteerId: 1, fullName: 'Hidden', latitude: 6.9, longitude: 79.8 }, { allowExact: false }) === null,
    'adaptVolunteerToMapItem enforces privacy gate when allowExact is false'
  );
  assert(
    adaptVolunteerToMapItem({ volunteerId: 1, fullName: 'Responder A', latitude: 6.9, longitude: 79.8 }, { allowExact: true }) !== null,
    'adaptVolunteerToMapItem allows authorized volunteer coordinates when allowExact is true'
  );

  const adaptedAi = adaptAiRecommendationToMapItem({
    recommendationId: 12,
    citizenRequestId: 88,
    suggestedCategory: 'Medicine',
    suggestedUrgencyLevel: 'Critical',
    reviewStatus: 'PendingReview',
    latitude: 6.5854,
    longitude: 79.9607,
  });
  assert(
    adaptedAi && adaptedAi.properties.isAdvisoryRecommendation === true,
    'adaptAiRecommendationToMapItem marks AI recommendations as advisory'
  );

  const collectionResult = adaptCollectionToMapItems(
    [
      { id: '1', crisisName: 'Valid', location: { latitude: 6.9, longitude: 79.8 } },
      { id: '2', crisisName: 'Missing' },
    ],
    adaptCrisisToMapItem
  );
  assert(
    collectionResult.items.length === 1 && collectionResult.missingCoordinatesCount === 1,
    'adaptCollectionToMapItems excludes missing-coordinate records and reports missingCoordinatesCount'
  );

  // 5.3 Filtering & GeoJSON conversion
  const geoJson = mapItemsToGeoJson([adaptedCrisis, adaptedShelter]);
  assert(
    geoJson.type === 'FeatureCollection' && geoJson.features.length === 2 && geoJson.features[0].geometry.coordinates[0] === 79.8612,
    'mapItemsToGeoJson builds FeatureCollection with [lng, lat] coordinates'
  );
  const filteredOnlyCrises = filterMapItems([adaptedCrisis, adaptedShelter], {
    visibleTypes: new Set(['crisis']),
    searchQuery: 'kelani',
  });
  assert(filteredOnlyCrises.length === 1 && filteredOnlyCrises[0].id === 'crisis-C-1', 'filterMapItems filters by layer type and search query');

  // 5.4 Map config & routing safety
  const unconfiguredMap = getMapConfiguration();
  assert(
    unconfiguredMap.isConfigured === false && typeof unconfiguredMap.configurationError === 'string' && unconfiguredMap.configurationError.length > 0,
    'getMapConfiguration reports unconfigured state cleanly without fake fallback'
  );

  const unconfiguredRouter = createRoutingProvider();
  const routeCheck = await unconfiguredRouter.getRoute({
    origin: { latitude: 6.92, longitude: 79.86 },
    destination: { latitude: 7.29, longitude: 80.63 },
  });
  assert(
    routeCheck.supported === false && routeCheck.reason.includes('VITE_ROUTING_API_URL'),
    'createRoutingProvider refuses to fake a straight-line route as a road route'
  );
  assert(buildRouteGeoJson(routeCheck) === null, 'buildRouteGeoJson returns null when no road route exists');

  // 5.5 Backend-to-Frontend Coordinate DTO Mapper Round-Trips
  const crisisWithCoords = mapCrisisFromApi({
    crisisId: 202,
    crisisName: 'Kalu Ganga Flood',
    crisisType: 'Flood',
    severityLevel: 'High',
    status: 'Active',
    locationName: 'Kalutara',
    latitude: 6.5854,
    longitude: 79.9607,
  });
  assert(
    crisisWithCoords.latitude === 6.5854 && crisisWithCoords.location.longitude === 79.9607,
    'mapCrisisFromApi preserves persisted crisis latitude/longitude'
  );
  const crisisCreateWithCoords = mapCrisisCreateToApi(crisisWithCoords);
  assert(
    crisisCreateWithCoords.latitude === 6.5854 && crisisCreateWithCoords.locationName === 'Kalutara',
    'mapCrisisCreateToApi forwards latitude/longitude/locationName to backend'
  );

  const orgWithCoords = mapOrganizationFromApi({
    organizationId: 10,
    organizationName: 'Colombo Relief',
    organizationType: 'NGO',
    isActive: true,
    latitude: 6.9271,
    longitude: 79.8612,
  });
  assert(
    orgWithCoords.latitude === 6.9271 && orgWithCoords.longitude === 79.8612,
    'mapOrganizationFromApi preserves organization coordinates'
  );

  const whWithCoords = mapWarehouseFromApi({
    warehouseId: 11,
    warehouseName: 'Kandy Depot',
    warehouseCode: 'WH-KDY',
    address: 'Peradeniya Rd',
    areaId: 4,
    latitude: 7.2906,
    longitude: 80.6337,
  });
  assert(
    whWithCoords.latitude === 7.2906 && whWithCoords.longitude === 80.6337,
    'mapWarehouseFromApi preserves warehouse coordinates'
  );

  const allocWithCoords = mapResourceAllocationFromApi({
    allocationId: 12,
    inventoryId: 1,
    warehouseName: 'Kandy Depot',
    warehouseLatitude: 7.2906,
    warehouseLongitude: 80.6337,
    crisisId: 202,
    crisisName: 'Kalu Ganga Flood',
    crisisLatitude: 6.5854,
    crisisLongitude: 79.9607,
  });
  assert(
    allocWithCoords.warehouseLatitude === 7.2906 && allocWithCoords.crisisLatitude === 6.5854,
    'mapResourceAllocationFromApi preserves warehouse and crisis endpoint coordinates'
  );

  const aiWithCoords = mapAiRecommendationFromApi({
    recommendationId: 13,
    citizenRequestId: 88,
    latitude: 6.5854,
    longitude: 79.9607,
  });
  assert(
    aiWithCoords.latitude === 6.5854 && aiWithCoords.longitude === 79.9607,
    'mapAiRecommendationFromApi preserves citizen request coordinates for AI advisory map'
  );

  console.log('\n=====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
