/**
 * Assigned Areas API Service for ReliefLink Organization Portal
 * 
 * Future Backend Alignment:
 *  - GET /api/areas
 *  - POST /api/areas
 *  - PUT /api/areas/{id}
 *  - POST /api/areas/{id}/assign-teams
 * 
 * Manages reactive in-memory state with simulation support.
 */

import { initialAssignedAreas } from '../data/mockAssignedAreas';

let inMemoryAreas = [...initialAssignedAreas];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7104/api';

export const assignedAreasService = {
  /**
   * Fetch all assigned areas with testing simulation support
   */
  async getAllAssignedAreas({ simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Geographic Areas Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/areas`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      // In development or when backend is unavailable, return copy of in-memory areas
      return inMemoryAreas.map(a => ({ ...a }));
    }
  },

  /**
   * Get single area by ID
   */
  async getAreaById(id) {
    const found = inMemoryAreas.find(a => a.areaId === id);
    if (!found) throw new Error(`Area ${id} not found.`);
    return { ...found };
  },

  /**
   * Assign a new area record
   */
  async assignNewArea(areaData) {
    const nextNum = 100 + inMemoryAreas.length + 1;
    const newArea = {
      areaId: `AREA-${nextNum}`,
      areaName: areaData.areaName.trim(),
      district: areaData.district,
      province: areaData.province || "Western",
      coordinates: areaData.coordinates || [6.9271, 79.8612],
      crisisType: areaData.crisisType || "Flood",
      riskLevel: areaData.riskLevel || "Medium",
      affectedCitizens: Number(areaData.affectedCitizens) || 0,
      assignedTeams: Array.isArray(areaData.assignedTeams) ? areaData.assignedTeams : [],
      responseStatus: areaData.responseStatus || "Awaiting Assignment",
      primaryContact: areaData.primaryContact?.trim() || "District Disaster Officer (+94 11 269 4487)",
      shelterCount: Number(areaData.shelterCount) || 1,
      shelterCapacity: Number(areaData.shelterCapacity) || 500,
      linkedIncident: areaData.linkedIncident?.trim() || "Active Humanitarian Operation",
      notes: areaData.notes?.trim() || "Initial field coverage registration.",
      lastAssessmentDate: new Date().toISOString()
    };

    inMemoryAreas = [newArea, ...inMemoryAreas];
    return { ...newArea };
  },

  /**
   * Update area details
   */
  async updateArea(id, updateData) {
    const idx = inMemoryAreas.findIndex(a => a.areaId === id);
    if (idx === -1) throw new Error(`Area ${id} not found.`);

    const updated = {
      ...inMemoryAreas[idx],
      ...updateData,
      affectedCitizens: Number(updateData.affectedCitizens) || inMemoryAreas[idx].affectedCitizens,
      lastAssessmentDate: new Date().toISOString()
    };

    inMemoryAreas[idx] = updated;
    return { ...updated };
  },

  /**
   * Assign teams to an area
   */
  async assignTeamsToArea(id, teamNames) {
    const idx = inMemoryAreas.findIndex(a => a.areaId === id);
    if (idx === -1) throw new Error(`Area ${id} not found.`);

    inMemoryAreas[idx] = {
      ...inMemoryAreas[idx],
      assignedTeams: teamNames,
      responseStatus: teamNames.length > 0 ? "Active Response" : "Awaiting Assignment",
      lastAssessmentDate: new Date().toISOString()
    };

    return { ...inMemoryAreas[idx] };
  },

  /**
   * Update status & risk level
   */
  async updateStatusAndRisk(id, newStatus, newRiskLevel) {
    const idx = inMemoryAreas.findIndex(a => a.areaId === id);
    if (idx === -1) throw new Error(`Area ${id} not found.`);

    inMemoryAreas[idx] = {
      ...inMemoryAreas[idx],
      responseStatus: newStatus || inMemoryAreas[idx].responseStatus,
      riskLevel: newRiskLevel || inMemoryAreas[idx].riskLevel,
      lastAssessmentDate: new Date().toISOString()
    };

    return { ...inMemoryAreas[idx] };
  },

  /**
   * Reset in-memory data
   */
  resetToDefaults() {
    inMemoryAreas = [...initialAssignedAreas];
    return inMemoryAreas;
  }
};
