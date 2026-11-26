import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import '../styles/OrganizationSettings.css';
import {
  IconSettings,
  IconBuilding,
  IconUser,
  IconBell,
  IconLock,
  IconShieldCheck,
  IconCheckCircle,
  IconAlertTriangle,
  IconRotateCcw
} from './Icons';
import { organizationSettingsService } from '../services/organizationSettingsService';
import { organizationOperationsService } from '../services/organizationOperationsService';
import { OrganizationProfileSection } from './OrganizationProfileSection';
import { AdminProfileSection } from './AdminProfileSection';
import { OperationalPreferencesSection } from './OperationalPreferencesSection';
import { NotificationPreferencesSection } from './NotificationPreferencesSection';
import { AccountSecuritySection } from './AccountSecuritySection';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { useAuth } from '../../app/providers/AuthProvider';

export const OrganizationSettingsPage = () => {
  const {
    activeOrganizationId,
    activeOrganizationAccess,
    orgRoles,
    refreshMemberships,
  } = useOrganization();
  const { user, logout } = useAuth();

  // Active settings subtab
  const [activeSubTab, setActiveSubTab] = useState('profile');

  // Mock-mode state (isolated to USE_MOCK_API === true)
  const [savedSettings, setSavedSettings] = useState(() =>
    USE_MOCK_API ? organizationSettingsService.getSettings() : null
  );
  const [workingSettings, setWorkingSettings] = useState(() =>
    USE_MOCK_API ? organizationSettingsService.getSettings() : null
  );

  // Live-mode state (backend organization profile + explicitly local browser preferences)
  const [liveProfile, setLiveProfile] = useState(null);
  const [savedLiveProfile, setSavedLiveProfile] = useState(null);
  const [liveLoading, setLiveLoading] = useState(!USE_MOCK_API);
  const [liveSaving, setLiveSaving] = useState(false);
  const [liveLoadError, setLiveLoadError] = useState(null);
  const [localPrefs, setLocalPrefs] = useState(() =>
    organizationSettingsService.getLocalPreferences(activeOrganizationId)
  );
  const [orgRolesList, setOrgRolesList] = useState([]);
  const [orgMembersList, setOrgMembersList] = useState([]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const requestSeqRef = useRef(0);
  const activeOrgIdRef = useRef(activeOrganizationId);

  // Validation errors & feedback alerts
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);

  const loadLiveProfile = useCallback(async () => {
    if (USE_MOCK_API) return;
    const seq = ++requestSeqRef.current;

    setLiveSaving(false);

    if (!activeOrganizationId) {
      setLiveProfile(null);
      setSavedLiveProfile(null);
      setLiveLoadError(null);
      setLiveLoading(false);
      return;
    }

    setLiveLoading(true);
    setLiveLoadError(null);
    setLiveProfile(null);
    setSavedLiveProfile(null);
    setErrors({});
    setFeedback(null);

    try {
      const [profile, rolesRes, membersRes] = await Promise.all([
        organizationSettingsService.getOrganizationProfile(activeOrganizationId),
        organizationOperationsService.getOrganizationRoles(activeOrganizationId).catch(() => ({ items: [] })),
        organizationOperationsService.getOrganizationMembers(activeOrganizationId).catch(() => ({ items: [] })),
      ]);
      if (requestSeqRef.current !== seq || activeOrgIdRef.current !== activeOrganizationId) return;
      setLiveProfile(profile);
      setSavedLiveProfile(profile);
      setOrgRolesList(Array.isArray(rolesRes?.items) ? rolesRes.items : []);
      setOrgMembersList(Array.isArray(membersRes?.items) ? membersRes.items : []);
      setLiveLoading(false);
    } catch (err) {
      if (requestSeqRef.current !== seq || activeOrgIdRef.current !== activeOrganizationId) return;
      setLiveLoadError(err?.detail || err?.message || 'Failed to load organization profile.');
      setLiveLoading(false);
    }
  }, [activeOrganizationId]);

  useEffect(() => {
    activeOrgIdRef.current = activeOrganizationId;
    if (USE_MOCK_API) return undefined;
    setLocalPrefs(organizationSettingsService.getLocalPreferences(activeOrganizationId));
    loadLiveProfile();
    return () => {
      requestSeqRef.current += 1;
    };
  }, [activeOrganizationId, loadLiveProfile]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!USE_MOCK_API) {
      if (!liveProfile || !savedLiveProfile) return false;
      return JSON.stringify(liveProfile) !== JSON.stringify(savedLiveProfile);
    }
    return JSON.stringify(savedSettings) !== JSON.stringify(workingSettings);
  }, [savedSettings, workingSettings, liveProfile, savedLiveProfile]);

  const handleLiveFieldChange = (field, value) => {
    setLiveProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (feedback?.type === 'error') {
      setFeedback(null);
    }
  };

  const handleLiveSaveProfile = async (e) => {
    e.preventDefault();
    if (!liveProfile || !activeOrganizationId || liveSaving) return;

    const validation = organizationSettingsService.validateOrganizationProfile(liveProfile);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setFeedback({
        type: 'error',
        title: 'Validation Error',
        message: 'Please correct the highlighted organization profile fields before saving.',
      });
      return;
    }

    const targetOrgId = activeOrganizationId;
    const previousOrgName = savedLiveProfile?.organizationName ?? '';
    const seq = ++requestSeqRef.current;
    const isStale = () =>
      requestSeqRef.current !== seq || activeOrgIdRef.current !== targetOrgId;

    setLiveSaving(true);
    setFeedback(null);
    try {
      const updated = await organizationSettingsService.updateOrganizationProfile(
        targetOrgId,
        liveProfile
      );
      if (isStale()) return;

      setLiveProfile(updated);
      setSavedLiveProfile(updated);
      setErrors({});
      setFeedback({
        type: 'success',
        title: 'Organization Profile Updated',
        message: 'Organization profile changes were saved to the HCMS backend.',
      });

      if (updated.organizationName !== previousOrgName) {
        try {
          await refreshMemberships({ preserveError: true });
        } catch {
          // Profile PUT succeeded; do not report a membership refresh failure as a save failure
        }
      }
    } catch (err) {
      if (isStale()) return;
      setFeedback({
        type: 'error',
        title: err?.title || 'Save Failed',
        message: err?.detail || err?.message || 'Unable to update organization profile.',
      });
    } finally {
      if (!isStale()) {
        setLiveSaving(false);
      }
    }
  };

  const handleSaveLocalPreferences = () => {
    const res = organizationSettingsService.saveLocalPreferences(activeOrganizationId, localPrefs);
    if (res.success) {
      setFeedback({
        type: 'success',
        title: 'Browser Preferences Saved',
        message: 'Display preferences were saved to this browser only (not synced to the backend).',
      });
    } else {
      setFeedback({
        type: 'error',
        title: 'Save Failed',
        message: res.error || 'Could not save browser preferences.',
      });
    }
  };

  // Scroll to top on tab change or feedback
  const handleSelectSubTab = (tabKey) => {
    setActiveSubTab(tabKey);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Section update handler
  const handleSectionChange = (sectionKey, updatedSectionData) => {
    setWorkingSettings(prev => ({
      ...prev,
      [sectionKey]: updatedSectionData
    }));

    // Clear field errors for the modified section
    setErrors(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(sectionKey + '.')) {
          delete next[k];
        }
      });
      return next;
    });

    if (feedback?.type === 'error') {
      setFeedback(null);
    }
  };

  // Save changes
  const handleSave = () => {
    const validation = organizationSettingsService.validateSettings(workingSettings);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setFeedback({
        type: 'error',
        title: 'Please correct the validation errors',
        message: 'Some required fields are missing or formatted incorrectly. Please review highlighted inputs.'
      });

      // Switch to the tab containing the first error if on a specific tab
      const firstErrorKey = Object.keys(validation.errors)[0];
      if (firstErrorKey && activeSubTab !== 'all') {
        if (firstErrorKey.startsWith('organization.')) setActiveSubTab('profile');
        else if (firstErrorKey.startsWith('admin.')) setActiveSubTab('admin');
        else if (firstErrorKey.startsWith('operational.')) setActiveSubTab('operational');
      }
      return;
    }

    // Persist to local storage service
    const result = organizationSettingsService.saveSettings(workingSettings);
    if (result.success) {
      setSavedSettings(JSON.parse(JSON.stringify(workingSettings)));
      setErrors({});
      setFeedback({
        type: 'success',
        title: 'Settings Saved',
        message: 'Organization profile and operational preferences have been updated and saved locally.'
      });
    } else {
      setFeedback({
        type: 'error',
        title: 'Save Failed',
        message: result.error || 'Failed to save settings.'
      });
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setWorkingSettings(JSON.parse(JSON.stringify(savedSettings)));
    setErrors({});
    setFeedback({
      type: 'notice',
      title: 'Changes Discarded',
      message: 'Unsaved modifications have been reset back to the last saved configuration.'
    });
  };

  // Reset to default SLRCS mock
  const handleResetToDefaults = () => {
    if (window.confirm('Reset all organization settings back to default Sri Lanka Red Cross Society configuration?')) {
      const defaults = organizationSettingsService.resetSettings();
      setSavedSettings(defaults);
      setWorkingSettings(defaults);
      setErrors({});
      setFeedback({
        type: 'success',
        title: 'Reset to Factory Defaults',
        message: 'All organization settings have been restored to default Sri Lanka Red Cross Society parameters.'
      });
    }
  };

  if (!USE_MOCK_API) {
    return (
      <div className="org-settings-page">
        <div className="org-settings-header">
          <div className="org-settings-title-group">
            <h1>Organization Settings</h1>
            <p>
              Manage backend-backed profile details for{' '}
              <strong>
                {activeOrganizationAccess?.organizationName ||
                  liveProfile?.organizationName ||
                  'your active organization'}
              </strong>
              .
            </p>
          </div>
        </div>

        {feedback && (
          <div className={`org-settings-alert ${feedback.type}`}>
            {feedback.type === 'success' && (
              <IconCheckCircle size={18} color="#065F46" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            {feedback.type === 'error' && (
              <IconAlertTriangle size={18} color="#991B1B" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            {feedback.type === 'notice' && (
              <IconSettings size={18} color="#0369A1" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div className="org-settings-alert-content">
              {feedback.title && <div className="org-settings-alert-title">{feedback.title}</div>}
              <div>{feedback.message}</div>
            </div>
            <button
              type="button"
              className="org-settings-alert-close"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss feedback"
            >
              &times;
            </button>
          </div>
        )}

        <nav className="org-settings-tabs-nav" aria-label="Settings navigation">
          <button
            type="button"
            className={`org-settings-tab-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleSelectSubTab('profile')}
          >
            <IconBuilding size={16} />
            Organization Profile &amp; Contacts
          </button>
          <button
            type="button"
            className={`org-settings-tab-btn ${activeSubTab === 'preferences' ? 'active' : ''}`}
            onClick={() => handleSelectSubTab('preferences')}
          >
            <IconBell size={16} />
            Organization Preferences
          </button>
          <button
            type="button"
            className={`org-settings-tab-btn ${activeSubTab === 'access' ? 'active' : ''}`}
            onClick={() => handleSelectSubTab('access')}
          >
            <IconShieldCheck size={16} />
            Membership &amp; Access
          </button>
          <button
            type="button"
            className={`org-settings-tab-btn ${activeSubTab === 'security' ? 'active' : ''}`}
            onClick={() => handleSelectSubTab('security')}
          >
            <IconLock size={16} />
            Account Security
          </button>
        </nav>

        {activeSubTab === 'profile' && (
          <div className="org-settings-section-card">
            {!activeOrganizationId && (
              <div className="org-state-box">
                <IconBuilding size={26} color="#64748B" />
                <h3 className="org-state-title">No Active Organization Selected</h3>
                <p className="org-state-desc">
                  Select an approved organization to view or manage its backend profile.
                </p>
              </div>
            )}

            {activeOrganizationId && liveLoading && (
              <div style={{ padding: '24px' }}>
                <div className="org-skeleton-row"></div>
                <div className="org-skeleton-row"></div>
                <div className="org-skeleton-row"></div>
              </div>
            )}

            {activeOrganizationId && !liveLoading && liveLoadError && (
              <div className="org-state-box">
                <IconAlertTriangle size={26} color="#DC2626" />
                <h3 className="org-state-title">Unable to Load Organization Profile</h3>
                <p className="org-state-desc">{liveLoadError}</p>
                <button
                  type="button"
                  className="org-btn-primary"
                  onClick={loadLiveProfile}
                  style={{ marginTop: '8px' }}
                >
                  Retry
                </button>
              </div>
            )}

            {activeOrganizationId && !liveLoading && !liveLoadError && liveProfile && (
              <form onSubmit={handleLiveSaveProfile}>
                <div className="org-settings-section-header">
                  <div>
                    <h2 className="org-settings-section-title">Organization Profile</h2>
                    <p className="org-settings-section-desc">
                      Loaded from and saved directly to <code>GET / PUT /api/organizations/{activeOrganizationId}</code>.
                      Signed in as <strong>{user?.fullName || user?.email}</strong>
                      {orgRoles.length > 0 ? ` (${orgRoles.join(', ')})` : ''}.
                    </p>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Members: <strong>{liveProfile.memberCount}</strong>
                  </div>
                </div>

                <div className="org-settings-form-grid">
                  <div className="org-form-field">
                    <label htmlFor="liveOrgName">Organization Name *</label>
                    <input
                      id="liveOrgName"
                      type="text"
                      value={liveProfile.organizationName}
                      onChange={(e) => handleLiveFieldChange('organizationName', e.target.value)}
                      required
                    />
                    {errors.organizationName && (
                      <span className="org-field-error">{errors.organizationName}</span>
                    )}
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveOrgType">Organization Type *</label>
                    <input
                      id="liveOrgType"
                      type="text"
                      value={liveProfile.organizationType}
                      onChange={(e) => handleLiveFieldChange('organizationType', e.target.value)}
                      required
                    />
                    {errors.organizationType && (
                      <span className="org-field-error">{errors.organizationType}</span>
                    )}
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveRegNumber">Registration Number</label>
                    <input
                      id="liveRegNumber"
                      type="text"
                      value={liveProfile.registrationNumber}
                      onChange={(e) => handleLiveFieldChange('registrationNumber', e.target.value)}
                    />
                    {errors.registrationNumber && (
                      <span className="org-field-error">{errors.registrationNumber}</span>
                    )}
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveEmail">Official Email</label>
                    <input
                      id="liveEmail"
                      type="email"
                      value={liveProfile.email}
                      onChange={(e) => handleLiveFieldChange('email', e.target.value)}
                    />
                    {errors.email && <span className="org-field-error">{errors.email}</span>}
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="livePhone">Phone Number</label>
                    <input
                      id="livePhone"
                      type="tel"
                      value={liveProfile.phoneNumber}
                      onChange={(e) => handleLiveFieldChange('phoneNumber', e.target.value)}
                    />
                    {errors.phoneNumber && (
                      <span className="org-field-error">{errors.phoneNumber}</span>
                    )}
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveAddress">Address</label>
                    <input
                      id="liveAddress"
                      type="text"
                      value={liveProfile.address}
                      onChange={(e) => handleLiveFieldChange('address', e.target.value)}
                    />
                    {errors.address && <span className="org-field-error">{errors.address}</span>}
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveWebsite">Website</label>
                    <input
                      id="liveWebsite"
                      type="url"
                      placeholder="https://organization.org"
                      value={liveProfile.website || ''}
                      onChange={(e) => handleLiveFieldChange('website', e.target.value)}
                    />
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="livePrimaryContact">Primary Contact Person</label>
                    <input
                      id="livePrimaryContact"
                      type="text"
                      placeholder="Contact officer full name"
                      value={liveProfile.primaryContactName || ''}
                      onChange={(e) => handleLiveFieldChange('primaryContactName', e.target.value)}
                    />
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveEmergencyPhone">Emergency Contact Phone</label>
                    <input
                      id="liveEmergencyPhone"
                      type="text"
                      placeholder="+94 11 000 0000"
                      value={liveProfile.emergencyContactPhone || ''}
                      onChange={(e) => handleLiveFieldChange('emergencyContactPhone', e.target.value)}
                    />
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveLatitude">Latitude</label>
                    <input
                      id="liveLatitude"
                      type="number"
                      step="0.000001"
                      placeholder="6.9271"
                      value={liveProfile.latitude ?? ''}
                      onChange={(e) => handleLiveFieldChange('latitude', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>

                  <div className="org-form-field">
                    <label htmlFor="liveLongitude">Longitude</label>
                    <input
                      id="liveLongitude"
                      type="number"
                      step="0.000001"
                      placeholder="79.8612"
                      value={liveProfile.longitude ?? ''}
                      onChange={(e) => handleLiveFieldChange('longitude', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>

                  <div className="org-form-field" style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="liveDescription">Description</label>
                    <textarea
                      id="liveDescription"
                      rows={3}
                      value={liveProfile.description}
                      onChange={(e) => handleLiveFieldChange('description', e.target.value)}
                    />
                    {errors.description && (
                      <span className="org-field-error">{errors.description}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="org-btn-secondary"
                    disabled={!isDirty || liveSaving}
                    onClick={() => {
                      setLiveProfile(savedLiveProfile ? { ...savedLiveProfile } : null);
                      setErrors({});
                      setFeedback(null);
                    }}
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="org-btn-primary"
                    disabled={!isDirty || liveSaving}
                  >
                    <IconCheckCircle size={16} />
                    {liveSaving ? 'Saving...' : 'Save Organization Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeSubTab === 'preferences' && (
          <div className="org-settings-section-card">
            {!liveProfile ? (
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                {liveLoading ? 'Loading organization preferences...' : 'Select an active organization to manage preferences.'}
              </div>
            ) : (
              <form onSubmit={handleLiveSaveProfile}>
                <div className="org-settings-section-header">
                  <div>
                    <h2 className="org-settings-section-title">Organization Preferences</h2>
                    <p className="org-settings-section-desc">
                      Persisted in SQL Server for <strong>{liveProfile.organizationName}</strong> across sessions.
                    </p>
                  </div>
                </div>

                <div className="org-form-grid" style={{ marginBottom: '16px' }}>
                  <div className="org-form-field">
                    <label htmlFor="livePreferredLanguage">Preferred Language</label>
                    <select
                      id="livePreferredLanguage"
                      value={liveProfile.preferredLanguage || 'en'}
                      onChange={(e) => handleLiveFieldChange('preferredLanguage', e.target.value)}
                    >
                      <option value="en">English (en)</option>
                      <option value="si">Sinhala (si)</option>
                      <option value="ta">Tamil (ta)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(liveProfile.emailAlertsEnabled)}
                      onChange={(e) => handleLiveFieldChange('emailAlertsEnabled', e.target.checked)}
                    />
                    <span>Enable email alerts for organization operations</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(liveProfile.crisisAlertsEnabled)}
                      onChange={(e) => handleLiveFieldChange('crisisAlertsEnabled', e.target.checked)}
                    />
                    <span>Enable crisis alert notifications</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(liveProfile.requestAlertsEnabled)}
                      onChange={(e) => handleLiveFieldChange('requestAlertsEnabled', e.target.checked)}
                    />
                    <span>Enable citizen aid request notifications</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(liveProfile.autoAssignNotifications)}
                      onChange={(e) => handleLiveFieldChange('autoAssignNotifications', e.target.checked)}
                    />
                    <span>Notify team leaders on response team deployment</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#0F172A' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(liveProfile.compactTables)}
                      onChange={(e) => handleLiveFieldChange('compactTables', e.target.checked)}
                    />
                    <span>Use compact table row density</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button
                    type="button"
                    className="org-btn-secondary"
                    disabled={!isDirty || liveSaving}
                    onClick={() => {
                      setLiveProfile(savedLiveProfile ? { ...savedLiveProfile } : null);
                      setFeedback(null);
                    }}
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    className="org-btn-primary"
                    disabled={!isDirty || liveSaving}
                  >
                    <IconCheckCircle size={16} />
                    {liveSaving ? 'Saving...' : 'Save Organization Preferences'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeSubTab === 'access' && (
          <div className="org-settings-section-card">
            <div className="org-settings-section-header">
              <div>
                <h2 className="org-settings-section-title">Organization Membership &amp; Scoped Access</h2>
                <p className="org-settings-section-desc">
                  Roles assigned here are strictly scoped to <strong>{liveProfile?.organizationName || 'this organization'}</strong> and cannot grant global system administrator privileges.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '13px' }}>
              <strong>Your Active Organization Roles:</strong>{' '}
              {orgRoles.length > 0 ? orgRoles.join(', ') : 'Approved Member'}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Organization Administrators</h3>
              {orgMembersList.filter((m) => (m.roles || []).includes('OrganizationAdmin')).length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No OrganizationAdmin records visible for your current permission level.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {orgMembersList
                    .filter((m) => (m.roles || []).includes('OrganizationAdmin'))
                    .map((admin) => (
                      <div key={admin.membershipId} style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px' }}>
                        <strong>{admin.fullName}</strong> · <span style={{ color: '#64748B' }}>{admin.email}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Available Organization-Scoped Roles</h3>
              {orgRolesList.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#64748B' }}>No custom organization roles loaded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orgRolesList.map((r) => (
                    <div key={r.roleId} style={{ padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12.5px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{r.roleName}</div>
                      {r.description && <div style={{ color: '#64748B', marginTop: '2px' }}>{r.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'security' && (
          <div className="org-settings-section-card">
            <div className="org-settings-section-header">
              <div>
                <h2 className="org-settings-section-title">Account Security</h2>
                <p className="org-settings-section-desc">
                  Signed in as <strong>{user?.fullName || 'User'}</strong> ({user?.email}).
                </p>
              </div>
              <button
                type="button"
                className="org-btn-secondary"
                style={{ color: '#DC2626', borderColor: '#FECACA' }}
                onClick={logout}
              >
                Sign Out
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setFeedback(null);
                if (!passwordForm.currentPassword || passwordForm.newPassword.length < 8) {
                  setFeedback({
                    type: 'error',
                    title: 'Validation Error',
                    message: 'Enter your current password and a new password of at least 8 characters.',
                  });
                  return;
                }
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  setFeedback({
                    type: 'error',
                    title: 'Password Mismatch',
                    message: 'New password and confirmation do not match.',
                  });
                  return;
                }
                setChangingPassword(true);
                try {
                  await organizationSettingsService.changePassword(
                    passwordForm.currentPassword,
                    passwordForm.newPassword
                  );
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setFeedback({
                    type: 'success',
                    title: 'Password Updated',
                    message: 'Your account password has been updated.',
                  });
                } catch (err) {
                  setFeedback({
                    type: 'error',
                    title: 'Password Update Failed',
                    message: err?.detail || err?.message || 'Unable to update password.',
                  });
                } finally {
                  setChangingPassword(false);
                }
              }}
              style={{ maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div className="org-form-field">
                <label htmlFor="orgSecCurrentPass">Current Password</label>
                <input
                  id="orgSecCurrentPass"
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>
              <div className="org-form-field">
                <label htmlFor="orgSecNewPass">New Password (min 8 chars)</label>
                <input
                  id="orgSecNewPass"
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div className="org-form-field">
                <label htmlFor="orgSecConfirmPass">Confirm New Password</label>
                <input
                  id="orgSecConfirmPass"
                  type="password"
                  required
                  minLength={8}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
                <button type="submit" className="org-btn-primary" disabled={changingPassword}>
                  <IconLock size={15} />
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="org-settings-page">
      {/* Page Header */}
      <div className="org-settings-header">
        <div className="org-settings-title-group">
          <h1>Organization Settings</h1>
          <p>Manage your organization profile, operational preferences, and account settings.</p>
        </div>

        <div className="org-settings-header-actions">
          {isDirty && (
            <div className="org-unsaved-badge">
              <span className="org-unsaved-dot" />
              <span>Unsaved changes</span>
            </div>
          )}

          <button
            type="button"
            className="org-btn-secondary"
            onClick={handleResetToDefaults}
            title="Reset to default SLRCS configuration"
          >
            <IconRotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            type="button"
            className="org-btn-primary"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <IconCheckCircle size={16} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Demo storage status notice */}
      <div className="org-settings-alert notice">
        <IconShieldCheck size={18} color="#0369A1" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div className="org-settings-alert-content">
          <div className="org-settings-alert-title">ReliefLink Organization Preferences</div>
          <div>
            Settings are persisted locally in your browser storage. Backend identity and organization management contracts are ready for API v1 integration.
          </div>
        </div>
      </div>

      {/* Feedback Alert Toast/Banner */}
      {feedback && (
        <div className={`org-settings-alert ${feedback.type}`}>
          {feedback.type === 'success' && <IconCheckCircle size={18} color="#065F46" style={{ flexShrink: 0, marginTop: '2px' }} />}
          {feedback.type === 'error' && <IconAlertTriangle size={18} color="#991B1B" style={{ flexShrink: 0, marginTop: '2px' }} />}
          {feedback.type === 'notice' && <IconSettings size={18} color="#0369A1" style={{ flexShrink: 0, marginTop: '2px' }} />}
          <div className="org-settings-alert-content">
            {feedback.title && <div className="org-settings-alert-title">{feedback.title}</div>}
            <div>{feedback.message}</div>
          </div>
          <button
            type="button"
            className="org-settings-alert-close"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss feedback"
          >
            &times;
          </button>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <nav className="org-settings-tabs-nav" aria-label="Settings navigation">
        <button
          type="button"
          className={`org-settings-tab-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('profile')}
        >
          <IconBuilding size={16} />
          Organization Profile
        </button>

        <button
          type="button"
          className={`org-settings-tab-btn ${activeSubTab === 'admin' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('admin')}
        >
          <IconUser size={16} />
          Administrator Profile
        </button>

        <button
          type="button"
          className={`org-settings-tab-btn ${activeSubTab === 'operational' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('operational')}
        >
          <IconSettings size={16} />
          Operational Preferences
        </button>

        <button
          type="button"
          className={`org-settings-tab-btn ${activeSubTab === 'notifications' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('notifications')}
        >
          <IconBell size={16} />
          Notification Preferences
        </button>

        <button
          type="button"
          className={`org-settings-tab-btn ${activeSubTab === 'security' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('security')}
        >
          <IconLock size={16} />
          Account Security
        </button>

        <button
          type="button"
          className={`org-settings-tab-btn ${activeSubTab === 'all' ? 'active' : ''}`}
          onClick={() => handleSelectSubTab('all')}
        >
          View All Sections
        </button>
      </nav>

      {/* Settings Sections Rendered by Tab */}
      {(activeSubTab === 'profile' || activeSubTab === 'all') && (
        <OrganizationProfileSection
          formData={workingSettings}
          onChange={handleSectionChange}
          errors={errors}
        />
      )}

      {(activeSubTab === 'admin' || activeSubTab === 'all') && (
        <AdminProfileSection
          formData={workingSettings}
          onChange={handleSectionChange}
          errors={errors}
        />
      )}

      {(activeSubTab === 'operational' || activeSubTab === 'all') && (
        <OperationalPreferencesSection
          formData={workingSettings}
          onChange={handleSectionChange}
          errors={errors}
        />
      )}

      {(activeSubTab === 'notifications' || activeSubTab === 'all') && (
        <NotificationPreferencesSection
          formData={workingSettings}
          onChange={handleSectionChange}
        />
      )}

      {(activeSubTab === 'security' || activeSubTab === 'all') && (
        <AccountSecuritySection />
      )}

      {/* Bottom Actions Footer */}
      <div className="org-settings-actions-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isDirty ? (
            <span style={{ fontSize: '13px', color: '#B45309', fontWeight: 600 }}>
              ● Unsaved changes detected
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#047857', fontWeight: 600 }}>
              ✓ All changes saved
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="org-btn-secondary"
            onClick={handleDiscard}
            disabled={!isDirty}
          >
            Discard
          </button>
          <button
            type="button"
            className="org-btn-primary"
            onClick={handleSave}
            disabled={!isDirty}
          >
            <IconCheckCircle size={16} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Sticky Bottom Save Bar when Dirty */}
      {isDirty && (
        <div className="org-sticky-save-bar">
          <div className="org-sticky-save-text">
            <span className="org-unsaved-dot" />
            <span>You have unsaved changes in your organization settings.</span>
          </div>
          <div className="org-sticky-save-actions">
            <button
              type="button"
              className="org-btn-secondary"
              onClick={handleDiscard}
            >
              Discard Changes
            </button>
            <button
              type="button"
              className="org-btn-primary"
              onClick={handleSave}
            >
              <IconCheckCircle size={16} />
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
