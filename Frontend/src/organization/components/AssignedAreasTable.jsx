import React from 'react';
import {
  IconMapPin,
  IconChevronRight,
  IconAlertTriangle,
  IconUsers,
  IconEdit,
  IconPlus,
  IconHome
} from './Icons';

export const AssignedAreasTable = ({
  areas = [],
  isLoading = false,
  error = null,
  onViewDetails = () => {},
  onEditArea = () => {},
  onAssignTeam = () => {},
  onRetry = () => {},
  onResetFilters = () => {}
}) => {
  const getRiskBadge = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return <span className="org-severity-badge critical">● Critical</span>;
      case 'high':
        return <span className="org-severity-badge high">● High</span>;
      case 'medium':
        return <span className="org-severity-badge medium">● Medium</span>;
      case 'low':
        return <span className="org-severity-badge low">● Low</span>;
      default:
        return <span className="org-severity-badge low">{risk}</span>;
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'Active Response':
        return (
          <span className="org-area-status-pill active">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
            Active Response
          </span>
        );
      case 'Monitoring':
        return (
          <span className="org-area-status-pill monitoring">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }}></span>
            Monitoring
          </span>
        );
      case 'Awaiting Assignment':
        return (
          <span className="org-area-status-pill awaiting">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }}></span>
            Awaiting Assignment
          </span>
        );
      case 'Stabilized':
        return (
          <span className="org-area-status-pill stabilized">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
            Stabilized
          </span>
        );
      default:
        return (
          <span className="org-area-status-pill stabilized">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="org-incidents-table-card">
      <div className="org-table-header-bar">
        <span className="org-table-count-label">
          Assigned Response Areas Directory ({areas.length} Areas)
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
          <h3 className="org-state-title">Unable to Load Assigned Areas</h3>
          <p className="org-state-desc">{error}</p>
          <button
            className="org-btn-primary"
            onClick={onRetry}
            style={{ marginTop: '8px' }}
            type="button"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && areas.length === 0 && (
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
            <IconMapPin size={24} color="#10756F" />
          </div>
          <h3 className="org-state-title">No Assigned Areas Found</h3>
          <p className="org-state-desc">
            No areas match your current search query or filter selection. Try adjusting your search or clearing filters.
          </p>
          <button
            className="org-btn-secondary"
            onClick={onResetFilters}
            style={{ marginTop: '8px' }}
            type="button"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && areas.length > 0 && (
        <div className="org-table-responsive">
          <table className="org-incidents-table">
            <thead>
              <tr>
                <th>Area ID</th>
                <th>Area Name</th>
                <th>District</th>
                <th>Crisis Type</th>
                <th>Risk Level</th>
                <th>Affected Citizens</th>
                <th>Assigned Teams</th>
                <th>Response Status</th>
                <th style={{ textAlign: 'right', minWidth: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.areaId}>
                  {/* Area ID */}
                  <td>
                    <span className="org-incident-code" style={{ fontSize: '12px' }}>
                      #{area.areaId}
                    </span>
                  </td>

                  {/* Area Name */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                      {area.areaName}
                    </div>
                    {area.linkedIncident && (
                      <div style={{ fontSize: '11px', color: '#10756F', marginTop: '2px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={area.linkedIncident}>
                        🚨 {area.linkedIncident}
                      </div>
                    )}
                  </td>

                  {/* District */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                      <IconMapPin size={13} color="#64748B" />
                      <span>{area.district}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {area.province} Province
                    </div>
                  </td>

                  {/* Crisis Type */}
                  <td>
                    <span style={{
                      fontSize: '11px',
                      color: '#10756F',
                      fontWeight: 600,
                      backgroundColor: '#ECFBF8',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}>
                      {area.crisisType}
                    </span>
                  </td>

                  {/* Risk Level */}
                  <td>
                    {getRiskBadge(area.riskLevel)}
                  </td>

                  {/* Affected Citizens */}
                  <td>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>
                      {area.affectedCitizens ? Number(area.affectedCitizens).toLocaleString() : '0'} Citizens
                    </div>
                    {area.shelterCapacity > 0 && (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        ⛺ Shelter cap: {area.shelterCapacity}
                      </div>
                    )}
                  </td>

                  {/* Assigned Teams */}
                  <td>
                    {area.assignedTeams && area.assignedTeams.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {area.assignedTeams.map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#1D4ED8',
                              backgroundColor: '#EFF6FF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={t}
                          >
                            👥 {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>
                        ⚠️ No teams assigned
                      </span>
                    )}
                  </td>

                  {/* Response Status */}
                  <td>
                    {getStatusPill(area.responseStatus)}
                  </td>

                  {/* Actions (Ensured no clipping on desktop) */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div className="org-team-table-actions">
                      {/* View Details */}
                      <button
                        className="org-btn-table-action"
                        onClick={() => onViewDetails(area)}
                        type="button"
                        title="View detailed area assessment"
                      >
                        <span>Details</span>
                        <IconChevronRight size={13} />
                      </button>

                      {/* Quick Assign Team */}
                      <button
                        className="org-btn-table-action deploy"
                        onClick={() => onAssignTeam(area)}
                        type="button"
                        title="Assign response teams to this area"
                      >
                        <IconUsers size={12} />
                        <span>Assign</span>
                      </button>

                      {/* Edit */}
                      <button
                        className="org-btn-table-action edit"
                        onClick={() => onEditArea(area)}
                        type="button"
                        title="Edit area parameters"
                      >
                        <IconEdit size={12} />
                        <span>Edit</span>
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
