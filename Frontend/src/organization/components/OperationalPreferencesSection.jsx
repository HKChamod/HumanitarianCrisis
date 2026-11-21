import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconSettings,
  IconMapPin,
  IconClock,
  IconGlobe,
  IconCheckCircle
} from './Icons';
import {
  ALL_SRI_LANKA_DISTRICTS,
  AVAILABLE_HUMANITARIAN_SERVICES,
  EMERGENCY_AVAILABILITY_MODES,
  LANGUAGE_OPTIONS
} from '../data/mockOrganizationSettings';

export const OperationalPreferencesSection = ({
  formData,
  onChange,
  errors = {}
}) => {
  const { i18n } = useTranslation();
  const operational = formData.operational || {};

  const handleFieldChange = (field, value) => {
    onChange('operational', {
      ...operational,
      [field]: value
    });
  };

  const handleLanguageSelect = (code) => {
    handleFieldChange('preferredLanguage', code);
    if (i18n.language !== code) {
      i18n.changeLanguage(code);
    }
  };

  const handleToggleService = (serviceId) => {
    const current = operational.humanitarianServices || [];
    let updated;
    if (current.includes(serviceId)) {
      // Keep at least one service selected
      if (current.length === 1) return;
      updated = current.filter(id => id !== serviceId);
    } else {
      updated = [...current, serviceId];
    }
    handleFieldChange('humanitarianServices', updated);
  };

  return (
    <section className="org-settings-card" aria-label="Operational Preferences">
      <div className="org-settings-card-header">
        <div>
          <h2>
            <IconSettings size={20} color="#10756F" />
            Operational Preferences
          </h2>
          <p>Configure operational district boundaries, service capabilities, and emergency readiness hours.</p>
        </div>
      </div>

      <div className="org-settings-grid">
        {/* Primary Operational District */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="op-district">
            <IconMapPin size={14} color="#10756F" /> Primary Operational District <span className="required">*</span>
          </label>
          <select
            id="op-district"
            className={`org-settings-select ${errors['operational.primaryDistrict'] ? 'is-invalid' : ''}`}
            value={operational.primaryDistrict || 'Colombo'}
            onChange={(e) => handleFieldChange('primaryDistrict', e.target.value)}
          >
            {ALL_SRI_LANKA_DISTRICTS.map((dist) => (
              <option key={dist} value={dist}>
                {dist} District
              </option>
            ))}
          </select>
          {errors['operational.primaryDistrict'] && (
            <span className="org-settings-error-text">{errors['operational.primaryDistrict']}</span>
          )}
          <span className="org-settings-helper">Default regional hub for assigning new crisis response operations.</span>
        </div>

        {/* Time Zone (Sri Lanka Asia/Colombo) */}
        <div className="org-settings-field">
          <label className="org-settings-label" htmlFor="op-timezone">
            <IconClock size={14} color="#10756F" /> System Time Zone
          </label>
          <input
            id="op-timezone"
            type="text"
            className="org-settings-input"
            value={operational.timeZone || 'Asia/Colombo (GMT+05:30)'}
            disabled
            title="Locked to Sri Lanka Standard Time (Asia/Colombo)"
          />
          <span className="org-settings-helper">Locked to Asia/Colombo (Sri Lanka Standard Time - SLST) for incident timestamps.</span>
        </div>

        {/* Preferred Language Selection */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label">
            <IconGlobe size={14} color="#10756F" /> Preferred Portal Language
          </label>
          <div className="org-language-options">
            {LANGUAGE_OPTIONS.map((lang) => {
              const currentLang = operational.preferredLanguage || i18n.language || 'en';
              const isSelected = currentLang === lang.code;
              return (
                <div
                  key={lang.code}
                  className={`org-language-pill ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleLanguageSelect(lang.code)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleLanguageSelect(lang.code);
                    }
                  }}
                >
                  <div className="org-language-pill-name">{lang.label}</div>
                  <div className="org-language-pill-native">{lang.native}</div>
                </div>
              );
            })}
          </div>
          <span className="org-settings-helper">Controls interface terminology and communication dispatch templates.</span>
        </div>

        {/* Emergency Response Availability */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label">
            Emergency Response Availability Schedule
          </label>
          <div className="org-availability-cards">
            {EMERGENCY_AVAILABILITY_MODES.map((mode) => {
              const isSelected = operational.emergencyAvailability === mode.id;
              return (
                <div
                  key={mode.id}
                  className={`org-availability-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleFieldChange('emergencyAvailability', mode.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleFieldChange('emergencyAvailability', mode.id);
                    }
                  }}
                >
                  <div className="org-availability-radio">
                    {isSelected && <div className="org-availability-radio-inner" />}
                  </div>
                  <div className="org-availability-content">
                    <h3>{mode.title}</h3>
                    <p>{mode.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Humanitarian Services Multi-select */}
        <div className="org-settings-field span-2">
          <label className="org-settings-label">
            Available Humanitarian Relief Services ({operational.humanitarianServices?.length || 0} active)
          </label>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 10px 0' }}>
            Select the humanitarian capabilities your field teams are certified and equipped to deliver.
          </p>
          <div className="org-services-grid">
            {AVAILABLE_HUMANITARIAN_SERVICES.map((service) => {
              const isChecked = operational.humanitarianServices?.includes(service.id);
              return (
                <div
                  key={service.id}
                  className={`org-service-chip ${isChecked ? 'selected' : ''}`}
                  onClick={() => handleToggleService(service.id)}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggleService(service.id);
                    }
                  }}
                >
                  <div className="org-service-chip-content">
                    <span className="org-service-chip-title">{service.label}</span>
                    <span className="org-service-chip-category">{service.category}</span>
                  </div>
                  <div className="org-service-chip-check">
                    {isChecked ? <IconCheckCircle size={14} color="#FFFFFF" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
