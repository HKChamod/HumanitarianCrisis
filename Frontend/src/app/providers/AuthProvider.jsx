import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { USE_MOCK_API } from '../../services/api/axiosClient';

const DEMO_PROFILES = {
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
    return USE_MOCK_API ? DEMO_PROFILES.central_admin : null;
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
    setUser(profile);
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

export function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? children : fallback;
}
