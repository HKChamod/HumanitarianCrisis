import { useState } from 'react';
import { X, User, Save, CheckCircle2 } from 'lucide-react';
import { DISTRICTS } from '../../../data/sriLankaAreas';

export function CitizenProfileModal({
  isOpen,
  onClose,
  citizenUser,
  onSaveProfile
}) {
  const [fullName, setFullName] = useState(citizenUser?.fullName || 'Kavinda Perera');
  const [email, setEmail] = useState(citizenUser?.email || 'kavinda.perera@example.com');
  const [phone, setPhone] = useState(citizenUser?.phone || '+94 77 123 4567');
  const [district, setDistrict] = useState(citizenUser?.district || 'Kalutara');
  const [emergencyContact, setEmergencyContact] = useState(citizenUser?.emergencyContact || '+94 71 987 6543 (Brother)');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...citizenUser,
      fullName,
      email,
      phone,
      district,
      emergencyContact,
    };
    onSaveProfile(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="citizen-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-profile-title">
      <div className="citizen-modal-container">
        <div className="citizen-modal-header">
          <h2 id="modal-profile-title" className="citizen-modal-title">
            <User size={20} color="#0F766E" />
            Citizen Profile &amp; Contact Information (CIT-06)
          </h2>
          <button
            type="button"
            className="citizen-modal-close-btn"
            onClick={onClose}
            aria-label="Close profile modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="citizen-modal-body">
            {saved && (
              <div
                style={{
                  background: '#D1FAE5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={16} /> Profile information updated successfully.
              </div>
            )}

            <div className="citizen-form-group">
              <label className="citizen-form-label">Full Name</label>
              <input
                type="text"
                className="citizen-form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">Email Address</label>
                <input
                  type="email"
                  className="citizen-form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="citizen-form-group">
                <label className="citizen-form-label">Contact Phone Number</label>
                <input
                  type="tel"
                  className="citizen-form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">Primary District</label>
                <select
                  className="citizen-form-select"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="citizen-form-group">
                <label className="citizen-form-label">Secondary / Emergency Contact</label>
                <input
                  type="text"
                  className="citizen-form-input"
                  placeholder="Relative name and phone"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.5rem 0 0' }}>
              Your contact details are encrypted and disclosed exclusively to assigned humanitarian responders
              handling your active requests.
            </p>
          </div>

          <div className="citizen-modal-footer">
            <button type="button" className="btn-teal-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-teal-primary">
              <Save size={15} /> Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
