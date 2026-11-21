import React from 'react';
import {
  IconUser,
  IconLock,
  IconMail,
  IconPhone,
  IconShieldCheck
} from './Icons';

export const AdminProfileSection = ({
  formData,
  onChange,
  errors = {}
}) => {
  const admin = formData.admin || {};

  const handleFieldChange = (field, value) => {
    onChange('admin', {
      ...admin,
      [field]: value
    });
  };

  return (
    <section className="org-settings-card" aria-label="Administrator Profile">
      <div className="org-settings-card-header">
        <div>
          <h2>
            <IconUser size={20} color="#10756F" />
            Administrator Profile
          </h2>
          <p>Lead officer in charge of organization dispatch authority and operational command.</p>
        </div>
      </div>

      {/* Administrator Avatar & Role Header */}
      <div className="org-admin-header-row">
        <div className="org-admin-avatar">
          {admin.avatarInitials || 'KJ'}
        </div>
        <div className="org-admin-header-info">
          <div className="org-admin-header-name">
            {admin.fullName || 'Lead Officer'}
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            {admin.designation || 'Provincial Response Director'}
          </div>
          <div className="org-admin-header-role">
            <IconShieldCheck size={13} color="#10756F" />
            <span>Active Command Authority</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="org-settings-grid">
        {/* Full Name */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="admin-name">
            Full Name <span className="required">*</span>
          </label>
          <input
            id="admin-name"
            type="text"
            className={`org-settings-input ${errors['admin.fullName'] ? 'is-invalid' : ''}`}
            value={admin.fullName || ''}
            onChange={(e) => handleFieldChange('fullName', e.target.value)}
            placeholder="e.g. Dr. K. Jayasuriya"
          />
          {errors['admin.fullName'] && (
            <span className="org-settings-error-text">{errors['admin.fullName']}</span>
          )}
        </div>

        {/* Designation */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="admin-designation">
            Designation / Title <span className="required">*</span>
          </label>
          <input
            id="admin-designation"
            type="text"
            className={`org-settings-input ${errors['admin.designation'] ? 'is-invalid' : ''}`}
            value={admin.designation || ''}
            onChange={(e) => handleFieldChange('designation', e.target.value)}
            placeholder="e.g. Provincial Response Director"
          />
          {errors['admin.designation'] && (
            <span className="org-settings-error-text">{errors['admin.designation']}</span>
          )}
        </div>

        {/* Email Address */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="admin-email">
            <IconMail size={14} color="#64748B" /> Email Address <span className="required">*</span>
          </label>
          <input
            id="admin-email"
            type="email"
            className={`org-settings-input ${errors['admin.email'] ? 'is-invalid' : ''}`}
            value={admin.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="k.jayasuriya@redcross.lk"
          />
          {errors['admin.email'] && (
            <span className="org-settings-error-text">{errors['admin.email']}</span>
          )}
          <span className="org-settings-helper">Used for primary system notifications and security alerts.</span>
        </div>

        {/* Contact Number */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="admin-phone">
            <IconPhone size={14} color="#64748B" /> Contact Number <span className="required">*</span>
          </label>
          <input
            id="admin-phone"
            type="tel"
            className={`org-settings-input ${errors['admin.phone'] ? 'is-invalid' : ''}`}
            value={admin.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="+94 77 123 4567"
          />
          {errors['admin.phone'] && (
            <span className="org-settings-error-text">{errors['admin.phone']}</span>
          )}
          <span className="org-settings-helper">Direct mobile for rapid field verification calls.</span>
        </div>

        {/* Account Role (Read-Only) */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label">
            Account Role & Authorization Level
          </label>
          <div className="org-role-readonly-box">
            <IconLock size={20} color="#64748B" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div className="org-role-badge-text">
                <span>{admin.role || 'Organization Administrator'}</span>
                <span className="org-role-badge-pill">Read Only</span>
              </div>
              <div className="org-role-desc">
                {admin.roleDescription || 'Full administrative authority for disaster management operations.'}
              </div>
              <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '6px' }}>
                Assigned on {admin.roleAssignedDate || '2024-01-10'} • Controlled by ReliefLink RBAC policy. Role modifications require System Superadmin authorization.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
