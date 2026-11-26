import React, { useEffect, useState } from 'react';
import { WelcomeBanner } from './WelcomeBanner';
import { StatCards } from './StatCards';
import { RecentActivity } from './RecentActivity';
import { QuickAlerts } from './QuickAlerts';
import { USE_MOCK_API } from '../../services/api/apiConfig';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { crisisEventsService } from '../services/crisisEventsService';
import { organizationOperationsService } from '../services/organizationOperationsService';

export const DashboardView = ({
  onNavigateToIncidents = () => {},
  onNavigateToRequests = () => {},
  onNavigateToTeams = () => {},
  onNavigateToAreas = () => {}
}) => {
  const { activeOrganizationId } = useOrganization();
  const [liveSummary, setLiveSummary] = useState({
    loading: !USE_MOCK_API,
    dashboard: null,
    dashboardError: null,
    crises: [],
    crisesError: null,
  });

  useEffect(() => {
    if (USE_MOCK_API || !activeOrganizationId) return undefined;

    let isCancelled = false;

    const loadDashboardSummary = async () => {
      setLiveSummary((prev) => ({
        ...prev,
        loading: true,
        dashboardError: null,
        crisesError: null,
      }));

      const [dashResult, crisesResult] = await Promise.allSettled([
        organizationOperationsService.getDashboard(activeOrganizationId),
        crisisEventsService.getAllCrisisEvents(),
      ]);

      if (isCancelled) return;

      setLiveSummary({
        loading: false,
        dashboard: dashResult.status === 'fulfilled' ? dashResult.value : null,
        dashboardError:
          dashResult.status === 'rejected'
            ? dashResult.reason?.detail || dashResult.reason?.message || 'Unable to load organization dashboard'
            : null,
        crises:
          crisesResult.status === 'fulfilled' && Array.isArray(crisesResult.value)
            ? crisesResult.value
            : [],
        crisesError:
          crisesResult.status === 'rejected'
            ? crisesResult.reason?.detail || crisesResult.reason?.message || 'Unable to load crisis events'
            : null,
      });
    };

    loadDashboardSummary();

    return () => {
      isCancelled = true;
    };
  }, [activeOrganizationId]);

  const liveMetrics = (() => {
    if (USE_MOCK_API) return null;
    const d = liveSummary.dashboard;

    return [
      {
        id: 'active-incidents',
        title: 'Active Crises',
        value: liveSummary.loading ? '—' : liveSummary.dashboardError ? 'N/A' : String(d?.activeCrisesCount ?? 0),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.dashboardError
            ? 'Unavailable'
            : `${d?.criticalCrisesCount ?? 0} Critical`,
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.dashboardError
            ? liveSummary.dashboardError
            : `${d?.assignedAreasCount ?? 0} Assigned areas`,
        changeType: liveSummary.dashboardError
          ? 'neutral'
          : (d?.criticalCrisesCount ?? 0) > 0
            ? 'urgent'
            : 'positive',
        icon: 'alertTriangle',
        accentColor: '#FFBE00'
      },
      {
        id: 'aid-requests',
        title: 'Open Aid Requests',
        value: liveSummary.loading ? '—' : liveSummary.dashboardError ? 'N/A' : String(d?.scopedAidRequestsCount ?? 0),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.dashboardError
            ? 'Unavailable'
            : `${d?.openAidRequestsCount ?? 0} Total Open`,
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.dashboardError
            ? liveSummary.dashboardError
            : `${d?.assignedAllocationsCount ?? 0} Resource allocations`,
        changeType: (d?.scopedAidRequestsCount ?? 0) > 0 ? 'urgent' : 'positive',
        icon: 'handHeart',
        accentColor: '#10756F'
      },
      {
        id: 'geographic-areas',
        title: 'Members & Areas',
        value: liveSummary.loading ? '—' : liveSummary.dashboardError ? 'N/A' : String(d?.activeMembers ?? 0),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.dashboardError
            ? 'Unavailable'
            : `${d?.pendingMembers ?? 0} Pending`,
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.dashboardError
            ? liveSummary.dashboardError
            : `${d?.totalMembers ?? 0} Total members · ${d?.assignedAreasCount ?? 0} Areas`,
        changeType: 'neutral',
        icon: 'package',
        accentColor: '#10756F'
      },
      {
        id: 'dispatched-teams',
        title: 'Response Teams',
        value: liveSummary.loading ? '—' : liveSummary.dashboardError ? 'N/A' : String(d?.responseTeamsCount ?? 0),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.dashboardError
            ? 'Unavailable'
            : `${d?.deployedTeamsCount ?? 0} Deployed`,
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.dashboardError
            ? liveSummary.dashboardError
            : `${d?.availableTeamsCount ?? 0} Available for dispatch`,
        changeType: (d?.deployedTeamsCount ?? 0) > 0 ? 'positive' : 'neutral',
        icon: 'users',
        accentColor: '#10756F'
      }
    ];
  })();

  return (
    <>
      {/* Welcome Section */}
      <WelcomeBanner
        onViewIncidents={onNavigateToIncidents}
        onDeployTeam={onNavigateToTeams}
      />

      {/* Summary Statistics */}
      <StatCards
        metrics={liveMetrics}
        onNavigateToIncidents={onNavigateToIncidents}
        onNavigateToRequests={onNavigateToRequests}
        onNavigateToTeams={onNavigateToTeams}
        onNavigateToAreas={onNavigateToAreas}
      />

      {/* 2-Column Content: Recent Activities + Alerts/Readiness */}
      <div className="org-content-columns">
        <section aria-label="Recent Activities">
          <RecentActivity
            onViewAll={onNavigateToIncidents}
            liveIncidents={liveSummary.crises}
            isLoading={liveSummary.loading}
            error={liveSummary.crisesError}
          />
        </section>

        <aside aria-label="Operational Alerts and Readiness">
          <QuickAlerts />
        </aside>
      </div>
    </>
  );
};
