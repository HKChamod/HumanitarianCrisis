import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReliefLinkLogoIcon,
  IconDashboard,
  IconAlertTriangle,
  IconHandHeart,
  IconUsers,
  IconMapPin,
  IconSettings,
  IconShieldCheck
} from './Icons';
import { mockOrganizationProfile } from '../data/mockDashboardData';

export const Sidebar = ({ activeTab = 'dashboard', onSelectTab = () => {}, mobileOpen = false, onCloseMobile = () => {} }) => {
  const { t } = useTranslation();

  const navItems = [
    { id: 'dashboard', label: t('sidebar.dashboard', { defaultValue: 'Dashboard' }), icon: IconDashboard, badge: null },
    { id: 'incidents', label: t('sidebar.crisisIncidents', { defaultValue: 'Crisis Incidents' }), icon: IconAlertTriangle, badge: '14' },
    { id: 'requests', label: t('sidebar.aidRequests', { defaultValue: 'Aid Requests' }), icon: IconHandHeart, badge: '38' },
    { id: 'teams', label: t('sidebar.responseTeams', { defaultValue: 'Response Teams' }), icon: IconUsers, badge: '12' },
    { id: 'areas', label: t('sidebar.assignedAreas', { defaultValue: 'Assigned Areas' }), icon: IconMapPin, badge: null },
    { id: 'settings', label: t('sidebar.orgSettings', { defaultValue: 'Org Settings' }), icon: IconSettings, badge: null },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 35
          }}
        />
      )}

      <aside className={`org-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand & Logo Header */}
        <div className="org-sidebar-header">
          <ReliefLinkLogoIcon size={38} />
          <div className="org-brand-text">
            <span className="org-brand-name">ReliefLink</span>
            <span className="org-portal-badge">{t('sidebar.portalBadge', { defaultValue: 'Organization Portal' })}</span>
          </div>
        </div>

        {/* Current Organization Context Card */}
        <div className="org-sidebar-org-info">
          <div className="org-info-icon" title="Verified Organization">
            <IconShieldCheck size={18} color="#FFFFFF" />
          </div>
          <div className="org-info-text">
            <div className="org-info-name" title={mockOrganizationProfile.name}>
              {mockOrganizationProfile.name}
            </div>
            <div className="org-info-chapter" title={mockOrganizationProfile.chapter}>
              {mockOrganizationProfile.chapter}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="org-sidebar-nav">
          <div className="org-nav-label">{t('sidebar.managementCommand', { defaultValue: 'Management Command' })}</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`org-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="nav-count-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Live Operational Status */}
        <div className="org-sidebar-footer">
          <div className="org-system-status-pill">
            <span className="org-status-dot-pulse"></span>
            <span>{t('sidebar.liveNetworkActive', { defaultValue: 'Live Response Network Active' })}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
            Ref: {mockOrganizationProfile.registrationNumber}
          </div>
        </div>
      </aside>
    </>
  );
};
