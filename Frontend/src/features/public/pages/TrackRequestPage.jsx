import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Shield,
  MapPin,
  Building2,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

const WORKFLOW_STAGES = [
  'Submitted',
  'Under Review',
  'Verified',
  'Approved',
  'In Progress',
  'Completed',
];

export function TrackRequestPage() {
  const [searchParams] = useSearchParams();
  const { t, lang } = useLanguage();

  const [refInput, setRefInput] = useState(searchParams.get('ref') || '');
  const [phoneInput, setPhoneInput] = useState(searchParams.get('phone') || '');
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [error, setError] = useState('');

  const executeSearch = useCallback(async (ref, phone) => {
    if (!ref.trim()) {
      setError(t('errorRefRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await publicApi.trackRequest({
        referenceNumber: ref,
        verificationPhone: phone,
      });
      setRequestData(res.data);
    } catch (err) {
      setRequestData(null);
      setError(
        err.detail || err.title || t('errorNotFound')
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleSearch = (ref = refInput, phone = phoneInput) => {
    return executeSearch(ref, phone);
  };

  // Auto-search if both parameters are provided in URL
  useEffect(() => {
    const r = searchParams.get('ref');
    const p = searchParams.get('phone');
    if (r) {
      setRefInput(r);
      if (p) {
        setPhoneInput(p);
        executeSearch(r, p);
      }
    }
  }, [searchParams, executeSearch]);

  const loadSample = (sampleRef, samplePhone) => {
    setRefInput(sampleRef);
    setPhoneInput(samplePhone);
    handleSearch(sampleRef, samplePhone);
  };

  // Determine stage progression index
  const currentStageIndex = WORKFLOW_STAGES.findIndex(
    (s) => s.toLowerCase() === (requestData?.status || '').toLowerCase()
  );

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="section-label">{t('publicTrackingLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)', letterSpacing: '-0.02em' }}>
            {t('trackPageTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1rem' }}>
            {t('trackPageSubtitle')}
          </p>
        </div>

        {/* Search Card */}
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="refNo">
                  {t('refNumberLabel')} <span className="required">*</span>
                </label>
                <input
                  id="refNo"
                  type="text"
                  className="form-input"
                  placeholder={t('refPlaceholder')}
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  style={{ textTransform: 'uppercase', fontWeight: 600 }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="verifyPhone">
                  {t('contactPhoneLabel')}
                </label>
                <input
                  id="verifyPhone"
                  type="tel"
                  className="form-input"
                  placeholder="0771234567"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={Search}
                style={{ height: '44px' }}
              >
                {t('trackBtn')}
              </Button>
            </div>
          </form>

          {/* Quick Demo Pre-seed Buttons */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-100)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
              {t('trySamples')}
            </span>
            <button
              type="button"
              className="tag-pill"
              onClick={() => loadSample('HCMS-2026-000123', '0771234567')}
              style={{ cursor: 'pointer' }}
            >
              {t('sampleFood')}
            </button>
            <button
              type="button"
              className="tag-pill"
              onClick={() => loadSample('HCMS-2026-000124', '0719876543')}
              style={{ cursor: 'pointer' }}
            >
              {t('sampleMedical')}
            </button>
            <button
              type="button"
              className="tag-pill"
              onClick={() => loadSample('HCMS-2026-000125', '0755551234')}
              style={{ cursor: 'pointer' }}
            >
              {t('sampleShelter')}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginTop: '1.25rem',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                padding: '0.875rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* RESULTS CARD */}
        {requestData && (
          <div className="card" style={{ padding: '2.5rem' }}>
            {/* Top Status Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-slate-200)', paddingBottom: '1.5rem', marginBottom: '1.75rem' }}>
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', fontWeight: 600 }}>
                  {t('requestReference')}
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary-dark)', letterSpacing: '0.05em' }}>
                  {requestData.referenceNumber}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                    {t('categoryFieldTrack')} <strong>{requestData.category}</strong>
                  </span>
                  <span>•</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                    {t('peopleAffectedTrack')} <strong>{requestData.peopleAffected}</strong>
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', display: 'block', marginBottom: '0.25rem' }}>
                  {t('currentStatus')}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.35rem 0.875rem',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    backgroundColor:
                      requestData.status === 'Completed'
                        ? '#D1FAE5'
                        : requestData.status === 'In Progress'
                        ? '#E0F2FE'
                        : '#FEF3C7',
                    color:
                      requestData.status === 'Completed'
                        ? '#065F46'
                        : requestData.status === 'In Progress'
                        ? '#0369A1'
                        : '#92400E',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'currentColor' }} />
                  {requestData.status}
                </span>
              </div>
            </div>

            {/* Stage Progress Bar Indicator */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                {WORKFLOW_STAGES.map((stg, i) => {
                  const isPassed = currentStageIndex >= i;
                  const isCurrent = currentStageIndex === i;
                  return (
                    <div
                      key={stg}
                      style={{
                        textAlign: 'center',
                        flex: 1,
                        fontSize: '0.75rem',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent
                          ? 'var(--color-primary)'
                          : isPassed
                          ? 'var(--color-green-dark)'
                          : 'var(--color-slate-400)',
                      }}
                    >
                      {stg}
                    </div>
                  );
                })}
              </div>

              {/* Progress Line */}
              <div style={{ height: '8px', backgroundColor: 'var(--color-slate-100)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    width: `${Math.max(15, ((currentStageIndex + 1) / WORKFLOW_STAGES.length) * 100)}%`,
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
            </div>

            {/* Request Summary Information */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                backgroundColor: 'var(--color-surface-subtle)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-slate-200)',
                marginBottom: '2rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', display: 'block' }}>{t('locationLabel')}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-800)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <MapPin size={14} color="var(--color-primary)" />
                  {requestData.location?.addressLine || t('districtArea')}, {requestData.location?.districtName}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', display: 'block' }}>{t('assignedAgencyLabel')}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-800)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Building2 size={14} color="var(--color-primary)" />
                  {requestData.assignedOrganization || t('evalNearestCenter')}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', display: 'block' }}>{t('assignedUnitLabel')}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-800)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <UserCheck size={14} color="var(--color-primary)" />
                  {requestData.assignedTeam || t('officerReviewQueue')}
                </span>
              </div>
            </div>

            {/* Need Description */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '0.5rem' }}>
                {t('reportedNeedsTitle')}
              </h4>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-slate-700)', backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-slate-200)', lineHeight: 1.6 }}>
                "{requestData.description}"
              </p>
            </div>

            {/* Timeline of Updates */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '1rem' }}>
                {t('progressTimeline')}
              </h4>

              <div className="timeline">
                {requestData.timeline?.map((item, index) => (
                  <div
                    key={index}
                    className={`timeline-item ${index === requestData.timeline.length - 1 ? 'active' : 'completed'}`}
                  >
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-status">{item.status}</span>
                        <span className="timeline-time">
                          {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(item.time).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="timeline-note">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Hotline Assistance Callout */}
            <div
              style={{
                marginTop: '2.5rem',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h5 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#92400E' }}>
                  {t('escalateTitle')}
                </h5>
                <p style={{ fontSize: '0.8125rem', color: '#B45309', marginTop: '0.25rem' }}>
                  {t('escalateDesc')} <strong>{requestData.referenceNumber}</strong>.
                </p>
              </div>

              <a href="tel:117" className="btn btn-amber btn-sm">
                <PhoneCall size={14} /> {t('call117Btn')}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
