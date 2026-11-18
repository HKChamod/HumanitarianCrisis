/**
 * Public Portal API Service
 * Implements endpoints from Section 5.4 & Auth from Section 4 of API Integration Specification
 */

import { httpClient } from './httpClient';
import {
  INITIAL_CRISES,
  INITIAL_NOTICES,
  INITIAL_SHELTERS,
  INITIAL_ASSISTANCE_REQUESTS,
  INITIAL_CAMPAIGNS,
} from './mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';

// Helper to get or init localStorage data with automatic i18n key synchronization
function getLocal(key, initialValue) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(initialValue));
      return initialValue;
    }
    const parsed = JSON.parse(item);
    if (Array.isArray(initialValue) && Array.isArray(parsed)) {
      // Merge initial translations while keeping dynamic updates
      return initialValue.map((initItem) => {
        const found = parsed.find((p) => p.id === initItem.id);
        return found ? { ...found, ...initItem } : initItem;
      });
    }
    return parsed;
  } catch {
    return initialValue;
  }
}

function setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Artificial delay for smooth realistic UX
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const publicApi = {
  /**
   * GET /public/crises
   * Public crisis list with filters
   */
  async getCrises(params = {}) {
    if (!USE_MOCK) {
      return httpClient.get('/public/crises', params);
    }
    await delay();
    let list = getLocal('hcms_crises', INITIAL_CRISES);
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.crisisName.toLowerCase().includes(q) ||
          c.districtName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (params.type && params.type !== 'All') {
      list = list.filter((c) => c.crisisType.toLowerCase() === params.type.toLowerCase());
    }
    if (params.severity && params.severity !== 'All') {
      list = list.filter((c) => c.severityLevel.toLowerCase() === params.severity.toLowerCase());
    }
    if (params.districtId && params.districtId !== 'All') {
      list = list.filter((c) => c.districtId === params.districtId);
    }
    return { data: list, pagination: { totalItems: list.length, page: 1, pageSize: 20 } };
  },

  /**
   * GET /public/crises/{crisisId}
   */
  async getCrisisById(crisisId) {
    if (!USE_MOCK) {
      return httpClient.get(`/public/crises/${crisisId}`);
    }
    await delay();
    const list = getLocal('hcms_crises', INITIAL_CRISES);
    const crisis = list.find((c) => c.id === crisisId);
    if (!crisis) throw { status: 404, title: 'Crisis not found' };
    return { data: crisis };
  },

  /**
   * GET /public/notices
   */
  async getNotices() {
    if (!USE_MOCK) {
      return httpClient.get('/public/notices');
    }
    await delay();
    const notices = getLocal('hcms_notices', INITIAL_NOTICES);
    return { data: notices };
  },

  /**
   * GET /public/shelters
   */
  async getShelters(params = {}) {
    if (!USE_MOCK) {
      return httpClient.get('/public/shelters', params);
    }
    await delay();
    let shelters = getLocal('hcms_shelters', INITIAL_SHELTERS);
    if (params.search) {
      const q = params.search.toLowerCase();
      shelters = shelters.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.districtName.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
      );
    }
    if (params.districtId && params.districtId !== 'All') {
      shelters = shelters.filter((s) => s.districtId === params.districtId);
    }
    if (params.isOpenOnly) {
      shelters = shelters.filter((s) => s.isOpen);
    }
    return { data: shelters, pagination: { totalItems: shelters.length, page: 1, pageSize: 20 } };
  },

  /**
   * GET /public/shelters/{shelterId}
   */
  async getShelterById(shelterId) {
    if (!USE_MOCK) {
      return httpClient.get(`/public/shelters/${shelterId}`);
    }
    await delay();
    const shelters = getLocal('hcms_shelters', INITIAL_SHELTERS);
    const item = shelters.find((s) => s.id === shelterId);
    if (!item) throw { status: 404, title: 'Shelter not found' };
    return { data: item };
  },

  /**
   * POST /public/assistance-requests
   * Guest assistance submission
   */
  async submitGuestAssistanceRequest(payload) {
    if (!USE_MOCK) {
      return httpClient.post('/public/assistance-requests', payload);
    }
    await delay(400);

    // Validate required fields
    if (!payload.category || !payload.contactPhone || !payload.description) {
      throw {
        status: 400,
        title: 'Validation failed',
        errors: {
          category: !payload.category ? ['Category is required.'] : [],
          contactPhone: !payload.contactPhone ? ['Phone number is required.'] : [],
          description: !payload.description ? ['Description of need is required.'] : [],
        },
      };
    }

    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const referenceNumber = `HCMS-2026-${randomNumber}`;

    const newRequest = {
      id: `req-${Date.now()}`,
      referenceNumber,
      trackingPin: pin,
      contactPhone: payload.contactPhone,
      contactName: payload.contactName || 'Anonymous Guest',
      category: payload.category,
      description: payload.description,
      peopleAffected: Number(payload.peopleAffected) || 1,
      status: 'Submitted',
      urgencyLevel: payload.urgencyLevel || 'Medium',
      crisisId: payload.crisisId || 'crisis-001',
      crisisName: payload.crisisName || 'Localized Emergency',
      location: {
        provinceName: payload.provinceName || 'Western Province',
        districtName: payload.districtName || 'Kalutara',
        districtId: payload.districtId || 'KAL',
        dsDivisionName: payload.dsDivisionName || '',
        gnDivisionName: payload.gnDivisionName || '',
        addressLine: payload.addressLine || '',
        latitude: payload.latitude || 6.5854,
        longitude: payload.longitude || 79.9607,
      },
      createdAt: new Date().toISOString(),
      timeline: [
        {
          status: 'Submitted',
          time: new Date().toISOString(),
          note: 'Request received into HCMS priority queue.',
        },
      ],
      assignedOrganization: 'Pending Verification Desk Assignment',
      assignedTeam: 'Review in queue',
    };

    const requests = getLocal('hcms_requests', INITIAL_ASSISTANCE_REQUESTS);
    requests.unshift(newRequest);
    setLocal('hcms_requests', requests);

    return {
      data: {
        id: newRequest.id,
        referenceNumber: newRequest.referenceNumber,
        trackingPin: pin,
        status: 'Submitted',
        category: newRequest.category,
        createdAt: newRequest.createdAt,
        contactPhone: newRequest.contactPhone,
      },
    };
  },

  /**
   * POST /public/assistance-requests/track
   * Track using reference plus verification phone
   */
  async trackRequest({ referenceNumber, verificationPhone }) {
    if (!USE_MOCK) {
      return httpClient.post('/public/assistance-requests/track', {
        referenceNumber,
        verificationPhone,
      });
    }
    await delay(350);

    const cleanRef = (referenceNumber || '').trim().toUpperCase();
    const cleanPhone = (verificationPhone || '').replace(/\D/g, '');

    const requests = getLocal('hcms_requests', INITIAL_ASSISTANCE_REQUESTS);
    const found = requests.find((r) => r.referenceNumber.toUpperCase() === cleanRef);

    if (!found) {
      throw {
        status: 404,
        title: 'Request not found',
        detail: 'No assistance request was found with this reference number.',
      };
    }

    // Check verification phone factor (last 4 digits match or direct match for guest privacy)
    const targetPhoneDigits = (found.contactPhone || '').replace(/\D/g, '');
    const phoneMatches =
      !cleanPhone ||
      targetPhoneDigits.endsWith(cleanPhone.slice(-4)) ||
      targetPhoneDigits === cleanPhone;

    if (!phoneMatches) {
      throw {
        status: 403,
        title: 'Verification failed',
        detail: 'The contact phone number provided does not match the record for this reference.',
      };
    }

    return { data: found };
  },

  /**
   * POST /public/volunteer-applications
   */
  async submitVolunteerApplication(payload) {
    if (!USE_MOCK) {
      return httpClient.post('/public/volunteer-applications', payload);
    }
    await delay(400);
    const applications = getLocal('hcms_volunteers', []);
    const newVol = {
      id: `vol-${Date.now()}`,
      referenceNumber: `VOL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ...payload,
      status: 'Pending Verification',
      submittedAt: new Date().toISOString(),
    };
    applications.push(newVol);
    setLocal('hcms_volunteers', applications);
    return { data: newVol };
  },

  /**
   * GET /donation-campaigns
   */
  async getDonationCampaigns() {
    if (!USE_MOCK) {
      return httpClient.get('/donation-campaigns');
    }
    await delay();
    return { data: INITIAL_CAMPAIGNS };
  },

  /**
   * AUTH SERVICES
   */
  async login({ email, password }) {
    if (!USE_MOCK) {
      return httpClient.post('/auth/login', { email, password });
    }
    await delay(300);
    if (!email || !password) {
      throw { status: 400, title: 'Email and password required' };
    }

    const mockUser = {
      id: 'usr-cit-01',
      fullName: email.split('@')[0].toUpperCase(),
      email,
      role: 'Citizen',
    };

    localStorage.setItem('hcms_access_token', 'mock_jwt_token_2026_xyz');
    localStorage.setItem('hcms_user', JSON.stringify(mockUser));

    return {
      data: {
        accessToken: 'mock_jwt_token_2026_xyz',
        user: mockUser,
      },
    };
  },

  async register(payload) {
    if (!USE_MOCK) {
      return httpClient.post('/auth/register', payload);
    }
    await delay(400);
    return {
      data: {
        id: `usr-${Date.now()}`,
        fullName: payload.fullName,
        email: payload.email,
        message: 'Account successfully registered. You can now sign in.',
      },
    };
  },

  async forgotPassword({ email }) {
    if (!USE_MOCK) {
      return httpClient.post('/auth/forgot-password', { email });
    }
    await delay(300);
    return {
      data: {
        message: 'If an account exists with this email, a reset verification code has been sent.',
      },
    };
  },
};
