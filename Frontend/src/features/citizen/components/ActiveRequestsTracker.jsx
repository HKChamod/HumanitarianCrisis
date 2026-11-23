import { useState } from 'react';
import { Search, MapPin, Users, Calendar, ArrowRight, XCircle, CheckCircle, Clock, RotateCcw } from 'lucide-react';

const LIFECYCLE_STAGES = [
  'Submitted',
  'Under Review',
  'Verified',
  'Approved',
  'In Progress',
  'Completed',
];

function getStatusPillClass(status) {
  switch (status) {
    case 'Submitted':
      return 'status-submitted';
    case 'Under Review':
      return 'status-under-review';
    case 'Verified':
      return 'status-verified';
    case 'Approved':
      return 'status-approved';
    case 'In Progress':
      return 'status-in-progress';
    case 'Completed':
      return 'status-completed';
    case 'Cancelled':
    case 'Rejected':
      return 'status-cancelled';
    default:
      return 'status-submitted';
  }
}

export function ActiveRequestsTracker({
  requests = [],
  loading = false,
  onSelectRequest,
  onCancelRequest,
  onOpenSubmitModal,
  onAdvanceStatus,
  onClearAllData
}) {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = requests.filter((req) => {
    // Filter by tab
    if (filter === 'Pending') {
      if (req.status !== 'Submitted' && req.status !== 'Under Review' && req.status !== 'Pending') {
        return false;
      }
    } else if (filter === 'In Progress') {
      if (req.status !== 'Approved' && req.status !== 'In Progress' && req.status !== 'Verified' && req.status !== 'Assigned') {
        return false;
      }
    } else if (filter === 'Completed') {
      if (req.status !== 'Completed' && req.status !== 'Fulfilled') {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = req.referenceNumber?.toLowerCase().includes(q);
      const matchCat = req.category?.toLowerCase().includes(q);
      const matchDesc = req.description?.toLowerCase().includes(q);
      const matchLoc = req.location?.district?.toLowerCase().includes(q);
      return matchRef || matchCat || matchDesc || matchLoc;
    }

    return true;
  });

  return (
    <section className="citizen-requests-section" aria-label="My Assistance Requests">
      <div className="requests-header-row">
        <div>
          <div className="section-eyebrow">Real-Time Tracker</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 className="section-heading" style={{ margin: 0 }}>My Assistance Requests</h2>
            {requests.length > 0 && onClearAllData && (
              <button
                type="button"
                onClick={onClearAllData}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                title="Wipe submitted requests to start test clean"
              >
                <RotateCcw size={13} /> Reset to 0
              </button>
            )}
          </div>
          <p className="section-desc" style={{ marginBottom: 0, marginTop: '0.25rem' }}>
            Live status of your submitted emergency requests and dispatched humanitarian relief.
          </p>
        </div>

        {/* Filter Pills & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="requests-filter-pills">
            {['All', 'Pending', 'In Progress', 'Completed'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`filter-pill ${filter === tab ? 'active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="requests-search-bar">
            <Search size={16} color="#64748B" />
            <input
              type="text"
              placeholder="Search by ref # or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search my requests"
            />
          </div>
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B', fontSize: '0.9rem' }}>
          Loading your assistance requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
          <Clock size={38} color="#0F766E" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
          <p style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', margin: '0 0 0.35rem' }}>
            {requests.length === 0 ? 'No Assistance Requests Yet' : 'No Matching Requests'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.25rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            {requests.length === 0
              ? 'You have not submitted any emergency requests. Select an assistance category above or click below to submit your first request.'
              : `No requests match "${searchQuery}". Try a different search term or filter.`}
          </p>
          <button
            type="button"
            className="btn-teal-primary"
            onClick={onOpenSubmitModal}
            style={{ fontSize: '0.875rem', padding: '0.55rem 1.25rem' }}
          >
            + Submit New Assistance Request
          </button>
        </div>
      ) : (
        <div className="citizen-request-cards-list">
          {filteredRequests.map((req) => {
            const currentStageIdx = LIFECYCLE_STAGES.indexOf(req.status);

            return (
              <div key={req.id} className="citizen-req-card">
                {/* Top Row: Ref Number, Category, Status Badge */}
                <div className="citizen-req-card-top">
                  <div className="req-ref-title-wrap">
                    <span className="req-ref-number">{req.referenceNumber}</span>
                    <span className="req-category-badge">{req.category}</span>
                    {req.urgencyLevel === 'Critical' && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        CRITICAL
                      </span>
                    )}
                    {req.urgencyLevel === 'High' && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        HIGH URGENCY
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className={`req-status-pill ${getStatusPillClass(req.status)}`}>
                      {req.status === 'Completed' ? <CheckCircle size={13} /> : <Clock size={13} />}
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="citizen-req-desc">{req.description}</p>

                {/* Meta details: People, Location, Date */}
                <div className="citizen-req-meta-row">
                  <span className="citizen-req-meta-item">
                    <Users size={14} /> {req.peopleAffected} person(s) affected
                  </span>
                  <span className="citizen-req-meta-item">
                    <MapPin size={14} /> {req.location?.addressLine || req.location?.district}
                  </span>
                  <span className="citizen-req-meta-item">
                    <Calendar size={14} /> {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                  {req.assignedOrganization && (
                    <span className="citizen-req-meta-item" style={{ color: '#0F766E', fontWeight: 600 }}>
                      Assigned: {req.assignedOrganization}
                    </span>
                  )}
                </div>

                {/* Compact Lifecycle Stepper */}
                {req.status !== 'Cancelled' && req.status !== 'Rejected' && (
                  <div className="citizen-stepper-compact">
                    {LIFECYCLE_STAGES.map((stage, idx) => {
                      const isCompleted = currentStageIdx >= idx;
                      const isCurrent = req.status === stage;

                      return (
                        <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <div
                            className={`stepper-step-item ${isCompleted ? 'completed' : ''} ${
                              isCurrent ? 'current' : ''
                            }`}
                          >
                            <span className="stepper-dot">{idx + 1}</span>
                            <span>{stage}</span>
                          </div>
                          {idx < LIFECYCLE_STAGES.length - 1 && (
                            <span
                              className={`stepper-line ${currentStageIdx > idx ? 'completed' : ''}`}
                            ></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Action Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    Last update: {new Date(req.updatedAt || req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {/* Advance Status Button for Testing Lifecycle */}
                    {onAdvanceStatus && req.status !== 'Completed' && req.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => onAdvanceStatus(req.id)}
                        style={{
                          background: '#E6FFFA',
                          border: '1px solid #99F6E4',
                          color: '#0F766E',
                          borderRadius: '8px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Simulate next status transition"
                      >
                        Advance Status &rarr;
                      </button>
                    )}

                    {(req.status === 'Pending' || req.status === 'Submitted' || req.status === 'Under Review') && (
                      <button
                        type="button"
                        onClick={() => onCancelRequest(req.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-teal-primary"
                      onClick={() => onSelectRequest(req)}
                      style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
                    >
                      View Details &amp; History <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
