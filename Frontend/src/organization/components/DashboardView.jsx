import React, { useEffect, useState } from 'react';
import { WelcomeBanner } from './WelcomeBanner';
import { StatCards } from './StatCards';
import { RecentActivity } from './RecentActivity';
import { QuickAlerts } from './QuickAlerts';
import { USE_MOCK_API } from '../../services/api/apiConfig';
import { crisisEventsService } from '../services/crisisEventsService';
import { aidRequestsService } from '../services/aidRequestsService';
import { assignedAreasService } from '../services/assignedAreasService';

export const DashboardView = ({
  onNavigateToIncidents = () => {},
  onNavigateToRequests = () => {},
  onNavigateToTeams = () => {},
  onNavigateToAreas = () => {}
}) => {
  const [liveSummary, setLiveSummary] = useState({
    loading: !USE_MOCK_API,
    crises: [],
    crisesError: null,
    requests: [],
    requestsError: null,
    areas: [],
    areasError: null
  });

  useEffect(() => {
    if (USE_MOCK_API) return undefined;

    let isCancelled = false;

    const loadDashboardSummary = async () => {
      setLiveSummary((prev) => ({
        ...prev,
        loading: true,
        crisesError: null,
        requestsError: null,
        areasError: null
      }));

      const [crisesResult, requestsResult, areasResult] = await Promise.allSettled([
        crisisEventsService.getAllCrisisEvents(),
        aidRequestsService.getAllAidRequests(),
        assignedAreasService.getAllAssignedAreas()
      ]);

      if (isCancelled) return;

      setLiveSummary({
        loading: false,
        crises:
          crisesResult.status === 'fulfilled' && Array.isArray(crisesResult.value)
            ? crisesResult.value
            : [],
        crisesError:
          crisesResult.status === 'rejected'
            ? crisesResult.reason?.detail || crisesResult.reason?.message || 'Unable to load crisis events'
            : null,
        requests:
          requestsResult.status === 'fulfilled' && Array.isArray(requestsResult.value)
            ? requestsResult.value
            : [],
        requestsError:
          requestsResult.status === 'rejected'
            ? requestsResult.reason?.detail || requestsResult.reason?.message || 'Unable to load citizen requests'
            : null,
        areas:
          areasResult.status === 'fulfilled' && Array.isArray(areasResult.value)
            ? areasResult.value
            : [],
        areasError:
          areasResult.status === 'rejected'
            ? areasResult.reason?.detail || areasResult.reason?.message || 'Unable to load geographic areas'
            : null
      });
    };

    loadDashboardSummary();

    return () => {
      isCancelled = true;
    };
  }, []);

  const liveMetrics = (() => {
    if (USE_MOCK_API) return null;

    const activeCrisesCount = liveSummary.crises.filter(
      (c) => String(c.status || '').toLowerCase() === 'active'
    ).length;
    const criticalCrisesCount = liveSummary.crises.filter(
      (c) => String(c.severityLevel || '').toLowerCase() === 'critical'
    ).length;

    const pendingRequestsCount = liveSummary.requests.filter(
      (r) => String(r.status || '').toLowerCase() === 'pending'
    ).length;
    const fulfilledRequestsCount = liveSummary.requests.filter(
      (r) => String(r.status || '').toLowerCase() === 'fulfilled'
    ).length;

    return [
      {
        id: 'active-incidents',
        title: 'Crisis Events',
        value: liveSummary.loading ? '—' : liveSummary.crisesError ? 'N/A' : String(liveSummary.crises.length),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.crisesError
            ? 'Unavailable'
            : `${criticalCrisesCount} Critical`,
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.crisesError
            ? liveSummary.crisesError
            : `${activeCrisesCount} Active in directory`,
        changeType: liveSummary.crisesError
          ? 'neutral'
          : criticalCrisesCount > 0
            ? 'urgent'
            : 'positive',
        icon: 'alertTriangle',
        accentColor: '#FFBE00'
      },
      {
        id: 'aid-requests',
        title: 'Citizen Requests',
        value: liveSummary.loading ? '—' : liveSummary.requestsError ? 'N/A' : String(liveSummary.requests.length),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.requestsError
            ? 'Unavailable'
            : `${fulfilledRequestsCount} Fulfilled`,
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.requestsError
            ? liveSummary.requestsError
            : `${pendingRequestsCount} Pending review`,
        changeType: liveSummary.requestsError
          ? 'neutral'
          : pendingRequestsCount > 0
            ? 'urgent'
            : 'positive',
        icon: 'handHeart',
        accentColor: '#10756F'
      },
      {
        id: 'geographic-areas',
        title: 'Geographic Areas',
        value: liveSummary.loading ? '—' : liveSummary.areasError ? 'N/A' : String(liveSummary.areas.length),
        badge: liveSummary.loading
          ? 'Loading...'
          : liveSummary.areasError
            ? 'Unavailable'
            : 'Live Directory',
        change: liveSummary.loading
          ? 'Fetching live backend data'
          : liveSummary.areasError
            ? liveSummary.areasError
            : 'Global backend Areas directory',
        changeType: 'neutral',
        icon: 'package',
        accentColor: '#10756F'
      },
      {
        id: 'dispatched-teams',
        title: 'Response Teams',
        value: 'N/A',
        badge: 'Not Backend-Backed',
        change: 'No live Response Teams API yet',
        changeType: 'neutral',
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
