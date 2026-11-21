/**
 * Crisis Events API Service for ReliefLink Organization Portal
 * 
 * Future Production Endpoint: /api/CrisisEvents
 * Handles graceful fallback to mock data when backend is not running or during local UI testing.
 */

import { mockCrisisEvents } from '../data/mockCrisisEvents';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7104/api';

export const crisisEventsService = {
  /**
   * Fetch all crisis incidents with optional query filters
   */
  async getAllCrisisEvents({ simulateLoading = false, simulateError = false, simulateEmpty = false } = {}) {
    if (simulateError) {
      throw new Error('Network error: Unable to connect to Crisis Events Service.');
    }

    if (simulateEmpty) {
      return [];
    }

    // Try real API first if available, otherwise return mock data
    try {
      const response = await fetch(`${API_BASE_URL}/CrisisEvents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch {
      // In development or when API is unreachable, return enriched mock events
      return mockCrisisEvents;
    }
  },

  /**
   * Fetch single incident by CrisisId
   */
  async getCrisisEventById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/CrisisEvents/${id}`);
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      const found = mockCrisisEvents.find(c => c.crisisId === Number(id));
      if (!found) throw new Error(`Crisis event #${id} not found.`);
      return found;
    }
  },

  /**
   * Update Status: PATCH /api/CrisisEvents/{id}/status
   */
  async updateCrisisStatus(id, newStatus) {
    try {
      const response = await fetch(`${API_BASE_URL}/CrisisEvents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch {
      // Mock update locally
      const event = mockCrisisEvents.find(c => c.crisisId === Number(id));
      if (event) {
        event.status = newStatus;
        event.lastUpdated = new Date().toISOString();
      }
      return { crisisId: id, status: newStatus };
    }
  }
};
