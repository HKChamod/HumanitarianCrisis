/**
 * Organization Settings Service
 *
 * Live Mode (USE_MOCK_API === false):
 *  - Organization Profile uses centralized axiosClient:
 *      GET /api/organizations/{id}
 *      PUT /api/organizations/{id}
 *  - Browser UI preferences are explicitly scoped to local-only localStorage per organization
 *    and are never presented as server-synchronized settings.
 *
 * Mock Mode (USE_MOCK_API === true):
 *  - Preserves localStorage-backed mock settings for local UI development.
 */

import { defaultOrganizationSettings } from '../data/mockOrganizationSettings';
import { axiosClient, USE_MOCK_API } from '../../services/api/axiosClient';

const STORAGE_KEY = 'relieflink_org_settings';
const LOCAL_PREFS_PREFIX = 'relieflink_local_ui_prefs_';

const DEFAULT_LOCAL_PREFERENCES = {
  emailAlerts: true,
  criticalBannerSound: false,
  compactTables: false,
};

function mapOrganizationProfileFromApi(item) {
  return {
    organizationId: item?.organizationId ?? null,
    organizationName: item?.organizationName ?? '',
    organizationType: item?.organizationType ?? '',
    registrationNumber: item?.registrationNumber ?? '',
    description: item?.description ?? '',
    email: item?.email ?? '',
    phoneNumber: item?.phoneNumber ?? '',
    address: item?.address ?? '',
    latitude: item?.latitude ?? null,
    longitude: item?.longitude ?? null,
    website: item?.website ?? '',
    primaryContactName: item?.primaryContactName ?? '',
    emergencyContactPhone: item?.emergencyContactPhone ?? '',
    preferredLanguage: item?.preferredLanguage || 'en',
    emailAlertsEnabled: typeof item?.emailAlertsEnabled === 'boolean' ? item.emailAlertsEnabled : true,
    crisisAlertsEnabled: typeof item?.crisisAlertsEnabled === 'boolean' ? item.crisisAlertsEnabled : true,
    requestAlertsEnabled: typeof item?.requestAlertsEnabled === 'boolean' ? item.requestAlertsEnabled : true,
    autoAssignNotifications: typeof item?.autoAssignNotifications === 'boolean' ? item.autoAssignNotifications : true,
    compactTables: typeof item?.compactTables === 'boolean' ? item.compactTables : false,
    isActive: typeof item?.isActive === 'boolean' ? item.isActive : true,
    createdAt: item?.createdAt ?? null,
    memberCount: typeof item?.memberCount === 'number' ? item.memberCount : 0,
  };
}

function normalizeOptionalString(value) {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const organizationSettingsService = {
  /**
   * Fetch live organization profile from GET /api/organizations/{id}
   */
  async getOrganizationProfile(organizationId) {
    if (!organizationId) {
      throw {
        status: 400,
        title: 'No Active Organization',
        detail: 'Select an active organization before loading organization profile settings.',
        message: 'Select an active organization before loading organization profile settings.',
      };
    }

    if (USE_MOCK_API) {
      const mock = organizationSettingsService.getSettings().organization;
      return {
        organizationId: Number(organizationId),
        organizationName: mock.name,
        organizationType: mock.type,
        registrationNumber: mock.registrationNumber,
        description: mock.description || '',
        email: mock.email,
        phoneNumber: mock.phone,
        address: mock.address,
        isActive: true,
        createdAt: null,
        memberCount: 0,
      };
    }

    const response = await axiosClient.get(`/organizations/${Number(organizationId)}`);
    return mapOrganizationProfileFromApi(response.data);
  },

  /**
   * Update live organization profile via PUT /api/organizations/{id}
   * Sends only fields explicitly supported by backend UpdateOrganizationRequest.
   */
  async updateOrganizationProfile(organizationId, profile) {
    if (!organizationId) {
      throw {
        status: 400,
        title: 'No Active Organization',
        detail: 'Select an active organization before saving organization profile settings.',
        message: 'Select an active organization before saving organization profile settings.',
      };
    }

    const payload = {
      organizationName: (profile.organizationName ?? '').trim(),
      organizationType: (profile.organizationType ?? '').trim(),
      registrationNumber: normalizeOptionalString(profile.registrationNumber),
      description: normalizeOptionalString(profile.description),
      email: normalizeOptionalString(profile.email),
      phoneNumber: normalizeOptionalString(profile.phoneNumber),
      address: normalizeOptionalString(profile.address),
      latitude: profile.latitude !== '' && profile.latitude != null ? Number(profile.latitude) : null,
      longitude: profile.longitude !== '' && profile.longitude != null ? Number(profile.longitude) : null,
      website: normalizeOptionalString(profile.website),
      primaryContactName: normalizeOptionalString(profile.primaryContactName),
      emergencyContactPhone: normalizeOptionalString(profile.emergencyContactPhone),
      preferredLanguage: profile.preferredLanguage || 'en',
      emailAlertsEnabled: typeof profile.emailAlertsEnabled === 'boolean' ? profile.emailAlertsEnabled : true,
      crisisAlertsEnabled: typeof profile.crisisAlertsEnabled === 'boolean' ? profile.crisisAlertsEnabled : true,
      requestAlertsEnabled: typeof profile.requestAlertsEnabled === 'boolean' ? profile.requestAlertsEnabled : true,
      autoAssignNotifications: typeof profile.autoAssignNotifications === 'boolean' ? profile.autoAssignNotifications : true,
      compactTables: typeof profile.compactTables === 'boolean' ? profile.compactTables : false,
      isActive: typeof profile.isActive === 'boolean' ? profile.isActive : true,
    };

    if (USE_MOCK_API) {
      return {
        ...profile,
        ...payload,
        organizationId: Number(organizationId),
      };
    }

    const response = await axiosClient.put(
      `/organizations/${Number(organizationId)}`,
      payload
    );
    return mapOrganizationProfileFromApi(response.data);
  },

  async changePassword(currentPassword, newPassword) {
    if (USE_MOCK_API) return { message: 'Password updated in mock mode.' };
    const response = await axiosClient.post('/Auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Validate live organization profile against backend UpdateOrganizationRequest constraints
   */
  validateOrganizationProfile: (profile) => {
    const errors = {};
    const name = (profile?.organizationName ?? '').trim();
    const type = (profile?.organizationType ?? '').trim();
    const regNo = (profile?.registrationNumber ?? '').trim();
    const desc = (profile?.description ?? '').trim();
    const email = (profile?.email ?? '').trim();
    const phone = (profile?.phoneNumber ?? '').trim();
    const address = (profile?.address ?? '').trim();

    if (name.length < 2 || name.length > 200) {
      errors.organizationName = 'Organization name must be between 2 and 200 characters.';
    }
    if (type.length < 2 || type.length > 50) {
      errors.organizationType = 'Organization type must be between 2 and 50 characters.';
    }
    if (regNo.length > 100) {
      errors.registrationNumber = 'Registration number cannot exceed 100 characters.';
    }
    if (desc.length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && (!emailRegex.test(email) || email.length > 256)) {
      errors.email = 'Enter a valid email address (max 256 characters).';
    }
    if (phone.length > 20) {
      errors.phoneNumber = 'Phone number cannot exceed 20 characters.';
    }
    if (address.length > 500) {
      errors.address = 'Address cannot exceed 500 characters.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Retrieve local-only browser UI preferences scoped to the active organization
   */
  getLocalPreferences: (organizationId) => {
    if (!organizationId) return { ...DEFAULT_LOCAL_PREFERENCES };
    try {
      const stored = localStorage.getItem(`${LOCAL_PREFS_PREFIX}${organizationId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_LOCAL_PREFERENCES, ...parsed };
      }
    } catch {
      // ignore storage errors
    }
    return { ...DEFAULT_LOCAL_PREFERENCES };
  },

  /**
   * Save local-only browser UI preferences scoped to the active organization
   */
  saveLocalPreferences: (organizationId, prefs) => {
    if (!organizationId) {
      return { success: false, error: 'No active organization selected.' };
    }
    try {
      const merged = { ...DEFAULT_LOCAL_PREFERENCES, ...prefs };
      localStorage.setItem(`${LOCAL_PREFS_PREFIX}${organizationId}`, JSON.stringify(merged));
      return { success: true, preferences: merged };
    } catch {
      return { success: false, error: 'Could not save browser preferences to local storage.' };
    }
  },

  /**
   * Mock-only: Retrieve settings from localStorage or fallback to defaults
   */
  getSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to ensure any new keys exist
        return {
          organization: { ...defaultOrganizationSettings.organization, ...(parsed.organization || {}) },
          admin: { ...defaultOrganizationSettings.admin, ...(parsed.admin || {}) },
          operational: {
            ...defaultOrganizationSettings.operational,
            ...(parsed.operational || {}),
            humanitarianServices: parsed.operational?.humanitarianServices || defaultOrganizationSettings.operational.humanitarianServices
          },
          notifications: { ...defaultOrganizationSettings.notifications, ...(parsed.notifications || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to parse stored organization settings, using defaults.', e);
    }
    return JSON.parse(JSON.stringify(defaultOrganizationSettings));
  },

  /**
   * Persist updated settings to localStorage
   */
  saveSettings: (updatedSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      return { success: true, settings: updatedSettings };
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
      return { success: false, error: 'Could not write to local storage.' };
    }
  },

  /**
   * Reset settings to default SLRCS state
   */
  resetSettings: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear stored settings:', e);
    }
    return JSON.parse(JSON.stringify(defaultOrganizationSettings));
  },

  /**
   * Validation helpers
   */
  validateSettings: (settings) => {
    const errors = {};
    const org = settings.organization || {};
    const admin = settings.admin || {};

    // Organization Name
    if (!org.name?.trim()) {
      errors['organization.name'] = 'Organization name is required.';
    }

    // Registration Number
    if (!org.registrationNumber?.trim()) {
      errors['organization.registrationNumber'] = 'Registration number is required.';
    }

    // Organization Type
    if (!org.type?.trim()) {
      errors['organization.type'] = 'Organization type is required.';
    }

    // Address
    if (!org.address?.trim()) {
      errors['organization.address'] = 'Head office address is required.';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!org.email?.trim()) {
      errors['organization.email'] = 'Official email address is required.';
    } else if (!emailRegex.test(org.email.trim())) {
      errors['organization.email'] = 'Enter a valid official email address.';
    }

    // Contact number validation
    if (!org.phone?.trim()) {
      errors['organization.phone'] = 'Official contact number is required.';
    }

    // Emergency phone validation
    if (!org.emergencyPhone?.trim()) {
      errors['organization.emergencyPhone'] = 'Emergency contact number is required.';
    }

    // Admin validation
    if (!admin.fullName?.trim()) {
      errors['admin.fullName'] = 'Administrator full name is required.';
    }
    if (!admin.designation?.trim()) {
      errors['admin.designation'] = 'Administrator designation is required.';
    }
    if (!admin.email?.trim()) {
      errors['admin.email'] = 'Administrator email address is required.';
    } else if (!emailRegex.test(admin.email.trim())) {
      errors['admin.email'] = 'Enter a valid administrator email address.';
    }
    if (!admin.phone?.trim()) {
      errors['admin.phone'] = 'Administrator contact number is required.';
    }

    // Operational preferences
    if (!settings.operational?.primaryDistrict) {
      errors['operational.primaryDistrict'] = 'Please select a primary operational district.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Password validation helper
   */
  validatePasswordForm: (currentPassword, newPassword, confirmPassword) => {
    const errors = {};
    if (!currentPassword) {
      errors.currentPassword = 'Enter your current password.';
    }
    if (!newPassword) {
      errors.newPassword = 'Enter a new password.';
    } else {
      if (newPassword.length < 8) {
        errors.newPassword = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(newPassword)) {
        errors.newPassword = 'Password must include at least one uppercase letter (A-Z).';
      } else if (!/[a-z]/.test(newPassword)) {
        errors.newPassword = 'Password must include at least one lowercase letter (a-z).';
      } else if (!/[0-9]/.test(newPassword)) {
        errors.newPassword = 'Password must include at least one number (0-9).';
      } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
        errors.newPassword = 'Password must include at least one special character.';
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword && newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};
