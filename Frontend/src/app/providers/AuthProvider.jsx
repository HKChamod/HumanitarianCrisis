import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TOKEN_STORAGE_KEY, USE_MOCK_API } from '../../services/api/apiConfig';
import { authService } from '../../services/api/adminServices';

const ADMIN_ROLE_NAMES = new Set([
  'Admin',
  'SystemAdmin',
  'Central Administrator',
  'Coordinator',
  'Crisis Coordinator',
  'OrganizationManager',
]);

const CENTRAL_ADMIN_PERMISSIONS = [
  'Users.View',
  'Users.Manage',
  'Organizations.View',
  'Organizations.Manage',
  'Organizations.ApproveMembers',
  'CrisisEvents.View',
  'CrisisEvents.Create',
  'CrisisEvents.Update',
  'CrisisEvents.Delete',
  'CrisisEvents.Manage',
  'CitizenRequests.View',
  'CitizenRequests.Manage',
  'Areas.View',
  'Areas.Manage',
  'Resources.View',
  'Resources.Manage',
  'Resources.Allocate',
  'Donations.View',
  'Donations.Manage',
  'Donations.Verify',
  'Volunteers.View',
  'Volunteers.Manage',
  'Volunteers.Approve',
  'Reports.View',
  'Reports.Generate',
  // Frontend-only planned module permissions (awaiting backend seed)
  'Shelters.View',
  'Roles.Manage',
  'Permissions.View',
  'AI.Review',
  'Notifications.View',
  'AuditLogs.View',
  'Settings.Manage',
];

const COORDINATOR_PERMISSIONS = [
  'CrisisEvents.View',
  'CrisisEvents.Create',
  'CrisisEvents.Update',
  'CitizenRequests.View',
  'CitizenRequests.Manage',
  'Areas.View',
  'Organizations.View',
  'Resources.View',
  'Resources.Allocate',
  'Shelters.View',
  'Volunteers.View',
  'AI.Review',
  'Reports.View',
  'Notifications.View',
];

const CITIZEN_PERMISSIONS = ['CrisisEvents.View', 'Areas.View'];

const ROLE_PERMISSION_MAP = {
  Admin: CENTRAL_ADMIN_PERMISSIONS,
  SystemAdmin: CENTRAL_ADMIN_PERMISSIONS,
  'Central Administrator': CENTRAL_ADMIN_PERMISSIONS,
  Coordinator: COORDINATOR_PERMISSIONS,
  'Crisis Coordinator': COORDINATOR_PERMISSIONS,
  OrganizationManager: COORDINATOR_PERMISSIONS,
  Citizen: CITIZEN_PERMISSIONS,
};

function resolvePermissionsForRoles(roles = []) {
  const permSet = new Set();
  roles.forEach((roleName) => {
    const perms = ROLE_PERMISSION_MAP[roleName];
    if (perms) perms.forEach((p) => permSet.add(p));
  });
  return Array.from(permSet);
}

export function isAdminUser(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];
  return roles.some((r) => ADMIN_ROLE_NAMES.has(r));
}

const DEMO_PROFILES = {
  central_admin: {
    id: 'USR-001',
    fullName: 'D. Senanayake',
    email: 'officer@dmc.gov.lk',
    role: 'Central Administrator',
    roles: ['Admin', 'Central Administrator'],
    department: 'Disaster Management Centre',
    avatarInitials: 'DS',
    isDemoSession: true,
    permissions: CENTRAL_ADMIN_PERMISSIONS,
  },
  crisis_coordinator: {
    id: 'USR-003',
    fullName: 'M. Bandara',
    email: 'm.bandara@hcms-example.gov.lk',
    role: 'Crisis Coordinator',
    roles: ['Coordinator', 'Crisis Coordinator'],
    department: 'National Operations Room',
    avatarInitials: 'MB',
    isDemoSession: true,
    permissions: COORDINATOR_PERMISSIONS,
  },
  citizen: {
    id: 'USR-CIT-01',
    fullName: 'Example Citizen',
    email: 'citizen@relieflink.lk',
    role: 'Citizen',
    roles: ['Citizen'],
    department: 'Public Portal',
    avatarInitials: 'EC',
    isDemoSession: true,
    permissions: CITIZEN_PERMISSIONS,
  },
};

const STORAGE_KEY = 'hcms_admin_session_user';
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore storage errors
    }
    return USE_MOCK_API ? DEMO_PROFILES.central_admin : null;
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('hcms_user');
      setUser(null);
    };
    window.addEventListener('hcms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hcms:unauthorized', handleUnauthorized);
  }, []);

  const loginAsDemoRole = (rolePreset) => {
    const profile = DEMO_PROFILES[rolePreset];
    if (!profile) return null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(TOKEN_STORAGE_KEY, `mock_jwt_${rolePreset}`);
    setUser(profile);
    return profile;
  };

  const loginWithCredentials = async (email, password) => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail || !password) {
      throw { status: 400, title: 'Validation Error', detail: 'Email and password are required.' };
    }

    if (USE_MOCK_API) {
      const isOfficerOrAdmin =
        trimmedEmail.includes('admin') ||
        trimmedEmail.includes('officer') ||
        trimmedEmail.includes('dmc') ||
        trimmedEmail.includes('coord');

      const preset = trimmedEmail.includes('coord')
        ? 'crisis_coordinator'
        : isOfficerOrAdmin
          ? 'central_admin'
          : 'citizen';

      const base = DEMO_PROFILES[preset];
      const sessionUser = {
        ...base,
        email: trimmedEmail,
      };
      localStorage.setItem(TOKEN_STORAGE_KEY, `mock_jwt_${preset}`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      return sessionUser;
    }

    // Live .NET 10 Backend Authentication: POST /api/auth/login + GET /api/auth/me
    const authRes = await authService.login(trimmedEmail, password);
    if (!authRes?.accessToken) {
      throw { status: 401, title: 'Authentication Failed', detail: 'No access token returned by server.' };
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, authRes.accessToken);

    let me = null;
    try {
      me = await authService.getMe();
    } catch {
      // Fallback to AuthResponse fields if /me fails
    }

    const roles = Array.isArray(me?.roles) && me.roles.length > 0 ? me.roles : ['Citizen'];
    const permissions =
      Array.isArray(me?.permissions) && me.permissions.length > 0
        ? me.permissions
        : resolvePermissionsForRoles(roles);

    const fullName = me?.fullName || authRes.fullName || trimmedEmail;
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('');

    const sessionUser = {
      id: String(me?.userId ?? authRes.userId ?? ''),
      fullName,
      email: me?.email || authRes.email || trimmedEmail,
      role: roles[0],
      roles,
      permissions,
      avatarInitials: initials || 'US',
      isDemoSession: false,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    return sessionUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('hcms_user');
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: isAdminUser(user),
      isMockAuth: USE_MOCK_API,
      loginAsDemoRole,
      loginWithCredentials,
      logout,
      hasPermission: (permission) => {
        if (!permission) return true;
        if (!user) return false;
        return user.permissions.includes(permission);
      },
      hasAnyPermission: (permissions) => {
        if (!permissions || permissions.length === 0) return true;
        if (!user) return false;
        return permissions.some((p) => user.permissions.includes(p));
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function ProtectedAdminRoute({ children, requiredPermission }) {
  const { isAuthenticated, isAdmin, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Prevent authenticated non-admin users (e.g., Citizen) from entering /admin routes
  if (!isAdmin && location.pathname !== '/admin/unauthorized') {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return children;
}

export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : fallback;
}
