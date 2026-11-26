/**
 * Centralized role- and permission-based routing helpers for HCMS.
 * Pure JS module (safe for both React/Vite and Node integration tests).
 */

export const ADMIN_PORTAL_ENTRY_PERMISSIONS = [
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

const NON_REDIRECT_AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/admin/unauthorized',
]);

/**
 * Exact permission requirements matching adminRoutes.jsx.
 * Value is either a single permission string, an array of alternative permissions
 * (any one suffices), or null (only isAdminUser required).
 */
const ADMIN_ROUTE_PERMISSIONS = {
  '/admin': null,
  '/admin/crises': 'CrisisEvents.View',
  '/admin/crises/active': 'CrisisEvents.View',
  '/admin/crises/create': 'CrisisEvents.Create',
  '/admin/crises/map': 'CrisisEvents.View',
  '/admin/requests': 'CitizenRequests.View',
  '/admin/requests/pending': 'CitizenRequests.View',
  '/admin/requests/approved': 'CitizenRequests.View',
  '/admin/requests/rejected': 'CitizenRequests.View',
  '/admin/organizations': 'Organizations.View',
  '/admin/organizations/applications': 'Organizations.Manage',
  '/admin/organizations/memberships': 'Organizations.View',
  '/admin/users': 'Users.View',
  '/admin/roles': 'Roles.Manage',
  '/admin/permissions': 'Permissions.View',
  '/admin/resources/inventory': 'Resources.View',
  '/admin/resources/allocations': ['ResourceAllocations.View', 'Resources.View'],
  '/admin/resources/requests': ['ResourceAllocations.View', 'Resources.View'],
  '/admin/shelters': 'Shelters.View',
  '/admin/shelters/occupancy': 'Shelters.View',
  '/admin/volunteers': 'Volunteers.View',
  '/admin/volunteers/assignments': 'Volunteers.View',
  '/admin/donations': 'Donations.View',
  '/admin/donations/campaigns': 'Donations.View',
  '/admin/ai': ['AI.View', 'AI.Review'],
  '/admin/ai/recommendations': ['AI.View', 'AI.Review'],
  '/admin/ai/analytics': ['AI.View', 'AI.Review'],
  '/admin/reports': 'Reports.View',
  '/admin/reports/analytics': 'Reports.View',
  '/admin/notifications': 'Notifications.View',
  '/admin/audit-logs': 'AuditLogs.View',
  '/admin/settings': 'Permissions.View',
};

function normalizeRoles(user) {
  if (!user || !Array.isArray(user.roles)) return [];
  return user.roles
    .map((r) => (typeof r === 'string' ? r.trim().toLowerCase() : ''))
    .filter(Boolean);
}

function hasAnyRole(user, candidateRoles) {
  const userRoles = normalizeRoles(user);
  if (userRoles.length === 0) return false;
  return candidateRoles.some((candidate) => userRoles.includes(candidate.toLowerCase()));
}

function hasPermission(user, permission) {
  if (!permission) return true;
  if (!user || !Array.isArray(user.permissions)) return false;
  if (Array.isArray(permission)) {
    return permission.some((p) => user.permissions.includes(p));
  }
  return user.permissions.includes(permission);
}

export function isAdminUser(user) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return user.permissions.some((p) => ADMIN_PORTAL_ENTRY_PERMISSIONS.includes(p));
}

export function isApprovedMembership(membership) {
  return (
    membership?.membershipStatus === 'Approved' &&
    membership?.isOrganizationActive === true
  );
}

export function hasApprovedOrganizationMembership(memberships = []) {
  return Array.isArray(memberships) && memberships.some(isApprovedMembership);
}

function sanitizeInternalPath(path) {
  if (typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return null;
  }
  return trimmed;
}

function extractPathname(path) {
  const sanitized = sanitizeInternalPath(path);
  if (!sanitized) return null;
  const clean = sanitized.split('?')[0].split('#')[0];
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

/**
 * Computes the default landing route for an authenticated user based on their
 * backend-provided roles, effective permissions, and approved organization memberships.
 *
 * Role-priority order for multi-role accounts:
 * 1. Administrator / SystemAdmin (with admin portal permissions) -> /admin
 * 2. CrisisManager (with admin portal permissions) -> /admin
 * 3. Responder (with admin portal permissions) -> /admin
 * 4. Any other user possessing ADMIN_PORTAL_ENTRY_PERMISSIONS -> /admin
 * 5. Approved organization member (e.g. OrganizationAdmin, Coordinator, etc.) -> /organization
 * 6. Citizen / Donor / Volunteer / Default authenticated user -> /citizen
 */
export function getDefaultRouteForUser(user, memberships = []) {
  if (!user) return '/login';

  const adminEligible = isAdminUser(user);

  if (adminEligible && hasAnyRole(user, ['Administrator', 'SystemAdmin', 'Admin'])) {
    return '/admin';
  }

  if (adminEligible && hasAnyRole(user, ['CrisisManager', 'Coordinator'])) {
    return '/admin';
  }

  if (adminEligible && hasAnyRole(user, ['Responder'])) {
    return '/admin';
  }

  if (adminEligible) {
    return '/admin';
  }

  if (hasApprovedOrganizationMembership(memberships) || hasAnyRole(user, ['OrganizationAdmin'])) {
    return '/organization';
  }

  return '/citizen';
}

/**
 * Checks whether an authenticated user is authorized to be redirected to `path`
 * after login or session restoration.
 *
 * Prevents:
 * - Redirecting back to /login, /register, /forgot-password, /admin/unauthorized
 * - Redirecting non-admin users to /admin/* or unauthorized /admin sub-routes
 * - Redirecting users without approved org membership to /organization/*
 * - Redirecting Admin / CrisisManager / Responder accounts to /citizen/*
 */
export function canAccessPath(path, user, memberships = [], isMock = false) {
  if (!user) return false;

  const pathname = extractPathname(path);
  if (!pathname) return false;
  if (NON_REDIRECT_AUTH_PATHS.has(pathname)) return false;

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!isAdminUser(user)) return false;

    if (Object.prototype.hasOwnProperty.call(ADMIN_ROUTE_PERMISSIONS, pathname)) {
      const reqPerm = ADMIN_ROUTE_PERMISSIONS[pathname];
      if (pathname === '/admin/resources/allocations' || pathname === '/admin/resources/requests') {
        return hasPermission(user, isMock ? 'Resources.View' : 'ResourceAllocations.View');
      }
      if (
        pathname === '/admin/ai' ||
        pathname === '/admin/ai/recommendations' ||
        pathname === '/admin/ai/analytics'
      ) {
        return hasPermission(user, isMock ? 'AI.Review' : 'AI.View');
      }
      return hasPermission(user, reqPerm);
    }

    return true;
  }

  if (pathname === '/organization' || pathname.startsWith('/organization/')) {
    return hasApprovedOrganizationMembership(memberships);
  }

  if (pathname === '/citizen' || pathname.startsWith('/citizen/')) {
    // Operational staff (Admin, CrisisManager, Responder) must not be routed to Citizen Portal
    return !isAdminUser(user);
  }

  return false;
}

/**
 * Resolves the post-authentication destination:
 * 1. Requested protected path, ONLY if the authenticated user is authorized for it.
 * 2. Otherwise, the user's role-based default dashboard.
 */
export function resolvePostLoginRoute({ user, requestedPath, memberships = [], isMock = false }) {
  if (!user) return '/login';

  const sanitized = sanitizeInternalPath(requestedPath);
  if (sanitized && canAccessPath(sanitized, user, memberships, isMock)) {
    return sanitized;
  }

  return getDefaultRouteForUser(user, memberships);
}
