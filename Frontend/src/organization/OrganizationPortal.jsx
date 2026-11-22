import React, { useState, useEffect } from 'react';
import './styles/OrganizationPortal.css';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { CrisisIncidentsPage } from './components/CrisisIncidentsPage';
import { AidRequestsPage } from './components/AidRequestsPage';
import { ResponseTeamsPage } from './components/ResponseTeamsPage';
import { AssignedAreasPage } from './components/AssignedAreasPage';
import { OrganizationSettingsPage } from './components/OrganizationSettingsPage';

/**
 * OrganizationPortal Main Container
 * 
 * Supports Dashboard, Crisis Incidents, Aid Requests, Response Teams, Assigned Areas, and Organization Settings views with full layout reuse.
 * Scoped under .org-portal to preserve styling boundaries.
 */
export const OrganizationPortal = () => {
  // Sync initial tab with URL path
  const getInitialTab = () => {
    const path = window.location.pathname;
    if (path.includes('/settings')) {
      return 'settings';
    }
    if (path.includes('/assigned-areas') || path.includes('/areas')) {
      return 'areas';
    }
    if (path.includes('/response-teams') || path.includes('/teams')) {
      return 'teams';
    }
    if (path.includes('/aid-requests') || path.includes('/requests')) {
      return 'requests';
    }
    if (path.includes('/incidents')) {
      return 'incidents';
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('/settings')) {
        setActiveTab('settings');
      } else if (path.includes('/assigned-areas') || path.includes('/areas')) {
        setActiveTab('areas');
      } else if (path.includes('/response-teams') || path.includes('/teams')) {
        setActiveTab('teams');
      } else if (path.includes('/aid-requests') || path.includes('/requests')) {
        setActiveTab('requests');
      } else if (path.includes('/incidents')) {
        setActiveTab('incidents');
      } else {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    let newPath = '/organization';
    if (tabId === 'incidents') {
      newPath = '/organization/incidents';
    } else if (tabId === 'requests') {
      newPath = '/organization/aid-requests';
    } else if (tabId === 'teams') {
      newPath = '/organization/response-teams';
    } else if (tabId === 'areas') {
      newPath = '/organization/assigned-areas';
    } else if (tabId === 'settings') {
      newPath = '/organization/settings';
    }
    window.history.pushState({}, '', newPath);
  };

  return (
    <div className="org-portal">
      <div className="org-layout-container">
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="org-main-wrapper">
          {/* Top Header */}
          <TopHeader
            onToggleMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            onNavigateTab={handleSelectTab}
          />

          {/* Main Body */}
          <main className="org-dashboard-body">
            {activeTab === 'settings' && <OrganizationSettingsPage />}
            {activeTab === 'areas' && <AssignedAreasPage />}
            {activeTab === 'teams' && <ResponseTeamsPage />}
            {activeTab === 'requests' && <AidRequestsPage />}
            {activeTab === 'incidents' && <CrisisIncidentsPage />}
            {activeTab === 'dashboard' && (
              <DashboardView
                onNavigateToIncidents={() => handleSelectTab('incidents')}
                onNavigateToRequests={() => handleSelectTab('requests')}
                onNavigateToTeams={() => handleSelectTab('teams')}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default OrganizationPortal;
