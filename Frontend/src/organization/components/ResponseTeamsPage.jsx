
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
import { assignedAreasService } from '../services/assignedAreasService';
import { organizationOperationsService } from '../services/organizationOperationsService';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { useAuth } from '../../app/providers/AuthProvider';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { IconUsers, IconPlus } from './Icons';

export const ResponseTeamsPage = () => {
  const { t } = useTranslation();
  const { activeOrganizationId, hasOrgPermission } = useOrganization();
  const { isAdmin } = useAuth();

  const canManageTeams =
    USE_MOCK_API ||
    isAdmin ||
    hasOrgPermission('Organizations.Manage') ||
    hasOrgPermission('Volunteers.Manage') ||
    hasOrgPermission('Resources.Manage');

  const [teams, setTeams] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
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
    if (!USE_MOCK_API && !activeOrganizationId) {
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

      const [teamsData, membersRes, areasRes] = await Promise.all([
        responseTeamsService.getAllTeams({
          organizationId: activeOrganizationId,
          simulateError: stateMode === 'error',
          simulateEmpty: stateMode === 'empty',
        }),
        USE_MOCK_API
          ? Promise.resolve({ items: [] })
          : organizationOperationsService.getOrganizationMembers(activeOrganizationId).catch(() => ({ items: [] })),
        USE_MOCK_API
          ? Promise.resolve([])
          : assignedAreasService.getAvailableAreas().catch(() => []),
      ]);

      setTeams(teamsData);
      setOrgMembers((membersRes?.items || []).filter((m) => m.membershipStatus === 'Approved'));
      setAvailableAreas(Array.isArray(areasRes) ? areasRes : []);
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to fetch response teams.');
      setTeams([]);
    } finally {
      if (stateMode !== 'loading') {
        setIsLoading(false);
      }
    }
  }, [simState, activeOrganizationId]);

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
      const updated = await responseTeamsService.updateTeam(activeOrganizationId, editId, formData);

      setTeams(prev =>
        prev.map(t => (t.teamId === editId ? updated : t))
      );

      if (selectedTeamForDetails && selectedTeamForDetails.teamId === editId) {
        setSelectedTeamForDetails(updated);
      }
    } else {
      const created = await responseTeamsService.createTeam(activeOrganizationId, formData);
      setTeams(prev => [created, ...prev]);
    }
  };

  // Quick Deploy Team
  const handleDeployTeam = async (teamId, deploymentInput = 'Emergency Crisis Deployment') => {
    await responseTeamsService.deployTeam(activeOrganizationId, teamId, deploymentInput);
    const refreshed = await responseTeamsService.getTeamById(activeOrganizationId, teamId);

    setTeams(prev =>
      prev.map(t => (t.teamId === teamId ? refreshed : t))
    );

    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(refreshed);
    }
  };

  // Complete Deployment
  const handleCompleteDeployment = async (teamId, deploymentId, status = 'Completed') => {
    await responseTeamsService.completeDeployment(activeOrganizationId, teamId, deploymentId, status);
    const refreshed = await responseTeamsService.getTeamById(activeOrganizationId, teamId);

    setTeams(prev =>
      prev.map(t => (t.teamId === teamId ? refreshed : t))
    );

    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(refreshed);
    }
  };

  // Add / Remove Team Member
  const handleAddMember = async (teamId, membershipId, roleInTeam = 'Member') => {
    const updated = await responseTeamsService.addTeamMember(activeOrganizationId, teamId, membershipId, roleInTeam);
    setTeams(prev => prev.map(t => (t.teamId === teamId ? updated : t)));
    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(updated);
    }
  };

  const handleRemoveMember = async (teamId, membershipId) => {
    const updated = await responseTeamsService.removeTeamMember(activeOrganizationId, teamId, membershipId);
    setTeams(prev => prev.map(t => (t.teamId === teamId ? updated : t)));
    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(updated);
    }
  };

  // Update Status
  const handleUpdateStatus = async (teamId, newStatus) => {
    const updated = await responseTeamsService.updateStatus(activeOrganizationId, teamId, newStatus);

    setTeams(prev =>
      prev.map(t => (t.teamId === teamId ? updated : t))
    );

    if (selectedTeamForDetails && selectedTeamForDetails.teamId === teamId) {
      setSelectedTeamForDetails(updated);
    }
  };

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

        {canManageTeams && (
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
        )}
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
        onEditTeam={canManageTeams ? handleOpenEditModal : undefined}
        onQuickDeploy={canManageTeams ? (team) => handleDeployTeam(team.teamId, `${team.assignedArea || team.teamName} Rapid Response`) : undefined}
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
        onCompleteDeployment={handleCompleteDeployment}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        orgMembers={orgMembers}
        canManageTeams={canManageTeams}
        onEdit={(team) => handleOpenEditModal(team)}
      />

      {/* Create / Edit Team Modal */}
      <CreateEditTeamModal
        isOpen={isCreateEditOpen}
        teamToEdit={teamToEdit}
        orgMembers={orgMembers}
        availableAreas={availableAreas}
        onClose={handleCloseCreateEditModal}
        onSave={handleSaveTeam}
      />

    </div>
  );
};

export default ResponseTeamsPage;
