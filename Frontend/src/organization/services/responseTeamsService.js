/**
 * Response Teams Service for ReliefLink Organization Portal
 *
 * Live Mode (USE_MOCK_API === false):
 *  - GET    /api/organizations/{orgId}/teams
 *  - GET    /api/organizations/{orgId}/teams/{teamId}
 *  - POST   /api/organizations/{orgId}/teams
 *  - PUT    /api/organizations/{orgId}/teams/{teamId}
 *  - PATCH  /api/organizations/{orgId}/teams/{teamId}/status
 *  - POST   /api/organizations/{orgId}/teams/{teamId}/members
 *  - DELETE /api/organizations/{orgId}/teams/{teamId}/members/{membershipId}
 *  - POST   /api/organizations/{orgId}/teams/{teamId}/deployments
 *  - PATCH  /api/organizations/{orgId}/teams/{teamId}/deployments/{deploymentId}/complete
 */

import { initialResponseTeams } from '../data/mockResponseTeams.js';
import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient.js';

function cloneMockTeams() {
  return initialResponseTeams.map((team) => ({
    ...team,
    specializedEquipment: Array.isArray(team.specializedEquipment)
      ? [...team.specializedEquipment]
      : [],
  }));
}

let inMemoryTeams = cloneMockTeams();

export function mapResponseTeamFromApi(dto) {
  const equipmentList = Array.isArray(dto?.specializedEquipment)
    ? dto.specializedEquipment
    : typeof dto?.specializedEquipment === 'string' && dto.specializedEquipment.trim()
      ? dto.specializedEquipment.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    teamId: dto?.responseTeamId ?? dto?.teamId,
    responseTeamId: dto?.responseTeamId ?? dto?.teamId,
    organizationId: dto?.organizationId ?? null,
    teamName: dto?.teamName ?? '',
    teamType: dto?.teamType ?? 'General',
    leaderMembershipId: dto?.leaderMembershipId ?? null,
    teamLeader: dto?.leaderName || 'Unassigned',
    leaderPhone: dto?.contactPhone ?? '',
    leaderEmail: dto?.leaderEmail || dto?.contactEmail || '',
    contactPhone: dto?.contactPhone ?? '',
    contactEmail: dto?.contactEmail ?? '',
    areaId: dto?.areaId ?? null,
    assignedArea: dto?.areaName || dto?.baseStation || 'Organization-Wide',
    district: dto?.areaName || '',
    status: dto?.status ?? 'Available',
    membersCount: Number(dto?.membersCount ?? (Array.isArray(dto?.members) ? dto.members.length : 0)),
    members: Array.isArray(dto?.members) ? dto.members : [],
    deployments: Array.isArray(dto?.deployments) ? dto.deployments : [],
    activeDeployment: dto?.activeDeployment ?? null,
    deployedIncident: dto?.activeDeployment?.missionTitle ?? null,
    specializedEquipment: equipmentList,
    baseStation: dto?.baseStation ?? '',
    lastDeploymentDate: dto?.activeDeployment?.deployedAt ?? dto?.updatedAt ?? dto?.createdAt ?? null,
    createdAt: dto?.createdAt ?? null,
  };
}

function requireOrgId(organizationId) {
  const id = Number(organizationId);
  if (!id || Number.isNaN(id)) {
    throw {
      status: 400,
      title: 'No Active Organization',
      detail: 'Select an active organization before managing response teams.',
      message: 'Select an active organization before managing response teams.',
    };
  }
  return id;
}

export const responseTeamsService = {
  async getAllTeams({ organizationId, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Response Teams Registry Service.');
    }
    if (simulateEmpty) {
      return [];
    }
    if (USE_MOCK_API) {
      return inMemoryTeams.map((t) => ({
        ...t,
        specializedEquipment: Array.isArray(t.specializedEquipment) ? [...t.specializedEquipment] : [],
      }));
    }

    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.get(`/organizations/${orgId}/teams`);
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapResponseTeamFromApi);
  },

  async getTeamById(organizationId, teamId) {
    if (USE_MOCK_API) {
      const found = inMemoryTeams.find((t) => t.teamId === teamId);
      if (!found) throw new Error(`Response Team ${teamId} not found.`);
      return { ...found };
    }

    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.get(`/organizations/${orgId}/teams/${Number(teamId)}`);
    return mapResponseTeamFromApi(response.data);
  },

  async createTeam(organizationId, teamData) {
    if (USE_MOCK_API) {
      const nextNum = 110 + inMemoryTeams.length;
      const newTeam = {
        teamId: `TM-${nextNum}`,
        teamName: teamData.teamName.trim(),
        teamType: teamData.teamType,
        teamLeader: teamData.teamLeader?.trim() || 'Unassigned',
        leaderPhone: teamData.leaderPhone?.trim() || '',
        leaderEmail: teamData.leaderEmail?.trim() || '',
        membersCount: Number(teamData.membersCount) || 1,
        assignedArea: teamData.assignedArea?.trim() || '',
        district: teamData.district || '',
        status: teamData.status || 'Available',
        deployedIncident: null,
        specializedEquipment: Array.isArray(teamData.specializedEquipment) ? teamData.specializedEquipment : [],
        baseStation: teamData.baseStation?.trim() || '',
        lastDeploymentDate: new Date().toISOString(),
      };
      inMemoryTeams = [newTeam, ...inMemoryTeams];
      return { ...newTeam };
    }

    const orgId = requireOrgId(organizationId);
    const payload = {
      teamName: (teamData.teamName ?? '').trim(),
      teamType: (teamData.teamType ?? 'General').trim(),
      leaderMembershipId: teamData.leaderMembershipId ? Number(teamData.leaderMembershipId) : null,
      areaId: teamData.areaId ? Number(teamData.areaId) : null,
      baseStation: teamData.baseStation?.trim() || null,
      contactPhone: teamData.contactPhone?.trim() || teamData.leaderPhone?.trim() || null,
      contactEmail: teamData.contactEmail?.trim() || teamData.leaderEmail?.trim() || null,
      specializedEquipment: Array.isArray(teamData.specializedEquipment)
        ? teamData.specializedEquipment.join(', ')
        : teamData.specializedEquipment?.trim() || null,
      status: teamData.status || 'Available',
    };
    const response = await axiosClient.post(`/organizations/${orgId}/teams`, payload);
    return mapResponseTeamFromApi(response.data);
  },

  async updateTeam(organizationId, teamId, updateData) {
    if (USE_MOCK_API) {
      const idx = inMemoryTeams.findIndex((t) => t.teamId === teamId);
      if (idx === -1) throw new Error(`Response Team ${teamId} not found.`);
      inMemoryTeams[idx] = { ...inMemoryTeams[idx], ...updateData };
      return { ...inMemoryTeams[idx] };
    }

    const orgId = requireOrgId(organizationId);
    const payload = {
      teamName: (updateData.teamName ?? '').trim(),
      teamType: (updateData.teamType ?? 'General').trim(),
      leaderMembershipId: updateData.leaderMembershipId ? Number(updateData.leaderMembershipId) : null,
      areaId: updateData.areaId ? Number(updateData.areaId) : null,
      baseStation: updateData.baseStation?.trim() || null,
      contactPhone: updateData.contactPhone?.trim() || updateData.leaderPhone?.trim() || null,
      contactEmail: updateData.contactEmail?.trim() || updateData.leaderEmail?.trim() || null,
      specializedEquipment: Array.isArray(updateData.specializedEquipment)
        ? updateData.specializedEquipment.join(', ')
        : updateData.specializedEquipment?.trim() || null,
      status: updateData.status || 'Available',
    };
    const response = await axiosClient.put(`/organizations/${orgId}/teams/${Number(teamId)}`, payload);
    return mapResponseTeamFromApi(response.data);
  },

  async updateStatus(organizationId, teamId, newStatus) {
    if (USE_MOCK_API) {
      const idx = inMemoryTeams.findIndex((t) => t.teamId === teamId);
      if (idx === -1) throw new Error(`Response Team ${teamId} not found.`);
      inMemoryTeams[idx] = { ...inMemoryTeams[idx], status: newStatus };
      return { ...inMemoryTeams[idx] };
    }

    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.patch(`/organizations/${orgId}/teams/${Number(teamId)}/status`, {
      status: newStatus,
    });
    return mapResponseTeamFromApi(response.data);
  },

  async addTeamMember(organizationId, teamId, membershipId, roleInTeam = 'Member') {
    if (USE_MOCK_API) return { success: true };
    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.post(`/organizations/${orgId}/teams/${Number(teamId)}/members`, {
      membershipId: Number(membershipId),
      roleInTeam,
    });
    return mapResponseTeamFromApi(response.data);
  },

  async removeTeamMember(organizationId, teamId, membershipId) {
    if (USE_MOCK_API) return { success: true };
    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.delete(
      `/organizations/${orgId}/teams/${Number(teamId)}/members/${Number(membershipId)}`
    );
    return mapResponseTeamFromApi(response.data);
  },

  async deployTeam(organizationId, teamId, deploymentInput) {
    if (USE_MOCK_API) {
      const idx = inMemoryTeams.findIndex((t) => t.teamId === teamId);
      if (idx === -1) throw new Error(`Response Team ${teamId} not found.`);
      inMemoryTeams[idx] = {
        ...inMemoryTeams[idx],
        status: 'Deployed',
        deployedIncident: deploymentInput?.missionTitle || 'Field Mission',
      };
      return { ...inMemoryTeams[idx] };
    }

    const orgId = requireOrgId(organizationId);
    const payload = typeof deploymentInput === 'string'
      ? { missionTitle: deploymentInput }
      : {
          missionTitle: (deploymentInput?.missionTitle ?? '').trim(),
          crisisId: deploymentInput?.crisisId ? Number(deploymentInput.crisisId) : null,
          citizenRequestId: deploymentInput?.citizenRequestId ? Number(deploymentInput.citizenRequestId) : null,
          areaId: deploymentInput?.areaId ? Number(deploymentInput.areaId) : null,
          notes: deploymentInput?.notes?.trim() || null,
        };
    const response = await axiosClient.post(`/organizations/${orgId}/teams/${Number(teamId)}/deployments`, payload);
    return response.data;
  },

  async completeDeployment(organizationId, teamId, deploymentId, status = 'Completed') {
    if (USE_MOCK_API) return { success: true };
    const orgId = requireOrgId(organizationId);
    const response = await axiosClient.patch(
      `/organizations/${orgId}/teams/${Number(teamId)}/deployments/${Number(deploymentId)}/complete`,
      { status }
    );
    return response.data;
  },

  resetToDefaults() {
    inMemoryTeams = cloneMockTeams();
    return inMemoryTeams.map((t) => ({ ...t }));
  },
};
