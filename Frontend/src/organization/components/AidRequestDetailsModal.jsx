import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconMapPin,
  IconClock,
  IconUsers,
  IconPhone,
  IconHandHeart,
  IconCheckCircle
} from './Icons';
import { availableResponseTeams } from '../data/mockAidRequests';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { ALLOWED_STATUS_TRANSITIONS } from '../services/aidRequestsService';
import {
  formatLocalizedDate,
  getLocalizedDistrict,
  getLocalizedSeverity,
  getLocalizedStatus
} from '../utils/localizationUtils';

const AidRequestDetailsModalContent = ({
  request,
  onClose,
  onUpdateStatus,
  onAssignTeam
}) => {
  const { t, i18n } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState(request.status);
  const [selectedTeam, setSelectedTeam] = useState(request.assignedTeam || 'Unassigned');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isFeedbackError, setIsFeedbackError] = useState(false);
  const feedbackTimerRef = useRef(null);

  const liveStatusOptions = [
    request.status,
    ...(ALLOWED_STATUS_TRANSITIONS[request.status] || []),
  ];

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const scheduleFeedbackClear = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback('');
      setIsFeedbackError(false);
    }, 3000);
  };

  const handleStatusApply = async () => {
    if (selectedStatus === request.status) return;
    setIsUpdatingStatus(true);
    setFeedback('');
    setIsFeedbackError(false);
    try {
      await onUpdateStatus(request.requestId, selectedStatus);
      setFeedback(t('aidRequests.details.statusUpdated', { status: selectedStatus }));
      scheduleFeedbackClear();
    } catch (err) {
      setIsFeedbackError(true);
      setFeedback(err?.detail || err?.message || t('aidRequests.details.statusFailed'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleTeamAssign = async () => {
    if (selectedTeam === request.assignedTeam) return;
    setIsAssigningTeam(true);
    setFeedback('');
    setIsFeedbackError(false);
    try {
      await onAssignTeam(request.requestId, selectedTeam);
      setFeedback(t('aidRequests.details.teamAssigned', { team: selectedTeam }));
      scheduleFeedbackClear();
    } catch (err) {
      setIsFeedbackError(true);
      setFeedback(err?.detail || err?.message || t('aidRequests.details.assignFailed'));
    } finally {
      setIsAssigningTeam(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    const label = getLocalizedSeverity(priority, t);
    switch (p) {
      case 'critical':
        return <span className="org-severity-badge critical">● {label} Priority</span>;
      case 'high':
        return <span className="org-severity-badge high">● {label} Priority</span>;
      case 'medium':
        return <span className="org-severity-badge medium">● {label} Priority</span>;
      case 'low':
        return <span className="org-severity-badge low">● {label} Priority</span>;
      default:
        return <span className="org-severity-badge low">{priority}</span>;
    }
  };

  const currentStatusLabel = getLocalizedStatus(request.status, t);

  return (
    <div className="org-drawer-backdrop" onClick={onClose}>
      <div className="org-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="org-drawer-header">
          <div className="org-drawer-title-group">
            <div className="org-drawer-code-row">
              <span className="org-incident-code">
                #{request.requestId}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10756F',
                backgroundColor: '#ECFBF8',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {request.aidCategory}
              </span>
              {getPriorityBadge(request.priority)}
            </div>
            <h2 className="org-drawer-title">{t('aidRequests.details.title', { name: request.requester })}</h2>
          </div>
          <button
            className="org-drawer-close-btn"
            onClick={onClose}
            aria-label={t('common.close')}
            type="button"
          >
            &times;
          </button>
        </div>

        {/* Drawer Body */}
        <div className="org-drawer-body">
          {/* Operations & Triage Card */}
          <div className="org-assignment-card">
            <div className="org-assignment-header">
              <span className="org-assignment-title">
                <IconHandHeart size={15} color="#10756F" />
                <span>{t('aidRequests.details.triageSection')}</span>
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: request.status === 'Fulfilled' ? '#047857' : (request.status === 'Pending Review' ? '#B45309' : '#1D4ED8')
              }}>
                ● {currentStatusLabel}
              </span>
            </div>

            {/* Status Update Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                {t('aidRequests.details.reviewStatus')}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="org-team-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={!USE_MOCK_API && liveStatusOptions.length <= 1}
                >
                  {USE_MOCK_API ? (
                    <>
                      <option value="Pending Review">{t('status.pendingReview', { defaultValue: 'Pending Review' })}</option>
                      <option value="In Progress">{t('status.inProgress', { defaultValue: 'In Progress' })}</option>
                      <option value="Fulfilled">{t('status.fulfilled', { defaultValue: 'Fulfilled' })}</option>
                      <option value="Cancelled">{t('status.cancelled', { defaultValue: 'Cancelled' })}</option>
                    </>
                  ) : (
                    liveStatusOptions.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {getLocalizedStatus(statusOption, t)}
                      </option>
                    ))
                  )}
                </select>
                <button
                  className="org-btn-primary"
                  onClick={handleStatusApply}
                  disabled={isUpdatingStatus || selectedStatus === request.status}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    fontSize: '12px',
                    opacity: selectedStatus === request.status ? 0.6 : 1,
                    cursor: selectedStatus === request.status ? 'default' : 'pointer'
                  }}
                  type="button"
                >
                  {isUpdatingStatus ? t('common.saving') : t('aidRequests.details.saveStatus')}
                </button>
              </div>
            </div>

            {/* Response Team Assignment Action */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                {t('aidRequests.details.assignTeamPrompt')}
              </label>
              {USE_MOCK_API ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    className="org-team-select"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                  >
                    {availableResponseTeams.map((team) => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  <button
                    className="org-btn-secondary"
                    onClick={handleTeamAssign}
                    disabled={isAssigningTeam || selectedTeam === request.assignedTeam}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      fontSize: '12px',
                      borderColor: '#10756F',
                      color: '#10756F',
                      opacity: selectedTeam === request.assignedTeam ? 0.6 : 1,
                      cursor: selectedTeam === request.assignedTeam ? 'default' : 'pointer'
                    }}
                    type="button"
                  >
                    {isAssigningTeam ? t('aidRequests.details.assigningTeam') : t('aidRequests.details.assignTeam')}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '8px 10px' }}>
                  Response team assignment is not yet supported by the backend CitizenRequests API.
                </div>
              )}
            </div>

            {feedback && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: isFeedbackError ? '#DC2626' : '#047857', fontWeight: 600, marginTop: '4px' }}>
                <IconCheckCircle size={14} color={isFeedbackError ? '#DC2626' : '#047857'} />
                <span>{feedback}</span>
              </div>
            )}
          </div>

          {/* Request Information Grid */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconUsers size={16} color="#10756F" />
              <span>{t('aidRequests.details.requesterHousehold')}</span>
            </div>
            <div className="org-detail-grid">
              <div className="org-detail-item">
                <span className="org-detail-label">{t('aidRequests.details.primaryContact')}</span>
                <span className="org-detail-value">{request.requester}</span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('aidRequests.details.phoneHotline')}</span>
                {request.phone ? (
                  <a
                    href={`tel:${request.phone}`}
                    className="org-detail-value"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10756F', textDecoration: 'none' }}
                  >
                    <IconPhone size={12} color="#10756F" />
                    {request.phone}
                  </a>
                ) : (
                  <span className="org-detail-value">{t('aidRequests.details.notProvided')}</span>
                )}
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('aidRequests.details.nic')}</span>
                <span className="org-detail-value">{request.nic || t('aidRequests.details.notProvided')}</span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('common.district')}</span>
                <span className="org-detail-value" style={{ color: '#DC2626', fontWeight: 800 }}>
                  {t('aidRequests.details.familyMembers', { count: request.affectedPersons })}
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('common.district')}</span>
                <span className="org-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconMapPin size={13} color="#10756F" />
                  {getLocalizedDistrict(request.district, t)}
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">{t('aidRequests.details.submissionDate')}</span>
                <span className="org-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={12} color="#64748B" />
                  {formatLocalizedDate(request.requestedDate, i18n.language, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Precise Location */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconMapPin size={15} color="#10756F" />
              <span>{t('aidRequests.details.locationLandmark')}</span>
            </div>
            <div className="org-drawer-description-box" style={{ fontWeight: 600, color: '#0F172A' }}>
              📍 {request.location}
            </div>
          </div>

          {/* Citizen Description / Need */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <span>{t('aidRequests.details.citizenStatement')}</span>
            </div>
            <div className="org-drawer-description-box">
              {request.description}
            </div>
          </div>

          {/* Coordinator Dispatch Notes */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <span>{t('aidRequests.details.dispatchNotes')}</span>
            </div>
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#475569',
              lineHeight: 1.5
            }}>
              {request.notes || t('aidRequests.details.noNotes')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AidRequestDetailsModal = ({
  request,
  isOpen = false,
  onClose = () => {},
  onUpdateStatus = () => {},
  onAssignTeam = () => {}
}) => {
  if (!isOpen || !request) return null;

  return (
    <AidRequestDetailsModalContent
      key={request.requestId}
      request={request}
      onClose={onClose}
      onUpdateStatus={onUpdateStatus}
      onAssignTeam={onAssignTeam}
    />
  );
};
