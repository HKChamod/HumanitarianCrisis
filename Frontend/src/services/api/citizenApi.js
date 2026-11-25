/**
 * Citizen API Service
 * Handles Citizen Portal communication with HCMS .NET 10 backend API via centralized axiosClient.
 *
 * Live Mode (USE_MOCK_API === false):
 *  - GET    /api/CitizenRequests/my
 *  - POST   /api/CitizenRequests
 *  - DELETE /api/CitizenRequests/{id}   (only Pending requests owned by citizen)
 *  - GET    /api/Areas                  (active geographic areas)
 *  - GET    /api/Notifications/my       (personal notifications)
 *  - PATCH  /api/Notifications/{id}/read
 *  - PATCH  /api/Notifications/read-all
 *  - GET    /api/Shelters?activeOnly=true
 *  - GET    /api/CrisisEvents
 *  - Never silently falls back to localStorage or mock data on API failure.
 *  - Unsupported backend operations fail cleanly with normalized 501 errors.
 *
 * Mock Mode (USE_MOCK_API === true):
 *  - Preserves localStorage-backed mock workflow for local UI testing.
 */
import { axiosClient, USE_MOCK_API } from './axiosClient.js';

const STORAGE_KEY_REQUESTS = 'hcms_citizen_requests_v3';
const STORAGE_KEY_NOTIFICATIONS = 'hcms_citizen_notifications_v3';

const INITIAL_CITIZEN_REQUESTS = [];
const INITIAL_CITIZEN_NOTIFICATIONS = [];

try {
  localStorage.removeItem('hcms_citizen_requests');
  localStorage.removeItem('hcms_citizen_notifications');
  localStorage.removeItem('hcms_citizen_requests_v2');
  localStorage.removeItem('hcms_citizen_notifications_v2');
} catch {
  // ignore storage cleanup errors
}

function createUnsupportedError(detail) {
  return {
    status: 501,
    title: 'Not Supported',
    detail,
    message: detail,
  };
}

function getStoredRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(INITIAL_CITIZEN_REQUESTS));
      return INITIAL_CITIZEN_REQUESTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CITIZEN_REQUESTS;
  }
}

function saveStoredRequests(requests) {
  try {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
  } catch (err) {
    console.error('Failed to save requests:', err);
  }
}

function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(INITIAL_CITIZEN_NOTIFICATIONS));
      return INITIAL_CITIZEN_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CITIZEN_NOTIFICATIONS;
  }
}

function saveStoredNotifications(notifs) {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifs));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

export function mapCitizenAreaFromApi(dto) {
  return {
    areaId: Number(dto?.areaId),
    areaName: dto?.areaName ?? '',
    areaType: dto?.areaType ?? '',
    parentAreaId: dto?.parentAreaId ?? null,
    parentAreaName: dto?.parentAreaName ?? null,
    code: dto?.code ?? null,
    isActive: Boolean(dto?.isActive),
  };
}

export function mapCitizenRequestFromApi(dto) {
  const createdAt = dto?.createdAt ?? new Date().toISOString();
  const updatedAt = dto?.updatedAt ?? createdAt;
  const status = dto?.status ?? 'Pending';

  return {
    id: String(dto?.requestId ?? dto?.id ?? ''),
    requestId: dto?.requestId ?? null,
    referenceNumber: dto?.requestId != null ? `REQ-${dto.requestId}` : '',
    userId: dto?.userId ?? null,
    citizenName: dto?.citizenName ?? '',
    crisisId: dto?.crisisId ?? null,
    crisisTitle: dto?.crisisName ?? null,
    areaId: dto?.areaId ?? null,
    areaName: dto?.areaName ?? '',
    category: dto?.requestType ?? 'Other',
    urgencyLevel: dto?.urgencyLevel ?? 'Medium',
    status,
    peopleAffected: dto?.peopleCount ?? 1,
    description: dto?.description ?? '',
    location: {
      province: '',
      district: dto?.areaName ?? '',
      dsDivision: '',
      gnDivision: '',
      addressLine: dto?.address ?? '',
    },
    latitude: dto?.latitude ?? null,
    longitude: dto?.longitude ?? null,
    contactPhone: '',
    contactName: dto?.citizenName ?? '',
    createdAt,
    updatedAt,
    assignedOrganization: null,
    assignedOfficer: null,
    history: [
      {
        status,
        timestamp: updatedAt,
        note: `Current backend status: ${status}.`,
      },
    ],
  };
}

export function mapCitizenNotificationFromApi(dto) {
  const severity = String(dto?.severity || 'Info');
  const type =
    severity === 'Critical' || severity === 'Warning' || severity === 'Error'
      ? 'urgent'
      : severity === 'Success'
        ? 'success'
        : 'info';

  const relatedType = dto?.relatedEntityType ?? null;
  const relatedId = dto?.relatedEntityId ?? null;
  const referenceNumber =
    relatedType === 'CitizenRequest' && relatedId != null ? `REQ-${relatedId}` : null;

  return {
    id: String(dto?.notificationId ?? dto?.id ?? ''),
    notificationId: dto?.notificationId ?? null,
    title: dto?.title ?? 'Notification',
    message: dto?.message ?? '',
    category: dto?.category ?? 'System',
    severity,
    type,
    timestamp: dto?.createdAt ?? new Date().toISOString(),
    read: Boolean(dto?.isRead),
    referenceNumber,
    relatedEntityType: relatedType,
    relatedEntityId: relatedId,
  };
}

export function mapCitizenShelterFromApi(dto) {
  const facilitiesRaw = String(dto?.facilities || '').trim();
  const facilities = facilitiesRaw
    ? facilitiesRaw.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  return {
    id: String(dto?.shelterId ?? ''),
    shelterId: dto?.shelterId ?? null,
    name: dto?.shelterName ?? '',
    areaName: dto?.areaName ?? '',
    address: dto?.address ?? '',
    distance: dto?.areaName ? `${dto.areaName}` : dto?.address || 'Active Shelter',
    status: dto?.status ?? 'Open',
    used: Number(dto?.currentOccupancy ?? 0),
    total: Math.max(1, Number(dto?.capacity ?? 1)),
    availableCapacity: Number(dto?.availableCapacity ?? Math.max(0, Number(dto?.capacity ?? 0) - Number(dto?.currentOccupancy ?? 0))),
    facilities,
    isActive: Boolean(dto?.isActive ?? true),
  };
}

export function mapCitizenCrisisAlertFromApi(dto) {
  return {
    id: String(dto?.crisisId ?? ''),
    crisisId: dto?.crisisId ?? null,
    severity: dto?.severityLevel ?? 'Medium',
    title: dto?.crisisName ?? '',
    crisisType: dto?.crisisType ?? '',
    location: dto?.crisisType ? `${dto.crisisType} Response` : 'Active Advisory',
    startDate: dto?.startDate ?? null,
    status: dto?.status ?? 'Active',
    verifiedBy: 'Disaster Management Command',
    instructions: dto?.description ?? '',
  };
}

export function normalizeUrgencyForApi(urgency) {
  if (urgency === 'Standard') return 'Medium';
  if (['Low', 'Medium', 'High', 'Critical'].includes(urgency)) return urgency;
  return 'Medium';
}

export function buildCitizenRequestPayload(payload) {
  const parsedAreaId = Number(payload?.areaId);
  if (!Number.isInteger(parsedAreaId) || parsedAreaId <= 0) {
    const detail = 'Please select a valid active geographic area before submitting your request.';
    throw {
      status: 400,
      title: 'Validation Error',
      detail,
      message: detail,
    };
  }

  const parsedCrisisId =
    payload?.crisisId !== undefined && payload?.crisisId !== null && payload?.crisisId !== ''
      ? Number(payload.crisisId)
      : null;

  const peopleCount = Number.parseInt(payload?.peopleAffected ?? payload?.peopleCount, 10);
  const addressValue = (payload?.location?.addressLine || payload?.addressLine || payload?.address || '').trim();

  return {
    requestType: (payload?.category || payload?.requestType || 'Other').trim(),
    description: (payload?.description || '').trim(),
    urgencyLevel: normalizeUrgencyForApi(payload?.urgencyLevel),
    peopleCount: Number.isInteger(peopleCount) && peopleCount >= 1 ? Math.min(peopleCount, 1000) : 1,
    areaId: parsedAreaId,
    crisisId: Number.isInteger(parsedCrisisId) && parsedCrisisId > 0 ? parsedCrisisId : null,
    address: addressValue || null,
    latitude:
      payload?.latitude !== undefined && payload?.latitude !== null && payload?.latitude !== ''
        ? Number(payload.latitude)
        : null,
    longitude:
      payload?.longitude !== undefined && payload?.longitude !== null && payload?.longitude !== ''
        ? Number(payload.longitude)
        : null,
  };
}

export const citizenApi = {
  /**
   * Load active geographic areas from GET /api/Areas (live mode)
   */
  async getActiveAreas() {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await axiosClient.get('/Areas');
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapCitizenAreaFromApi).filter((a) => a.isActive);
  },

  /**
   * Get all assistance requests submitted by the logged-in citizen (GET /api/CitizenRequests/my)
   */
  async getMyRequests() {
    if (USE_MOCK_API) {
      const data = getStoredRequests();
      return { data, total: data.length };
    }

    const response = await axiosClient.get('/CitizenRequests/my');
    const items = Array.isArray(response.data) ? response.data : [];
    const mapped = items.map(mapCitizenRequestFromApi);
    return { data: mapped, total: mapped.length };
  },

  /**
   * Submit a new emergency assistance request (POST /api/CitizenRequests)
   */
  async submitRequest(payload) {
    if (USE_MOCK_API) {
      const newRef = `HCMS-2026-000${Math.floor(100 + Math.random() * 900)}`;
      const nowIso = new Date().toISOString();

      const newRequest = {
        id: `req-${Date.now()}`,
        referenceNumber: newRef,
        crisisId: payload.crisisId || 'cr-kalutara-2026',
        crisisTitle: payload.crisisTitle || 'Kalutara Flood Emergency 2026',
        category: payload.category || 'Food',
        urgencyLevel: payload.urgencyLevel || 'High',
        status: 'Submitted',
        peopleAffected: parseInt(payload.peopleAffected, 10) || 1,
        description: payload.description || '',
        location: {
          province: payload.province || 'Western Province',
          district: payload.district || 'Kalutara',
          dsDivision: payload.dsDivision || '',
          gnDivision: payload.gnDivision || '',
          addressLine: payload.addressLine || '',
        },
        contactPhone: payload.contactPhone || '+94 77 123 4567',
        contactName: payload.contactName || 'Kavinda Perera',
        createdAt: nowIso,
        updatedAt: nowIso,
        assignedOrganization: null,
        assignedOfficer: null,
        history: [
          {
            status: 'Submitted',
            timestamp: nowIso,
            note: 'Assistance request submitted by citizen via Citizen Portal.',
          },
        ],
      };

      const current = getStoredRequests();
      saveStoredRequests([newRequest, ...current]);

      const notifs = getStoredNotifications();
      saveStoredNotifications([
        {
          id: `notif-${Date.now()}`,
          title: 'Request Submitted Successfully',
          message: `Your request for ${newRequest.category} (${newRef}) has been received and registered with the Disaster Management Centre.`,
          timestamp: nowIso,
          read: false,
          type: 'info',
          referenceNumber: newRef,
        },
        ...notifs,
      ]);

      return { data: newRequest };
    }

    const requestPayload = buildCitizenRequestPayload(payload);
    const response = await axiosClient.post('/CitizenRequests', requestPayload);
    return { data: mapCitizenRequestFromApi(response.data) };
  },

  /**
   * Track request by reference number (mock-only; backend has no public reference lookup endpoint)
   */
  async trackRequest(referenceNumber) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Public reference-number tracking is not currently supported by the HCMS backend API. Select one of your submitted requests from the dashboard to view its live status.'
      );
    }

    const requests = getStoredRequests();
    const match = requests.find(
      (r) => r.referenceNumber?.toLowerCase().trim() === referenceNumber?.toLowerCase().trim()
    );
    if (match) return { data: match };
    throw new Error(`No assistance request found matching reference "${referenceNumber}".`);
  },

  /**
   * Progress request to next status (mock-only simulator)
   */
  async advanceRequestStatus(requestId) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Client-side status simulation is disabled in live API mode. Status transitions are managed by authorized coordinators.'
      );
    }

    const requests = getStoredRequests();
    let updatedReq = null;
    const nowIso = new Date().toISOString();

    const updatedList = requests.map((req) => {
      if (req.id !== requestId) return req;

      let nextStatus = req.status;
      let nextNote = '';
      let assignedOrg = req.assignedOrganization;
      let assignedOfficer = req.assignedOfficer;

      switch (req.status) {
        case 'Submitted':
          nextStatus = 'Under Review';
          nextNote = 'Disaster Management Centre response desk initiated review.';
          break;
        case 'Under Review':
          nextStatus = 'Verified';
          nextNote = 'Location, household vulnerability, and need verified by area Grama Niladhari.';
          break;
        case 'Verified':
          nextStatus = 'Approved';
          nextNote = 'Relief package authorized for dispatch.';
          assignedOrg = 'Sri Lanka Red Cross & Emergency Disaster Relief Team';
          assignedOfficer = 'Relief Officer In-Charge';
          break;
        case 'Approved':
          nextStatus = 'In Progress';
          nextNote = 'Relief supplies dispatched from central warehouse. In transit to location.';
          break;
        case 'In Progress':
          nextStatus = 'Completed';
          nextNote = 'Assistance delivered successfully to citizen.';
          break;
        default:
          return req;
      }

      updatedReq = {
        ...req,
        status: nextStatus,
        updatedAt: nowIso,
        assignedOrganization: assignedOrg,
        assignedOfficer: assignedOfficer,
        history: [
          ...req.history,
          {
            status: nextStatus,
            timestamp: nowIso,
            note: nextNote,
          },
        ],
      };
      return updatedReq;
    });

    if (updatedReq) {
      saveStoredRequests(updatedList);
      const notifs = getStoredNotifications();
      saveStoredNotifications([
        {
          id: `notif-${Date.now()}`,
          title: `Status Updated: ${updatedReq.status}`,
          message: `Your request ${updatedReq.referenceNumber} (${updatedReq.category}) is now ${updatedReq.status}.`,
          timestamp: nowIso,
          read: false,
          type: updatedReq.status === 'Completed' ? 'success' : 'info',
          referenceNumber: updatedReq.referenceNumber,
        },
        ...notifs,
      ]);
    }

    return { data: updatedReq };
  },

  /**
   * Cancel/delete a Pending assistance request (DELETE /api/CitizenRequests/{id} in live mode)
   */
  async cancelRequest(requestId) {
    if (!USE_MOCK_API) {
      await axiosClient.delete(`/CitizenRequests/${Number(requestId)}`);
      return { success: true };
    }

    const requests = getStoredRequests();
    const nowIso = new Date().toISOString();
    const updated = requests.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'Cancelled',
          updatedAt: nowIso,
          history: [
            ...r.history,
            {
              status: 'Cancelled',
              timestamp: nowIso,
              note: 'Cancelled by citizen.',
            },
          ],
        };
      }
      return r;
    });
    saveStoredRequests(updated);
    return { success: true };
  },

  /**
   * Submit citizen feedback (mock-only; no backend feedback endpoint exists)
   */
  async submitFeedback(requestId, feedbackData) {
    if (!USE_MOCK_API) {
      throw createUnsupportedError(
        'Citizen feedback submission is not currently supported by the HCMS backend API.'
      );
    }

    const requests = getStoredRequests();
    const updated = requests.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          feedback: {
            ...feedbackData,
            submittedAt: new Date().toISOString(),
          },
        };
      }
      return r;
    });
    saveStoredRequests(updated);
    return { success: true };
  },

  /**
   * Get personal notifications (GET /api/Notifications/my in live mode)
   */
  async getNotifications() {
    if (!USE_MOCK_API) {
      const response = await axiosClient.get('/Notifications/my', {
        params: { limit: 50 },
      });
      const items = Array.isArray(response.data) ? response.data : [];
      return {
        data: items.map(mapCitizenNotificationFromApi),
        unsupported: false,
      };
    }
    return { data: getStoredNotifications(), unsupported: false };
  },

  /**
   * Mark a single notification as read (PATCH /api/Notifications/{id}/read in live mode)
   */
  async markNotificationRead(notificationId) {
    if (!USE_MOCK_API) {
      await axiosClient.patch(`/Notifications/${Number(notificationId)}/read`);
      return { success: true };
    }
    const notifs = getStoredNotifications().map((n) =>
      String(n.id) === String(notificationId) ? { ...n, read: true } : n
    );
    saveStoredNotifications(notifs);
    return { success: true };
  },

  /**
   * Mark all notifications as read (PATCH /api/Notifications/read-all in live mode)
   */
  async markAllNotificationsRead() {
    if (!USE_MOCK_API) {
      await axiosClient.patch('/Notifications/read-all');
      return { success: true, unsupported: false };
    }
    const notifs = getStoredNotifications().map((n) => ({ ...n, read: true }));
    saveStoredNotifications(notifs);
    return { success: true };
  },

  /**
   * Load active shelters for Citizen Portal widget (GET /api/Shelters?activeOnly=true)
   */
  async getOpenShelters() {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await axiosClient.get('/Shelters', {
      params: { activeOnly: true },
    });
    const items = Array.isArray(response.data) ? response.data : [];
    return items.map(mapCitizenShelterFromApi);
  },

  /**
   * Load active crisis advisories for Citizen Portal widget (GET /api/CrisisEvents)
   */
  async getActiveCrisisAlerts() {
    if (USE_MOCK_API) {
      return [];
    }
    const response = await axiosClient.get('/CrisisEvents');
    const items = Array.isArray(response.data) ? response.data : [];
    return items
      .filter((c) => String(c?.status || '').toLowerCase() === 'active')
      .map(mapCitizenCrisisAlertFromApi);
  },

  /**
   * Reset all local mock citizen data (mock-only)
   */
  clearAllCitizenData() {
    if (!USE_MOCK_API) {
      throw createUnsupportedError('Clearing mock citizen data is only available in mock mode.');
    }
    saveStoredRequests([]);
    saveStoredNotifications([]);
    return { success: true };
  },
};
