import React, { useState, useEffect } from 'react';
import { IconUsers, IconEdit, IconPlus } from './Icons';
import { TEAM_TYPES, TEAM_STATUSES, SRI_LANKA_DISTRICTS } from '../data/mockResponseTeams';
import { USE_MOCK_API } from '../../services/api/axiosClient';

const LIVE_TEAM_STATUSES = ['Available', 'Deployed', 'Unavailable', 'Inactive'];

export const CreateEditTeamModal = ({
  isOpen = false,
  teamToEdit = null, // null if creating, object if editing
  orgMembers = [],
  availableAreas = [],
  onClose = () => {},
  onSave = () => {}
}) => {
  const isEditing = Boolean(teamToEdit);

  const [formData, setFormData] = useState({
    teamName: '',
    teamType: 'Search & Rescue',
    leaderMembershipId: '',
    areaId: '',
    teamLeader: '',
    leaderPhone: '',
    leaderEmail: '',
    membersCount: 1,
    assignedArea: '',
    district: 'Colombo',
    status: 'Available',
    baseStation: '',
    specializedEquipment: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (teamToEdit) {
      setFormData({
        teamName: teamToEdit.teamName || '',
        teamType: teamToEdit.teamType || 'Search & Rescue',
        leaderMembershipId: teamToEdit.leaderMembershipId ? String(teamToEdit.leaderMembershipId) : '',
        areaId: teamToEdit.areaId ? String(teamToEdit.areaId) : '',
        teamLeader: teamToEdit.teamLeader || '',
        leaderPhone: teamToEdit.leaderPhone || teamToEdit.contactPhone || '',
        leaderEmail: teamToEdit.leaderEmail || teamToEdit.contactEmail || '',
        membersCount: teamToEdit.membersCount || 1,
        assignedArea: teamToEdit.assignedArea || '',
        district: teamToEdit.district || 'Colombo',
        status: teamToEdit.status || 'Available',
        baseStation: teamToEdit.baseStation || '',
        specializedEquipment: Array.isArray(teamToEdit.specializedEquipment)
          ? teamToEdit.specializedEquipment.join(', ')
          : ''
      });
    } else {
      setFormData({
        teamName: '',
        teamType: 'Search & Rescue',
        leaderMembershipId: '',
        areaId: '',
        teamLeader: '',
        leaderPhone: '',
        leaderEmail: '',
        membersCount: 1,
        assignedArea: '',
        district: 'Colombo',
        status: 'Available',
        baseStation: '',
        specializedEquipment: ''
      });
    }
    setErrors({});
  }, [teamToEdit, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.teamName.trim() || formData.teamName.trim().length < 2) {
      newErrors.teamName = 'Team name must be at least 2 characters.';
    }
    if (USE_MOCK_API) {
      if (!formData.teamLeader.trim()) {
        newErrors.teamLeader = 'Team leader name is required.';
      }
      if (!formData.leaderPhone.trim() || formData.leaderPhone.trim().length < 9) {
        newErrors.leaderPhone = 'Valid contact phone number is required.';
      }
      if (!formData.assignedArea.trim()) {
        newErrors.assignedArea = 'Assigned area/division is required.';
      }
      if (!formData.membersCount || Number(formData.membersCount) < 1) {
        newErrors.membersCount = 'Must have at least 1 member.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const equipmentArray = formData.specializedEquipment
        ? formData.specializedEquipment.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        ...formData,
        leaderMembershipId: formData.leaderMembershipId ? Number(formData.leaderMembershipId) : null,
        areaId: formData.areaId ? Number(formData.areaId) : null,
        membersCount: Number(formData.membersCount) || 1,
        specializedEquipment: equipmentArray
      };

      await onSave(payload, teamToEdit ? teamToEdit.teamId : null);
      onClose();
    } catch (err) {
      setErrors({ form: err?.detail || err?.message || 'An error occurred while saving the team.' });
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
            <span>{isEditing ? `Edit Team: ${teamToEdit.teamName}` : 'Create New Response Team'}</span>
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

            {/* Team Name & Type */}
            <div className="org-form-grid-2">
              <div className="org-form-field">
                <label className="org-form-label">
                  Team Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className={`org-form-input ${errors.teamName ? 'error' : ''}`}
                  placeholder="e.g. Echo Search & Rescue Unit"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                />
                {errors.teamName && <span className="org-form-error-msg">{errors.teamName}</span>}
              </div>

              <div className="org-form-field">
                <label className="org-form-label">
                  Team Type <span className="req">*</span>
                </label>
                <select
                  className="org-form-select"
                  value={formData.teamType}
                  onChange={(e) => setFormData({ ...formData, teamType: e.target.value })}
                >
                  {TEAM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leader & Contact Phone */}
            {!USE_MOCK_API ? (
              <div className="org-form-grid-2">
                <div className="org-form-field">
                  <label className="org-form-label">Team Leader (Approved Member)</label>
                  <select
                    className="org-form-select"
                    value={formData.leaderMembershipId}
                    onChange={(e) => setFormData({ ...formData, leaderMembershipId: e.target.value })}
                  >
                    <option value="">-- Unassigned --</option>
                    {orgMembers.map((m) => (
                      <option key={m.membershipId} value={m.membershipId}>
                        {m.fullName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="org-form-field">
                  <label className="org-form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="org-form-input"
                    placeholder="+94 77 123 4567"
                    value={formData.leaderPhone}
                    onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="org-form-grid-2">
                <div className="org-form-field">
                  <label className="org-form-label">
                    Team Leader Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className={`org-form-input ${errors.teamLeader ? 'error' : ''}`}
                    placeholder="e.g. Major K. D. Silva"
                    value={formData.teamLeader}
                    onChange={(e) => setFormData({ ...formData, teamLeader: e.target.value })}
                  />
                  {errors.teamLeader && <span className="org-form-error-msg">{errors.teamLeader}</span>}
                </div>

                <div className="org-form-field">
                  <label className="org-form-label">
                    Leader Phone <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    className={`org-form-input ${errors.leaderPhone ? 'error' : ''}`}
                    placeholder="+94 77 123 4567"
                    value={formData.leaderPhone}
                    onChange={(e) => setFormData({ ...formData, leaderPhone: e.target.value })}
                  />
                  {errors.leaderPhone && <span className="org-form-error-msg">{errors.leaderPhone}</span>}
                </div>
              </div>
            )}

            {/* Status & Area */}
            {!USE_MOCK_API ? (
              <div className="org-form-grid-2">
                <div className="org-form-field">
                  <label className="org-form-label">
                    Availability Status <span className="req">*</span>
                  </label>
                  <select
                    className="org-form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {LIVE_TEAM_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="org-form-field">
                  <label className="org-form-label">Primary Operational Area</label>
                  <select
                    className="org-form-select"
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                  >
                    <option value="">-- Organization-Wide --</option>
                    {availableAreas.map((a) => (
                      <option key={a.areaId} value={a.areaId}>
                        {a.areaName} ({a.areaType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="org-form-grid-2">
                  <div className="org-form-field">
                    <label className="org-form-label">
                      Number of Responders <span className="req">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      className={`org-form-input ${errors.membersCount ? 'error' : ''}`}
                      value={formData.membersCount}
                      onChange={(e) => setFormData({ ...formData, membersCount: e.target.value })}
                    />
                    {errors.membersCount && <span className="org-form-error-msg">{errors.membersCount}</span>}
                  </div>

                  <div className="org-form-field">
                    <label className="org-form-label">
                      Availability Status <span className="req">*</span>
                    </label>
                    <select
                      className="org-form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {TEAM_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="org-form-grid-2">
                  <div className="org-form-field">
                    <label className="org-form-label">
                      Assigned District <span className="req">*</span>
                    </label>
                    <select
                      className="org-form-select"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    >
                      {SRI_LANKA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="org-form-field">
                    <label className="org-form-label">
                      Assigned Area / Division <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className={`org-form-input ${errors.assignedArea ? 'error' : ''}`}
                      placeholder="e.g. Kolonnawa & Sedawatta Zone"
                      value={formData.assignedArea}
                      onChange={(e) => setFormData({ ...formData, assignedArea: e.target.value })}
                    />
                    {errors.assignedArea && <span className="org-form-error-msg">{errors.assignedArea}</span>}
                  </div>
                </div>
              </>
            )}

            {/* Base Station */}
            <div className="org-form-field">
              <label className="org-form-label">
                Base Station / Depot
              </label>
              <input
                type="text"
                className="org-form-input"
                placeholder="e.g. Western Province Relief Depot, Colombo"
                value={formData.baseStation}
                onChange={(e) => setFormData({ ...formData, baseStation: e.target.value })}
              />
            </div>

            {/* Specialized Equipment */}
            <div className="org-form-field">
              <label className="org-form-label">
                Specialized Equipment (comma separated)
              </label>
              <input
                type="text"
                className="org-form-input"
                placeholder="e.g. Inflatable Dinghy, High-pressure Pumps, Trauma Kit"
                value={formData.specializedEquipment}
                onChange={(e) => setFormData({ ...formData, specializedEquipment: e.target.value })}
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
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Team')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
