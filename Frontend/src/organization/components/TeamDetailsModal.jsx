import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconMapPin,
  IconClock,
  IconUsers,
  IconPhone,
  IconEdit,
  IconSend,
  IconCheckCircle,
  IconShieldCheck,
  IconPackage
} from './Icons';
import { TEAM_STATUSES } from '../data/mockResponseTeams';

export const TeamDetailsModal = ({
  team,
  isOpen = false,
  onClose = () => {},
  onUpdateStatus = () => {},
  onDeploy = () => {},
  onCompleteDeployment = () => {},
  onAddMember = () => {},
  onRemoveMember = () => {},
  orgMembers = [],
  canManageTeams = true,
  onEdit = () => {}
}) => {
  const { t } = useTranslation();

  const [selectedStatus, setSelectedStatus] = useState('');
  const [deploymentTarget, setDeploymentTarget] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRoleInTeam, setSelectedRoleInTeam] = useState('Member');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen && team) {
      setSelectedStatus(team.status);
      setDeploymentTarget(team.deployedIncident || '');
      setFeedback(null);
    }
  }, [isOpen, team?.teamId]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!isOpen || !team) return null;

  const statusKeys = {
    'Available': 'available',
    'Deployed': 'deployed',
    'On Standby': 'standby',
    'Unavailable': 'unavailable'
  };

  const typeKeys = {
    'Search & Rescue': 'searchRescue',
    'Medical Response': 'medicalResponse',
    'Logistics & Fleet': 'logistics',
    'Volunteer Support': 'volunteerSupport',
    'Relief Distribution': 'reliefDistribution'
  };

  const translateStatus = (status) =>
    statusKeys[status]
      ? t(`teamDetails.${statusKeys[status]}`)
      : status;

  const translateType = (type) =>
    typeKeys[type]
      ? t(`teamDetails.${typeKeys[type]}`)
      : type;

  const formatDate = (dateString) => {
    if (!dateString) {
      return t('teamDetails.notDeployed');
    }

    const d = new Date(dateString);

    if (Number.isNaN(d.getTime())) {
      return dateString;
    }

    return d.toLocaleDateString(
      t('teamDetails.dateLocale'),
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  };

  const handleStatusSave = async () => {
    if (selectedStatus === team.status) return;

    setIsUpdating(true);
    setFeedback(null);

    try {
      await onUpdateStatus(team.teamId, selectedStatus);
      setFeedback({ key: 'statusSuccess', error: false });
    } catch {
      setFeedback({ key: 'statusError', error: true });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeploySubmit = async () => {
    setIsUpdating(true);
    setFeedback(null);

    try {
      await onDeploy(
        team.teamId,
        deploymentTarget || `${team.assignedArea} Relief Mission`
      );

      setSelectedStatus('Deployed');
      setFeedback({ key: 'deploySuccess', error: false });
    } catch {
      setFeedback({ key: 'deployError', error: true });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="org-drawer-backdrop" onClick={onClose}>
      <div
        className="org-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="org-drawer-header">
          <div className="org-drawer-title-group">
            <div className="org-drawer-code-row">
              <span className="org-incident-code">
                #{team.teamId}
              </span>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#10756F',
                backgroundColor: '#ECFBF8',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {translateType(team.teamType)}
              </span>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor:
                  team.status === 'Available'
                    ? '#ECFDF5'
                    : team.status === 'Deployed'
                      ? '#EFF6FF'
                      : team.status === 'Unavailable'
                        ? '#F1F5F9'
                        : '#FFFBEB',
                color:
                  team.status === 'Available'
                    ? '#047857'
                    : team.status === 'Deployed'
                      ? '#1D4ED8'
                      : team.status === 'Unavailable'
                        ? '#64748B'
                        : '#B45309'
              }}>
                ● {translateStatus(team.status)}
              </span>
            </div>

            <h2 className="org-drawer-title">
              {team.teamName}
            </h2>
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

          {/* Operations & Deployment */}
          <div className="org-assignment-card">
            <div className="org-assignment-header">
              <span className="org-assignment-title">
                <IconSend size={15} color="#10756F" />
                <span>{t('teamDetails.readiness')}</span>
              </span>

              <button
                className="org-btn-secondary"
                onClick={() => {
                  onClose();
                  onEdit(team);
                }}
                style={{
                  height: '30px',
                  padding: '0 10px',
                  fontSize: '11px'
                }}
                type="button"
              >
                <IconEdit size={12} />
                <span>{t('teamDetails.editTeam')}</span>
              </button>
            </div>

            {/* Quick Status Update */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <label style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569'
              }}>
                {t('teamDetails.availability')}:
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="org-team-select"
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value)
                  }
                >
                  {['Available', 'Deployed', 'Unavailable', 'Inactive'].map((s) => (
                    <option key={s} value={s}>
                      {translateStatus(s)}
                    </option>
                  ))}
                </select>

                <button
                  className="org-btn-primary"
                  onClick={handleStatusSave}
                  disabled={
                    isUpdating || selectedStatus === team.status
                  }
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    fontSize: '12px',
                    opacity:
                      selectedStatus === team.status ? 0.6 : 1,
                    cursor:
                      selectedStatus === team.status
                        ? 'default'
                        : 'pointer'
                  }}
                  type="button"
                >
                  {t('teamDetails.saveStatus')}
                </button>
              </div>
            </div>

            {/* Deploy Mission */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '6px'
            }}>
              <label style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569'
              }}>
                {t('teamDetails.missionTarget')}:
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="org-team-select"
                  placeholder={t('teamDetails.missionPlaceholder')}
                  value={deploymentTarget}
                  onChange={(e) =>
                    setDeploymentTarget(e.target.value)
                  }
                />

                <button
                  className="org-btn-secondary"
                  onClick={handleDeploySubmit}
                  disabled={isUpdating}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    fontSize: '12px',
                    borderColor: '#1D4ED8',
                    color: '#1D4ED8',
                    backgroundColor: '#EFF6FF'
                  }}
                  type="button"
                >
                  <IconSend size={12} />
                  <span>{t('teamDetails.deploy')}</span>
                </button>
              </div>
            </div>

            {feedback && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: feedback.error ? '#DC2626' : '#047857',
                fontWeight: 600,
                marginTop: '4px'
              }}>
                {!feedback.error && (
                  <IconCheckCircle size={14} color="#047857" />
                )}
                <span>
                  {t(`teamDetails.${feedback.key}`)}
                </span>
              </div>
            )}
          </div>

          {/* Leadership & Personnel */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconUsers size={16} color="#10756F" />
              <span>{t('teamDetails.leadership')}</span>
            </div>

            <div className="org-detail-grid">

              <div className="org-detail-item">
                <span className="org-detail-label">
                  {t('teamDetails.teamLeader')}
                </span>
                <span className="org-detail-value">
                  {team.teamLeader}
                </span>
              </div>

              <div className="org-detail-item">
                <span className="org-detail-label">
                  {t('teamDetails.leaderPhone')}
                </span>
                <a
                  href={`tel:${team.leaderPhone}`}
                  className="org-detail-value"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#10756F',
                    textDecoration: 'none'
                  }}
                >
                  <IconPhone size={12} color="#10756F" />
                  {team.leaderPhone}
                </a>
              </div>

              <div className="org-detail-item">
                <span className="org-detail-label">
                  {t('teamDetails.officialEmail')}
                </span>
                <span className="org-detail-value">
                  {team.leaderEmail || t('teamDetails.notAvailable')}
                </span>
              </div>

              <div className="org-detail-item">
                <span className="org-detail-label">
                  {t('teamDetails.personnelStrength')}
                </span>
                <span
                  className="org-detail-value"
                  style={{
                    color: '#10756F',
                    fontWeight: 800
                  }}
                >
                  {team.membersCount}{' '}
                  {t('teamDetails.certifiedResponders')}
                </span>
              </div>

              <div className="org-detail-item">
                <span className="org-detail-label">
                  {t('teamDetails.baseStation')}
                </span>
                <span className="org-detail-value">
                  🏢 {team.baseStation || t('teamDetails.mainHub')}
                </span>
              </div>

              <div className="org-detail-item">
                <span className="org-detail-label">
                  {t('teamDetails.lastActive')}
                </span>

                <span
                  className="org-detail-value"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <IconClock size={12} color="#64748B" />
                  {formatDate(team.lastDeploymentDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Area */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconMapPin size={15} color="#10756F" />
              <span>{t('teamDetails.assignedArea')}</span>
            </div>

            <div
              className="org-drawer-description-box"
              style={{ fontWeight: 600, color: '#0F172A' }}
            >
              📍 {team.assignedArea} •{' '}
              {team.district
                ? t(`districts.${team.district.toLowerCase().replace(/\s+/g, '')}`)
                : ''}{' '}
              {t('common.district')}
            </div>
          </div>

          {/* Current Mission */}
          {team.status === 'Deployed' && team.deployedIncident && (
            <div className="org-drawer-section">
              <div className="org-drawer-section-title">
                <IconShieldCheck size={15} color="#1D4ED8" />
                <span>{t('teamDetails.currentMission')}</span>
              </div>

              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E40AF'
              }}>
                🎯 {team.deployedIncident}
              </div>
            </div>
          )}

          {/* Team Members Management */}
          <div className="org-drawer-section">
            <div className="org-drawer-section-title">
              <IconUsers size={15} color="#10756F" />
              <span>Team Members ({Array.isArray(team.members) ? team.members.length : team.membersCount || 0})</span>
            </div>

            {canManageTeams && orgMembers.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <select
                  className="org-team-select"
                  style={{ flex: '1 1 180px' }}
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="">Select approved member...</option>
                  {orgMembers
                    .filter((om) => !(team.members || []).some((tm) => tm.membershipId === om.membershipId))
                    .map((om) => (
                      <option key={om.membershipId} value={om.membershipId}>
                        {om.fullName} ({om.email})
                      </option>
                    ))}
                </select>
                <select
                  className="org-team-select"
                  style={{ width: '115px' }}
                  value={selectedRoleInTeam}
                  onChange={(e) => setSelectedRoleInTeam(e.target.value)}
                >
                  <option value="Member">Member</option>
                  <option value="Leader">Leader</option>
                  <option value="Medic">Medic</option>
                  <option value="Coordinator">Coordinator</option>
                </select>
                <button
                  type="button"
                  className="org-btn-primary"
                  disabled={!selectedMemberId || isUpdating}
                  style={{ height: '38px', padding: '0 14px', fontSize: '12px' }}
                  onClick={async () => {
                    if (!selectedMemberId) return;
                    setIsUpdating(true);
                    setFeedback(null);
                    try {
                      await onAddMember(team.teamId, Number(selectedMemberId), selectedRoleInTeam);
                      setSelectedMemberId('');
                      setFeedback({ type: 'success', text: 'Member added to team.' });
                    } catch (err) {
                      setFeedback({ type: 'error', text: err?.detail || err?.message || 'Unable to add member.' });
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}

            {Array.isArray(team.members) && team.members.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {team.members.map((m) => (
                  <div
                    key={m.responseTeamMemberId || m.membershipId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div>
                      <strong>{m.fullName}</strong>{' '}
                      <span style={{ color: '#64748B' }}>({m.roleInTeam})</span>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{m.email}</div>
                    </div>
                    {canManageTeams && (
                      <button
                        type="button"
                        className="org-btn-secondary"
                        style={{ height: '26px', padding: '0 8px', fontSize: '11px', color: '#DC2626' }}
                        onClick={async () => {
                          setIsUpdating(true);
                          try {
                            await onRemoveMember(team.teamId, m.membershipId);
                            setFeedback({ type: 'success', text: 'Member removed from team.' });
                          } catch (err) {
                            setFeedback({ type: 'error', text: err?.detail || err?.message || 'Unable to remove member.' });
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#64748B' }}>No members assigned to this team yet.</div>
            )}
          </div>

          {/* Deployment History */}
          {Array.isArray(team.deployments) && team.deployments.length > 0 && (
            <div className="org-drawer-section">
              <div className="org-drawer-section-title">
                <IconClock size={15} color="#10756F" />
                <span>Deployment History ({team.deployments.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {team.deployments.map((d) => (
                  <div
                    key={d.deploymentId}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      backgroundColor: d.status === 'Active' ? '#EFF6FF' : '#F8FAFC',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong>{d.missionTitle}</strong>
                      <span style={{ fontWeight: 700, color: d.status === 'Active' ? '#1D4ED8' : '#047857' }}>
                        {d.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      Deployed: {formatDate(d.deployedAt)}
                      {d.completedAt ? ` · Completed: ${formatDate(d.completedAt)}` : ''}
                    </div>
                    {canManageTeams && d.status === 'Active' && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          className="org-btn-primary"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                          onClick={async () => {
                            setIsUpdating(true);
                            try {
                              await onCompleteDeployment(team.teamId, d.deploymentId, 'Completed');
                              setFeedback({ type: 'success', text: 'Deployment marked completed.' });
                            } catch (err) {
                              setFeedback({ type: 'error', text: err?.detail || err?.message || 'Unable to complete deployment.' });
                            } finally {
                              setIsUpdating(false);
                            }
                          }}
                        >
                          Mark Completed
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specialized Equipment */}
          {team.specializedEquipment &&
            team.specializedEquipment.length > 0 && (
              <div className="org-drawer-section">
                <div className="org-drawer-section-title">
                  <IconPackage size={15} color="#10756F" />
                  <span>{t('teamDetails.equipment')}</span>
                </div>

                <div className="org-chips-wrap">
                  {team.specializedEquipment.map((eq, idx) => (
                    <span key={idx} className="org-relief-chip">
                      <span>🧰</span>
                      <span>{eq}</span>
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