import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconAlertTriangle,
  IconHandHeart,
  IconUsers,
  IconPackage,
  IconTrendingUp
} from './Icons';
import { mockDashboardMetrics } from '../data/mockDashboardData';

export const StatCards = ({
  onNavigateToIncidents = () => {},
  onNavigateToRequests = () => {},
  onNavigateToTeams = () => {}
}) => {
  const { t } = useTranslation();

  const getIcon = (iconName, color) => {
    switch (iconName) {
      case 'alertTriangle':
        return <IconAlertTriangle size={22} color={color} />;
      case 'handHeart':
        return <IconHandHeart size={22} color={color} />;
      case 'users':
        return <IconUsers size={22} color={color} />;
      case 'package':
        return <IconPackage size={22} color={color} />;
      default:
        return <IconTrendingUp size={22} color={color} />;
    }
  };

  const getTranslatedMetric = (stat) => {
    switch (stat.id) {
      case 'active-incidents':
        return {
          title: t('dashboard.kpi.activeIncidents', { defaultValue: stat.title }),
          badge: t('dashboard.kpi.highSeverity', { count: 5, defaultValue: stat.badge }),
          change: t('dashboard.kpi.activeIncidentsChange', { defaultValue: stat.change })
        };
      case 'aid-requests':
        return {
          title: t('dashboard.kpi.aidRequests', { defaultValue: stat.title }),
          badge: t('dashboard.kpi.fulfilled', { count: 128, defaultValue: stat.badge }),
          change: t('dashboard.kpi.aidRequestsPending', { count: 38, defaultValue: stat.change })
        };
      case 'dispatched-teams':
        return {
          title: t('dashboard.kpi.dispatchedTeams', { defaultValue: stat.title }),
          badge: t('dashboard.kpi.respondersActive', { count: 88, defaultValue: stat.badge }),
          change: t('dashboard.kpi.dispatchedTeamsStandby', { defaultValue: stat.change })
        };
      case 'supplies-distributed':
        return {
          title: t('dashboard.kpi.suppliesDistributed', { defaultValue: stat.title }),
          badge: t('dashboard.kpi.suppliesBadge', { defaultValue: stat.badge }),
          change: t('dashboard.kpi.suppliesChange', { defaultValue: stat.change })
        };
      default:
        return {
          title: stat.title,
          badge: stat.badge,
          change: stat.change
        };
    }
  };

  return (
    <section className="org-stats-grid" aria-label={t('dashboard.kpi.title', { defaultValue: 'Key Performance Indicators' })}>
      {mockDashboardMetrics.map((stat) => {
        const isUrgent = stat.changeType === 'urgent' || stat.changeType === 'increase';
        const localized = getTranslatedMetric(stat);

        return (
          <div
            key={stat.id}
            className="org-stat-card"
            style={{ cursor: stat.id === 'active-incidents' || stat.id === 'aid-requests' || stat.id === 'dispatched-teams' ? 'pointer' : 'default' }}
            onClick={() => {
              if (stat.id === 'active-incidents') onNavigateToIncidents();
              if (stat.id === 'aid-requests') onNavigateToRequests();
              if (stat.id === 'dispatched-teams') onNavigateToTeams();
            }}
          >
            <div className="org-stat-top">
              <div
                className="org-stat-icon-wrapper"
                style={{
                  backgroundColor: stat.accentColor === '#FFBE00' ? '#FFFBEB' : '#ECFBF8',
                  border: `1px solid ${stat.accentColor === '#FFBE00' ? '#FDE68A' : '#BCEFE6'}`
                }}
              >
                {getIcon(stat.icon, stat.accentColor === '#FFBE00' ? '#B45309' : '#10756F')}
              </div>
              <span className={`org-stat-badge ${isUrgent && stat.id === 'active-incidents' ? 'urgent' : 'normal'}`}>
                {localized.badge}
              </span>
            </div>

            <div className="org-stat-middle">
              <span className="org-stat-value">{stat.value}</span>
              <span className="org-stat-title">{localized.title}</span>
            </div>

            <div className="org-stat-bottom">
              <IconTrendingUp size={14} color={stat.changeType === 'positive' ? '#16A34A' : (stat.changeType === 'urgent' ? '#B45309' : '#64748B')} />
              <span className={`org-stat-change ${stat.changeType}`}>
                {localized.change}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
};
