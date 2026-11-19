import { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedAdminRoute } from './providers/AuthProvider';
import { LoadingState } from '../components/common/States';

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

function withSuspense(element, requiredPermission) {
  const wrapped = <Suspense fallback={<LoadingState message="Loading module..." />}>{element}</Suspense>;
  return requiredPermission ? (
    <ProtectedAdminRoute requiredPermission={requiredPermission}>{wrapped}</ProtectedAdminRoute>
  ) : (
    wrapped
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
      <Route path="roles" element={withSuspense(<RolesPage />, 'Roles.Manage')} />
      <Route path="permissions" element={withSuspense(<PermissionsPage />, 'Permissions.View')} />

      {/* ADM-09 & ADM-10: Resource Management */}
      <Route path="resources/inventory" element={withSuspense(<ResourceInventoryPage />, 'Resources.View')} />
      <Route path="resources/allocations" element={withSuspense(<ResourceAllocationPage mode="allocations" />, 'Resources.View')} />
      <Route path="resources/requests" element={withSuspense(<ResourceAllocationPage mode="requests" />, 'Resources.View')} />

      {/* ADM-11: Shelter Management */}
      <Route path="shelters" element={withSuspense(<SheltersPage mode="all" />, 'Shelters.View')} />
      <Route path="shelters/occupancy" element={withSuspense(<SheltersPage mode="occupancy" />, 'Shelters.View')} />

      {/* ADM-12 & ADM-13: Volunteer Management */}
      <Route path="volunteers" element={withSuspense(<VolunteersPage mode="volunteers" />, 'Volunteers.View')} />
      <Route path="volunteers/assignments" element={withSuspense(<VolunteersPage mode="assignments" />, 'Volunteers.View')} />

      {/* ADM-14: Donation Management */}
      <Route path="donations" element={withSuspense(<DonationsPage mode="donations" />, 'Donations.View')} />
      <Route path="donations/campaigns" element={withSuspense(<DonationsPage mode="campaigns" />, 'Donations.View')} />

      {/* ADM-15 & ADM-16: AI Decision Support */}
      <Route path="ai" element={withSuspense(<AiDecisionSupportPage mode="overview" />, 'AI.Review')} />
      <Route path="ai/recommendations" element={withSuspense(<AiDecisionSupportPage mode="recommendations" />, 'AI.Review')} />
      <Route path="ai/analytics" element={withSuspense(<AiDecisionSupportPage mode="analytics" />, 'AI.Review')} />

      {/* ADM-17: Reports & Analytics */}
      <Route path="reports" element={withSuspense(<ReportsPage mode="reports" />, 'Reports.Read')} />
      <Route path="reports/analytics" element={withSuspense(<ReportsPage mode="analytics" />, 'Reports.Read')} />

      {/* ADM-18, ADM-19, ADM-20: System Management */}
      <Route path="notifications" element={withSuspense(<NotificationsPage />, 'Notifications.View')} />
      <Route path="audit-logs" element={withSuspense(<AuditLogsPage />, 'AuditLogs.Read')} />
      <Route path="settings" element={withSuspense(<SystemSettingsPage />, 'Settings.Manage')} />
    </Route>
  );
}
