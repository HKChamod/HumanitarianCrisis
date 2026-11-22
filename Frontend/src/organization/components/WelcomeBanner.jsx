import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconShieldCheck, IconPlus, IconArrowRight } from './Icons';
import { mockOrganizationProfile } from '../data/mockDashboardData';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { USE_MOCK_API } from '../../services/api/axiosClient';

export const WelcomeBanner = ({ onViewIncidents = () => {}, onDeployTeam = () => {} }) => {
  const { t } = useTranslation();
  const { activeOrganization, activeOrganizationAccess, orgRoles } = useOrganization();

  const orgName = USE_MOCK_API
    ? mockOrganizationProfile.name
    : activeOrganizationAccess?.organizationName ||
      activeOrganization?.organizationName ||
      'Organization Workspace';

  const badgeText = USE_MOCK_API
    ? `${mockOrganizationProfile.type} • ${t(`status.${mockOrganizationProfile.status.toLowerCase()}`, { defaultValue: mockOrganizationProfile.status })}`
    : `${orgRoles.length > 0 ? orgRoles[0] : 'Approved Member'} • ${activeOrganizationAccess?.membershipStatus || 'Active'}`;

  const subtextPrefix = USE_MOCK_API
    ? mockOrganizationProfile.chapter
    : activeOrganization?.registrationNumber
      ? `Ref: ${activeOrganization.registrationNumber} —`
      : 'Verified organization';

  return (
    <section className="org-welcome-card">
      <div className="org-welcome-content">
        <div className="org-welcome-badge">
          <IconShieldCheck size={14} color="#10756F" />
          <span>{badgeText}</span>
        </div>
        <h1 className="org-welcome-heading">
          {t('dashboard.welcomeBack', { defaultValue: 'Welcome back,' })} {orgName}
        </h1>
        <p className="org-welcome-subtext">
          {subtextPrefix} {t('dashboard.operationsSubtext', {
            defaultValue: 'emergency operations portal. Monitor crisis events, review citizen requests, and coordinate humanitarian response.'
          })}
        </p>
      </div>

      <div className="org-welcome-actions">
        {USE_MOCK_API && (
          <button className="org-btn-primary" onClick={onDeployTeam} type="button">
            <IconPlus size={16} />
            <span>{t('dashboard.deployFieldTeam', { defaultValue: 'Deploy Field Team' })}</span>
          </button>
        )}
        <button className="org-btn-secondary" onClick={onViewIncidents} type="button">
          <span>{t('dashboard.incidentLog', { defaultValue: 'Incident Log' })}</span>
          <IconArrowRight size={14} />
        </button>
      </div>
    </section>
  );
};
