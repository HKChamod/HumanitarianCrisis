import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconMapPin,
  IconClock,
  IconShieldCheck,
  IconUsers,
  IconPackage,
  IconPhone
} from './Icons';
import {
  formatLocalizedDate,
  getLocalizedDistrict,
  getLocalizedCrisisType,
  getLocalizedSeverity,
  getLocalizedStatus
} from '../utils/localizationUtils';

const IncidentDetailsModalContent = ({
  incident,
  onClose,
  onUpdateStatus
}) => {
  const { t, i18n } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState(incident.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateFeedback, setUpdateFeedback] = useState('');
  const [isFeedbackError, setIsFeedbackError] = useState(false);
  const feedbackTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleStatusApply = async () => {
    if (selectedStatus === incident.status) return;
    setIsUpdating(true);
    setUpdateFeedback('');
    setIsFeedbackError(false);
    try {
      await onUpdateStatus(incident.crisisId, selectedStatus);
      setUpdateFeedback(
        t('incidents.details.updateSuccess', {
          status: getLocalizedStatus(selectedStatus, t),
          defaultValue: `Status successfully updated to ${selectedStatus}`
        })
      );
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = setTimeout(() => {
        setUpdateFeedback('');
        setIsFeedbackError(false);
      }, 3000);
    } catch (err) {
      setIsFeedbackError(true);
      setUpdateFeedback(
        err?.detail ||
          err?.message ||
          t('incidents.details.updateFailed', { defaultValue: 'Failed to update status.' })
      );
    } finally {
      setIsUpdating(false);
    }
  };

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

  return (
    <div className="org-drawer-backdrop" onClick={onClose}>
      <div className="org-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="org-drawer-header">
          <div className="org-drawer-title-group">
            <div className="org-drawer-code-row">
              <span className="org-incident-code">
                #CR-{incident.crisisId}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10756F',
                backgroundColor: '#ECFBF8',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {getLocalizedCrisisType(incident.crisisType, t)}
              </span>
              {getSeverityBadge(incident.severityLevel)}
            </div>
            <h2 className="org-drawer-title">{incident.crisisName}</h2>
          </div>
          <button
            className="org-drawer-close-btn"
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Close details' })}
            type="button"
          >
            &times;
          </button>
        </div>

        {/* Drawer Body */}
        <div className="org-drawer-body">
          {/* Status Update Quick Action Box */}
          <div className="org-status-change-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#10756F', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('incidents.details.commandTitle', { defaultValue: 'Operational Status Command' })}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: incident.status === 'Active' ? '#047857' : (incident.status === 'Reported' ? '#B45309' : '#1D4ED8')
              }}>
                {t('incidents.details.currentStatusLabel', {
                  status: getLocalizedStatus(incident.status, t),
                  defaultValue: `Current: ${incident.status}`
                })}
              </span>
            </div>
            <div className="org-status-actions-row">
              <select
                className="org-filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ flex: 1, height: '36px', fontSize: '13px' }}
              >
                <option value="Reported">{t('status.reported', { defaultValue: 'Reported' })}</option>
                <option value="Active">{t('status.active', { defaultValue: 'Active' })}</option>
                <option value="Resolved">{t('status.resolved', { defaultValue: 'Resolved' })}</option>
                <option value="Closed">{t('status.closed', { defaultValue: 'Closed' })}</option>
              </select>
              <button
                className="org-btn-primary"
                onClick={handleStatusApply}
                disabled={isUpdating || selectedStatus === incident.status}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  fontSize: '12px',
                  opacity: selectedStatus === incident.status ? 0.6 : 1,
                  cursor: selectedStatus === incident.status ? 'default' : 'pointer'
                }}
                type="button"
              >
                {isUpdating
                  ? t('common.saving', { defaultValue: 'Saving...' })
                  : t('incidents.details.updateStatus', { defaultValue: 'Update Status' })}
              </button>
            </div>
            {updateFeedback && (
              <span style={{ fontSize: '11px', color: isFeedbackError ? '#DC2626' : '#047857', fontWeight: 600 }}>
                {updateFeedback}
              </span>
            )}
          </div>

          {/* Key Incident Metadata */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconShieldCheck size={16} color="#10756F" />
              <span>{t('incidents.details.parametersTitle', { defaultValue: 'Incident Parameters' })}</span>
            </div>
            <div className="org-detail-grid">
              <div className="org-detail-item">
                <span className="org-detail-label">{t('incidents.details.districtRegion', { defaultValue: 'District & Region' })}</span>
                <span className="org-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconMapPin size={13} color="#10756F" />
                  {getLocalizedDistrict(incident.district, t)}
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('incidents.details.specificLocation', { defaultValue: 'Specific Location' })}</span>
                <span className="org-detail-value">{incident.location}</span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('incidents.details.initialTriggerDate', { defaultValue: 'Initial Trigger Date' })}</span>
                <span className="org-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={13} color="#64748B" />
                  {formatLocalizedDate(incident.startDate, i18n.language, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('incidents.details.affectedPopulation', { defaultValue: 'Affected Population' })}</span>
                <span className="org-detail-value" style={{ color: '#DC2626' }}>
                  {t('incidents.details.citizensCount', {
                    count: incident.affectedPopulation ? incident.affectedPopulation.toLocaleString() : 'N/A',
                    defaultValue: `~${incident.affectedPopulation ? incident.affectedPopulation.toLocaleString() : 'N/A'} Citizens`
                  })}
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('incidents.details.reportingAuthority', { defaultValue: 'Reporting Authority' })}</span>
                <span className="org-detail-value">{incident.reportedBy || 'Disaster Management Centre'}</span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('incidents.details.emergencyDesk', { defaultValue: 'Emergency Desk' })}</span>
                <span className="org-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconPhone size={12} color="#10756F" />
                  {incident.contactNumber || '117'}
                </span>
              </div>
            </div>
          </div>

          {/* Full Description */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <span>{t('incidents.details.fieldOverview', { defaultValue: 'Field Situation Overview' })}</span>
            </div>
            <div className="org-drawer-description-box">
              {incident.description}
            </div>
          </div>

          {/* Required Assistance */}
          {incident.requiredAssistance && incident.requiredAssistance.length > 0 && (
            <div className="org-drawer-section">
              <div className="org-drawer-section-title">
                <IconPackage size={15} color="#10756F" />
                <span>{t('incidents.details.requestedRelief', { defaultValue: 'Requested Relief & Aid Supplies' })}</span>
              </div>
              <div className="org-chips-wrap">
                {incident.requiredAssistance.map((item, idx) => (
                  <span key={idx} className="org-relief-chip">
                    <span>📦</span>
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deployed Teams */}
          {incident.assignedTeams && incident.assignedTeams.length > 0 && (
            <div className="org-drawer-section">
              <div className="org-drawer-section-title">
                <IconUsers size={15} color="#1D4ED8" />
                <span>{t('incidents.details.assignedUnits', { defaultValue: 'Assigned Emergency Response Units' })}</span>
              </div>
              <div className="org-chips-wrap">
                {incident.assignedTeams.map((team, idx) => (
                  <span key={idx} className="org-team-chip">
                    👥 {team}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const IncidentDetailsModal = ({
  incident,
  isOpen = false,
  onClose = () => {},
  onUpdateStatus = () => {}
}) => {
  if (!isOpen || !incident) return null;

  return (
    <IncidentDetailsModalContent
      key={incident.crisisId}
      incident={incident}
      onClose={onClose}
      onUpdateStatus={onUpdateStatus}
    />
  );
};
