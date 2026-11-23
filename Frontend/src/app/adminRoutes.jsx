import { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';
import { Info } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedAdminRoute } from './providers/AuthProvider';
import { LoadingState } from '../components/common/States';
import { USE_MOCK_API } from '../services/api/apiConfig';

// Lazy-loaded Central Administration Portal pages for clean bundle code-splitting
const AdminDashboardPage = lazy(() =>
  import('../features/dashboard/pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const UnauthorizedPage = lazy(() =>
  import('../features/auth/pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage }))
);
const CrisisEventsPage = lazy(() =>
  import('../features/crises/pages/CrisisEventsPage').then((m) => ({ default: m.CrisisEventsPage }))
);
const CreateCrisisEventPage = lazy(() =>
  import('../features/crises/pages/CreateCrisisEventPage').then((m) => ({ default: m.CreateCrisisEventPage }))
);
const AdminCrisisMapPage = lazy(() =>
  import('../features/crises/pages/AdminCrisisMapPage').then((m) => ({ default: m.AdminCrisisMapPage }))
);
const AssistanceRequestsPage = lazy(() =>
  import('../features/assistance-requests/pages/AssistanceRequestsPage').then((m) => ({ default: m.AssistanceRequestsPage }))
);
const OrganizationsPage = lazy(() =>
  import('../features/organizations/pages/OrganizationsPage').then((m) => ({ default: m.OrganizationsPage }))
);
const UsersPage = lazy(() =>
  import('../features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const RolesPage = lazy(() =>
  import('../features/roles/pages/RolesPage').then((m) => ({ default: m.RolesPage }))
);
const PermissionsPage = lazy(() =>
  import('../features/permissions/pages/PermissionsPage').then((m) => ({ default: m.PermissionsPage }))
);
const ResourceInventoryPage = lazy(() =>
  import('../features/resources/pages/ResourceInventoryPage').then((m) => ({ default: m.ResourceInventoryPage }))
);
const ResourceAllocationPage = lazy(() =>
  import('../features/resources/pages/ResourceAllocationPage').then((m) => ({ default: m.ResourceAllocationPage }))
);
const SheltersPage = lazy(() =>
  import('../features/shelters/pages/SheltersPage').then((m) => ({ default: m.SheltersPage }))
);
const VolunteersPage = lazy(() =>
  import('../features/volunteers/pages/VolunteersPage').then((m) => ({ default: m.VolunteersPage }))
);
const DonationsPage = lazy(() =>
  import('../features/donations/pages/DonationsPage').then((m) => ({ default: m.DonationsPage }))
);
const AiDecisionSupportPage = lazy(() =>
  import('../features/ai-decision-support/pages/AiDecisionSupportPage').then((m) => ({ default: m.AiDecisionSupportPage }))
);
const ReportsPage = lazy(() =>
  import('../features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage }))
);
const AuditLogsPage = lazy(() =>
  import('../features/audit-logs/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage }))
);
const SystemSettingsPage = lazy(() =>
  import('../features/settings/pages/SystemSettingsPage').then((m) => ({ default: m.SystemSettingsPage }))
);

function LiveModuleUnavailable({ title, detail }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 max-w-2xl mx-auto mt-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">{title}</h1>
          <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">{detail}</p>
          <p className="text-xs text-[#64748B] mt-3">
            Live API mode (<code className="font-mono bg-slate-100 px-1 rounded">VITE_USE_MOCK_API=false</code>) does not substitute mock data for unimplemented backend modules.
          </p>
        </div>
      </div>
    </div>
  );
}

function withSuspense(element, requiredPermission, requiredRole) {
  const wrapped = <Suspense fallback={<LoadingState message="Loading module..." />}>{element}</Suspense>;
  return requiredPermission || requiredRole ? (
    <ProtectedAdminRoute requiredPermission={requiredPermission} requiredRole={requiredRole}>
      {wrapped}
    </ProtectedAdminRoute>
  ) : (
    wrapped
  );
}

function withLiveOrMockModule(mockElement, liveTitle, liveDetail, mockPermission) {
  if (USE_MOCK_API) {
    return withSuspense(mockElement, mockPermission);
  }
  return withSuspense(
    <LiveModuleUnavailable title={liveTitle} detail={liveDetail} />,
    undefined,
    'Administrator'
  );
}

export function renderAdminRoutes() {
  return (
    <Route
      path="admin"
      element={
        <ProtectedAdminRoute>
          <AdminLayout />
        </ProtectedAdminRoute>
      }
    >
      {/* ADM-01: Central Administration Dashboard */}
      <Route index element={withSuspense(<AdminDashboardPage />)} />
      <Route path="unauthorized" element={withSuspense(<UnauthorizedPage />)} />

      {/* ADM-02 & ADM-03: Crisis Management */}
      <Route path="crises" element={withSuspense(<CrisisEventsPage />, 'CrisisEvents.View')} />
      <Route path="crises/active" element={withSuspense(<CrisisEventsPage initialStatusFilter="Active" />, 'CrisisEvents.View')} />
      <Route path="crises/create" element={withSuspense(<CreateCrisisEventPage />, 'CrisisEvents.Create')} />
      <Route path="crises/map" element={withSuspense(<AdminCrisisMapPage />, 'CrisisEvents.View')} />

      {/* ADM-04: Citizen Assistance Requests */}
      <Route path="requests" element={withSuspense(<AssistanceRequestsPage />, 'CitizenRequests.View')} />
      <Route path="requests/pending" element={withSuspense(<AssistanceRequestsPage initialStatusFilter="Pending" />, 'CitizenRequests.View')} />
      <Route path="requests/approved" element={withSuspense(<AssistanceRequestsPage initialStatusFilter="Approved" />, 'CitizenRequests.View')} />
      <Route path="requests/rejected" element={withSuspense(<AssistanceRequestsPage initialStatusFilter="Rejected" />, 'CitizenRequests.View')} />

      {/* ADM-05: Organization Management */}
      <Route path="organizations" element={withSuspense(<OrganizationsPage mode="all" />, 'Organizations.View')} />
      <Route path="organizations/applications" element={withSuspense(<OrganizationsPage mode="applications" />, 'Organizations.Manage')} />
      <Route path="organizations/memberships" element={withSuspense(<OrganizationsPage mode="memberships" />, 'Organizations.View')} />

      {/* ADM-06, ADM-07, ADM-08: User & Access Management */}
      <Route path="users" element={withSuspense(<UsersPage />, 'Users.Manage')} />
      <Route
        path="roles"
        element={withLiveOrMockModule(
          <RolesPage />,
          'Role Management Unavailable in Live Mode',
          'System roles are currently seeded via EF Core migrations. No backend Roles CRUD API endpoint exists yet.',
          'Roles.Manage'
        )}
      />
      <Route
        path="permissions"
        element={withLiveOrMockModule(
          <PermissionsPage />,
          'Permissions Registry Unavailable in Live Mode',
          'Permissions are enforced by the .NET 10 backend authorization policies and seeded via migrations. No backend Permissions CRUD API exists yet.',
          'Permissions.View'
        )}
      />

      {/* ADM-09 & ADM-10: Resource & Logistics Management */}
      <Route path="resources/inventory" element={withSuspense(<ResourceInventoryPage />, 'Resources.View')} />
      <Route
        path="resources/allocations"
        element={withSuspense(
          <ResourceAllocationPage mode="allocations" />,
          USE_MOCK_API ? 'Resources.View' : 'ResourceAllocations.View'
        )}
      />
      <Route
        path="resources/requests"
        element={withSuspense(
          <ResourceAllocationPage mode="requests" />,
          USE_MOCK_API ? 'Resources.View' : 'ResourceAllocations.View'
        )}
      />

      {/* ADM-11: Shelter Management */}
      <Route
        path="shelters"
        element={withLiveOrMockModule(
          <SheltersPage mode="all" />,
          'Shelter Management Unavailable in Live Mode',
          'No Shelters backend controller or database table has been implemented yet.',
          'Shelters.View'
        )}
      />
      <Route
        path="shelters/occupancy"
        element={withLiveOrMockModule(
          <SheltersPage mode="occupancy" />,
          'Shelter Occupancy Unavailable in Live Mode',
          'No Shelters backend controller or database table has been implemented yet.',
          'Shelters.View'
        )}
      />

      {/* ADM-12 & ADM-13: Volunteer Management */}
      <Route path="volunteers" element={withSuspense(<VolunteersPage mode="volunteers" />, 'Volunteers.View')} />
      <Route path="volunteers/assignments" element={withSuspense(<VolunteersPage mode="assignments" />, 'Volunteers.View')} />

      {/* ADM-14: Donation Management */}
      <Route path="donations" element={withSuspense(<DonationsPage mode="donations" />, 'Donations.View')} />
      <Route path="donations/campaigns" element={withSuspense(<DonationsPage mode="campaigns" />, 'Donations.View')} />

      {/* ADM-15 & ADM-16: AI Decision Support (Live Backend Integrated) */}
      <Route
        path="ai"
        element={withSuspense(<AiDecisionSupportPage mode="overview" />, USE_MOCK_API ? 'AI.Review' : 'AI.View')}
      />
      <Route
        path="ai/recommendations"
        element={withSuspense(<AiDecisionSupportPage mode="recommendations" />, USE_MOCK_API ? 'AI.Review' : 'AI.View')}
      />
      <Route
        path="ai/analytics"
        element={withSuspense(<AiDecisionSupportPage mode="analytics" />, USE_MOCK_API ? 'AI.Review' : 'AI.View')}
      />

      {/* ADM-17: Reports & Analytics */}
      <Route path="reports" element={withSuspense(<ReportsPage mode="reports" />, 'Reports.View')} />
      <Route path="reports/analytics" element={withSuspense(<ReportsPage mode="analytics" />, 'Reports.View')} />

      {/* ADM-18, ADM-19, ADM-20: System Management */}
      <Route
        path="notifications"
        element={withLiveOrMockModule(
          <NotificationsPage />,
          'System Notifications Unavailable in Live Mode',
          'No backend Notifications persistence or delivery API has been implemented yet.',
          'Notifications.View'
        )}
      />
      <Route
        path="audit-logs"
        element={withLiveOrMockModule(
          <AuditLogsPage />,
          'Audit Logs Unavailable in Live Mode',
          'No backend Audit Logs persistence or query API has been implemented yet.',
          'AuditLogs.View'
        )}
      />
      <Route
        path="settings"
        element={withLiveOrMockModule(
          <SystemSettingsPage />,
          'System Settings Unavailable in Live Mode',
          'No backend System Settings API has been implemented yet.',
          'Settings.Manage'
        )}
      />
    </Route>
  );
}
