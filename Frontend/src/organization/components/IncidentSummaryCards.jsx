import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconAlertTriangle,
  IconShieldCheck,
  IconClock,
  IconTrendingUp
} from './Icons';

export const IncidentSummaryCards = ({ incidents = [] }) => {
  const { t } = useTranslation();
  const total = incidents.length;
  const activeCount = incidents.filter(i => i.status === 'Active').length;
  const criticalCount = incidents.filter(i => i.severityLevel === 'Critical').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;

  const kpis = [
    {
      id: 'total',
      label: t('incidents.kpi.total', { defaultValue: 'Total Monitored Incidents' }),
      value: total,
      subtext: t('incidents.kpi.totalSub', { defaultValue: 'Across all registered districts' }),
      icon: IconAlertTriangle,
      iconColor: '#10756F',
      iconBg: '#ECFBF8',
      iconBorder: '#BCEFE6'
    },
    {
      id: 'active',
      label: t('incidents.kpi.active', { defaultValue: 'Active Emergencies' }),
      value: activeCount,
      subtext: t('incidents.kpi.activeSub', { defaultValue: 'Teams currently deployed' }),
      icon: IconTrendingUp,
      iconColor: '#047857',
      iconBg: '#ECFDF5',
      iconBorder: '#A7F3D0'
    },
    {
      id: 'critical',
      label: t('incidents.kpi.critical', { defaultValue: 'Critical Severity' }),
      value: criticalCount,
      subtext: t('incidents.kpi.criticalSub', { defaultValue: 'Immediate response required' }),
      icon: IconAlertTriangle,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
      iconBorder: '#FECACA'
    },
    {
      id: 'resolved',
      label: t('incidents.kpi.resolved', { defaultValue: 'Resolved / Under Control' }),
      value: resolvedCount,
      subtext: t('incidents.kpi.resolvedSub', { defaultValue: 'Emergency phase neutralized' }),
      icon: IconShieldCheck,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
      iconBorder: '#BFDBFE'
    }
  ];

  return (
    <div className="org-incidents-kpi-grid">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.id} className="org-incidents-kpi-card">
            <div
              className="org-kpi-icon-box"
              style={{
                backgroundColor: kpi.iconBg,
                border: `1px solid ${kpi.iconBorder}`
              }}
            >
              <Icon size={22} color={kpi.iconColor} />
            </div>
            <div className="org-kpi-content">
              <span className="org-kpi-val">{kpi.value}</span>
              <span className="org-kpi-label">{kpi.label}</span>
              <span className="org-kpi-subtext">{kpi.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
