import React, { useState, useEffect, useMemo } from 'react';
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
import { OrganizationProfileSection } from './OrganizationProfileSection';
import { AdminProfileSection } from './AdminProfileSection';
import { OperationalPreferencesSection } from './OperationalPreferencesSection';
import { NotificationPreferencesSection } from './NotificationPreferencesSection';
import { AccountSecuritySection } from './AccountSecuritySection';

export const OrganizationSettingsPage = () => {
  // Active settings subtab
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'admin' | 'operational' | 'notifications' | 'security' | 'all'

  // Persisted state vs Working form state
  const [savedSettings, setSavedSettings] = useState(() => organizationSettingsService.getSettings());
  const [workingSettings, setWorkingSettings] = useState(() => organizationSettingsService.getSettings());

  // Validation errors & feedback alerts
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'notice', message: string, title?: string }

  // Check if form is dirty (has unsaved changes)
  const isDirty = useMemo(() => {
    return JSON.stringify(savedSettings) !== JSON.stringify(workingSettings);
  }, [savedSettings, workingSettings]);

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
