import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle, IconClock, IconShieldCheck } from './Icons';
import { mockUrgentAlerts } from '../data/mockDashboardData';
import { getLocalizedRelativeTime } from '../utils/localizationUtils';

export const QuickAlerts = () => {
  const { t } = useTranslation();

  const getAlertTitle = (alert) => {
    if (alert.id === 'ALT-01') return t('dashboard.alerts.alt1Title', { defaultValue: alert.title });
    if (alert.id === 'ALT-02') return t('dashboard.alerts.alt2Title', { defaultValue: alert.title });
    return alert.title;
  };

  const getAlertMessage = (alert) => {
    if (alert.id === 'ALT-01') return t('dashboard.alerts.alt1Message', { defaultValue: alert.message });
    if (alert.id === 'ALT-02') return t('dashboard.alerts.alt2Message', { defaultValue: alert.message });
    return alert.message;
  };

  const getAlertAction = (alert) => {
    if (alert.id === 'ALT-01') return t('dashboard.alerts.alt1Action', { defaultValue: alert.actionRequired });
    if (alert.id === 'ALT-02') return t('dashboard.alerts.alt2Action', { defaultValue: alert.actionRequired });
    return alert.actionRequired;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Urgent Operational Alerts */}
      <div className="org-section-card">
        <div className="org-section-header">
          <div className="org-section-title-wrap">
            <h2 className="org-section-title">
              {t('dashboard.criticalNotices.title', { defaultValue: 'Critical Field Notices' })}
            </h2>
            <p className="org-section-subtitle">
              {t('dashboard.criticalNotices.subtitle', { defaultValue: 'DMC & Area Command advisories' })}
            </p>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            borderRadius: '9999px'
          }}>
            {t('dashboard.criticalNotices.active', { defaultValue: '2 Active' })}
          </span>
        </div>

        <div className="org-alerts-list">
          {mockUrgentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`org-alert-item ${alert.severity === 'Critical' ? 'critical' : ''}`}
            >
              <div className="org-alert-top">
                <span className={`org-alert-badge ${alert.severity === 'Critical' ? 'critical' : 'warning'}`}>
                  {t(`severity.${alert.severity.toLowerCase()}`, { defaultValue: alert.severity })}
                </span>
                <span className="org-alert-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={12} />
                  <span>{getLocalizedRelativeTime(alert.time, t)}</span>
                </span>
              </div>
              <h3 className="org-alert-title">{getAlertTitle(alert)}</h3>
              <p className="org-alert-message">{getAlertMessage(alert)}</p>
              <button className="org-alert-action-btn" type="button">
                {getAlertAction(alert)} &rarr;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Resource & Operational Readiness Overview */}
      <div className="org-section-card">
        <div className="org-section-header">
          <div className="org-section-title-wrap">
            <h2 className="org-section-title">
              {t('dashboard.resourceReadiness.title', { defaultValue: 'Resource Readiness' })}
            </h2>
            <p className="org-section-subtitle">
              {t('dashboard.resourceReadiness.subtitle', { defaultValue: 'Hub inventory & standby capacity' })}
            </p>
          </div>
        </div>

        <div className="org-readiness-grid">
          <div className="org-readiness-item">
            <div className="org-readiness-labels">
              <span style={{ color: '#0F172A' }}>
                {t('dashboard.resourceReadiness.rescueVolunteers', { defaultValue: 'Rescue Volunteers Standby' })}
              </span>
              <span style={{ color: '#10756F' }}>
                {t('dashboard.resourceReadiness.capacity', { pct: 84, defaultValue: '84% Capacity' })}
              </span>
            </div>
            <div className="org-readiness-bar-bg">
              <div className="org-readiness-bar-fill" style={{ width: '84%' }}></div>
            </div>
          </div>

          <div className="org-readiness-item">
            <div className="org-readiness-labels">
              <span style={{ color: '#0F172A' }}>
                {t('dashboard.resourceReadiness.emergencyVehicles', { defaultValue: 'Emergency Vehicles & Boats' })}
              </span>
              <span style={{ color: '#10756F' }}>
                {t('dashboard.resourceReadiness.deployed', { pct: 72, defaultValue: '72% Deployed' })}
              </span>
            </div>
            <div className="org-readiness-bar-bg">
              <div className="org-readiness-bar-fill" style={{ width: '72%', backgroundColor: '#2563EB' }}></div>
            </div>
          </div>

          <div className="org-readiness-item">
            <div className="org-readiness-labels">
              <span style={{ color: '#0F172A' }}>
                {t('dashboard.resourceReadiness.dryRations', { defaultValue: 'Dry Rations & Water Rations' })}
              </span>
              <span style={{ color: '#B45309' }}>
                {t('dashboard.resourceReadiness.inventory', { pct: 55, defaultValue: '55% Inventory' })}
              </span>
            </div>
            <div className="org-readiness-bar-bg">
              <div className="org-readiness-bar-fill" style={{ width: '55%', backgroundColor: '#FFBE00' }}></div>
            </div>
          </div>

          <div className="org-readiness-item">
            <div className="org-readiness-labels">
              <span style={{ color: '#0F172A' }}>
                {t('dashboard.resourceReadiness.medicalAidKits', { defaultValue: 'Medical Aid Kits' })}
              </span>
              <span style={{ color: '#DC2626' }}>
                28% {t('dashboard.resourceReadiness.lowStock', { defaultValue: '(Low stock)' })}
              </span>
            </div>
            <div className="org-readiness-bar-bg">
              <div className="org-readiness-bar-fill" style={{ width: '28%', backgroundColor: '#DC2626' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
