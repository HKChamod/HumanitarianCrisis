import { useState, useEffect, useCallback } from 'react';
import { X, ShieldCheck, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { PROVINCES, DISTRICTS } from '../../../data/sriLankaAreas';
import { citizenApi } from '../../../services/api/citizenApi';
import { USE_MOCK_API } from '../../../services/api/apiConfig';
import { MapView, MAP_ENTITY_TYPES } from '../../../shared/maps';

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
  citizenUser,
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
  const [contactPhone, setContactPhone] = useState(citizenUser?.phone || '');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(null);

  // Live backend Geographic Areas state
  const [liveAreas, setLiveAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  const loadLiveAreas = useCallback(async () => {
    if (USE_MOCK_API) return;
    setAreasLoading(true);
    setAreasError('');
    try {
      const areas = await citizenApi.getActiveAreas();
      setLiveAreas(areas);
      setSelectedAreaId((prev) => {
        if (prev && areas.some((a) => String(a.areaId) === String(prev))) {
          return prev;
        }
        return areas.length > 0 ? String(areas[0].areaId) : '';
      });
    } catch (err) {
      setLiveAreas([]);
      setSelectedAreaId('');
      setAreasError(err?.detail || err?.message || 'Unable to load active geographic areas from the backend.');
    } finally {
      setAreasLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !USE_MOCK_API) {
      loadLiveAreas();
    }
  }, [isOpen, loadLiveAreas]);

  if (!isOpen) return null;

  const availableDistricts = DISTRICTS.filter((d) => d.provinceId === provinceId);
  const canSubmitLive =
    USE_MOCK_API || (!areasLoading && !areasError && liveAreas.length > 0 && Boolean(selectedAreaId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide a description of at least 5 characters explaining what assistance is needed.');
      return;
    }
    if (!USE_MOCK_API && (!selectedAreaId || !Number.isInteger(Number(selectedAreaId)) || Number(selectedAreaId) <= 0)) {
      setError('Please select a valid active geographic area before submitting.');
      return;
    }
    if (USE_MOCK_API && !contactPhone.trim()) {
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
      const selectedArea = liveAreas.find((a) => String(a.areaId) === String(selectedAreaId));
      const payload = USE_MOCK_API
        ? {
            category,
            peopleAffected: parseInt(peopleAffected, 10),
            province: PROVINCES.find((p) => p.id === provinceId)?.name || 'Western Province',
            district,
            dsDivision,
            gnDivision,
            addressLine,
            urgencyLevel,
            description: description.trim(),
            contactPhone,
            contactName: citizenUser?.fullName || 'Citizen',
          }
        : {
            category,
            peopleAffected: parseInt(peopleAffected, 10),
            areaId: Number(selectedAreaId),
            areaName: selectedArea?.areaName || '',
            addressLine: addressLine.trim(),
            urgencyLevel,
            description: description.trim(),
            latitude: pickedCoords?.latitude,
            longitude: pickedCoords?.longitude,
          };

      await onSubmitSuccess(payload);
      setDescription('');
      setAddressLine('');
      setPickedCoords(null);
      setShowMapPicker(false);
      onClose();
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="citizen-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-submit-title">
      <div className="citizen-modal-container">
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
                  <option value="Medium">Medium (General relief assistance)</option>
                  <option value="Low">Low (Non-urgent support)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="citizen-form-group">
                <label className="citizen-form-label">People Affected (Household size) *</label>
                <input
                  type="number"
                  className="citizen-form-input"
                  min="1"
                  max="1000"
                  value={peopleAffected}
                  onChange={(e) => setPeopleAffected(e.target.value)}
                  required
                />
              </div>

              {USE_MOCK_API ? (
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
              ) : (
                <div className="citizen-form-group">
                  <label className="citizen-form-label">Geographic Area (Live Directory) *</label>
                  {areasLoading ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748B', padding: '0.5rem 0' }}>
                      Loading active areas...
                    </div>
                  ) : areasError ? (
                    <div style={{ fontSize: '0.78rem', color: '#B91C1C', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span>{areasError}</span>
                      <button
                        type="button"
                        onClick={loadLiveAreas}
                        style={{
                          alignSelf: 'flex-start',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#0F766E',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <RefreshCw size={12} /> Retry loading areas
                      </button>
                    </div>
                  ) : liveAreas.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#B45309', padding: '0.4rem 0' }}>
                      No active geographic areas are available. Submission is disabled until an area is configured.
                    </div>
                  ) : (
                    <select
                      className="citizen-form-select"
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
                      required
                    >
                      <option value="">Select an active area...</option>
                      {liveAreas.map((area) => (
                        <option key={area.areaId} value={area.areaId}>
                          {area.areaName} ({area.areaType}
                          {area.parentAreaName ? ` • ${area.parentAreaName}` : ''})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {USE_MOCK_API && (
              <>
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
              </>
            )}

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

            <div className="citizen-form-group">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => setShowMapPicker((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:underline"
                >
                  <MapPin size={14} />
                  {showMapPicker ? 'Hide Map Coordinate Picker' : 'Pin Exact Coordinates on Map (Optional)'}
                </button>
                {pickedCoords && (
                  <span className="text-[11px] font-mono text-[#475569]">
                    {pickedCoords.latitude.toFixed(5)}, {pickedCoords.longitude.toFixed(5)}
                  </span>
                )}
              </div>
              {showMapPicker && (
                <MapView
                  items={
                    pickedCoords
                      ? [
                          {
                            id: 'picked-request-location',
                            type: MAP_ENTITY_TYPES.CITIZEN_REQUEST,
                            title: 'Selected Location',
                            latitude: pickedCoords.latitude,
                            longitude: pickedCoords.longitude,
                            status: urgencyLevel,
                            properties: {},
                          },
                        ]
                      : []
                  }
                  onMapClick={(coords) => setPickedCoords(coords)}
                  heightClass="h-[220px]"
                  showSearch={false}
                  showLayerControl={false}
                  showLegend={false}
                  emptyMessage="Click anywhere on the map to pin your exact location."
                />
              )}
            </div>

            <div className="citizen-form-group">
              <label className="citizen-form-label">Detailed Needs Description *</label>
              <textarea
                className="citizen-form-textarea"
                rows="3"
                placeholder="Please describe what is urgently needed (at least 5 characters)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              ></textarea>
            </div>

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
                Authorized disaster responders may use this information for aid coordination.
              </label>
            </div>
          </div>

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
              disabled={submitting || !canSubmitLive}
            >
              {submitting ? 'Submitting Request...' : 'Submit Assistance Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
