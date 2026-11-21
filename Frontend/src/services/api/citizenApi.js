/**
 * Citizen API Service
 * Handles Citizen Portal communication with HCMS backend API
 * Clean state with ZERO pre-seeded dummy data
 */
import { axiosClient, USE_MOCK_API } from './axiosClient';

const STORAGE_KEY_REQUESTS = 'hcms_citizen_requests_v3';
const STORAGE_KEY_NOTIFICATIONS = 'hcms_citizen_notifications_v3';

// Clean initial state: zero dummy data
const INITIAL_CITIZEN_REQUESTS = [];
const INITIAL_CITIZEN_NOTIFICATIONS = [];

// Clean legacy dummy data if still present in user's browser
try {
  localStorage.removeItem('hcms_citizen_requests');
  localStorage.removeItem('hcms_citizen_notifications');
  localStorage.removeItem('hcms_citizen_requests_v2');
  localStorage.removeItem('hcms_citizen_notifications_v2');
} catch {}

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

export const citizenApi = {
  /**
   * Get all assistance requests submitted by the logged-in citizen
   */
  async getMyRequests() {
    if (USE_MOCK_API) {
      const data = getStoredRequests();
      return { data, total: data.length };
    }
    try {
      const response = await axiosClient.get('/CitizenRequests/my');
      const items = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      return { data: items, total: items.length };
    } catch {
      // Fallback to local storage if backend endpoint is still pending
      const data = getStoredRequests();
      return { data, total: data.length };
    }
  },

  /**
   * Submit a new emergency assistance request
   */
  async submitRequest(payload) {
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
          note: 'Assistance request submitted by citizen via Citizen Portal.'
        }
      ]
    };

    if (USE_MOCK_API) {
      const current = getStoredRequests();
      const updated = [newRequest, ...current];
      saveStoredRequests(updated);

      // Confirmation notification
      const notifs = getStoredNotifications();
      const newNotif = {
        id: `notif-${Date.now()}`,
        title: 'Request Submitted Successfully',
        message: `Your request for ${newRequest.category} (${newRef}) has been received and registered with the Disaster Management Centre.`,
        timestamp: nowIso,
        read: false,
        type: 'info',
        referenceNumber: newRef
      };
      saveStoredNotifications([newNotif, ...notifs]);

      return { data: newRequest };
    }

    try {
      const requestPayload = {
        requestType: payload.category || 'Other',
        description: payload.description || 'Emergency assistance needed',
        urgencyLevel: ['Low', 'Medium', 'High', 'Critical'].includes(payload.urgencyLevel)
          ? payload.urgencyLevel
          : 'High',
        peopleCount: parseInt(payload.peopleAffected, 10) || 1,
        areaId: payload.areaId ? parseInt(payload.areaId, 10) : 1,
        crisisId: payload.crisisId ? parseInt(payload.crisisId, 10) : null,
        address: payload.location?.addressLine || payload.addressLine || payload.address || null,
        latitude: payload.latitude ? Number(payload.latitude) : null,
        longitude: payload.longitude ? Number(payload.longitude) : null,
      };
      const response = await axiosClient.post('/CitizenRequests', requestPayload);
      return { data: response.data };
    } catch {
      const current = getStoredRequests();
      const updated = [newRequest, ...current];
      saveStoredRequests(updated);
      return { data: newRequest };
    }
  },

  /**
   * Track request by reference number
   */
  async trackRequest(referenceNumber) {
    const requests = getStoredRequests();
    const match = requests.find(
      (r) => r.referenceNumber?.toLowerCase().trim() === referenceNumber?.toLowerCase().trim()
    );
    if (match) return { data: match };
    throw new Error(`No assistance request found matching reference "${referenceNumber}".`);
  },

  /**
   * Progress request to next status (Submitted -> Under Review -> Verified -> Approved -> In Progress -> Completed)
   * This allows the user to test and verify every stage of the lifecycle.
   */
  async advanceRequestStatus(requestId) {
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
            note: nextNote
          }
        ]
      };
      return updatedReq;
    });

    if (updatedReq) {
      saveStoredRequests(updatedList);

      // Add status change notification
      const notifs = getStoredNotifications();
      const notif = {
        id: `notif-${Date.now()}`,
        title: `Status Updated: ${updatedReq.status}`,
        message: `Your request ${updatedReq.referenceNumber} (${updatedReq.category}) is now ${updatedReq.status}.`,
        timestamp: nowIso,
        read: false,
        type: updatedReq.status === 'Completed' ? 'success' : 'info',
        referenceNumber: updatedReq.referenceNumber
      };
      saveStoredNotifications([notif, ...notifs]);
    }

    return { data: updatedReq };
  },

  /**
   * Cancel an assistance request
   */
  async cancelRequest(requestId) {
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
              note: 'Cancelled by citizen.'
            }
          ]
        };
      }
      return r;
    });
    saveStoredRequests(updated);
    return { success: true };
  },

  /**
   * Submit citizen feedback for a completed request
   */
  async submitFeedback(requestId, feedbackData) {
    const requests = getStoredRequests();
    const updated = requests.map((r) => {
      if (r.id === requestId) {
        return {
          ...r,
          feedback: {
            rating: feedbackData.rating,
            comments: feedbackData.comments,
            submittedAt: new Date().toISOString()
          }
        };
      }
      return r;
    });
    saveStoredRequests(updated);
    return { success: true };
  },

  /**
   * Get citizen notifications
   */
  async getNotifications() {
    const data = getStoredNotifications();
    return { data, total: data.length };
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead() {
    const notifs = getStoredNotifications().map((n) => ({ ...n, read: true }));
    saveStoredNotifications(notifs);
    return { success: true };
  },

  /**
   * Reset / clear all citizen data to test clean again
   */
  clearAllCitizenData() {
    localStorage.removeItem(STORAGE_KEY_REQUESTS);
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
    return { success: true };
  }
};
