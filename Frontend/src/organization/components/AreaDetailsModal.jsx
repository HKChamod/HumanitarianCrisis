import React, { useState, useRef, useEffect } from 'react';
import {
  IconMapPin,
  IconClock,
  IconUsers,
  IconAlertTriangle,
  IconEdit,
  IconCheckCircle,
  IconShieldCheck,
  IconHome
} from './Icons';
import { AREA_RESPONSE_STATUSES, AREA_RISK_LEVELS } from '../data/mockAssignedAreas';
import { availableResponseTeams } from '../data/mockAidRequests';

const AreaDetailsModalContent = ({
  area,
  onClose,
  onUpdateStatusAndRisk,
  onUpdateTeams,
  onEdit
}) => {
  const [selectedStatus, setSelectedStatus] = useState(area.responseStatus);
  const [selectedRisk, setSelectedRisk] = useState(area.riskLevel);
  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const feedbackTimerRef = useRef(null);

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
    feedbackTimerRef.current = setTimeout(() => setFeedback(''), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not recorded';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleStatusAndRiskSave = async () => {
    setIsUpdating(true);
    setFeedback('');
    try {
      await onUpdateStatusAndRisk(area.areaId, selectedStatus, selectedRisk);
      setFeedback('Status & Risk parameters updated.');
      scheduleFeedbackClear();
    } catch {
      setFeedback('Failed to update area.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTeam = async () => {
    if (!selectedTeamToAdd || area.assignedTeams.includes(selectedTeamToAdd)) return;
    setIsUpdating(true);
    setFeedback('');
    try {
      const updatedTeams = [...area.assignedTeams, selectedTeamToAdd];
      await onUpdateTeams(area.areaId, updatedTeams);
      setSelectedTeamToAdd('');
      setFeedback(`Assigned ${selectedTeamToAdd} to area.`);
      scheduleFeedbackClear();
    } catch {
      setFeedback('Failed to assign team.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveTeam = async (teamToRemove) => {
    setIsUpdating(true);
    setFeedback('');
    try {
      const updatedTeams = area.assignedTeams.filter(t => t !== teamToRemove);
      await onUpdateTeams(area.areaId, updatedTeams);
      setFeedback(`Removed ${teamToRemove}.`);
      scheduleFeedbackClear();
    } catch {
      setFeedback('Failed to update team.');
    } finally {
      setIsUpdating(false);
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
                #{area.areaId}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10756F',
                backgroundColor: '#ECFBF8',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {area.crisisType}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: area.riskLevel === 'Critical' ? '#FEF2F2' : (area.riskLevel === 'High' ? '#FFF7ED' : '#FFFBEB'),
                color: area.riskLevel === 'Critical' ? '#DC2626' : (area.riskLevel === 'High' ? '#EA580C' : '#D97706')
              }}>
                ● {area.riskLevel} Risk
              </span>
            </div>
            <h2 className="org-drawer-title">{area.areaName}</h2>
          </div>
          <button
            className="org-drawer-close-btn"
            onClick={onClose}
            aria-label="Close details"
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
                <IconShieldCheck size={15} color="#10756F" />
                <span>Response Command & Severity Control</span>
              </span>
              <button
                className="org-btn-secondary"
                onClick={() => {
                  onClose();
                  onEdit(area);
                }}
                style={{ height: '30px', padding: '0 10px', fontSize: '11px' }}
                type="button"
              >
                <IconEdit size={12} />
                <span>Edit Area</span>
              </button>
            </div>

            {/* Status & Risk Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  Response Status:
                </label>
                <select
                  className="org-team-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {AREA_RESPONSE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>
                  Risk Severity Level:
                </label>
                <select
                  className="org-team-select"
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                >
                  {AREA_RISK_LEVELS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="org-btn-primary"
              onClick={handleStatusAndRiskSave}
              disabled={isUpdating || (selectedStatus === area.responseStatus && selectedRisk === area.riskLevel)}
              style={{
                height: '36px',
                fontSize: '12px',
                marginTop: '4px',
                opacity: (selectedStatus === area.responseStatus && selectedRisk === area.riskLevel) ? 0.6 : 1
              }}
              type="button"
            >
              {isUpdating ? 'Saving...' : 'Update Area Parameters'}
            </button>

            {feedback && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                <IconCheckCircle size={14} color="#047857" />
                <span>{feedback}</span>
              </div>
            )}
          </div>

          {/* Core Geographic & Demographics Grid */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconMapPin size={16} color="#10756F" />
              <span>Geographic & Population Parameters</span>
            </div>
            <div className="org-detail-grid">
              <div className="org-detail-item">
                <span className="org-detail-label">District & Province</span>
                <span className="org-detail-value">📍 {area.district} ({area.province} Prov.)</span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">Coordinates</span>
                <span className="org-detail-value">
                  {area.coordinates ? `${area.coordinates[0].toFixed(4)}°N, ${area.coordinates[1].toFixed(4)}°E` : 'N/A'}
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">Affected Citizens</span>
                <span className="org-detail-value" style={{ color: '#DC2626', fontWeight: 800 }}>
                  ~{Number(area.affectedCitizens).toLocaleString()} Citizens
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">Shelter Facilities</span>
                <span className="org-detail-value">
                  ⛺ {area.shelterCount || 1} Evac Shelters ({area.shelterCapacity || 500} Cap.)
                </span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">District Authority Contact</span>
                <span className="org-detail-value">{area.primaryContact || 'DMC Sri Lanka'}</span>
              </div>
              <div className="org-detail-item">
                <span className="org-detail-label">Last Assessment Date</span>
                <span className="org-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={12} color="#64748B" />
                  {formatDate(area.lastAssessmentDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Response Teams Management */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconUsers size={16} color="#1D4ED8" />
              <span>Assigned Field Teams ({area.assignedTeams?.length || 0})</span>
            </div>

            {/* Current Teams Chips */}
            <div className="org-chips-wrap">
              {area.assignedTeams && area.assignedTeams.length > 0 ? (
                area.assignedTeams.map((team, idx) => (
                  <span key={idx} className="org-team-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥 {team}</span>
                    <button
                      onClick={() => handleRemoveTeam(team)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#DC2626',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        padding: '0 2px'
                      }}
                      title="Unassign team"
                      type="button"
                    >
                      &times;
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                  No response teams currently assigned to this sector.
                </span>
              )}
            </div>

            {/* Quick Add Team Dropdown */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <select
                className="org-team-select"
                value={selectedTeamToAdd}
                onChange={(e) => setSelectedTeamToAdd(e.target.value)}
              >
                <option value="">Select available response team to assign...</option>
                {availableResponseTeams
                  .filter(t => t !== 'Unassigned' && !area.assignedTeams?.includes(t))
                  .map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
              </select>
              <button
                className="org-btn-secondary"
                onClick={handleAddTeam}
                disabled={!selectedTeamToAdd || isUpdating}
                style={{ height: '38px', padding: '0 14px', fontSize: '12px' }}
                type="button"
              >
                Assign Team
              </button>
            </div>
          </div>

          {/* Linked Crisis Event */}
          {area.linkedIncident && (
            <div className="org-drawer-section">
              <div className="org-drawer-section-title">
                <IconAlertTriangle size={15} color="#10756F" />
                <span>Linked Crisis Incident</span>
              </div>
              <div style={{
                backgroundColor: '#ECFBF8',
                border: '1px solid #BCEFE6',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F172A'
              }}>
                🚨 {area.linkedIncident}
              </div>
            </div>
          )}

          {/* Field Assessment Notes */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <span>Field Assessment & Operations Summary</span>
            </div>
            <div className="org-drawer-description-box">
              {area.notes || 'No specific field notes recorded.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AreaDetailsModal = ({
  area,
  isOpen = false,
  onClose = () => {},
  onUpdateStatusAndRisk = () => {},
  onUpdateTeams = () => {},
  onEdit = () => {}
}) => {
  if (!isOpen || !area) return null;

  return (
    <AreaDetailsModalContent
      key={area.areaId}
      area={area}
      onClose={onClose}
      onUpdateStatusAndRisk={onUpdateStatusAndRisk}
      onUpdateTeams={onUpdateTeams}
      onEdit={onEdit}
    />
  );
};
