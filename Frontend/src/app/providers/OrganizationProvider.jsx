import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AlertCircle, Building2, Clock, LogOut, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { ORG_STORAGE_KEY, USE_MOCK_API } from '../../services/api/apiConfig';
import { organizationService } from '../../services/api/adminServices';
import { ErrorState, LoadingState } from '../../components/common/States';
import { useAuth } from './AuthProvider';

const OrganizationContext = createContext(undefined);

export function isEligibleMembership(membership) {
  return (
    membership?.membershipStatus === 'Approved' &&
    membership?.isOrganizationActive === true
  );
}

function getStoredOrgId() {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function persistOrgId(orgId) {
  try {
    localStorage.setItem(ORG_STORAGE_KEY, String(orgId));
  } catch {
    // ignore storage errors
  }
}

function clearStoredOrgId() {
  try {
    localStorage.removeItem(ORG_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function formatOrgError(err, fallbackDetail) {
  const status = err?.status ?? 0;
  if (status === 401) {
    return {
      status: 401,
      title: 'Session Expired',
      detail: err?.detail || 'Your session has expired. Please sign in again.',
    };
  }
  if (status === 403) {
    return {
      status: 403,
      title: 'Organization Access Denied',
      detail:
        err?.detail ||
        'You do not have an approved membership in this active organization.',
    };
  }
  if (status === 0) {
    return {
      status: 0,
      title: 'Network Unavailable',
      detail:
        err?.detail ||
        'Unable to reach the HCMS backend API. Verify the server is running and try again.',
    };
  }
  return {
    status,
    title: err?.title || 'Unable to Verify Organization Access',
    detail: err?.detail || fallbackDetail || 'An unexpected error occurred.',
  };
}

export function OrganizationProvider({ children }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const userId = user?.id ?? null;

  const [memberships, setMemberships] = useState([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState(null);
  const [activeOrganizationAccess, setActiveOrganizationAccess] = useState(null);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState(null);
  const [loadedUserId, setLoadedUserId] = useState(null);

  const requestSeqRef = useRef(0);

  const approvedMemberships = useMemo(
    () => memberships.filter(isEligibleMembership),
    [memberships]
  );

  const activeOrganization = useMemo(
    () =>
      approvedMemberships.find(
        (m) => Number(m.organizationId) === Number(activeOrganizationId)
      ) || null,
    [approvedMemberships, activeOrganizationId]
  );

  const orgRoles = useMemo(
    () =>
      Array.isArray(activeOrganizationAccess?.roles)
        ? activeOrganizationAccess.roles
        : [],
    [activeOrganizationAccess]
  );

  const orgPermissions = useMemo(
    () =>
      Array.isArray(activeOrganizationAccess?.permissions)
        ? activeOrganizationAccess.permissions
        : [],
    [activeOrganizationAccess]
  );

  const resetState = useCallback(() => {
    requestSeqRef.current += 1;
    clearStoredOrgId();
    setMemberships([]);
    setActiveOrganizationId(null);
    setActiveOrganizationAccess(null);
    setOrgError(null);
    setOrgLoading(false);
    setLoadedUserId(null);
  }, []);

  const validateOrganizationAccess = useCallback(async (orgId, seq) => {
    const targetOrgId = Number(orgId);
    const access = await organizationService.getMyOrganizationAccess(targetOrgId);

    if (requestSeqRef.current !== seq) {
      return { stale: true, access: null };
    }

    if (
      !access ||
      Number(access.organizationId) !== targetOrgId ||
      access.membershipStatus !== 'Approved'
    ) {
      throw {
        status: 403,
        title: 'Organization Access Denied',
        detail: 'Organization access verification did not match the requested active organization.',
      };
    }

    persistOrgId(targetOrgId);
    setActiveOrganizationId(targetOrgId);
    setActiveOrganizationAccess(access);
    setOrgError(null);
    return { stale: false, access };
  }, []);

  const refreshMemberships = useCallback(
    async ({ preserveError = false } = {}) => {
      if (!isAuthenticated || !userId) {
        resetState();
        return [];
      }

      const seq = ++requestSeqRef.current;
      setOrgLoading(true);
      if (!preserveError) {
        setOrgError(null);
      }

    try {
      const data = await organizationService.getMyMemberships();
      if (requestSeqRef.current !== seq) return [];

      const list = Array.isArray(data) ? data : [];
      const eligible = list.filter(isEligibleMembership);
      setMemberships(list);

      const storedOrgId = getStoredOrgId();
      const storedEligible = storedOrgId
        ? eligible.find((m) => Number(m.organizationId) === storedOrgId)
        : null;

      let candidateOrgId = null;
      if (storedEligible) {
        candidateOrgId = Number(storedEligible.organizationId);
      } else if (eligible.length === 1) {
        candidateOrgId = Number(eligible[0].organizationId);
      }

      if (candidateOrgId === null) {
        clearStoredOrgId();
        setActiveOrganizationId(null);
        setActiveOrganizationAccess(null);
        setLoadedUserId(userId);
        setOrgLoading(false);
        return list;
      }

      // Clear stale access before validating the selected organization
      setActiveOrganizationAccess(null);

      try {
        await validateOrganizationAccess(candidateOrgId, seq);
      } catch (accessErr) {
        if (requestSeqRef.current !== seq) return list;
        clearStoredOrgId();
        setActiveOrganizationId(null);
        setActiveOrganizationAccess(null);
        if (accessErr?.status !== 401) {
          setOrgError(
            formatOrgError(
              accessErr,
              'Could not verify access for the selected organization.'
            )
          );
        }
      }

      if (requestSeqRef.current === seq) {
        setLoadedUserId(userId);
        setOrgLoading(false);
      }
      return list;
    } catch (err) {
      if (requestSeqRef.current !== seq) return [];
      clearStoredOrgId();
      setMemberships([]);
      setActiveOrganizationId(null);
      setActiveOrganizationAccess(null);
      if (err?.status !== 401) {
        setOrgError(
          formatOrgError(err, 'Failed to load organization memberships.')
        );
      }
      setLoadedUserId(userId);
      setOrgLoading(false);
      return [];
    }
  }, [isAuthenticated, userId, resetState, validateOrganizationAccess]);

  // Load memberships when authenticated user changes; clear state on logout/unauthenticated
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      resetState();
      return undefined;
    }
    refreshMemberships();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [isAuthenticated, userId, resetState, refreshMemberships]);

  const selectOrganization = useCallback(
    async (orgId) => {
      const targetOrgId = Number(orgId);
      const isEligible = approvedMemberships.some(
        (m) => Number(m.organizationId) === targetOrgId
      );

      if (!isEligible) {
        setOrgError({
          status: 403,
          title: 'Organization Not Eligible',
          detail:
            'Only approved memberships in active organizations can be selected.',
        });
        return false;
      }

      const seq = ++requestSeqRef.current;
      // Clear previous org permissions immediately before switching
      setActiveOrganizationAccess(null);
      setOrgError(null);
      setOrgLoading(true);

      try {
        const result = await validateOrganizationAccess(targetOrgId, seq);
        if (result.stale) return false;
        setOrgLoading(false);
        return true;
      } catch (err) {
        if (requestSeqRef.current !== seq) return false;
        clearStoredOrgId();
        setActiveOrganizationId(null);
        setActiveOrganizationAccess(null);
        if (err?.status === 403) {
          setOrgError(
            formatOrgError(
              err,
              'Access to this organization was denied or revoked.'
            )
          );
          await refreshMemberships({ preserveError: true });
          return false;
        }
        if (err?.status !== 401) {
          setOrgError(
            formatOrgError(err, 'Failed to verify access for this organization.')
          );
        }
        setOrgLoading(false);
        return false;
      }
    },
    [approvedMemberships, validateOrganizationAccess, refreshMemberships]
  );

  const clearOrganization = useCallback(() => {
    requestSeqRef.current += 1;
    clearStoredOrgId();
    setActiveOrganizationId(null);
    setActiveOrganizationAccess(null);
    setOrgError(null);
  }, []);

  const hasOrgPermission = useCallback(
    (permission) => {
      if (!permission) return true;
      return orgPermissions.includes(permission);
    },
    [orgPermissions]
  );

  const hasAnyOrgPermission = useCallback(
    (permissions) => {
      if (!permissions || permissions.length === 0) return true;
      return permissions.some((p) => orgPermissions.includes(p));
    },
    [orgPermissions]
  );

  const isInitializing = Boolean(isAuthenticated && userId && loadedUserId !== userId);

  const value = useMemo(
    () => ({
      memberships,
      approvedMemberships,
      activeOrganizationId,
      activeOrganization,
      activeOrganizationAccess,
      orgRoles,
      orgPermissions,
      orgLoading: orgLoading || isInitializing,
      orgError,
      isMockOrgMode: USE_MOCK_API,
      selectOrganization,
      clearOrganization,
      refreshMemberships,
      hasOrgPermission,
      hasAnyOrgPermission,
      isPlatformAdmin: isAdmin,
    }),
    [
      memberships,
      approvedMemberships,
      activeOrganizationId,
      activeOrganization,
      activeOrganizationAccess,
      orgRoles,
      orgPermissions,
      orgLoading,
      isInitializing,
      orgError,
      selectOrganization,
      clearOrganization,
      refreshMemberships,
      hasOrgPermission,
      hasAnyOrgPermission,
      isAdmin,
    ]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return ctx;
}

export function OrgPermissionGate({ permission, children, fallback = null }) {
  const { hasOrgPermission } = useOrganization();
  return hasOrgPermission(permission) ? children : fallback;
}

function OrganizationAccessStatusScreen({
  memberships,
  orgError,
  onRefresh,
  onLogout,
  isAdmin,
}) {
  const pendingMemberships = memberships.filter(
    (m) => m.membershipStatus === 'Pending'
  );
  const rejectedMemberships = memberships.filter(
    (m) => m.membershipStatus === 'Rejected'
  );
  const inactiveOrgMemberships = memberships.filter(
    (m) => m.membershipStatus === 'Approved' && !m.isOrganizationActive
  );

  let icon = <Building2 className="w-7 h-7 text-[#0F766E]" />;
  let iconBg = 'bg-[#F0FDFA] border-teal-200';
  let title = 'No Organization Membership Found';
  let description =
    'Your account does not currently belong to any active organization. Request membership in an organization or contact an administrator to gain access to the Organization Portal.';

  if (pendingMemberships.length > 0) {
    icon = <Clock className="w-7 h-7 text-amber-600" />;
    iconBg = 'bg-amber-50 border-amber-200';
    title = 'Organization Membership Pending Approval';
    description =
      'Your membership request is awaiting review by an organization coordinator or platform administrator. Access will be unlocked once approved.';
  } else if (inactiveOrgMemberships.length > 0) {
    icon = <ShieldAlert className="w-7 h-7 text-orange-600" />;
    iconBg = 'bg-orange-50 border-orange-200';
    title = 'Organization Currently Inactive';
    description =
      'Your approved membership belongs to an organization that is currently deactivated. Contact a platform administrator for assistance.';
  } else if (rejectedMemberships.length > 0) {
    icon = <XCircle className="w-7 h-7 text-[#DC2626]" />;
    iconBg = 'bg-red-50 border-red-200';
    title = 'Organization Membership Not Approved';
    description =
      'Your previous organization membership request was rejected. Contact the organization coordinator or system administrator if you believe this is an error.';
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-8 text-center">
        <div
          className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${iconBg}`}
        >
          {icon}
        </div>
        <h1 className="text-xl font-bold text-[#0F172A]">{title}</h1>
        <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
          {description}
        </p>

        {orgError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-left text-xs text-[#991B1B] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{orgError.detail}</span>
          </div>
        )}

        {memberships.length > 0 && (
          <div className="mt-5 text-left border border-[#E2E8F0] rounded-xl divide-y divide-[#E2E8F0]">
            {memberships.map((m) => (
              <div
                key={m.membershipId}
                className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-[#0F172A]">
                    {m.organizationName}
                  </div>
                  {!m.isOrganizationActive && (
                    <div className="text-[#DC2626] mt-0.5">
                      Organization inactive
                    </div>
                  )}
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full font-semibold ${
                    m.membershipStatus === 'Pending'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : m.membershipStatus === 'Rejected'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {m.membershipStatus}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Status
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 transition-colors"
            >
              Admin Portal
            </Link>
          )}
          <Link
            to="/citizen"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50 transition-colors"
          >
            Citizen Portal
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-red-200 text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function OrganizationSelectionScreen({
  approvedMemberships,
  orgError,
  onSelect,
  onLogout,
  isAdmin,
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F0FDFA] border border-teal-200 flex items-center justify-center text-[#0F766E] mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A]">
            Select Active Organization
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Choose an approved organization workspace to continue.
          </p>
        </div>

        {orgError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#991B1B] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{orgError.detail}</span>
          </div>
        )}

        <div className="space-y-3">
          {approvedMemberships.map((m) => (
            <button
              key={m.membershipId}
              type="button"
              onClick={() => onSelect(m.organizationId)}
              className="w-full text-left p-4 rounded-xl border border-[#E2E8F0] hover:border-[#0F766E] hover:bg-[#F0FDFA]/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
            >
              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {m.organizationName}
                </div>
                {m.registrationNumber && (
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Reg: {m.registrationNumber}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.isArray(m.roles) && m.roles.length > 0 ? (
                    m.roles.map((role) => (
                      <span
                        key={role}
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#ECFBF8] text-[#0F766E] border border-teal-200"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                      Approved Member
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-[#0F766E] shrink-0">
                Enter &rarr;
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="font-semibold text-[#0F766E] hover:underline"
              >
                Admin Portal
              </Link>
            )}
            <Link
              to="/citizen"
              className="font-semibold text-[#64748B] hover:text-[#0F172A]"
            >
              Citizen Portal
            </Link>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1 font-semibold text-[#DC2626] hover:underline cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProtectedOrganizationRoute({ children }) {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const {
    memberships,
    approvedMemberships,
    activeOrganizationId,
    activeOrganizationAccess,
    orgLoading,
    orgError,
    selectOrganization,
    refreshMemberships,
  } = useOrganization();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <LoadingState message="Verifying organization access..." />
        </div>
      </div>
    );
  }

  if (orgError && memberships.length === 0 && orgError.status !== 403) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <ErrorState
            title={orgError.title}
            message={orgError.detail}
            onRetry={refreshMemberships}
          />
        </div>
      </div>
    );
  }

  if (approvedMemberships.length === 0) {
    return (
      <OrganizationAccessStatusScreen
        memberships={memberships}
        orgError={orgError}
        onRefresh={refreshMemberships}
        onLogout={logout}
        isAdmin={isAdmin}
      />
    );
  }

  if (!activeOrganizationId || !activeOrganizationAccess) {
    if (approvedMemberships.length === 1 && orgError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <ErrorState
              title={orgError.title}
              message={orgError.detail}
              onRetry={() => selectOrganization(approvedMemberships[0].organizationId)}
            />
          </div>
        </div>
      );
    }

    return (
      <OrganizationSelectionScreen
        approvedMemberships={approvedMemberships}
        orgError={orgError}
        onSelect={selectOrganization}
        onLogout={logout}
        isAdmin={isAdmin}
      />
    );
  }

  return children;
}
