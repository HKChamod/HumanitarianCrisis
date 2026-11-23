import { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Clock, MapPin, Users, Phone, Building, AlertCircle, Star, ArrowRight } from 'lucide-react';
import { citizenApi } from '../../../services/api/citizenApi';
import { USE_MOCK_API } from '../../../services/api/apiConfig';

export function TrackRequestModal({
  isOpen,
  onClose,
  initialRequest = null,
  onFeedbackSubmit,
  onAdvanceStatus
}) {
  const [searchInput, setSearchInput] = useState('');
  const [activeRequest, setActiveRequest] = useState(initialRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  useEffect(() => {
    setActiveRequest(initialRequest);
    if (initialRequest?.referenceNumber) {
      setSearchInput(initialRequest.referenceNumber);
    }
  }, [initialRequest]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setError('');
    setLoading(true);
    try {
      const res = await citizenApi.trackRequest(searchInput.trim());
      setActiveRequest(res.data);
    } catch (err) {
      setError(err?.message || 'No assistance request found matching this reference number.');
      setActiveRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!activeRequest) return;
    try {
      await citizenApi.submitFeedback(activeRequest.id, {
        rating,
        comments: feedbackComment
      });
      setFeedbackSaved(true);
      if (onFeedbackSubmit) onFeedbackSubmit();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const handleAdvance = async () => {
    if (!activeRequest || !onAdvanceStatus) return;
    await onAdvanceStatus(activeRequest.id);
    try {
      const refreshed = await citizenApi.trackRequest(activeRequest.referenceNumber);
      setActiveRequest(refreshed.data);
    } catch {}
  };

  return (
    <div className="citizen-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-track-title">
      <div className="citizen-modal-container">
        {/* Header */}
        <div className="citizen-modal-header">
          <h2 id="modal-track-title" className="citizen-modal-title">
            <Clock size={20} color="#0F766E" />
            Track Assistance Request &amp; History
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

        <div className="citizen-modal-body">
          {/* Reference Search Bar */}
          {USE_MOCK_API ? (
            <form onSubmit={handleSearch} style={{ marginBottom: '1.25rem' }}>
              <label className="citizen-form-label">Search by Reference Number</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="requests-search-bar" style={{ maxWidth: 'none', flex: 1 }}>
                  <Search size={16} color="#64748B" />
                  <input
                    type="text"
                    placeholder="e.g. HCMS-2026-000123"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn-teal-primary"
                  disabled={loading}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#475569',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}
            >
              Public reference-number lookup and citizen feedback submission are not backed by the live API yet. Select any request from your dashboard to inspect its live backend status.
            </div>
          )}

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

          {/* Active Request Details */}
          {activeRequest ? (
            <div>
              {/* Top Banner */}
              <div
                style={{
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="req-ref-number">{activeRequest.referenceNumber}</span>
                  <span
                    style={{
                      background: '#0F766E',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                    }}
                  >
                    {activeRequest.status}
                  </span>
                </div>

                <p style={{ fontWeight: 700, color: '#0F172A', margin: '0 0 0.25rem' }}>
                  {activeRequest.category} Assistance Request
                </p>
                <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 0.75rem' }}>
                  {activeRequest.description}
                </p>

                <div className="citizen-req-meta-row">
                  <span className="citizen-req-meta-item">
                    <Users size={14} /> {activeRequest.peopleAffected} Affected
                  </span>
                  <span className="citizen-req-meta-item">
                    <MapPin size={14} /> {activeRequest.location?.addressLine || activeRequest.location?.district}
                  </span>
                  <span className="citizen-req-meta-item">
                    <Phone size={14} /> {activeRequest.contactPhone}
                  </span>
                </div>

                {activeRequest.assignedOrganization && (
                  <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #E2E8F0', fontSize: '0.8125rem', color: '#0F766E', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building size={14} />
                    <strong>Assigned:</strong> {activeRequest.assignedOrganization}
                    {activeRequest.assignedOfficer && ` (${activeRequest.assignedOfficer})`}
                  </div>
                )}
              </div>

              {/* Advance Status Simulation Bar */}
              {onAdvanceStatus && activeRequest.status !== 'Completed' && activeRequest.status !== 'Cancelled' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#F8FAFC',
                    border: '1px dashed #0F766E',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    marginBottom: '1.25rem',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                    Current Stage: <strong>{activeRequest.status}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-teal-primary"
                    onClick={handleAdvance}
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem' }}
                  >
                    Simulate Next Status &rarr;
                  </button>
                </div>
              )}

              {/* Timeline Stepper History */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.75rem' }}>
                Status Progression &amp; Action Log
              </h3>

              <div style={{ position: 'relative', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    bottom: '8px',
                    left: '7px',
                    width: '2px',
                    backgroundColor: '#CCFBF1',
                  }}
                ></div>

                {activeRequest.history && activeRequest.history.map((step, idx) => (
                  <div key={idx} style={{ position: 'relative', marginBottom: '1.2rem' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-1.5rem',
                        top: '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#0F766E',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 0 0 2px #0F766E',
                      }}
                    ></div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
                        {step.status}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        {new Date(step.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0.2rem 0 0' }}>
                      {step.note}
                    </p>
                  </div>
                ))}
              </div>

              {/* Citizen Feedback Form if Completed (mock-only; backend feedback endpoint not implemented) */}
              {USE_MOCK_API && activeRequest.status === 'Completed' && (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0F172A' }}>
                    Assistance Feedback (CIT-09)
                  </h4>
                  {feedbackSaved || activeRequest.feedback ? (
                    <p style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 600, margin: 0 }}>
                      Thank you! Your feedback has been recorded by the Disaster Management Centre.
                    </p>
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 0.5rem' }}>
                        Did you receive the requested assistance adequately? Rate your experience:
                      </p>
                      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.6rem' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Star
                              size={18}
                              fill={star <= rating ? '#F59E0B' : 'none'}
                              color={star <= rating ? '#F59E0B' : '#CBD5E1'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="citizen-form-textarea"
                        rows="2"
                        placeholder="Optional remarks on response speed or supplies received..."
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}
                      ></textarea>
                      <button
                        type="button"
                        className="btn-teal-primary"
                        onClick={handleSendFeedback}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      >
                        Submit Feedback
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>
              Enter a reference number above or select any request from your dashboard to view its real-time tracking timeline.
            </div>
          )}
        </div>

        <div className="citizen-modal-footer">
          <button type="button" className="btn-teal-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
