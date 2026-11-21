import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { authService } from '../../services/api/adminServices';

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
    email: 'admin.central@hcms-example.gov.lk',
    role: 'Central Administrator',
    roles: ['Central Administrator'],
    department: 'Disaster Management Centre',
    avatarInitials: 'DS',
    isDemoSession: true,
    permissions: [
      'CrisisEvents.View',
      'CrisisEvents.Create',
      'CrisisEvents.Update',
      'CitizenRequests.View',
      'CitizenRequests.Verify',
      'Organizations.View',
      'Organizations.Manage',
      'Resources.View',
      'Resources.Manage',
      'Shelters.View',
      'Volunteers.View',
      'Donations.View',
      'Users.Manage',
      'Roles.Manage',
      'Permissions.View',
      'AI.Review',
      'Reports.Read',
      'Notifications.View',
      'AuditLogs.Read',
      'Settings.Manage',
    ],
  },
  crisis_coordinator: {
    id: 'USR-003',
    fullName: 'M. Bandara',
    email: 'm.bandara@hcms-example.gov.lk',
    role: 'Crisis Coordinator',
    roles: ['Crisis Coordinator'],
    department: 'National Operations Room',
    avatarInitials: 'MB',
    isDemoSession: true,
    permissions: [
      'CrisisEvents.View',
      'CrisisEvents.Create',
      'CrisisEvents.Update',
      'CitizenRequests.View',
      'CitizenRequests.Verify',
      'Organizations.View',
      'Resources.View',
      'Shelters.View',
      'Volunteers.View',
      'AI.Review',
      'Reports.Read',
      'Notifications.View',
    ],
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
    return null;
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    };
    window.addEventListener('hcms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('hcms:unauthorized', handleUnauthorized);
  }, []);

  const loginAsDemoRole = (rolePreset) => {
    const profile = DEMO_PROFILES[rolePreset];
    if (!profile) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem('hcms_user', JSON.stringify(profile));
    setUser(profile);
  };

  const loginWithCredentials = async (email, password) => {
    if (USE_MOCK_API) {
      const lower = (email || '').toLowerCase();
      let profile = DEMO_PROFILES.citizen;
      if (lower.includes('admin') || lower.includes('officer') || lower.includes('dmc')) {
        profile = DEMO_PROFILES.central_admin;
      } else if (lower.includes('coord') || lower.includes('bandara')) {
        profile = DEMO_PROFILES.crisis_coordinator;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      localStorage.setItem('hcms_user', JSON.stringify(profile));
      setUser(profile);
      return profile;
    }
    const authRes = await authService.login(email, password);
    if (authRes?.accessToken) {
      localStorage.setItem('hcms_access_token', authRes.accessToken);
    }
    const me = await authService.getMe();
    const fullName = me?.fullName || authRes?.fullName || email;
    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('');
    const sessionUser = {
      id: String(me?.userId ?? authRes?.userId ?? ''),
      fullName,
      email: me?.email || authRes?.email || email,
      role: me?.roles?.[0] || 'Administrator',
      roles: me?.roles || ['Administrator'],
      permissions: me?.permissions || DEMO_PROFILES.central_admin.permissions,
      avatarInitials: initials || 'AD',
      isDemoSession: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
    return sessionUser;
  };

  const logout = () => {
    localStorage.removeItem('hcms_access_token');
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
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
  const { isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
