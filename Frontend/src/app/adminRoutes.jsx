import { Route } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { ProtectedAdminRoute } from './providers/AuthProvider';
import { AdminDashboardPage } from '../features/dashboard/pages/AdminDashboardPage';
import { UnauthorizedPage } from '../features/auth/pages/UnauthorizedPage';
import { ModulePlaceholderPage } from '../components/common/ModulePlaceholderPage';

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
      {/* Phase 2: ADM-01 Central Administration Dashboard */}
      <Route index element={<AdminDashboardPage />} />
      <Route path="unauthorized" element={<UnauthorizedPage />} />

      {/* Phase 3: Core Administration */}
      <Route
        path="crises"
        element={
          <ProtectedAdminRoute requiredPermission="CrisisEvents.View">
            <ModulePlaceholderPage code="ADM-02" title="Crisis Events Management" description="Manage national crisis events, severity levels, affected areas, and lifecycle status." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="crises/active"
        element={
          <ProtectedAdminRoute requiredPermission="CrisisEvents.View">
            <ModulePlaceholderPage code="ADM-02" title="Active Crisis Events" description="Filter and monitor currently active and monitoring crisis events." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="crises/create"
        element={
          <ProtectedAdminRoute requiredPermission="CrisisEvents.Create">
            <ModulePlaceholderPage code="ADM-02" title="Create Crisis Event" description="Declare a new crisis event with cascading Sri Lankan geographic hierarchy." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="crises/map"
        element={
          <ProtectedAdminRoute requiredPermission="CrisisEvents.View">
            <ModulePlaceholderPage code="ADM-03" title="Live Crisis Map" description="Interactive full-screen Sri Lanka crisis map with severity markers and filters." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="requests"
        element={
          <ProtectedAdminRoute requiredPermission="CitizenRequests.View">
            <ModulePlaceholderPage code="ADM-04" title="Citizen Assistance Requests" description="Review, verify, approve, reject, and assign incoming citizen assistance requests." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="requests/pending"
        element={
          <ProtectedAdminRoute requiredPermission="CitizenRequests.View">
            <ModulePlaceholderPage code="ADM-04" title="Pending Assistance Requests" description="Triage requests awaiting central verification and approval." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="requests/approved"
        element={
          <ProtectedAdminRoute requiredPermission="CitizenRequests.View">
            <ModulePlaceholderPage code="ADM-04" title="Approved Assistance Requests" description="Track approved and assigned assistance requests in progress." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="requests/rejected"
        element={
          <ProtectedAdminRoute requiredPermission="CitizenRequests.View">
            <ModulePlaceholderPage code="ADM-04" title="Rejected Assistance Requests" description="Review rejected requests and their verification notes." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="organizations"
        element={
          <ProtectedAdminRoute requiredPermission="Organizations.View">
            <ModulePlaceholderPage code="ADM-05" title="Organization Management" description="Manage registered partner NGOs, government departments, and hospitals." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="organizations/applications"
        element={
          <ProtectedAdminRoute requiredPermission="Organizations.Manage">
            <ModulePlaceholderPage code="ADM-05" title="Organization Applications" description="Approve or reject pending partner organization applications." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="organizations/memberships"
        element={
          <ProtectedAdminRoute requiredPermission="Organizations.View">
            <ModulePlaceholderPage code="ADM-05" title="Organization Memberships" description="Inspect organization memberships and scoped roles." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="users"
        element={
          <ProtectedAdminRoute requiredPermission="Users.Manage">
            <ModulePlaceholderPage code="ADM-06" title="User Management" description="Manage system users, activation status, and assigned system roles." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="roles"
        element={
          <ProtectedAdminRoute requiredPermission="Roles.Manage">
            <ModulePlaceholderPage code="ADM-07" title="Role Management" description="Create and configure RBAC system roles and their permissions." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="permissions"
        element={
          <ProtectedAdminRoute requiredPermission="Permissions.View">
            <ModulePlaceholderPage code="ADM-08" title="Permission Management" description="Inspect permission categories and role-permission mappings." phase="Phase 3" />
          </ProtectedAdminRoute>
        }
      />

      {/* Phase 4: Operational Modules */}
      <Route
        path="resources/inventory"
        element={
          <ProtectedAdminRoute requiredPermission="Resources.View">
            <ModulePlaceholderPage code="ADM-09" title="Resource Inventory" description="Monitor national stock balances, warehouses, conditions, and low-stock alerts." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="resources/allocations"
        element={
          <ProtectedAdminRoute requiredPermission="Resources.View">
            <ModulePlaceholderPage code="ADM-10" title="Resource Allocation" description="Create and track resource allocations to crises, shelters, and organizations." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="resources/requests"
        element={
          <ProtectedAdminRoute requiredPermission="Resources.View">
            <ModulePlaceholderPage code="ADM-10" title="Resource Requests" description="Review inter-organization and district resource supply requests." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="shelters"
        element={
          <ProtectedAdminRoute requiredPermission="Shelters.View">
            <ModulePlaceholderPage code="ADM-11" title="Shelter Management" description="Manage emergency shelters, capacities, facilities, and operating status." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="shelters/occupancy"
        element={
          <ProtectedAdminRoute requiredPermission="Shelters.View">
            <ModulePlaceholderPage code="ADM-11" title="Shelter Occupancy" description="Monitor live shelter occupancy percentages and overflow warnings." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="volunteers"
        element={
          <ProtectedAdminRoute requiredPermission="Volunteers.View">
            <ModulePlaceholderPage code="ADM-12" title="Volunteer Management" description="View registered volunteers, skills, verification status, and availability." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="volunteers/assignments"
        element={
          <ProtectedAdminRoute requiredPermission="Volunteers.View">
            <ModulePlaceholderPage code="ADM-13" title="Volunteer Assignments" description="Assign verified volunteers to active crisis events and track task status." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="donations"
        element={
          <ProtectedAdminRoute requiredPermission="Donations.View">
            <ModulePlaceholderPage code="ADM-14" title="Donation Management" description="Track monetary pledges, donated goods, verification, and distribution." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="donations/campaigns"
        element={
          <ProtectedAdminRoute requiredPermission="Donations.View">
            <ModulePlaceholderPage code="ADM-14" title="Donation Campaigns" description="Manage active emergency relief donation campaigns." phase="Phase 4" />
          </ProtectedAdminRoute>
        }
      />

      {/* Phase 5: Intelligence & Reporting */}
      <Route
        path="ai"
        element={
          <ProtectedAdminRoute requiredPermission="AI.Review">
            <ModulePlaceholderPage code="ADM-15" title="AI Decision Support Overview" description="Overview of advisory AI analyses and recommendations pending human review." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="ai/recommendations"
        element={
          <ProtectedAdminRoute requiredPermission="AI.Review">
            <ModulePlaceholderPage code="ADM-16" title="AI Recommendations" description="Review supporting evidence and record authorized human accept/reject/modify decisions." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="ai/analytics"
        element={
          <ProtectedAdminRoute requiredPermission="AI.Review">
            <ModulePlaceholderPage code="ADM-15" title="Predictions and Analytics" description="Review crisis forecasts and anomaly alerts with provenance metadata." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="reports"
        element={
          <ProtectedAdminRoute requiredPermission="Reports.Read">
            <ModulePlaceholderPage code="ADM-17" title="Reports & Analytics" description="Generate filtered operational reports across crises, requests, resources, shelters, volunteers, and donations." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="reports/analytics"
        element={
          <ProtectedAdminRoute requiredPermission="Reports.Read">
            <ModulePlaceholderPage code="ADM-17" title="Analytics Dashboard" description="Cross-module operational trends and exportable summaries." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="notifications"
        element={
          <ProtectedAdminRoute requiredPermission="Notifications.View">
            <ModulePlaceholderPage code="ADM-18" title="Notifications Center" description="Filter, inspect, and mark operational notifications as read." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="audit-logs"
        element={
          <ProtectedAdminRoute requiredPermission="AuditLogs.Read">
            <ModulePlaceholderPage code="ADM-19" title="Audit Logs" description="Search immutable administrative activity logs by actor, module, and timestamp." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="settings"
        element={
          <ProtectedAdminRoute requiredPermission="Settings.Manage">
            <ModulePlaceholderPage code="ADM-20" title="System Settings" description="Configure general, notification, localization, and administrative settings." phase="Phase 5" />
          </ProtectedAdminRoute>
        }
      />
    </Route>
  );
}
