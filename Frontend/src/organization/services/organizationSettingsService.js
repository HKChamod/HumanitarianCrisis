/**
 * Organization Settings Service
 * 
 * Manages organization profile, admin profile, operational preferences, and notifications.
 * Persists non-sensitive settings to browser localStorage for demo durability, with
 * fallback to the default Sri Lanka Red Cross Society mock state.
 */

import { defaultOrganizationSettings, PROVINCE_DISTRICT_MAP } from '../data/mockOrganizationSettings';

const STORAGE_KEY = 'relieflink_org_settings';

export const organizationSettingsService = {
  /**
   * Retrieve current settings from localStorage or fallback to defaults
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
