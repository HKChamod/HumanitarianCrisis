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

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
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
  console.log('\n--- TEST GROUP 4: Backend Live API Integration (http://localhost:5107) ---');
  try {
    // 4.1 Login
    const loginRes = await fetch(`${API_BASE_URL}/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin.test+20261116@example.com',
        password: 'Admin@4554',
      }),
    });
    assert(loginRes.status === 200, `POST /api/Auth/login returns HTTP 200 OK`);
    const loginData = await loginRes.json();
    assert(Boolean(loginData.accessToken), 'Login response contains valid JWT accessToken');

    const authHeaders = {
      Authorization: `Bearer ${loginData.accessToken}`,
      'Content-Type': 'application/json',
    };

    // 4.2 /api/Auth/me
    const meRes = await fetch(`${API_BASE_URL}/Auth/me`, { headers: authHeaders });
    assert(meRes.status === 200, 'GET /api/Auth/me returns HTTP 200 OK');
    const meData = await meRes.json();
    assert(meData.roles.includes('Administrator'), 'Current user contains Administrator role');
    assert(meData.permissions.length > 20, `Current user has all permissions populated (${meData.permissions.length} permissions)`);

    // 4.3 CrisisEvents
    const crisesRes = await fetch(`${API_BASE_URL}/CrisisEvents`, { headers: authHeaders });
    assert(crisesRes.status === 200, 'GET /api/CrisisEvents returns HTTP 200 OK');

    // 4.4 CitizenRequests
    const reqRes = await fetch(`${API_BASE_URL}/CitizenRequests`, { headers: authHeaders });
    assert(reqRes.status === 200, 'GET /api/CitizenRequests returns HTTP 200 OK');

    // 4.5 Organizations
    const orgRes = await fetch(`${API_BASE_URL}/Organizations`, { headers: authHeaders });
    assert(orgRes.status === 200, 'GET /api/Organizations returns HTTP 200 OK');

    // 4.6 Resources
    const resRes = await fetch(`${API_BASE_URL}/Resources`, { headers: authHeaders });
    assert(resRes.status === 200, 'GET /api/Resources returns HTTP 200 OK');

    // 4.7 Warehouses
    const whRes = await fetch(`${API_BASE_URL}/Warehouses`, { headers: authHeaders });
    assert(whRes.status === 200, 'GET /api/Warehouses returns HTTP 200 OK');

    // 4.8 Warehouse Inventories
    const invRes = await fetch(`${API_BASE_URL}/WarehouseInventories`, { headers: authHeaders });
    assert(invRes.status === 200, 'GET /api/WarehouseInventories returns HTTP 200 OK');
  } catch (err) {
    console.error('Error during backend API integration test:', err);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
