/**
 * Aid Requests API Service for ReliefLink Organization Portal
 * 
 * Future Production Endpoints:
 *  - GET /api/AssistanceRequests
 *  - GET /api/AssistanceRequests/{id}
 *  - PATCH /api/AssistanceRequests/{id}/status
 *  - POST /api/AssistanceRequests/{id}/assign
 * 
 * Handles graceful fallback to mock data during local UI testing and development.
 */

import { mockAidRequests } from '../data/mockAidRequests';
import { getAuthHeaders, API_BASE_URL as SHARED_BASE_URL } from '../../services/api/apiConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || SHARED_BASE_URL || 'http://localhost:5107/api';

export const aidRequestsService = {
  /**
   * Fetch all aid requests with optional test state simulation
   */
  async getAllAidRequests({ simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Aid Requests Management Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/CitizenRequests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch {
      // In development or when backend is unavailable, return clone of mock aid requests
      return [...mockAidRequests];
    }
  },

  /**
   * Fetch single request by ID
   */
  async getAidRequestById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/AssistanceRequests/${id}`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      const found = mockAidRequests.find(r => r.requestId === id);
      if (!found) throw new Error(`Aid request ${id} not found.`);
      return { ...found };
    }
  },

  /**
   * Update request status
   */
  async updateStatus(id, newStatus) {
    try {
      const response = await fetch(`${API_BASE_URL}/AssistanceRequests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      const item = mockAidRequests.find(r => r.requestId === id);
      if (item) {
        item.status = newStatus;
      }
      return { requestId: id, status: newStatus };
    }
  },

  /**
   * Assign Response Team
   */
  async assignTeam(id, teamName) {
    try {
      const response = await fetch(`${API_BASE_URL}/AssistanceRequests/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTeam: teamName })
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      const item = mockAidRequests.find(r => r.requestId === id);
      if (item) {
        item.assignedTeam = teamName;
        // If assigned and was pending, move to In Progress automatically
        if (item.status === 'Pending Review' && teamName !== 'Unassigned') {
          item.status = 'In Progress';
        }
      }
      return { requestId: id, assignedTeam: teamName };
    }
  }
};
