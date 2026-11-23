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
  mapCrisisFromApi,
  mapCrisisCreateToApi,
  mapRequestFromApi,
  mapOrganizationFromApi,
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

  // --- TEST 3: RBAC & ADMIN PERMISSION GUARD ---
  console.log('\n--- TEST GROUP 3: RBAC & Permission Verification ---');
  const citizenUser = {
    roles: ['Citizen'],
    permissions: ['CrisisEvents.View', 'Areas.View'],
  };
  assert(!isAdminUser(citizenUser), 'Citizen user is correctly barred from admin entry (isAdminUser === false)');

  const adminUser = {
    roles: ['Administrator'],
    permissions: ['CrisisEvents.Create', 'CrisisEvents.Manage', 'Users.Manage'],
  };
  assert(isAdminUser(adminUser), 'Administrator user with administrative permissions is granted access (isAdminUser === true)');

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

  if (!hasAdminEmail || !hasAdminPassword) {
    console.error(
      `❌ Missing required environment variables (HCMS_TEST_ADMIN_EMAIL set: ${hasAdminEmail}, HCMS_TEST_ADMIN_PASSWORD set: ${hasAdminPassword}).`
    );
    failed++;
    dependentAuthenticatedEndpoints.forEach((ep) =>
      skip(`${ep} — blocked because required login environment variables are missing`)
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

  console.log('\n=====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
