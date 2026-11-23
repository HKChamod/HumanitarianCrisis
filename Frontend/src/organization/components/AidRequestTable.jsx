import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconMapPin,
  IconChevronRight,
  IconAlertTriangle,
  IconClock,
  IconPhone,
  IconDroplet,
  IconHome,
  IconLifeBuoy,
  IconPackage
} from './Icons';
import {
  formatLocalizedDate,
  getLocalizedDistrict,
  getLocalizedSeverity,
  getLocalizedStatus
} from '../utils/localizationUtils';

export const AidRequestTable = ({
  requests = [],
  isLoading = false,
  error = null,
  onViewDetails = () => {},
  onRetry = () => {},
  onResetFilters = () => {}
}) => {
  const { t, i18n } = useTranslation();

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Food Rations':
        return (
          <span className="org-category-badge food">
            <span>🍞</span>
            <span>{t('aidRequests.categories.medicalAid', { defaultValue: category }) && t('aidRequests.categories.food')}</span>
          </span>
        );
      case 'Drinking Water':
        return (
          <span className="org-category-badge water">
            <IconDroplet size={12} color="#0369A1" />
            <span>{t('aidRequests.categories.water')}</span>
          </span>
        );
      case 'Medical Supplies':
        return (
          <span className="org-category-badge medical">
            <span>💊</span>
            <span>{t('aidRequests.categories.medicalAid')}</span>
          </span>
        );
      case 'Emergency Shelter':
        return (
          <span className="org-category-badge shelter">
            <IconHome size={12} color="#6B21A8" />
            <span>{t('aidRequests.categories.shelterKit')}</span>
          </span>
        );
      case 'Rescue & Evacuation':
        return (
          <span className="org-category-badge rescue">
            <IconLifeBuoy size={12} color="#047857" />
            <span>{t('aidRequests.categories.rescueEvac')}</span>
          </span>
        );
      default:
        return (
          <span className="org-category-badge">
            <IconPackage size={12} />
            <span>{category}</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    const label = getLocalizedSeverity(priority, t);
    switch (p) {
      case 'critical':
        return <span className="org-severity-badge critical">● {label}</span>;
      case 'high':
        return <span className="org-severity-badge high">● {label}</span>;
      case 'medium':
        return <span className="org-severity-badge medium">● {label}</span>;
      case 'low':
        return <span className="org-severity-badge low">● {label}</span>;
      default:
        return <span className="org-severity-badge low">{priority}</span>;
    }
  };

  const getStatusPill = (status) => {
    const label = getLocalizedStatus(status, t);
    switch (status) {
      case 'Pending':
      case 'Pending Review':
        return (
          <span className="org-aid-status-pill pending">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }}></span>
            {label}
          </span>
        );
      case 'Verified':
      case 'Assigned':
      case 'In Progress':
        return (
          <span className="org-aid-status-pill in-progress">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
            {label}
          </span>
        );
      case 'Fulfilled':
        return (
          <span className="org-aid-status-pill fulfilled">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
            {label}
          </span>
        );
      case 'Rejected':
      case 'Cancelled':
        return (
          <span className="org-aid-status-pill cancelled">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748B' }}></span>
            {label}
          </span>
        );
      default:
        return (
          <span className="org-aid-status-pill cancelled">
            {label || status}
          </span>
        );
    }
  };

  return (
    <div className="org-incidents-table-card">
      <div className="org-table-header-bar">
        <span className="org-table-count-label">
          {t('aidRequests.table.queueCount', { count: requests.length })}
        </span>
      </div>

      {/* Loading Skeleton State */}
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
          <h3 className="org-state-title">{t('aidRequests.states.errorTitle')}</h3>
          <p className="org-state-desc">{error}</p>
          <button
            className="org-btn-primary"
            onClick={onRetry}
            style={{ marginTop: '8px' }}
            type="button"
          >
            {t('common.retryConnection')}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && requests.length === 0 && (
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
          <h3 className="org-state-title">{t('aidRequests.states.emptyTitle')}</h3>
          <p className="org-state-desc">{t('aidRequests.states.emptyDesc')}</p>
          <button
            className="org-btn-secondary"
            onClick={onResetFilters}
            style={{ marginTop: '8px' }}
            type="button"
          >
            {t('common.clearFilters')}
          </button>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && requests.length > 0 && (
        <div className="org-table-responsive">
          <table className="org-incidents-table">
            <thead>
              <tr>
                <th>{t('aidRequests.table.requestId')}</th>
                <th>{t('aidRequests.table.requester')}</th>
                <th>{t('aidRequests.table.aidCategory')}</th>
                <th>{t('aidRequests.table.locationDistrict')}</th>
                <th>{t('common.priority')}</th>
                <th>{t('aidRequests.table.requestedDate')}</th>
                <th>{t('common.status')}</th>
                <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.requestId}>
                  {/* Request ID */}
                  <td>
                    <span className="org-incident-code" style={{ fontSize: '12px' }}>
                      #{req.requestId}
                    </span>
                  </td>

                  {/* Requester */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                      {req.requester}
                    </div>
                    {req.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        <IconPhone size={11} color="#10756F" />
                        <span>{req.phone}</span>
                      </div>
                    )}
                  </td>

                  {/* Aid Category */}
                  <td>
                    {getCategoryBadge(req.aidCategory)}
                  </td>

                  {/* Location & District */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                      <IconMapPin size={13} color="#64748B" />
                      <span>{getLocalizedDistrict(req.district, t)}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={req.location}>
                      {req.location}
                    </div>
                  </td>

                  {/* Priority */}
                  <td>
                    {getPriorityBadge(req.priority)}
                  </td>

                  {/* Requested Date */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#0F172A', fontWeight: 500 }}>
                      <IconClock size={12} color="#94A3B8" />
                      <span>{formatLocalizedDate(req.requestedDate, i18n.language)}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td>
                    {getStatusPill(req.status)}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="org-btn-view-details"
                      onClick={() => onViewDetails(req)}
                      type="button"
                    >
                      <span>{t('aidRequests.table.viewDetails')}</span>
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
