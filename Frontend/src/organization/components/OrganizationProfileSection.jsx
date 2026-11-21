import React, { useRef } from 'react';
import {
  IconBuilding,
  IconShieldCheck,
  IconEdit,
  IconGlobe,
  IconMail,
  IconPhone
} from './Icons';
import {
  ORGANIZATION_TYPES,
  SRI_LANKA_PROVINCES,
  PROVINCE_DISTRICT_MAP
} from '../data/mockOrganizationSettings';

export const OrganizationProfileSection = ({
  formData,
  onChange,
  errors = {}
}) => {
  const fileInputRef = useRef(null);
  const org = formData.organization || {};

  const handleFieldChange = (field, value) => {
    onChange('organization', {
      ...org,
      [field]: value
    });
  };

  const handleProvinceChange = (province) => {
    const districts = PROVINCE_DISTRICT_MAP[province] || [];
    const newDistrict = districts.includes(org.district) ? org.district : (districts[0] || '');
    onChange('organization', {
      ...org,
      province,
      district: newDistrict
    });
  };

  const handleSimulateLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleFieldChange('logoUrl', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const availableDistricts = PROVINCE_DISTRICT_MAP[org.province] || [];

  return (
    <section className="org-settings-card" aria-label="Organization Profile">
      <div className="org-settings-card-header">
        <div>
          <h2>
            <IconBuilding size={20} color="#10756F" />
            Organization Profile
          </h2>
          <p>Official registration, headquarters details, and verified humanitarian credentials.</p>
        </div>
      </div>

      {/* Organization Logo & Verification Banner */}
      <div className="org-logo-upload-section">
        <div className="org-logo-preview-box" title={org.name}>
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} />
          ) : (
            <span>{org.logoInitials || 'SLRCS'}</span>
          )}
        </div>
        <div className="org-logo-upload-info">
          <div className="org-logo-upload-title">
            <span>{org.name || 'Organization Name'}</span>
            {org.verified && (
              <span className="org-verified-badge" title="National Disaster Management Certified">
                <IconShieldCheck size={12} color="#047857" />
                Verified Organization
              </span>
            )}
          </div>
          <div className="org-logo-upload-desc">
            Established in {org.establishedYear || '1951'} • Registration: {org.registrationNumber || 'Pending'}
          </div>
          <div className="org-logo-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSimulateLogoUpload}
              accept="image/png, image/jpeg, image/svg+xml"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="org-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '12.5px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconEdit size={14} />
              Change Logo
            </button>
            {org.logoUrl && (
              <button
                type="button"
                className="org-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12.5px', color: '#DC2626' }}
                onClick={() => handleFieldChange('logoUrl', '')}
              >
                Remove
              </button>
            )}
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>PNG or SVG up to 2MB</span>
          </div>
        </div>
      </div>

      {/* Profile Form Grid */}
      <div className="org-settings-grid">
        {/* Organization Name */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-name">
            Organization Name <span className="required">*</span>
          </label>
          <input
            id="org-name"
            type="text"
            className={`org-settings-input ${errors['organization.name'] ? 'is-invalid' : ''}`}
            value={org.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Official Organization Name"
          />
          {errors['organization.name'] && (
            <span className="org-settings-error-text">{errors['organization.name']}</span>
          )}
        </div>

        {/* Registration Number */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-reg-no">
            Registration Number <span className="required">*</span>
          </label>
          <input
            id="org-reg-no"
            type="text"
            className={`org-settings-input ${errors['organization.registrationNumber'] ? 'is-invalid' : ''}`}
            value={org.registrationNumber || ''}
            onChange={(e) => handleFieldChange('registrationNumber', e.target.value)}
            placeholder="e.g. NGO-LK-1951-002"
          />
          {errors['organization.registrationNumber'] && (
            <span className="org-settings-error-text">{errors['organization.registrationNumber']}</span>
          )}
        </div>

        {/* Organization Type */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-type">
            Organization Type <span className="required">*</span>
          </label>
          <select
            id="org-type"
            className={`org-settings-select ${errors['organization.type'] ? 'is-invalid' : ''}`}
            value={org.type || ''}
            onChange={(e) => handleFieldChange('type', e.target.value)}
          >
            {ORGANIZATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors['organization.type'] && (
            <span className="org-settings-error-text">{errors['organization.type']}</span>
          )}
        </div>

        {/* Official Website */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-website">
            <IconGlobe size={14} color="#64748B" /> Official Website
          </label>
          <input
            id="org-website"
            type="url"
            className="org-settings-input"
            value={org.website || ''}
            onChange={(e) => handleFieldChange('website', e.target.value)}
            placeholder="https://www.redcross.lk"
          />
        </div>

        {/* Organization Description */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label" htmlFor="org-desc">
            Organization Description
          </label>
          <textarea
            id="org-desc"
            rows={3}
            className="org-settings-textarea"
            value={org.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Brief description of organization relief mission and humanitarian scope"
          />
          <span className="org-settings-helper">Visible to emergency coordinating authorities and response partners.</span>
        </div>

        {/* Head Office Address */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label" htmlFor="org-address">
            Head Office Address <span className="required">*</span>
          </label>
          <input
            id="org-address"
            type="text"
            className={`org-settings-input ${errors['organization.address'] ? 'is-invalid' : ''}`}
            value={org.address || ''}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="Street address, city, postal code"
          />
          {errors['organization.address'] && (
            <span className="org-settings-error-text">{errors['organization.address']}</span>
          )}
        </div>

        {/* Province */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-province">
            Province <span className="required">*</span>
          </label>
          <select
            id="org-province"
            className="org-settings-select"
            value={org.province || ''}
            onChange={(e) => handleProvinceChange(e.target.value)}
          >
            {SRI_LANKA_PROVINCES.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-district">
            District <span className="required">*</span>
          </label>
          <select
            id="org-district"
            className="org-settings-select"
            value={org.district || ''}
            onChange={(e) => handleFieldChange('district', e.target.value)}
          >
            {availableDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* Official Email */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-email">
            <IconMail size={14} color="#64748B" /> Official Email Address <span className="required">*</span>
          </label>
          <input
            id="org-email"
            type="email"
            className={`org-settings-input ${errors['organization.email'] ? 'is-invalid' : ''}`}
            value={org.email || ''}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            placeholder="info@redcross.lk"
          />
          {errors['organization.email'] && (
            <span className="org-settings-error-text">{errors['organization.email']}</span>
          )}
        </div>

        {/* Official Contact Number */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="org-phone">
            <IconPhone size={14} color="#64748B" /> Contact Number <span className="required">*</span>
          </label>
          <input
            id="org-phone"
            type="tel"
            className={`org-settings-input ${errors['organization.phone'] ? 'is-invalid' : ''}`}
            value={org.phone || ''}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            placeholder="+94 11 269 1095"
          />
          {errors['organization.phone'] && (
            <span className="org-settings-error-text">{errors['organization.phone']}</span>
          )}
        </div>

        {/* Emergency Contact Number */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label" htmlFor="org-emergency-phone">
            <IconPhone size={14} color="#DC2626" /> 24/7 Emergency Operations Hotline <span className="required">*</span>
          </label>
          <input
            id="org-emergency-phone"
            type="text"
            className={`org-settings-input ${errors['organization.emergencyPhone'] ? 'is-invalid' : ''}`}
            value={org.emergencyPhone || ''}
            onChange={(e) => handleFieldChange('emergencyPhone', e.target.value)}
            placeholder="117 / +94 11 269 4487"
          />
          {errors['organization.emergencyPhone'] && (
            <span className="org-settings-error-text">{errors['organization.emergencyPhone']}</span>
          )}
          <span className="org-settings-helper">Direct line displayed on top emergency banners and citizen escalation desks.</span>
        </div>
      </div>
    </section>
  );
};
