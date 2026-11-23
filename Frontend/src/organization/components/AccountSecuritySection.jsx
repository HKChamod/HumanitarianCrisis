import React, { useState } from 'react';
import {
  IconLock,
  IconKey,
  IconEye,
  IconEyeOff,
  IconAlertTriangle,
  IconShieldCheck
} from './Icons';
import { organizationSettingsService } from '../services/organizationSettingsService';

export const AccountSecuritySection = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [apiNotice, setApiNotice] = useState(null);

  // Live password validation checklist
  const rules = [
    { label: 'At least 8 characters long', valid: newPassword.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one numeric digit (0-9)', valid: /[0-9]/.test(newPassword) },
    { label: 'At least one special character (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) },
    { label: 'Passwords match', valid: newPassword.length > 0 && newPassword === confirmPassword }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setApiNotice(null);

    const validation = organizationSettingsService.validatePasswordForm(
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});

    // NOTE: Per requirement: "Do not simulate successful password changes when no authentication API is connected."
    // We clearly inform the administrator about the backend contract status.
    setApiNotice({
      type: 'warning',
      title: 'Backend Authentication API Required',
      message: 'The endpoint POST /api/auth/change-password is pending backend implementation. Your existing credentials remain securely unchanged on the server.'
    });
  };

  const handleReset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setApiNotice(null);
  };

  return (
    <section className="org-settings-card" aria-label="Account Security">
      <div className="org-settings-card-header">
        <div>
          <h2>
            <IconLock size={20} color="#10756F" />
            Account Security & Access
          </h2>
          <p>Maintain your account credentials, security preferences, and authentication keys.</p>
        </div>
      </div>

      {/* Security API Status Notice */}
      {apiNotice && (
        <div className={`org-settings-alert ${apiNotice.type}`} style={{ marginBottom: '20px' }}>
          <IconAlertTriangle size={18} color="#92400E" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div className="org-settings-alert-content">
            <div className="org-settings-alert-title">{apiNotice.title}</div>
            <div>{apiNotice.message}</div>
          </div>
          <button
            type="button"
            className="org-settings-alert-close"
            onClick={() => setApiNotice(null)}
            aria-label="Close alert"
          >
            &times;
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="org-settings-grid single-col" style={{ maxWidth: '640px' }}>
          {/* Current Password */}
          <div className="org-settings-field">
            <label className="org-settings-label" htmlFor="current-password">
              Current Password <span className="required">*</span>
            </label>
            <div className="org-password-wrapper">
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                className={`org-settings-input ${errors.currentPassword ? 'is-invalid' : ''}`}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) setErrors({ ...errors, currentPassword: null });
                }}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="org-password-toggle-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
              >
                {showCurrent ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <span className="org-settings-error-text">{errors.currentPassword}</span>
            )}
          </div>

          {/* New Password */}
          <div className="org-settings-field">
            <label className="org-settings-label" htmlFor="new-password">
              New Password <span className="required">*</span>
            </label>
            <div className="org-password-wrapper">
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                className={`org-settings-input ${errors.newPassword ? 'is-invalid' : ''}`}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors({ ...errors, newPassword: null });
                }}
                placeholder="Create strong new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="org-password-toggle-btn"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
              >
                {showNew ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <span className="org-settings-error-text">{errors.newPassword}</span>
            )}

            {/* Password Validation Checklist */}
            <div className="org-password-rules-box">
              <div className="org-password-rules-title">Password Complexity Requirements:</div>
              <ul className="org-password-rules-list">
                {rules.map((rule, idx) => (
                  <li key={idx} className={`org-password-rule-item ${rule.valid ? 'valid' : ''}`}>
                    <span className="org-rule-icon">
                      {rule.valid ? '✓' : '•'}
                    </span>
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="org-settings-field">
            <label className="org-settings-label" htmlFor="confirm-password">
              Confirm New Password <span className="required">*</span>
            </label>
            <div className="org-password-wrapper">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                className={`org-settings-input ${errors.confirmPassword ? 'is-invalid' : ''}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                placeholder="Re-type new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="org-password-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="org-settings-error-text">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Security Form Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="submit"
              className="org-btn-primary"
            >
              <IconKey size={16} />
              Update Password
            </button>
            <button
              type="button"
              className="org-btn-secondary"
              onClick={handleReset}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
