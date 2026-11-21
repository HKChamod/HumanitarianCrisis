import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconShieldCheck, IconPlus, IconArrowRight } from './Icons';
import { mockOrganizationProfile } from '../data/mockDashboardData';

export const WelcomeBanner = ({ onViewIncidents = () => {}, onDeployTeam = () => {} }) => {
  const { t } = useTranslation();

  return (
    <section className="org-welcome-card">
      <div className="org-welcome-content">
        <div className="org-welcome-badge">
          <IconShieldCheck size={14} color="#10756F" />
          <span>
            {mockOrganizationProfile.type} • {t(`status.${mockOrganizationProfile.status.toLowerCase()}`, { defaultValue: mockOrganizationProfile.status })}
          </span>
        </div>
        <h1 className="org-welcome-heading">
          {t('dashboard.welcomeBack', { defaultValue: 'Welcome back,' })} {mockOrganizationProfile.name}
        </h1>
        <p className="org-welcome-subtext">
          {mockOrganizationProfile.chapter} {t('dashboard.operationsSubtext', {
            defaultValue: 'emergency operations portal. Monitor crisis events, coordinate field rescue teams, and allocate incoming aid requests in real time.'
          })}
        </p>
      </div>

      <div className="org-welcome-actions">
        <button className="org-btn-primary" onClick={onDeployTeam} type="button">
          <IconPlus size={16} />
          <span>{t('dashboard.deployFieldTeam', { defaultValue: 'Deploy Field Team' })}</span>
        </button>
        <button className="org-btn-secondary" onClick={onViewIncidents} type="button">
          <span>{t('dashboard.incidentLog', { defaultValue: 'Incident Log' })}</span>
          <IconArrowRight size={14} />
        </button>
      </div>
    </section>
  );
};
