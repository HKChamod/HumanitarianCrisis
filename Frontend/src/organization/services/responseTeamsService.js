/**
 * Response Teams API Service for ReliefLink Organization Portal
 * 
 * Future Backend Alignment:
 *  - GET /api/organizations/{orgId}/teams
 *  - POST /api/organizations/{orgId}/teams
 *  - PUT /api/organizations/{orgId}/teams/{id}
 *  - PATCH /api/organizations/{orgId}/teams/{id}/status
 *  - POST /api/organizations/{orgId}/teams/{id}/deploy
 * 
 * Manages reactive in-memory state with realistic mock data.
 */

import { initialResponseTeams } from '../data/mockResponseTeams';

let inMemoryTeams = [...initialResponseTeams];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7104/api';

export const responseTeamsService = {
  /**
   * Fetch all response teams with simulation support
   */
  async getAllTeams({ simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Response Teams Registry Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ResponseTeams`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      // Return copy of current in-memory teams
      return inMemoryTeams.map(t => ({ ...t }));
    }
  },

  /**
   * Get single team by ID
   */
  async getTeamById(id) {
    const found = inMemoryTeams.find(t => t.teamId === id);
    if (!found) throw new Error(`Response Team ${id} not found.`);
    return { ...found };
  },

  /**
   * Create a new team
   */
  async createTeam(teamData) {
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
      status: teamData.status || "Available",
      deployedIncident: teamData.status === "Deployed" ? (teamData.deployedIncident || "Active Field Mission") : null,
      specializedEquipment: teamData.specializedEquipment?.length ? teamData.specializedEquipment : ["Standard Field Aid Gear", "First Responder Kits", "VHF Radios"],
      baseStation: teamData.baseStation?.trim() || "Western Province Command Hub",
      lastDeploymentDate: new Date().toISOString()
    };

    inMemoryTeams = [newTeam, ...inMemoryTeams];
    return { ...newTeam };
  },

  /**
   * Update team details
   */
  async updateTeam(id, updateData) {
    const idx = inMemoryTeams.findIndex(t => t.teamId === id);
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
   * Quick Deploy Team to an incident or area
   */
  async deployTeam(id, deploymentTarget) {
    const idx = inMemoryTeams.findIndex(t => t.teamId === id);
    if (idx === -1) throw new Error(`Response Team ${id} not found.`);

    inMemoryTeams[idx] = {
      ...inMemoryTeams[idx],
      status: "Deployed",
      deployedIncident: deploymentTarget || inMemoryTeams[idx].deployedIncident || "Emergency Field Operations",
      lastDeploymentDate: new Date().toISOString()
    };

    return { ...inMemoryTeams[idx] };
  },

  /**
   * Update team availability status
   */
  async updateStatus(id, newStatus) {
    const idx = inMemoryTeams.findIndex(t => t.teamId === id);
    if (idx === -1) throw new Error(`Response Team ${id} not found.`);

    inMemoryTeams[idx] = {
      ...inMemoryTeams[idx],
      status: newStatus,
      deployedIncident: newStatus === "Deployed" ? (inMemoryTeams[idx].deployedIncident || "Emergency Field Deployment") : null
    };

    return { ...inMemoryTeams[idx] };
  },

  /**
   * Reset to initial state
   */
  resetToDefaults() {
    inMemoryTeams = [...initialResponseTeams];
    return inMemoryTeams;
  }
};
