import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TOKEN_STORAGE_KEY, USE_MOCK_API } from '../../services/api/apiConfig';
import { authService } from '../../services/api/adminServices';

/**
 * Operational/administrative permissions that grant entry into the Central Administration Portal.
 * Citizens (who typically only have CrisisEvents.View / Areas.View) will not satisfy this check.
 */
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

export function isAdminUser(user) {
  if (!user || !Array.isArray(user.permissions)) return false;
  return user.permissions.some((p) => ADMIN_PORTAL_ENTRY_PERMISSIONS.includes(p));
}

function buildInitials(fullName, email) {
  const source = (fullName || email || 'US').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function mapCurrentUserFromApi(me, fallbackAuth = {}) {
  const roles = Array.isArray(me?.roles) ? me.roles : [];
  // Always use the effective permissions returned by GET /api/auth/me (never derive from role names)
  const permissions = Array.isArray(me?.permissions) ? me.permissions : [];
  const fullName = me?.fullName || fallbackAuth.fullName || me?.email || fallbackAuth.email || 'User';
  const email = me?.email || fallbackAuth.email || '';

  return {
    id: String(me?.userId ?? fallbackAuth.userId ?? ''),
    fullName,
    email,
    phoneNumber: me?.phoneNumber || null,
    role: roles[0] || 'Authenticated User',
    roles,
    permissions,
    avatarInitials: buildInitials(fullName, email),
    isDemoSession: false,
  };
}

// Clearly separated demo profiles used ONLY when VITE_USE_MOCK_API=true
const DEMO_PROFILES = {
  citizen: {
    id: 'USR-CIT-001',
    fullName: 'Kavinda Perera',
    email: 'citizen@relieflink.lk',
    role: 'Citizen',
    roles: ['Citizen'],
    department: 'General Public',
    district: 'Kalutara',
    avatarInitials: 'KP',
    isDemoSession: true,
    permissions: [
      'CitizenRequests.Submit',
      'CitizenRequests.ViewMy',
      'Notifications.View',
    ],
  },
  central_admin: {
    id: 'USR-001',
    fullName: 'D. Senanayake',
    email: 'officer@dmc.gov.lk',
    role: 'Central Administrator',
    roles: ['Administrator'],
    department: 'Disaster Management Centre',
    avatarInitials: 'DS',
    isDemoSession: true,
    permissions: [
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
      'Shelters.View',
      'Roles.Manage',
      'Permissions.View',
      'AI.Review',
      'Notifications.View',
      'AuditLogs.View',
      'Settings.Manage',
    ],
  },
  crisis_coordinator: {
    id: 'USR-003',
    fullName: 'M. Bandara',
    email: 'm.bandara@hcms-example.gov.lk',
    role: 'Crisis Coordinator',
    roles: ['Coordinator'],
    department: 'National Operations Room',
    avatarInitials: 'MB',
    isDemoSession: true,
    permissions: [
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
    ],
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
    permissions: ['CrisisEvents.View', 'Areas.View'],
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

  // Refresh live user roles & effective permissions from GET /api/auth/me on page reload
  useEffect(() => {
    if (USE_MOCK_API) return;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    let cancelled = false;
    authService
      .getMe()
      .then((me) => {
        if (cancelled) return;
        const refreshedUser = mapCurrentUserFromApi(me);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshedUser));
        setUser(refreshedUser);
      })
      .catch(() => {
        // 401 is handled by axios interceptor (dispatches hcms:unauthorized)
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

    // Live .NET 10 Backend Authentication: POST /api/auth/login -> GET /api/auth/me
    const authRes = await authService.login(trimmedEmail, password);
    if (!authRes?.accessToken) {
      throw { status: 401, title: 'Authentication Failed', detail: 'No access token returned by server.' };
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, authRes.accessToken);

    try {
      const me = await authService.getMe();
      const sessionUser = mapCurrentUserFromApi(me, authRes);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      return sessionUser;
    } catch (err) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      throw err;
    }
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
        if (!user || !Array.isArray(user.permissions)) return false;
        return user.permissions.includes(permission);
      },
      hasAnyPermission: (permissions) => {
        if (!permissions || permissions.length === 0) return true;
        if (!user || !Array.isArray(user.permissions)) return false;
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

  // Block authenticated users who lack administrative permissions from /admin routes
  if (!isAdmin && location.pathname !== '/admin/unauthorized') {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return children;
}

export function ProtectedCitizenRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : fallback;
}
