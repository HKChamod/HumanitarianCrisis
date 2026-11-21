import axios from 'axios';
import {
  API_BASE_URL,
  USE_MOCK_API,
  getAuthHeaders,
  handleUnauthorizedResponse,
  normalizeApiError,
} from './apiConfig';

export { USE_MOCK_API };

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const authHeaders = getAuthHeaders();
  if (config.headers) {
    Object.entries(authHeaders).forEach(([key, value]) => {
      config.headers[key] = value;
    });
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;

    if (status === 401) {
      handleUnauthorizedResponse();
    }

    return Promise.reject(normalizeApiError(status, data, error.message));
  }
);
