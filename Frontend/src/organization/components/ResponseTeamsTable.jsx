import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconMapPin,
  IconChevronRight,
  IconAlertTriangle,
  IconPhone,
  IconUsers,
  IconEdit,
  IconSend,
  IconLifeBuoy,
  IconHome,
  IconTruck
} from './Icons';

export const ResponseTeamsTable = ({
  teams = [],
  isLoading = false,
  error = null,
  onViewDetails = () => {},
  onEditTeam = () => {},
  onQuickDeploy = () => {},
  onRetry = () => {},
  onResetFilters = () => {}
}) => {
  const { t } = useTranslation();

  const getTypeBadge = (type) => {
    switch (type) {
      case 'Search and Rescue':
        return (
          <span className="org-team-type-badge rescue">
            <IconLifeBuoy size={12} color="#047857" />
            <span>{t('responseTeamTable.rescue')}</span>
          </span>
        );
      case 'Medical Response':
        return (
          <span className="org-team-type-badge medical">
            <span>🩺</span>
            <span>{t('responseTeamTable.medical')}</span>
          </span>
        );
      case 'Logistics':
        return (
          <span className="org-team-type-badge logistics">
            <IconTruck size={12} color="#0369A1" />
            <span>{t('responseTeamTable.logistics')}</span>
          </span>
        );
      case 'Volunteer Support':
        return (
          <span className="org-team-type-badge volunteer">
            <span>🤝</span>
            <span>{t('responseTeamTable.volunteer')}</span>
          </span>
        );
      case 'Relief Distribution':
        return (
          <span className="org-team-type-badge relief">
            <IconHome size={12} color="#6B21A8" />
            <span>{t('responseTeamTable.relief')}</span>
          </span>
        );
      default:
        return (
          <span className="org-team-type-badge">
            <IconUsers size={12} />
            <span>{type}</span>
          </span>
        );
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'Available':
        return (
          <span className="org-team-status-pill available">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
            {t('responseTeamTable.available')}
          </span>
        );

      case 'Deployed':
        return (
          <span className="org-team-status-pill deployed">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1D4ED8' }}></span>
            {t('responseTeamTable.deployed')}
          </span>
        );

      case 'On Standby':
        return (
          <span className="org-team-status-pill standby">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }}></span>
            {t('responseTeamTable.standby')}
          </span>
        );

      case 'Unavailable':
        return (
          <span className="org-team-status-pill unavailable">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748B' }}></span>
            {t('responseTeamTable.unavailable')}
          </span>
        );

      default:
        return (
          <span className="org-team-status-pill unavailable">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="org-incidents-table-card">

      <div className="org-table-header-bar">
        <span className="org-table-count-label">
          {t('responseTeamTable.directory', {
            count: teams.length
          })}
        </span>
      </div>

      {/* Loading Skeleton */}
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
            {t('responseTeamTable.loadError')}
          </h3>

          <p className="org-state-desc">
            {t('responseTeamTable.errorDescription')}
          </p>

          <button
            className="org-btn-primary"
            onClick={onRetry}
            style={{ marginTop: '8px' }}
            type="button"
          >
            {t('responseTeamTable.retry')}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && teams.length === 0 && (
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
            <IconUsers size={24} color="#10756F" />
          </div>

          <h3 className="org-state-title">
            {t('responseTeamTable.empty')}
          </h3>

          <p className="org-state-desc">
            {t('responseTeamTable.emptyDescription')}
          </p>

          <button
            className="org-btn-secondary"
            onClick={onResetFilters}
            style={{ marginTop: '8px' }}
            type="button"
          >
            {t('responseTeamTable.clear')}
          </button>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && teams.length > 0 && (
        <div className="org-table-responsive">
          <table className="org-incidents-table">

            <thead>
              <tr>
                <th>{t('responseTeamTable.teamId')}</th>
                <th>{t('responseTeamTable.teamName')}</th>
                <th>{t('responseTeamTable.teamType')}</th>
                <th>{t('responseTeamTable.teamLeader')}</th>
                <th>{t('responseTeamTable.members')}</th>
                <th>{t('responseTeamTable.assignedArea')}</th>
                <th>{t('responseTeamTable.availability')}</th>
                <th style={{ textAlign: 'right' }}>
                  {t('responseTeamTable.actions')}
                </th>
              </tr>
            </thead>

            <tbody>
              {teams.map((team) => (
                <tr key={team.teamId}>

                  {/* ID */}
                  <td>
                    <span
                      className="org-incident-code"
                      style={{ fontSize: '12px' }}
                    >
                      #{team.teamId}
                    </span>
                  </td>

                  {/* Name & Base Station */}
                  <td>
                    <div style={{
                      fontWeight: 700,
                      color: '#0F172A',
                      fontSize: '13px'
                    }}>
                      {team.teamName}
                    </div>

                    {team.baseStation && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748B',
                          marginTop: '2px',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={team.baseStation}
                      >
                        🏢 {team.baseStation}
                      </div>
                    )}
                  </td>

                  {/* Type */}
                  <td>
                    {getTypeBadge(team.teamType)}
                  </td>

                  {/* Leader */}
                  <td>
                    <div style={{
                      fontWeight: 600,
                      color: '#0F172A',
                      fontSize: '13px'
                    }}>
                      {team.teamLeader}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: '#64748B',
                      marginTop: '2px'
                    }}>
                      <IconPhone size={11} color="#10756F" />
                      <span>{team.leaderPhone}</span>
                    </div>
                  </td>

                  {/* Members */}
                  <td>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: 700,
                      color: '#10756F'
                    }}>
                      <IconUsers size={13} color="#10756F" />

                      <span>
                        {t('responseTeamTable.responders', {
                          count: Number(team.membersCount) || 0
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Assigned Area & District */}
                  <td>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                      color: '#334155'
                    }}>
                      <IconMapPin size={13} color="#64748B" />

                      <span>
                        {team.district
                          ? t(
                              'districts.' +
                              team.district
                                .toLowerCase()
                                .replace(/[^a-z]/g, ''),
                              { defaultValue: team.district }
                            )
                          : ''}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '11px',
                      color: '#64748B',
                      marginTop: '2px'
                    }}>
                      {team.assignedArea}
                    </div>
                  </td>

                  {/* Availability Status */}
                  <td>
                    {getStatusPill(team.status)}

                    {team.status === 'Deployed' &&
                      team.deployedIncident && (
                        <div
                          style={{
                            fontSize: '10px',
                            color: '#1D4ED8',
                            marginTop: '3px',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={team.deployedIncident}
                        >
                          🎯 {team.deployedIncident}
                        </div>
                      )}
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="org-team-table-actions">

                      {/* View Details */}
                      <button
                        className="org-btn-table-action"
                        onClick={() => onViewDetails(team)}
                        type="button"
                        title={t('responseTeamTable.detailsTitle')}
                      >
                        <span>
                          {t('responseTeamTable.details')}
                        </span>

                        <IconChevronRight size={13} />
                      </button>

                      {/* Quick Deploy */}
                      {(team.status === 'Available' ||
                        team.status === 'On Standby') && (
                        <button
                          className="org-btn-table-action deploy"
                          onClick={() => onQuickDeploy(team)}
                          type="button"
                          title={t('responseTeamTable.deployTitle')}
                        >
                          <IconSend size={12} />

                          <span>
                            {t('responseTeamTable.deploy')}
                          </span>
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        className="org-btn-table-action edit"
                        onClick={() => onEditTeam(team)}
                        type="button"
                        title={t('responseTeamTable.editTitle')}
                      >
                        <IconEdit size={12} />

                        <span>
                          {t('responseTeamTable.edit')}
                        </span>
                      </button>

                    </div>
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