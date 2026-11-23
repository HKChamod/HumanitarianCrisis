import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconMapPin, IconChevronRight } from './Icons';
import { mockRecentActivities } from '../data/mockDashboardData';
import { USE_MOCK_API } from '../../services/api/apiConfig';
import {
  getLocalizedRelativeTime,
  getLocalizedDistrict,
  getLocalizedStatus,
  getLocalizedSeverity
} from '../utils/localizationUtils';

export const RecentActivity = ({
  onViewAll = () => { },
  liveIncidents = [],
  isLoading = false,
  error = null
}) => {
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

  if (!USE_MOCK_API) {
    const recentLiveEvents = Array.isArray(liveIncidents) ? liveIncidents.slice(0, 5) : [];

    return (
      <div className="org-section-card">
        <div className="org-section-header">
          <div className="org-section-title-wrap">
            <h2 className="org-section-title">
              {t('dashboard.recentActivity.liveTitle', { defaultValue: 'Recent Crisis Events' })}
            </h2>
            <p className="org-section-subtitle">
              {t('dashboard.recentActivity.liveSubtitle', {
                defaultValue: 'Live crisis events returned by the backend CrisisEvents directory'
              })}
            </p>
          </div>
          <button className="org-section-action-link" onClick={onViewAll} type="button">
            <span>{t('dashboard.recentActivity.viewAllLog', { defaultValue: 'View All Log' })}</span>
            <IconChevronRight size={14} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Loading live crisis events...
          </div>
        ) : error ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#B91C1C', fontSize: '13px' }}>
            {error}
          </div>
        ) : recentLiveEvents.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            No crisis events returned from the backend API.
          </div>
        ) : (
          <div className="org-table-responsive">
            <table className="org-activity-table">
              <thead>
                <tr>
                  <th>Event Ref</th>
                  <th>Crisis Name</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Start Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLiveEvents.map((event) => {
                  const sevLower = String(event.severityLevel || '').toLowerCase();
                  const priorityClass =
                    sevLower === 'critical' || sevLower === 'high'
                      ? 'high'
                      : sevLower === 'medium'
                        ? 'medium'
                        : 'low';
                  const startDateLabel = event.startDate
                    ? new Date(event.startDate).toLocaleDateString()
                    : '—';

                  return (
                    <tr key={event.crisisId}>
                      <td>
                        <span className="org-incident-code">CR-{event.crisisId}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0F172A' }}>
                        {event.crisisName || 'Untitled Event'}
                      </td>
                      <td>
                        <span className="org-activity-type">{event.crisisType || '—'}</span>
                      </td>
                      <td>
                        <span className={`org-pill-priority ${priorityClass}`}>
                          {event.severityLevel || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        {startDateLabel}
                      </td>
                      <td>
                        <span className="org-pill-status operational">
                          {event.status || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

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
