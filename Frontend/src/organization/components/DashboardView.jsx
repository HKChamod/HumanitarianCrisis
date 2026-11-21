import React from 'react';
import { WelcomeBanner } from './WelcomeBanner';
import { StatCards } from './StatCards';
import { RecentActivity } from './RecentActivity';
import { QuickAlerts } from './QuickAlerts';

export const DashboardView = ({
  onNavigateToIncidents = () => {},
  onNavigateToRequests = () => {},
  onNavigateToTeams = () => {}
}) => {
  return (
    <>
      {/* Welcome Section */}
      <WelcomeBanner
        onViewIncidents={onNavigateToIncidents}
        onDeployTeam={onNavigateToTeams}
      />

      {/* Summary Statistics */}
      <StatCards
        onNavigateToIncidents={onNavigateToIncidents}
        onNavigateToRequests={onNavigateToRequests}
        onNavigateToTeams={onNavigateToTeams}
      />

      {/* 2-Column Content: Recent Activities + Alerts/Readiness */}
      <div className="org-content-columns">
        <section aria-label="Recent Activities">
          <RecentActivity onViewAll={onNavigateToIncidents} />
        </section>

        <aside aria-label="Operational Alerts and Readiness">
          <QuickAlerts />
        </aside>
      </div>
    </>
  );
};
