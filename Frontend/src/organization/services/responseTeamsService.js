/**
 * Response Teams Service for ReliefLink Organization Portal
 *
 * Backend Reality:
 * The current .NET 10 backend does not provide a Response Teams API.
 * In live mode (USE_MOCK_API === false), all operations reject with a normalized 501 error
 * without calling nonexistent endpoints or mutating mock data.
 * Mock behavior is strictly isolated to USE_MOCK_API === true.
 */

import { initialResponseTeams } from '../data/mockResponseTeams';
import { USE_MOCK_API } from '../../services/api/axiosClient';

function cloneMockTeams() {
  return initialResponseTeams.map((team) => ({
    ...team,
    specializedEquipment: Array.isArray(team.specializedEquipment)
      ? [...team.specializedEquipment]
      : [],
  }));
}

let inMemoryTeams = cloneMockTeams();

function createUnsupportedError(detail) {
  return {
    status: 501,
    title: 'Not Supported',
    detail,
    message: detail,
  };
}

export const responseTeamsService = {
  /**
   * Fetch all response teams (mock-only; unsupported in live mode)
   */
  async getAllTeams({ simulateLoading: _simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Response Teams management is not currently supported by the HCMS backend API.'
      );
    }

    if (simulateError) {
      throw new Error('Network error: Unable to connect to Response Teams Registry Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    return inMemoryTeams.map((t) => ({
      ...t,
      specializedEquipment: Array.isArray(t.specializedEquipment)
        ? [...t.specializedEquipment]
        : [],
    }));
  },

  /**
   * Get single team by ID (mock-only; unsupported in live mode)
   */
  async getTeamById(id) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Response Teams lookup is not currently supported by the HCMS backend API.'
      );
    }

    const found = inMemoryTeams.find((t) => t.teamId === id);
    if (!found) throw new Error(`Response Team ${id} not found.`);
    return {
      ...found,
      specializedEquipment: Array.isArray(found.specializedEquipment)
        ? [...found.specializedEquipment]
        : [],
    };
  },

  /**
   * Create a new team (mock-only; unsupported in live mode)
   */
  async createTeam(teamData) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Creating response teams is not currently supported by the HCMS backend API.'
      );
    }

    const nextNum = 110 + inMemoryTeams.length;
    const newTeam = {
      teamId: `TM-${nextNum}`,
      teamName: teamData.teamName.trim(),
      teamType: teamData.teamType,
      teamLeader: teamData.teamLeader.trim(),
      leaderPhone: teamData.leaderPhone.trim(),
      leaderEmail: teamData.leaderEmail?.trim() || `${teamData.teamLeader.toLowerCase().replace(/\s+/g, '.')}@redcross.lk`,
      membersCount: Number(teamData.membersCount) || 10,
      assignedArea: teamData.assignedArea.trim(),
      district: teamData.district,
      status: teamData.status || 'Available',
      deployedIncident: teamData.status === 'Deployed' ? (teamData.deployedIncident || 'Active Field Mission') : null,
      specializedEquipment: teamData.specializedEquipment?.length ? [...teamData.specializedEquipment] : ['Standard Field Aid Gear', 'First Responder Kits', 'VHF Radios'],
      baseStation: teamData.baseStation?.trim() || 'Western Province Command Hub',
      lastDeploymentDate: new Date().toISOString()
    };

    inMemoryTeams = [newTeam, ...inMemoryTeams];
    return { ...newTeam };
  },

  /**
   * Update team details (mock-only; unsupported in live mode)
   */
  async updateTeam(id, updateData) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Updating response teams is not currently supported by the HCMS backend API.'
      );
    }

    const idx = inMemoryTeams.findIndex((t) => t.teamId === id);
    if (idx === -1) throw new Error(`Response Team ${id} not found.`);

    const updated = {
      ...inMemoryTeams[idx],
      ...updateData,
      membersCount: Number(updateData.membersCount) || inMemoryTeams[idx].membersCount
    };

    inMemoryTeams[idx] = updated;
    return { ...updated };
  },

  /**
   * Quick Deploy Team to an incident or area (mock-only; unsupported in live mode)
   */
  async deployTeam(id, deploymentTarget) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Deploying response teams is not currently supported by the HCMS backend API.'
      );
    }

    const idx = inMemoryTeams.findIndex((t) => t.teamId === id);
    if (idx === -1) throw new Error(`Response Team ${id} not found.`);

    inMemoryTeams[idx] = {
      ...inMemoryTeams[idx],
      status: 'Deployed',
      deployedIncident: deploymentTarget || inMemoryTeams[idx].deployedIncident || 'Emergency Field Operations',
      lastDeploymentDate: new Date().toISOString()
    };

    return { ...inMemoryTeams[idx] };
  },

  /**
   * Update team availability status (mock-only; unsupported in live mode)
   */
  async updateStatus(id, newStatus) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Updating response team status is not currently supported by the HCMS backend API.'
      );
    }

    const idx = inMemoryTeams.findIndex((t) => t.teamId === id);
    if (idx === -1) throw new Error(`Response Team ${id} not found.`);

    inMemoryTeams[idx] = {
      ...inMemoryTeams[idx],
      status: newStatus,
      deployedIncident: newStatus === 'Deployed' ? (inMemoryTeams[idx].deployedIncident || 'Emergency Field Deployment') : null
    };

    return { ...inMemoryTeams[idx] };
  },

  /**
   * Reset to initial state (mock-only; unsupported in live mode)
   */
  resetToDefaults() {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Resetting default mock response teams is only available in mock mode.'
      );
    }

    inMemoryTeams = cloneMockTeams();
    return inMemoryTeams.map((t) => ({ ...t }));
  }
};
