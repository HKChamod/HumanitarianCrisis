import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconMapPin,
  IconChevronRight,
  IconAlertTriangle,
  IconClock
} from './Icons';
import {
  formatLocalizedDate,
  getLocalizedDistrict,
  getLocalizedCrisisType,
  getLocalizedSeverity,
  getLocalizedStatus
} from '../utils/localizationUtils';

export const IncidentTable = ({
  incidents = [],
  isLoading = false,
  error = null,
  onViewDetails = () => {},
  onRetry = () => {},
  onResetFilters = () => {}
}) => {
  const { t, i18n } = useTranslation();

  const getSeverityBadge = (severity) => {
    const sev = (severity || '').toLowerCase();
    const localized = getLocalizedSeverity(severity, t);
    switch (sev) {
      case 'critical':
        return <span className="org-severity-badge critical">● {localized}</span>;
      case 'high':
        return <span className="org-severity-badge high">● {localized}</span>;
      case 'medium':
        return <span className="org-severity-badge medium">● {localized}</span>;
      case 'low':
        return <span className="org-severity-badge low">● {localized}</span>;
      default:
        return <span className="org-severity-badge low">{localized}</span>;
    }
  };

  const getStatusPill = (status) => {
    const stat = (status || '').toLowerCase();
    const localized = getLocalizedStatus(status, t);
    switch (stat) {
      case 'active':
        return (
          <span className="org-status-pill active">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
            {localized}
          </span>
        );
      case 'reported':
        return (
          <span className="org-status-pill reported">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }}></span>
            {localized}
          </span>
        );
      case 'resolved':
        return (
          <span className="org-status-pill resolved">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
            {localized}
          </span>
        );
      case 'closed':
        return (
          <span className="org-status-pill closed">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748B' }}></span>
            {localized}
          </span>
        );
      default:
        return (
          <span className="org-status-pill closed">
            {localized}
          </span>
        );
    }
  };

  return (
    <div className="org-incidents-table-card">
      <div className="org-table-header-bar">
        <span className="org-table-count-label">
          {t('incidents.table.directoryCount', {
            count: incidents.length,
            defaultValue: `Crisis Incidents Directory (${incidents.length} Records)`
          })}
        </span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ padding: '24px' }}>
          <div className="org-skeleton-row"></div>
          <div className="org-skeleton-row"></div>
          <div className="org-skeleton-row"></div>
          <div className="org-skeleton-row"></div>
          <div className="org-skeleton-row"></div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="org-state-box">
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconAlertTriangle size={26} color="#DC2626" />
          </div>
          <h3 className="org-state-title">
            {t('incidents.states.errorTitle', { defaultValue: 'Unable to Load Crisis Incidents' })}
          </h3>
          <p className="org-state-desc">{error}</p>
          <button
            className="org-btn-primary"
            onClick={onRetry}
            style={{ marginTop: '8px' }}
            type="button"
          >
            {t('common.retryConnection', { defaultValue: 'Retry Connection' })}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && incidents.length === 0 && (
        <div className="org-state-box">
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#ECFBF8',
            color: '#10756F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconAlertTriangle size={24} color="#10756F" />
          </div>
          <h3 className="org-state-title">
            {t('incidents.states.emptyTitle', { defaultValue: 'No Crisis Incidents Found' })}
          </h3>
          <p className="org-state-desc">
            {t('incidents.states.emptyDesc', {
              defaultValue: 'No incidents match your current search query or filter criteria. Try adjusting your filters.'
            })}
          </p>
          <button
            className="org-btn-secondary"
            onClick={onResetFilters}
            style={{ marginTop: '8px' }}
            type="button"
          >
            {t('common.clearFilters', { defaultValue: 'Clear All Filters' })}
          </button>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && incidents.length > 0 && (
        <div className="org-table-responsive">
          <table className="org-incidents-table">
            <thead>
              <tr>
                <th>{t('incidents.table.id', { defaultValue: 'Incident ID' })}</th>
                <th>{t('incidents.table.nameType', { defaultValue: 'Incident Name & Type' })}</th>
                <th>{t('incidents.table.locationDistrict', { defaultValue: 'Location / District' })}</th>
                <th>{t('common.severity', { defaultValue: 'Severity' })}</th>
                <th>{t('incidents.table.startDate', { defaultValue: 'Start Date' })}</th>
                <th>{t('common.status', { defaultValue: 'Status' })}</th>
                <th style={{ textAlign: 'right' }}>{t('incidents.table.action', { defaultValue: 'Action' })}</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((item) => (
                <tr key={item.crisisId}>
                  {/* ID */}
                  <td>
                    <span className="org-incident-code">
                      #CR-{item.crisisId}
                    </span>
                  </td>

                  {/* Name & Type */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', marginBottom: '2px' }}>
                      {item.crisisName}
                    </div>
                    <span style={{
                      fontSize: '11px',
                      color: '#10756F',
                      fontWeight: 600,
                      backgroundColor: '#ECFBF8',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}>
                      {getLocalizedCrisisType(item.crisisType, t)}
                    </span>
                  </td>

                  {/* Location & District */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                      <IconMapPin size={13} color="#64748B" />
                      <span>{getLocalizedDistrict(item.district, t)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {item.location}
                    </div>
                  </td>

                  {/* Severity */}
                  <td>
                    {getSeverityBadge(item.severityLevel)}
                  </td>

                  {/* Start Date */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#0F172A', fontWeight: 500 }}>
                      <IconClock size={12} color="#94A3B8" />
                      <span>{formatLocalizedDate(item.startDate, i18n.language)}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    {getStatusPill(item.status)}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="org-btn-view-details"
                      onClick={() => onViewDetails(item)}
                      type="button"
                    >
                      <span>{t('common.viewDetails', { defaultValue: 'View Details' })}</span>
                      <IconChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
