import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5107/api';

export const USE_MOCK_API =
  import.meta.env.VITE_USE_MOCK_API !== undefined
    ? import.meta.env.VITE_USE_MOCK_API === 'true'
    : true;

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hcms_access_token');
  const orgId = localStorage.getItem('hcms_active_org_id');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (orgId && config.headers) {
    config.headers['X-Organization-Id'] = orgId;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status ?? 0;
    const data = error.response?.data;

    if (status === 401) {
      localStorage.removeItem('hcms_access_token');
      window.dispatchEvent(new CustomEvent('hcms:unauthorized'));
    }

    const normalized = {
      status,
      title: data?.title || (status === 0 ? 'Network Unavailable' : 'Request Failed'),
      detail:
        data?.detail ||
        data?.message ||
        (status === 0
          ? 'Unable to reach the HCMS backend API. Verify the API server is running or enable mock mode.'
          : error.message || 'An unexpected error occurred.'),
      errors: data?.errors,
      traceId: data?.traceId,
    };

    return Promise.reject(normalized);
  }
);
