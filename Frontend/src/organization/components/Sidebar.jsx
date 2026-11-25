import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ReliefLinkLogoIcon,
  IconDashboard,
  IconAlertTriangle,
  IconHandHeart,
  IconUsers,
  IconPackage,
  IconMapPin,
  IconSettings,
  IconShieldCheck
} from './Icons';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { USE_MOCK_API } from '../../services/api/axiosClient';

export const Sidebar = ({ activeTab = 'dashboard', onSelectTab = () => {}, mobileOpen = false, onCloseMobile = () => {} }) => {
  const { t } = useTranslation();
  const {
    activeOrganization,
    activeOrganizationAccess,
    approvedMemberships,
    activeOrganizationId,
    orgRoles,
    orgLoading,
    selectOrganization,
  } = useOrganization();

  const organizationName =
    activeOrganizationAccess?.organizationName ||
    activeOrganization?.organizationName ||
    'Organization Workspace';
  const organizationSubtitle =
    orgRoles.length > 0 ? orgRoles.join(', ') : 'Approved Member';
  const registrationNumber = activeOrganization?.registrationNumber || null;

  const navItems = [
    { id: 'dashboard', label: t('sidebar.dashboard', { defaultValue: 'Dashboard' }), icon: IconDashboard, badge: null },
    { id: 'incidents', label: t('sidebar.crisisIncidents', { defaultValue: 'Crisis Incidents' }), icon: IconAlertTriangle, badge: USE_MOCK_API ? '14' : null },
    { id: 'requests', label: t('sidebar.aidRequests', { defaultValue: 'Aid Requests' }), icon: IconHandHeart, badge: USE_MOCK_API ? '38' : null },
    { id: 'teams', label: t('sidebar.responseTeams', { defaultValue: 'Response Teams' }), icon: IconUsers, badge: USE_MOCK_API ? '12' : null },
    { id: 'areas', label: t('sidebar.assignedAreas', { defaultValue: 'Assigned Areas' }), icon: IconMapPin, badge: null },
    { id: 'members', label: t('sidebar.membersAndLogistics', { defaultValue: 'Members & Logistics' }), icon: IconPackage, badge: null },
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
        <div className="org-sidebar-org-info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div className="org-info-icon" title="Verified Organization">
              <IconShieldCheck size={18} color="#FFFFFF" />
            </div>
            <div className="org-info-text">
              <div className="org-info-name" title={organizationName}>
                {organizationName}
              </div>
              <div className="org-info-chapter" title={organizationSubtitle}>
                {organizationSubtitle}
              </div>
            </div>
          </div>

          {approvedMemberships.length > 1 && (
            <select
              aria-label="Switch active organization"
              value={activeOrganizationId ?? ''}
              disabled={orgLoading}
              onChange={(e) => {
                const nextId = Number(e.target.value);
                if (nextId && nextId !== activeOrganizationId) {
                  selectOrganization(nextId);
                }
              }}
              style={{
                width: '100%',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
              }}
            >
              {approvedMemberships.map((m) => (
                <option key={m.membershipId} value={m.organizationId}>
                  {m.organizationName}
                </option>
              ))}
            </select>
          )}
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
          {registrationNumber && (
            <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
              Ref: {registrationNumber}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
