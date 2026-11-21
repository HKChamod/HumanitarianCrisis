import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconMapPin, IconChevronRight } from './Icons';
import { mockRecentActivities } from '../data/mockDashboardData';
import {
  getLocalizedRelativeTime,
  getLocalizedDistrict,
  getLocalizedStatus,
  getLocalizedSeverity
} from '../utils/localizationUtils';

export const RecentActivity = ({ onViewAll = () => {} }) => {
  const { t } = useTranslation();

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'in progress':
        return 'in-progress';
      case 'en route':
        return 'en-route';
      case 'operational':
        return 'operational';
      case 'completed':
        return 'completed';
      default:
        return 'completed';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'low';
    }
  };

  const getLocalizedOperation = (opType) => {
    if (!opType) return '';
    const lower = opType.toLowerCase();
    if (lower.includes('evacuation')) return t('dashboard.recentActivity.operations.evacuation', { defaultValue: opType });
    if (lower.includes('water')) return t('dashboard.recentActivity.operations.water', { defaultValue: opType });
    if (lower.includes('medical') || lower.includes('first aid')) return t('dashboard.recentActivity.operations.medical', { defaultValue: opType });
    if (lower.includes('ration')) return t('dashboard.recentActivity.operations.rations', { defaultValue: opType });
    if (lower.includes('shelter')) return t('dashboard.recentActivity.operations.shelter', { defaultValue: opType });
    return opType;
  };

  const getLocalizedLocation = (locStr) => {
    if (!locStr) return '';
    const parts = locStr.split(',').map((s) => s.trim());
    if (parts.length === 2) {
      const districtLocalized = getLocalizedDistrict(parts[1], t);
      return `${parts[0]}, ${districtLocalized}`;
    }
    return locStr;
  };

  return (
    <div className="org-section-card">
      <div className="org-section-header">
        <div className="org-section-title-wrap">
          <h2 className="org-section-title">
            {t('dashboard.recentActivity.title', { defaultValue: 'Recent Field Activities & Operations' })}
          </h2>
          <p className="org-section-subtitle">
            {t('dashboard.recentActivity.subtitle', { defaultValue: 'Real-time dispatches, aid missions, and rescue progress updates' })}
          </p>
        </div>
        <button className="org-section-action-link" onClick={onViewAll} type="button">
          <span>{t('dashboard.recentActivity.viewAllLog', { defaultValue: 'View All Log' })}</span>
          <IconChevronRight size={14} />
        </button>
      </div>

      <div className="org-table-responsive">
        <table className="org-activity-table">
          <thead>
            <tr>
              <th>{t('dashboard.recentActivity.incidentRef', { defaultValue: 'Incident Ref' })}</th>
              <th>{t('dashboard.recentActivity.operation', { defaultValue: 'Operation / Type' })}</th>
              <th>{t('dashboard.recentActivity.location', { defaultValue: 'Location' })}</th>
              <th>{t('dashboard.recentActivity.priority', { defaultValue: 'Priority' })}</th>
              <th>{t('dashboard.recentActivity.assignedUnit', { defaultValue: 'Assigned Unit' })}</th>
              <th>{t('dashboard.recentActivity.impact', { defaultValue: 'Impact' })}</th>
              <th>{t('common.status', { defaultValue: 'Status' })}</th>
            </tr>
          </thead>
          <tbody>
            {mockRecentActivities.map((act) => (
              <tr key={act.id}>
                <td>
                  <span className="org-incident-code">{act.incidentCode}</span>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>{getLocalizedRelativeTime(act.reportedTime, t)}</div>
                </td>
                <td>
                  <span className="org-activity-type">{getLocalizedOperation(act.type)}</span>
                </td>
                <td>
                  <span className="org-activity-location">
                    <IconMapPin size={13} color="#64748B" />
                    <span>{getLocalizedLocation(act.location)}</span>
                  </span>
                </td>
                <td>
                  <span className={`org-pill-priority ${getPriorityClass(act.priority)}`}>
                    {getLocalizedSeverity(act.priority, t)}
                  </span>
                </td>
                <td style={{ fontWeight: 500, color: '#334155' }}>
                  {act.assignedTeam}
                </td>
                <td style={{ fontWeight: 600, color: '#10756F' }}>
                  {t('dashboard.recentActivity.beneficiariesCount', { count: act.beneficiaries, defaultValue: `${act.beneficiaries} citizens` })}
                </td>
                <td>
                  <span className={`org-pill-status ${getStatusClass(act.status)}`}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: act.status === 'In Progress' ? '#2563EB' : (act.status === 'Operational' ? '#059669' : (act.status === 'En Route' ? '#D97706' : '#64748B'))
                    }}></span>
                    {getLocalizedStatus(act.status, t)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
