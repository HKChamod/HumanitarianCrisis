/**
 * Shared HTTP Client Configuration for both Public Portal (Fetch) and Admin Portal (Axios).
 * Ensures consistent base URL, token handling, organization context, 401 handling, and error normalization.
 */

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

export const API_BASE_URL = metaEnv.VITE_API_BASE_URL || 'http://localhost:5107/api';

export const USE_MOCK_API =
  metaEnv.VITE_USE_MOCK_API !== undefined
    ? metaEnv.VITE_USE_MOCK_API === 'true'
    : false;

export const TOKEN_STORAGE_KEY = 'hcms_access_token';
export const ORG_STORAGE_KEY = 'hcms_active_org_id';

export function getAuthHeaders() {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const orgId = localStorage.getItem(ORG_STORAGE_KEY);

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { 'X-Organization-Id': orgId } : {}),
  };
}

export function handleUnauthorizedResponse() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ORG_STORAGE_KEY);
  }
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hcms:unauthorized'));
  }
}

export function normalizeApiError(status, data, fallbackMessage) {
  const normalizedStatus = status ?? 0;
  const title =
    data?.title ||
    (normalizedStatus === 0
      ? 'Network Unavailable'
      : normalizedStatus === 401
        ? 'Unauthorized'
        : normalizedStatus === 403
          ? 'Access Denied'
          : 'Request Failed');

  const detail =
    data?.detail ||
    data?.message ||
    (normalizedStatus === 0
      ? 'Unable to reach the HCMS backend API. Verify the API server is running or enable mock mode.'
      : normalizedStatus === 403
        ? 'You do not have permission to perform this action.'
        : fallbackMessage || 'An unexpected error occurred.');

  return {
    status: normalizedStatus,
    title,
    detail,
    message: detail || title,
    errors: data?.errors,
    traceId: data?.traceId,
  };
}
