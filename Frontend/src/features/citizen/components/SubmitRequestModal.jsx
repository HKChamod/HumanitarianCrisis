import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PROVINCES, DISTRICTS } from '../../../data/sriLankaAreas';

const CATEGORIES = [
  'Food',
  'Medicine',
  'Shelter',
  'Transport',
  'Accessibility Support',
  'Other',
];

export function SubmitRequestModal({
  isOpen,
  onClose,
  initialCategory = 'Food',
  onSubmitSuccess,
  citizenUser
}) {
  const [category, setCategory] = useState(initialCategory);
  const [peopleAffected, setPeopleAffected] = useState(3);
  const [provinceId, setProvinceId] = useState('WP');
  const [district, setDistrict] = useState('Kalutara');
  const [dsDivision, setDsDivision] = useState('Kalutara DS');
  const [gnDivision, setGnDivision] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('High');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(citizenUser?.phone || '+94 77 123 4567');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  if (!isOpen) return null;

  const availableDistricts = DISTRICTS.filter((d) => d.provinceId === provinceId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a brief description of what assistance is needed.');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Contact phone number is required for emergency verification.');
      return;
    }
    if (!consent) {
      setError('Please confirm the emergency declaration.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = {
        category,
        peopleAffected: parseInt(peopleAffected, 10),
        province: PROVINCES.find((p) => p.id === provinceId)?.name || 'Western Province',
        district,
        dsDivision,
        gnDivision,
        addressLine,
        urgencyLevel,
        description,
        contactPhone,
        contactName: citizenUser?.fullName || 'Kavinda Perera'
      };

      await onSubmitSuccess(payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-submit-title">
      <div className="citizen-modal-container">
        {/* Header */}
        <div className="citizen-modal-header">
          <h2 id="modal-submit-title" className="citizen-modal-title">
            <ShieldCheck size={20} color="#0F766E" />
            Request Emergency Assistance
          </h2>
          <button
            type="button"
            className="citizen-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="citizen-modal-body">
            {error && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Category and Urgency */}
            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">Assistance Category *</label>
                <select
                  className="citizen-form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="citizen-form-group">
                <label className="citizen-form-label">Urgency Level *</label>
                <select
                  className="citizen-form-select"
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  required
                >
                  <option value="Critical">Critical (Immediate life threat)</option>
                  <option value="High">High (Needed within 12-24 hours)</option>
                  <option value="Standard">Standard (General relief assistance)</option>
                </select>
              </div>
            </div>

            {/* People affected and Phone */}
            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">People Affected (Household size) *</label>
                <input
                  type="number"
                  className="citizen-form-input"
                  min="1"
                  max="100"
                  value={peopleAffected}
                  onChange={(e) => setPeopleAffected(e.target.value)}
                  required
                />
              </div>

              <div className="citizen-form-group">
                <label className="citizen-form-label">Contact Phone Number *</label>
                <input
                  type="tel"
                  className="citizen-form-input"
                  placeholder="+94 77 123 4567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Location: Province and District */}
            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">Province *</label>
                <select
                  className="citizen-form-select"
                  value={provinceId}
                  onChange={(e) => {
                    setProvinceId(e.target.value);
                    const matching = DISTRICTS.find((d) => d.provinceId === e.target.value);
                    if (matching) setDistrict(matching.name);
                  }}
                  required
                >
                  {PROVINCES.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="citizen-form-group">
                <label className="citizen-form-label">District *</label>
                <select
                  className="citizen-form-select"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                >
                  {availableDistricts.map((dist) => (
                    <option key={dist.id} value={dist.name}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location: DS Division and GN Division */}
            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">DS Division</label>
                <input
                  type="text"
                  className="citizen-form-input"
                  placeholder="e.g. Kalutara DS Division"
                  value={dsDivision}
                  onChange={(e) => setDsDivision(e.target.value)}
                />
              </div>

              <div className="citizen-form-group">
                <label className="citizen-form-label">Grama Niladhari (GN) Division</label>
                <input
                  type="text"
                  className="citizen-form-input"
                  placeholder="e.g. Nagoda South"
                  value={gnDivision}
                  onChange={(e) => setGnDivision(e.target.value)}
                />
              </div>
            </div>

            {/* Specific Address / Landmark */}
            <div className="citizen-form-group">
              <label className="citizen-form-label">Exact Address or Landmark *</label>
              <input
                type="text"
                className="citizen-form-input"
                placeholder="House number, street name, near temple/bridge..."
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                required
              />
            </div>

            {/* Needs Description */}
            <div className="citizen-form-group">
              <label className="citizen-form-label">Detailed Needs Description *</label>
              <textarea
                className="citizen-form-textarea"
                rows="3"
                placeholder="Please describe what is urgently needed (e.g. drinking water for 4 people, baby milk formula, elderly wheelchair transport...)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>

            {/* Consent Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="consentCheck"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <label htmlFor="consentCheck" style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                I confirm this is an authentic humanitarian emergency assistance request.
                Responders may contact this phone number for location coordination.
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="citizen-modal-footer">
            <button
              type="button"
              className="btn-teal-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-teal-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting Request...' : 'Submit Assistance Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
