import React, { useState, useEffect } from 'react';
import { IconMapPin, IconEdit, IconPlus } from './Icons';
import {
  AREA_RESPONSE_STATUSES,
  AREA_RISK_LEVELS,
  CRISIS_TYPES
} from '../data/mockAssignedAreas';
import { SRI_LANKA_DISTRICTS_GEOJSON } from '../data/sriLankaDistrictsGeoJSON';
import { availableResponseTeams } from '../data/mockAidRequests';

// District centroid map for auto-populating coordinates
const DISTRICT_CENTROIDS = {};
const DISTRICT_PROVINCES = {};
SRI_LANKA_DISTRICTS_GEOJSON.features.forEach(f => {
  DISTRICT_CENTROIDS[f.properties.name] = f.properties.center;
  DISTRICT_PROVINCES[f.properties.name] = f.properties.province;
});

const ALL_DISTRICTS = Object.keys(DISTRICT_CENTROIDS).sort();

export const AssignNewAreaModal = ({
  isOpen = false,
  areaToEdit = null,
  onClose = () => {},
  onSave = () => {}
}) => {
  const isEditing = Boolean(areaToEdit);

  const [formData, setFormData] = useState({
    areaName: '',
    district: 'Colombo',
    province: 'Western',
    lat: 6.9271,
    lng: 79.8612,
    crisisType: 'Flood',
    riskLevel: 'High',
    responseStatus: 'Active Response',
    affectedCitizens: 1200,
    shelterCount: 2,
    shelterCapacity: 1500,
    primaryContact: '+94 11 269 4487',
    linkedIncident: 'Kelani River Basin Flash Flooding (#CR-101)',
    assignedTeams: [],
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (areaToEdit) {
      setFormData({
        areaName: areaToEdit.areaName || '',
        district: areaToEdit.district || 'Colombo',
        province: areaToEdit.province || DISTRICT_PROVINCES[areaToEdit.district] || 'Western',
        lat: areaToEdit.coordinates ? areaToEdit.coordinates[0] : 6.9271,
        lng: areaToEdit.coordinates ? areaToEdit.coordinates[1] : 79.8612,
        crisisType: areaToEdit.crisisType || 'Flood',
        riskLevel: areaToEdit.riskLevel || 'High',
        responseStatus: areaToEdit.responseStatus || 'Active Response',
        affectedCitizens: areaToEdit.affectedCitizens || 0,
        shelterCount: areaToEdit.shelterCount || 1,
        shelterCapacity: areaToEdit.shelterCapacity || 500,
        primaryContact: areaToEdit.primaryContact || '',
        linkedIncident: areaToEdit.linkedIncident || '',
        assignedTeams: Array.isArray(areaToEdit.assignedTeams) ? [...areaToEdit.assignedTeams] : [],
        notes: areaToEdit.notes || ''
      });
    } else {
      setFormData({
        areaName: '',
        district: 'Colombo',
        province: 'Western',
        lat: 6.9271,
        lng: 79.8612,
        crisisType: 'Flood',
        riskLevel: 'High',
        responseStatus: 'Active Response',
        affectedCitizens: 1200,
        shelterCount: 2,
        shelterCapacity: 1500,
        primaryContact: 'DMC Colombo (+94 11 269 4487)',
        linkedIncident: 'Kelani River Basin Flash Flooding (#CR-101)',
        assignedTeams: ['Alpha Search & Rescue'],
        notes: 'Area assigned for priority field relief and flood monitoring.'
      });
    }
    setErrors({});
  }, [areaToEdit]);

  const handleDistrictChange = (newDistrict) => {
    const coords = DISTRICT_CENTROIDS[newDistrict] || [7.8731, 80.7718];
    const prov = DISTRICT_PROVINCES[newDistrict] || 'Western';
    setFormData(prev => ({
      ...prev,
      district: newDistrict,
      province: prov,
      lat: coords[0],
      lng: coords[1]
    }));
  };

  const handleTeamToggle = (teamName) => {
    setFormData(prev => {
      const exists = prev.assignedTeams.includes(teamName);
      if (exists) {
        return { ...prev, assignedTeams: prev.assignedTeams.filter(t => t !== teamName) };
      } else {
        return { ...prev, assignedTeams: [...prev.assignedTeams, teamName] };
      }
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.areaName.trim() || formData.areaName.trim().length < 3) {
      newErrors.areaName = 'Area name must be at least 3 characters.';
    }
    if (!formData.district) {
      newErrors.district = 'District selection is required.';
    }
    if (isNaN(Number(formData.affectedCitizens)) || Number(formData.affectedCitizens) < 0) {
      newErrors.affectedCitizens = 'Valid affected population count is required.';
    }
    if (isNaN(Number(formData.lat)) || isNaN(Number(formData.lng))) {
      newErrors.coordinates = 'Valid geographical coordinates are required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        affectedCitizens: Number(formData.affectedCitizens),
        shelterCount: Number(formData.shelterCount),
        shelterCapacity: Number(formData.shelterCapacity),
        coordinates: [Number(formData.lat), Number(formData.lng)]
      };

      await onSave(payload, areaToEdit ? areaToEdit.areaId : null);
      onClose();
    } catch {
      setErrors({ form: 'An error occurred while saving the area record.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="org-modal-backdrop" onClick={onClose}>
      <div className="org-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="org-modal-header">
          <h2 className="org-modal-title">
            {isEditing ? <IconEdit size={20} color="#10756F" /> : <IconPlus size={20} color="#10756F" />}
            <span>{isEditing ? `Edit Area: ${areaToEdit.areaName}` : 'Assign New Response Area'}</span>
          </h2>
          <button
            className="org-drawer-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="org-modal-body">
            {errors.form && (
              <div style={{ color: '#DC2626', fontSize: '13px', backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '6px' }}>
                {errors.form}
              </div>
            )}

            {/* Area Name & District */}
            <div className="org-form-grid-2">
              <div className="org-form-field">
                <label className="org-form-label">
                  Area Name / Sector <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className={`org-form-input ${errors.areaName ? 'error' : ''}`}
                  placeholder="e.g. Kolonnawa Flood Relief Zone"
                  value={formData.areaName}
                  onChange={(e) => setFormData({ ...formData, areaName: e.target.value })}
                />
                {errors.areaName && <span className="org-form-error-msg">{errors.areaName}</span>}
              </div>

              <div className="org-form-field">
                <label className="org-form-label">
                  Sri Lanka District <span className="req">*</span>
                </label>
                <select
                  className="org-form-select"
                  value={formData.district}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                >
                  {ALL_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Crisis Type & Risk Level */}
            <div className="org-form-grid-2">
              <div className="org-form-field">
                <label className="org-form-label">
                  Crisis Type <span className="req">*</span>
                </label>
                <select
                  className="org-form-select"
                  value={formData.crisisType}
                  onChange={(e) => setFormData({ ...formData, crisisType: e.target.value })}
                >
                  {CRISIS_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="org-form-field">
                <label className="org-form-label">
                  Risk Level <span className="req">*</span>
                </label>
                <select
                  className="org-form-select"
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                >
                  {AREA_RISK_LEVELS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Affected Citizens & Response Status */}
            <div className="org-form-grid-2">
              <div className="org-form-field">
                <label className="org-form-label">
                  Affected Citizens Estimate <span className="req">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className={`org-form-input ${errors.affectedCitizens ? 'error' : ''}`}
                  value={formData.affectedCitizens}
                  onChange={(e) => setFormData({ ...formData, affectedCitizens: e.target.value })}
                />
                {errors.affectedCitizens && <span className="org-form-error-msg">{errors.affectedCitizens}</span>}
              </div>

              <div className="org-form-field">
                <label className="org-form-label">
                  Response Status <span className="req">*</span>
                </label>
                <select
                  className="org-form-select"
                  value={formData.responseStatus}
                  onChange={(e) => setFormData({ ...formData, responseStatus: e.target.value })}
                >
                  {AREA_RESPONSE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Coordinates (Latitude & Longitude) */}
            <div className="org-form-grid-2">
              <div className="org-form-field">
                <label className="org-form-label">
                  Latitude (°N) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="org-form-input"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                />
              </div>

              <div className="org-form-field">
                <label className="org-form-label">
                  Longitude (°E) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="org-form-input"
                  value={formData.lng}
                  onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                />
              </div>
            </div>

            {/* Shelter Capacity & Primary Contact */}
            <div className="org-form-grid-2">
              <div className="org-form-field">
                <label className="org-form-label">
                  Evacuation Shelter Capacity
                </label>
                <input
                  type="number"
                  min="0"
                  className="org-form-input"
                  value={formData.shelterCapacity}
                  onChange={(e) => setFormData({ ...formData, shelterCapacity: e.target.value })}
                />
              </div>

              <div className="org-form-field">
                <label className="org-form-label">
                  Authority Emergency Contact
                </label>
                <input
                  type="text"
                  className="org-form-input"
                  placeholder="e.g. DMC Colombo (+94 11 269 4487)"
                  value={formData.primaryContact}
                  onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                />
              </div>
            </div>

            {/* Assign Response Teams Checkboxes */}
            <div className="org-form-field">
              <label className="org-form-label">
                Assign Emergency Response Teams
              </label>
              <div style={{
                maxHeight: '130px',
                overflowY: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '8px 12px',
                backgroundColor: '#F8FAFC',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}>
                {availableResponseTeams.filter(t => t !== 'Unassigned').map((team) => (
                  <label key={team} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.assignedTeams.includes(team)}
                      onChange={() => handleTeamToggle(team)}
                    />
                    <span>{team}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="org-form-field">
              <label className="org-form-label">
                Assessment Notes
              </label>
              <input
                type="text"
                className="org-form-input"
                placeholder="Field observations, access restrictions, or evacuation status..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="org-modal-footer">
            <button
              type="button"
              className="org-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="org-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Assign Area')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
