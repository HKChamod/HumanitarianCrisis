
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/CrisisIncidents.css';
import '../styles/ResponseTeams.css';
import { ResponseTeamsSummaryCards } from './ResponseTeamsSummaryCards';
import { ResponseTeamsFilters } from './ResponseTeamsFilters';
import { ResponseTeamsTable } from './ResponseTeamsTable';
import { TeamDetailsModal } from './TeamDetailsModal';
import { CreateEditTeamModal } from './CreateEditTeamModal';
import { responseTeamsService } from '../services/responseTeamsService';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { IconUsers, IconPlus, IconAlertTriangle } from './Icons';

export const ResponseTeamsPage = () => {
  const { t } = useTranslation();

  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  // Modal / Drawer States
  const [selectedTeamForDetails, setSelectedTeamForDetails] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [teamToEdit, setTeamToEdit] = useState(null);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);

  // QA Simulation State
  const [simState, setSimState] = useState('normal');

  // Load Teams Data
  const loadData = useCallback(async (stateMode = simState) => {
    if (!USE_MOCK_API) {
      setTeams([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (stateMode === 'loading') {
        return;
      }

      const data = await responseTeamsService.getAllTeams({
        simulateError: stateMode === 'error',
        simulateEmpty: stateMode === 'empty'
      });
      setTeams(data);
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to fetch response teams.');
      setTeams([]);
    } finally {
      if (stateMode !== 'loading') {
        setIsLoading(false);
      }
    }
  }, [simState]);

  useEffect(() => {
    loadData(simState);
  }, [loadData, simState]);

  // Derived Districts
  const availableDistricts = useMemo(() => {
    const set = new Set();
    teams.forEach(t => {
      if (t.district) set.add(t.district);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.teamId?.toLowerCase().includes(q);
        const matchesName = item.teamName?.toLowerCase().includes(q);
        const matchesLeader = item.teamLeader?.toLowerCase().includes(q);
        const matchesArea = item.assignedArea?.toLowerCase().includes(q);
        const matchesDist = item.district?.toLowerCase().includes(q);
        const matchesType = item.teamType?.toLowerCase().includes(q);

        if (!matchesId && !matchesName && !matchesLeader && !matchesArea && !matchesDist && !matchesType) {
          return false;
        }
      }

      if (typeFilter !== 'all') {
        if (item.teamType?.toLowerCase() !== typeFilter.toLowerCase()) {
          return false;
        }
      }

      if (statusFilter !== 'all') {
        if (item.status?.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (districtFilter !== 'all') {
        if (item.district?.toLowerCase() !== districtFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [teams, searchQuery, typeFilter, statusFilter, districtFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    districtFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setDistrictFilter('all');
  };

  // View Details
  const handleOpenDetails = (team) => {
    setSelectedTeamForDetails(team);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedTeamForDetails(null);
  };

  // Create Team
  const handleOpenCreateModal = () => {
    setTeamToEdit(null);
    setIsCreateEditOpen(true);
  };

  // Edit Team
  const handleOpenEditModal = (team) => {
    setTeamToEdit(team);
    setIsCreateEditOpen(true);
  };

  const handleCloseCreateEditModal = () => {
    setIsCreateEditOpen(false);
    setTeamToEdit(null);
  };

  // Save Create or Edit Team
  const handleSaveTeam = async (formData, editId) => {
    if (editId) {
      const updated = await responseTeamsService.updateTeam(editId, formData);

      setTeams(prev =>
        prev.map(t => (t.teamId === editId ? updated : t))
      );

      if (selectedTeamForDetails && selectedTeamForDetails.teamId === editId) {
        setSelectedTeamForDetails(updated);
      }
    } else {
      const created = await responseTeamsService.createTeam(formData);
      setTeams(prev => [created, ...prev]);
    }
  };

  // Quick Deploy Team
  const handleDeployTeam = async (teamId, target = 'Emergency Crisis Deployment') => {
    const updated = await responseTeamsService.deployTeam(teamId, target);

    setTeams(prev =>
      prev.map(t => (t.teamId === teamId ? updated : t))
    );

    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(updated);
    }
  };

  // Update Status
  const handleUpdateStatus = async (teamId, newStatus) => {
    const updated = await responseTeamsService.updateStatus(teamId, newStatus);

    setTeams(prev =>
      prev.map(t => (t.teamId === teamId ? updated : t))
    );

    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(updated);
    }
  };

  if (!USE_MOCK_API) {
    return (
      <div className="org-teams-page">
        <div className="org-page-header">
          <div className="org-page-title-wrap">
            <h1 className="org-page-title">
              <IconUsers size={24} color="#10756F" />
              <span>
                {t('responseTeamPage.title', {
                  defaultValue: 'Response Teams Management'
                })}
              </span>
            </h1>
            <p className="org-page-subtitle">
              {t('responseTeamPage.description', {
                defaultValue: 'Manage emergency response teams, monitor availability, and coordinate field deployments.'
              })}
            </p>
          </div>
        </div>

        <div className="org-incidents-table-card">
          <div className="org-state-box" style={{ padding: '48px 24px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FFFBEB',
                color: '#B45309',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
              }}
            >
              <IconAlertTriangle size={26} color="#B45309" />
            </div>
            <h3 className="org-state-title">Response Teams API Not Yet Available</h3>
            <p className="org-state-desc" style={{ maxWidth: '520px' }}>
              Response Teams management (creating teams, updating team status, and recording field deployments) is not currently supported by the HCMS backend API. No fabricated or local-only team records are displayed in live mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="org-teams-page">

      {/* Page Header */}
      <div className="org-page-header">
        <div className="org-page-title-wrap">
          <h1 className="org-page-title">
            <IconUsers size={24} color="#10756F" />
            <span>
              {t('responseTeamPage.title', {
                defaultValue: 'Response Teams Management'
              })}
            </span>
          </h1>

          <p className="org-page-subtitle">
            {t('responseTeamPage.description', {
              defaultValue: 'Manage emergency response teams, monitor availability, and coordinate field deployments.'
            })}
          </p>
        </div>

        <div className="org-header-action-group">
          <button
            className="org-btn-primary"
            onClick={handleOpenCreateModal}
            type="button"
          >
            <IconPlus size={16} />
            <span>
              {t('responseTeamPage.createTeam', {
                defaultValue: 'Create Team'
              })}
            </span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <ResponseTeamsSummaryCards teams={teams} />

      {/* Search and Filters */}
      <ResponseTeamsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        districtFilter={districtFilter}
        onDistrictChange={setDistrictFilter}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        availableDistricts={availableDistricts}
        activeSimState={simState}
        onSimStateChange={(state) => setSimState(state)}
      />

      {/* Response Teams Table */}
      <ResponseTeamsTable
        teams={filteredTeams}
        isLoading={isLoading}
        error={error}
        onViewDetails={handleOpenDetails}
        onEditTeam={handleOpenEditModal}
        onQuickDeploy={(team) => handleDeployTeam(team.teamId, `${team.assignedArea} Rapid Response`)}
        onRetry={() => loadData(simState)}
        onResetFilters={handleResetFilters}
      />

      {/* Team Details Modal */}
      <TeamDetailsModal
        team={selectedTeamForDetails}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onUpdateStatus={handleUpdateStatus}
        onDeploy={handleDeployTeam}
        onEdit={(team) => handleOpenEditModal(team)}
      />

      {/* Create / Edit Team Modal */}
      <CreateEditTeamModal
        isOpen={isCreateEditOpen}
        teamToEdit={teamToEdit}
        onClose={handleCloseCreateEditModal}
        onSave={handleSaveTeam}
      />

    </div>
  );
};

export default ResponseTeamsPage;
