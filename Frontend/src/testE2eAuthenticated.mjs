/**
 * HCMS Phase 3 – Opt-In Authenticated E2E HTTP Integration Test Suite
 *
 * Safety & Opt-In Controls:
 *  - Requires HCMS_RUN_E2E_INTEGRATION=true (otherwise exits cleanly with 0 live requests).
 *  - Default mode is 100% NON-DESTRUCTIVE (zero database writes):
 *      * /health + public endpoints
 *      * Unauthenticated 401 checks across all 10 operational workflow areas
 *      * Authenticated Admin read-only & negative-guard checks (when HCMS_TEST_ADMIN_EMAIL / HCMS_TEST_ADMIN_PASSWORD set)
 *      * Authenticated Citizen 403 RBAC checks (when HCMS_TEST_CITIZEN_EMAIL / HCMS_TEST_CITIZEN_PASSWORD set)
 *  - Optional synthetic write checks require BOTH:
 *      HCMS_RUN_E2E_INTEGRATION=true AND HCMS_ALLOW_SYNTHETIC_WRITES=true
 *    Write mode creates ONLY clearly marked `E2E-SYN-<timestamp>` records:
 *      * POST /api/Shelters -> POST /api/Shelters/placements -> PATCH /api/Shelters/placements/{id}/checkout
 *      * POST /api/Volunteers -> PATCH /api/Volunteers/{id}/approval
 *      * POST /api/Donations (Monetary only; never creates test inventory records) -> PATCH /api/Donations/{id}/verify
 *    Cleanup strategy: non-destructive (placements checked out; records remain clearly prefixed `E2E-SYN-` for auditability).
 *  - NEVER calls /api/AiRecommendations/analyze/{id}, NEVER calls /api/AiRecommendations/diagnostic,
 *    NEVER modifies existing records, NEVER elevates privileges, NEVER prints JWTs or passwords.
 */

const RUN_E2E = String(process.env.HCMS_RUN_E2E_INTEGRATION || '').toLowerCase() === 'true';
const ALLOW_SYNTHETIC_WRITES = String(process.env.HCMS_ALLOW_SYNTHETIC_WRITES || '').toLowerCase() === 'true';
const API_BASE = (process.env.HCMS_API_BASE_URL || 'http://localhost:5107').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.HCMS_TEST_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.HCMS_TEST_ADMIN_PASSWORD || '';
const CITIZEN_EMAIL = process.env.HCMS_TEST_CITIZEN_EMAIL || '';
const CITIZEN_PASSWORD = process.env.HCMS_TEST_CITIZEN_PASSWORD || '';

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(label) {
  passed++;
  console.log(`  ✅ PASS: ${label}`);
}

function fail(label, detail = '') {
  failed++;
  console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
}

function skip(label, reason) {
  skipped++;
  console.log(`  ⏭️ SKIPPED: ${label} (${reason})`);
}

async function httpRequest(path, { method = 'GET', token = null, body = null } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== null) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, text, json };
}

async function loginSilently(email, password) {
  const res = await httpRequest('/api/Auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (res.status !== 200 || !res.json?.accessToken) {
    return { ok: false, status: res.status, token: null };
  }
  return { ok: true, status: res.status, token: res.json.accessToken };
}

async function run() {
  console.log('=================================================================');
  console.log('🔐 HCMS PHASE 3 – AUTHENTICATED E2E HTTP INTEGRATION SUITE');
  console.log('=================================================================');

  if (!RUN_E2E) {
    console.log('ℹ️ Opt-in suite skipped. Set HCMS_RUN_E2E_INTEGRATION=true to execute.');
    console.log('   Optional: HCMS_API_BASE_URL (default http://localhost:5107)');
    console.log('   Optional: HCMS_TEST_ADMIN_EMAIL, HCMS_TEST_ADMIN_PASSWORD');
    console.log('   Optional: HCMS_TEST_CITIZEN_EMAIL, HCMS_TEST_CITIZEN_PASSWORD');
    console.log('   Optional: HCMS_ALLOW_SYNTHETIC_WRITES=true (explicit opt-in for E2E-SYN- write tests)');
    process.exit(0);
  }

  console.log(`Target API: ${API_BASE}`);
  console.log(`Synthetic Writes Enabled: ${ALLOW_SYNTHETIC_WRITES}`);

  // 1. Health & Public Endpoints
  console.log('\n--- GROUP 1: Health & Public Endpoints ---');
  const health = await httpRequest('/health');
  if (health.status === 200 && health.text.includes('Healthy')) {
    pass('GET /health returns HTTP 200 Healthy');
  } else {
    fail('GET /health returns HTTP 200 Healthy', `HTTP ${health.status}`);
  }

  const publicShelters = await httpRequest('/api/Shelters');
  if (publicShelters.status === 200 && Array.isArray(publicShelters.json)) {
    pass(`GET /api/Shelters (AllowAnonymous) returns HTTP 200 (${publicShelters.json.length} records)`);
  } else {
    fail('GET /api/Shelters (AllowAnonymous) returns HTTP 200', `HTTP ${publicShelters.status}`);
  }

  // 2. Unauthenticated 401 Security Enforcement
  console.log('\n--- GROUP 2: Unauthenticated 401 Security Checks ---');
  const unauthProtectedPaths = [
    '/api/Auth/me',
    '/api/CrisisEvents',
    '/api/CitizenRequests',
    '/api/Organizations',
    '/api/Resources',
    '/api/Warehouses',
    '/api/WarehouseInventories',
    '/api/InventoryTransactions',
    '/api/ResourceAllocations',
    '/api/Shelters/placements',
    '/api/Volunteers',
    '/api/Volunteers/assignments',
    '/api/Donations',
    '/api/Users',
    '/api/Roles',
    '/api/Roles/permissions',
    '/api/Dashboard/overview',
    '/api/Notifications',
    '/api/Notifications/my',
    '/api/AuditLogs',
    '/api/AiRecommendations/status',
    '/api/AiRecommendations',
  ];

  for (const path of unauthProtectedPaths) {
    const res = await httpRequest(path);
    if (res.status === 401) {
      pass(`Unauthenticated GET ${path} -> HTTP 401`);
    } else {
      fail(`Unauthenticated GET ${path} -> expected HTTP 401`, `got HTTP ${res.status}`);
    }
  }

  // 3. Authenticated Admin Non-Destructive Checks (All 10 Workflows)
  console.log('\n--- GROUP 3: Authenticated Admin Non-Destructive Workflow Checks ---');
  let adminToken = null;
  let adminUserId = null;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    skip('Admin authenticated workflow checks (10 areas)', 'HCMS_TEST_ADMIN_EMAIL / HCMS_TEST_ADMIN_PASSWORD not set');
  } else {
    const login = await loginSilently(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!login.ok) {
      fail('POST /api/Auth/login (Admin)', `HTTP ${login.status}`);
    } else {
      adminToken = login.token;
      pass('POST /api/Auth/login (Admin) returned valid JWT (token redacted)');

      const me = await httpRequest('/api/Auth/me', { token: adminToken });
      if (me.status === 200 && me.json?.userId) {
        adminUserId = me.json.userId;
        pass(`GET /api/Auth/me returned authenticated profile (UserId=${adminUserId})`);
      } else {
        fail('GET /api/Auth/me', `HTTP ${me.status}`);
      }

      const adminReadChecks = [
        ['GET /api/CrisisEvents', '/api/CrisisEvents'],
        ['GET /api/CitizenRequests', '/api/CitizenRequests'],
        ['GET /api/Organizations', '/api/Organizations'],
        ['GET /api/Organizations/my-memberships', '/api/Organizations/my-memberships'],
        ['GET /api/Resources', '/api/Resources'],
        ['GET /api/Warehouses', '/api/Warehouses'],
        ['GET /api/WarehouseInventories', '/api/WarehouseInventories'],
        ['GET /api/InventoryTransactions', '/api/InventoryTransactions'],
        ['GET /api/ResourceAllocations', '/api/ResourceAllocations'],
        ['GET /api/Shelters/placements', '/api/Shelters/placements'],
        ['GET /api/Volunteers', '/api/Volunteers'],
        ['GET /api/Volunteers/assignments', '/api/Volunteers/assignments'],
        ['GET /api/Donations', '/api/Donations'],
        ['GET /api/Users', '/api/Users'],
        ['GET /api/Roles', '/api/Roles'],
        ['GET /api/Roles/permissions', '/api/Roles/permissions'],
        ['GET /api/Dashboard/overview', '/api/Dashboard/overview'],
        ['GET /api/Notifications', '/api/Notifications'],
        ['GET /api/Notifications/my', '/api/Notifications/my'],
        ['GET /api/AuditLogs', '/api/AuditLogs'],
        ['GET /api/AiRecommendations/status', '/api/AiRecommendations/status'],
        ['GET /api/AiRecommendations', '/api/AiRecommendations'],
      ];

      for (const [label, path] of adminReadChecks) {
        const res = await httpRequest(path, { token: adminToken });
        if (res.status === 200) {
          pass(`${label} -> HTTP 200`);
        } else {
          fail(`${label} -> expected HTTP 200`, `got HTTP ${res.status}`);
        }
      }

      // Security negative check: Admin cannot modify their own roles
      if (adminUserId) {
        const selfRoleAttempt = await httpRequest(`/api/Users/${adminUserId}/roles`, {
          method: 'PUT',
          token: adminToken,
          body: { roleIds: [2] },
        });
        if (selfRoleAttempt.status === 400 || selfRoleAttempt.status === 409) {
          pass(`PUT /api/Users/${adminUserId}/roles (self-role guard) rejected with HTTP ${selfRoleAttempt.status}`);
        } else {
          fail(`PUT /api/Users/${adminUserId}/roles self-role guard`, `got HTTP ${selfRoleAttempt.status}`);
        }
      }

      // AI.Review authorization check on non-existent recommendation ID (zero writes, zero live AI)
      const missingReview = await httpRequest('/api/AiRecommendations/999999/review', {
        method: 'PATCH',
        token: adminToken,
        body: { decision: 'Approved', humanDecisionNote: 'E2E auth check' },
      });
      if (missingReview.status === 404) {
        pass('PATCH /api/AiRecommendations/999999/review (AI.Review policy passed, 404 on unknown ID)');
      } else {
        fail('PATCH /api/AiRecommendations/999999/review', `expected HTTP 404, got HTTP ${missingReview.status}`);
      }
    }
  }

  // 4. Authenticated Citizen 403 RBAC Checks
  console.log('\n--- GROUP 4: Non-Admin RBAC 403 Forbidden Checks ---');
  if (!CITIZEN_EMAIL || !CITIZEN_PASSWORD) {
    skip('Citizen 403 RBAC enforcement checks', 'HCMS_TEST_CITIZEN_EMAIL / HCMS_TEST_CITIZEN_PASSWORD not set');
  } else {
    const citizenLogin = await loginSilently(CITIZEN_EMAIL, CITIZEN_PASSWORD);
    if (!citizenLogin.ok) {
      fail('POST /api/Auth/login (Citizen)', `HTTP ${citizenLogin.status}`);
    } else {
      const citizenToken = citizenLogin.token;
      pass('POST /api/Auth/login (Citizen) returned valid JWT (token redacted)');

      const forbiddenPaths = [
        ['GET', '/api/Users'],
        ['GET', '/api/Roles'],
        ['GET', '/api/Roles/permissions'],
        ['GET', '/api/AuditLogs'],
        ['GET', '/api/Dashboard/overview'],
        ['GET', '/api/Volunteers'],
        ['GET', '/api/Donations'],
        ['GET', '/api/AiRecommendations/status'],
        ['GET', '/api/AiRecommendations'],
      ];

      for (const [method, path] of forbiddenPaths) {
        const res = await httpRequest(path, { method, token: citizenToken });
        if (res.status === 403) {
          pass(`Citizen ${method} ${path} -> HTTP 403 Forbidden`);
        } else {
          fail(`Citizen ${method} ${path} -> expected HTTP 403`, `got HTTP ${res.status}`);
        }
      }

      const citizenReviewAttempt = await httpRequest('/api/AiRecommendations/1/review', {
        method: 'PATCH',
        token: citizenToken,
        body: { decision: 'Approved', humanDecisionNote: 'Unauthorized review attempt' },
      });
      if (citizenReviewAttempt.status === 403) {
        pass('Citizen PATCH /api/AiRecommendations/1/review -> HTTP 403 Forbidden (AI.Review enforced)');
      } else {
        fail('Citizen PATCH /api/AiRecommendations/1/review -> expected HTTP 403', `got HTTP ${citizenReviewAttempt.status}`);
      }
    }
  }

  // 5. Optional Opt-In Synthetic Write Workflow Checks (NOT executed unless HCMS_ALLOW_SYNTHETIC_WRITES=true)
  console.log('\n--- GROUP 5: Optional Synthetic Write Workflows (E2E-SYN-) ---');
  if (!ALLOW_SYNTHETIC_WRITES) {
    skip('Synthetic write workflows (Shelter/Volunteer/Monetary Donation)', 'HCMS_ALLOW_SYNTHETIC_WRITES is not true (safe non-destructive default)');
  } else if (!adminToken) {
    skip('Synthetic write workflows', 'Admin token unavailable');
  } else {
    const tag = `E2E-SYN-${Date.now()}`;
    const areasRes = await httpRequest('/api/Areas', { token: adminToken });
    const firstAreaId = Array.isArray(areasRes.json) && areasRes.json.length > 0 ? areasRes.json[0].areaId : 1;

    // 5A. Shelter create -> placement check-in -> placement check-out
    const createdShelter = await httpRequest('/api/Shelters', {
      method: 'POST',
      token: adminToken,
      body: {
        shelterName: `${tag} Emergency Shelter`,
        areaId: firstAreaId,
        address: `${tag} Synthetic Address`,
        capacity: 20,
        currentOccupancy: 0,
        status: 'Open',
      },
    });
    if (createdShelter.status === 201 && createdShelter.json?.shelterId) {
      const sid = createdShelter.json.shelterId;
      pass(`POST /api/Shelters created ${tag} (ShelterId=${sid})`);

      const placement = await httpRequest('/api/Shelters/placements', {
        method: 'POST',
        token: adminToken,
        body: { shelterId: sid, residentName: `${tag} Resident`, peopleCount: 3 },
      });
      if (placement.status === 201 && placement.json?.placementId) {
        pass(`POST /api/Shelters/placements checked in 3 residents (PlacementId=${placement.json.placementId})`);
        const checkout = await httpRequest(`/api/Shelters/placements/${placement.json.placementId}/checkout`, {
          method: 'PATCH',
          token: adminToken,
        });
        if (checkout.status === 200 && checkout.json?.status === 'CheckedOut') {
          pass(`PATCH /api/Shelters/placements/${placement.json.placementId}/checkout -> CheckedOut`);
        } else {
          fail('Shelter placement checkout', `HTTP ${checkout.status}`);
        }
      } else {
        fail('POST /api/Shelters/placements', `HTTP ${placement.status}`);
      }
    } else {
      fail('POST /api/Shelters', `HTTP ${createdShelter.status}`);
    }

    // 5B. Volunteer registration -> approval
    const vol = await httpRequest('/api/Volunteers', {
      method: 'POST',
      token: adminToken,
      body: {
        fullName: `${tag} Volunteer`,
        email: `${tag.toLowerCase()}@synthetic.local`,
        areaId: firstAreaId,
        skills: 'First Aid, Logistics',
        availabilityStatus: 'Available',
      },
    });
    if (vol.status === 201 && vol.json?.volunteerId) {
      pass(`POST /api/Volunteers registered ${tag} (VolunteerId=${vol.json.volunteerId})`);
      const approve = await httpRequest(`/api/Volunteers/${vol.json.volunteerId}/approval`, {
        method: 'PATCH',
        token: adminToken,
        body: { approvalStatus: 'Approved' },
      });
      if (approve.status === 200 && approve.json?.approvalStatus === 'Approved') {
        pass(`PATCH /api/Volunteers/${vol.json.volunteerId}/approval -> Approved`);
      } else {
        fail('Volunteer approval', `HTTP ${approve.status}`);
      }
    } else {
      fail('POST /api/Volunteers', `HTTP ${vol.status}`);
    }

    // 5C. Monetary donation create -> verify (never creates inventory records without explicit approval)
    const don = await httpRequest('/api/Donations', {
      method: 'POST',
      token: adminToken,
      body: {
        donorName: `${tag} Donor`,
        donationType: 'Monetary',
        amount: 1000,
        currency: 'LKR',
        referenceNumber: `${tag}-REF`,
      },
    });
    if (don.status === 201 && don.json?.donationId) {
      pass(`POST /api/Donations created ${tag} (DonationId=${don.json.donationId})`);
      const verify = await httpRequest(`/api/Donations/${don.json.donationId}/verify`, {
        method: 'PATCH',
        token: adminToken,
        body: { decision: 'Verified', notes: `${tag} verified` },
      });
      if (verify.status === 200 && verify.json?.status === 'Verified') {
        pass(`PATCH /api/Donations/${don.json.donationId}/verify -> Verified`);
      } else {
        fail('Donation verification', `HTTP ${verify.status}`);
      }
    } else {
      fail('POST /api/Donations', `HTTP ${don.status}`);
    }
  }

  console.log('\n=================================================================');
  console.log(`📊 E2E INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED, ${skipped} SKIPPED`);
  console.log('=================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal E2E runner error:', err?.message || err);
  process.exit(1);
});
