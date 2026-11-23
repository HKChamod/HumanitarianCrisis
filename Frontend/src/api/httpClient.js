/**
 * Shared Fetch HTTP Client (used by Public Portal services)
 * Aligned with shared apiConfig for consistent base URL, JWT auth headers, 401 handling, and error shape.
 */

import {
  API_BASE_URL,
  getAuthHeaders,
  handleUnauthorizedResponse,
  normalizeApiError,
} from '../services/api/apiConfig';

export const httpClient = {
  baseURL: API_BASE_URL,

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    };

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err) {
      throw normalizeApiError(0, null, err?.message);
    }

    if (!response.ok) {
      let errorData = null;
      try {
        errorData = await response.json();
      } catch {
        // Non-JSON error response
      }

      if (response.status === 401) {
        handleUnauthorizedResponse();
      }

      throw normalizeApiError(response.status, errorData, response.statusText);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  get(endpoint, params) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, val);
        }
      });
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};
