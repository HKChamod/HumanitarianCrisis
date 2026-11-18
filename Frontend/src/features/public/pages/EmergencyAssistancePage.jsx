import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  Utensils,
  HeartPulse,
  Home,
  Truck,
  Accessibility,
  HelpCircle,
  LifeBuoy,
} from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { PROVINCES, DISTRICTS, getDsDivisionsForDistrict, getGnDivisionsForDs } from '../../../data/sriLankaAreas';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

const CATEGORIES = [
  { id: 'Food', labelKey: 'catFoodLabel', defaultLabel: 'Food & Rations', icon: Utensils },
  { id: 'Medicine', labelKey: 'catMedLabel', defaultLabel: 'Medical & First Aid', icon: HeartPulse },
  { id: 'Shelter', labelKey: 'catShelterLabel', defaultLabel: 'Emergency Shelter', icon: Home },
  { id: 'Transport', labelKey: 'catTransportLabel', defaultLabel: 'Rescue Transport', icon: Truck },
  { id: 'Accessibility Support', labelKey: 'catAccessLabel', defaultLabel: 'Disability / Elder Care', icon: Accessibility },
  { id: 'Water', labelKey: 'catWaterLabel', defaultLabel: 'Drinking Water', icon: LifeBuoy },
  { id: 'Other', labelKey: 'catOtherLabel', defaultLabel: 'Other Urgent Need', icon: HelpCircle },
];

export function EmergencyAssistancePage() {
  const [searchParams] = useSearchParams();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    category: searchParams.get('category') || 'Food',
    description: '',
    peopleAffected: 3,
    hasInfants: false,
    hasElderly: false,
    hasMedicalEmergency: false,
    provinceId: 'WP',
    districtId: 'KAL',
    dsDivisionId: 'KAL-01',
    gnDivisionId: 'GN-K01',
    addressLine: '',
    contactName: '',
    contactPhone: '',
    alternatePhone: '',
    urgencyLevel: 'High',
  });

  // Keep category in sync with query parameter if present
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) {
      setFormData((prev) => ({ ...prev, category: cat }));
    }
  }, [searchParams]);

  // Cascading location lists
  const availableDistricts = DISTRICTS.filter((d) => d.provinceId === formData.provinceId);
  const availableDs = getDsDivisionsForDistrict(formData.districtId);
  const availableGn = getGnDivisionsForDs(formData.dsDivisionId);

  const handleProvinceChange = (e) => {
    const provId = e.target.value;
    const newDistricts = DISTRICTS.filter((d) => d.provinceId === provId);
    const firstDist = newDistricts[0]?.id || '';
    const newDs = getDsDivisionsForDistrict(firstDist);
    const firstDs = newDs[0]?.id || '';
    const newGn = getGnDivisionsForDs(firstDs);

    setFormData((prev) => ({
      ...prev,
      provinceId: provId,
      districtId: firstDist,
      dsDivisionId: firstDs,
      gnDivisionId: newGn[0]?.id || '',
    }));
  };

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    const newDs = getDsDivisionsForDistrict(distId);
    const firstDs = newDs[0]?.id || '';
    const newGn = getGnDivisionsForDs(firstDs);

    setFormData((prev) => ({
      ...prev,
      districtId: distId,
      dsDivisionId: firstDs,
      gnDivisionId: newGn[0]?.id || '',
    }));
  };

  const handleDsChange = (e) => {
    const dsId = e.target.value;
    const newGn = getGnDivisionsForDs(dsId);

    setFormData((prev) => ({
      ...prev,
      dsDivisionId: dsId,
      gnDivisionId: newGn[0]?.id || '',
    }));
  };

  const validateStep = (currentStep) => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!formData.category) {
        setErrorMessage(t('errorSelectCategory'));
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.description.trim()) {
        setErrorMessage(t('errorDescRequired'));
        return false;
      }
      if (Number(formData.peopleAffected) < 1) {
        setErrorMessage(t('errorPeopleMin'));
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.districtId || !formData.addressLine.trim()) {
        setErrorMessage(t('errorAddressRequired'));
        return false;
      }
    } else if (currentStep === 4) {
      const phoneDigits = formData.contactPhone.replace(/\D/g, '');
      if (phoneDigits.length < 9) {
        setErrorMessage(t('errorPhoneInvalid'));
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setErrorMessage('');
    setStep((s) => s - 1);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const prov = PROVINCES.find((p) => p.id === formData.provinceId);
      const dist = DISTRICTS.find((d) => d.id === formData.districtId);
      const ds = availableDs.find((d) => d.id === formData.dsDivisionId);
      const gn = availableGn.find((g) => g.id === formData.gnDivisionId);

      const payload = {
        ...formData,
        provinceName: prov?.name,
        districtName: dist?.name,
        dsDivisionName: ds?.name,
        gnDivisionName: gn?.name,
      };

      const res = await publicApi.submitGuestAssistanceRequest(payload);
      setSubmittedData(res.data);
      setStep(5); // Success step
    } catch (err) {
      setErrorMessage(err.detail || err.title || t('errorSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyRefCode = () => {
    if (submittedData?.referenceNumber) {
      navigator.clipboard.writeText(submittedData.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              padding: '0.35rem 0.875rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            <ShieldAlert size={14} />
            <span>{t('emergencyPortalLabel')}</span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)', letterSpacing: '-0.02em' }}>
            {t('emergencyPortalTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1.0625rem' }}>
            {t('emergencyPortalSubtitle')}
          </p>
        </div>

        {/* Wizard Step Indicator (Only if not in success step) */}
        {step <= 4 && (
          <div className="wizard-steps" aria-label="Progress Steps">
            {[
              { num: 1, label: t('stepCategoryLabel') },
              { num: 2, label: t('stepNeedLabel') },
              { num: 3, label: t('stepLocationLabel') },
              { num: 4, label: t('stepContactLabel') },
            ].map((s) => (
              <div
                key={s.num}
                className={`wizard-step-node ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}
              >
                <div className="wizard-step-circle">
                  {step > s.num ? <Check size={14} strokeWidth={3} /> : s.num}
                </div>
                <span className="wizard-step-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '0.9375rem',
            }}
          >
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* MAIN FORM CARD */}
        <div className="card" style={{ padding: '2.5rem' }}>
          {/* STEP 1: CATEGORY SELECTION */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {t('step1Heading')}
              </h2>
              <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.75rem', fontSize: '0.9375rem' }}>
                {t('step1SubHeading')}
              </p>

              <div className="form-category-grid">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.id;
                  const categoryTitle = t(cat.labelKey) || cat.defaultLabel;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`form-category-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                    >
                      <Icon size={28} color={isSelected ? 'var(--color-primary)' : 'var(--color-slate-600)'} />
                      <span>{categoryTitle}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <Button variant="primary" size="lg" onClick={nextStep} iconRight={ArrowRight}>
                  {t('continueToDetails')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS OF NEED & VULNERABILITIES */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {t('step2Heading')}
              </h2>
              <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                {t('step2SubHeading')}
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="needDesc">
                  {t('needDescLabel')} <span className="required">*</span>
                </label>
                <textarea
                  id="needDesc"
                  rows={4}
                  className="form-textarea"
                  placeholder={t('needDescPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <span className="form-help">{t('needDescHelp')}</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="peopleAffected">
                  {t('peopleAffectedLabel')} <span className="required">*</span>
                </label>
                <input
                  id="peopleAffected"
                  type="number"
                  min={1}
                  max={200}
                  className="form-input"
                  style={{ maxWidth: '180px' }}
                  value={formData.peopleAffected}
                  onChange={(e) => setFormData({ ...formData, peopleAffected: e.target.value })}
                />
              </div>

              {/* Special Vulnerability Checks */}
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-slate-200)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-slate-800)', display: 'block', marginBottom: '0.75rem' }}>
                  {t('vulnerabilityTitle')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.hasInfants}
                      onChange={(e) => setFormData({ ...formData, hasInfants: e.target.checked })}
                    />
                    <span>{t('hasInfantsLabel')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.hasElderly}
                      onChange={(e) => setFormData({ ...formData, hasElderly: e.target.checked })}
                    />
                    <span>{t('hasElderlyLabel')}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.hasMedicalEmergency}
                      onChange={(e) => setFormData({ ...formData, hasMedicalEmergency: e.target.checked })}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>{t('hasMedicalLabel')}</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <Button variant="secondary" onClick={prevStep} icon={ArrowLeft}>
                  {t('backBtn')}
                </Button>
                <Button variant="primary" size="lg" onClick={nextStep} iconRight={ArrowRight}>
                  {t('continueToLocation')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SRI LANKAN ADMINISTRATIVE LOCATION */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {t('step3Heading')}
              </h2>
              <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                {t('step3SubHeading')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('provinceLabel')} <span className="required">*</span></label>
                  <select className="form-select" value={formData.provinceId} onChange={handleProvinceChange}>
                    {PROVINCES.map((p) => {
                      const name = lang === 'si' && p.nameSi ? p.nameSi : lang === 'ta' && p.nameTa ? p.nameTa : p.name;
                      return (
                        <option key={p.id} value={p.id}>{name} ({p.name})</option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('districtLabel')} <span className="required">*</span></label>
                  <select className="form-select" value={formData.districtId} onChange={handleDistrictChange}>
                    {availableDistricts.map((d) => {
                      const name = lang === 'si' && d.nameSi ? d.nameSi : lang === 'ta' && d.nameTa ? d.nameTa : d.name;
                      return (
                        <option key={d.id} value={d.id}>{name} ({d.name})</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">{t('dsDivisionLabel')}</label>
                  <select className="form-select" value={formData.dsDivisionId} onChange={handleDsChange}>
                    {availableDs.map((ds) => {
                      const name = lang === 'si' && ds.nameSi ? ds.nameSi : ds.name;
                      return (
                        <option key={ds.id} value={ds.id}>{name}</option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('gnDivisionLabel')}</label>
                  <select
                    className="form-select"
                    value={formData.gnDivisionId}
                    onChange={(e) => setFormData({ ...formData, gnDivisionId: e.target.value })}
                  >
                    {availableGn.map((gn) => (
                      <option key={gn.id} value={gn.id}>{gn.name} {gn.code ? `[${gn.code}]` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="addressLine">
                  {t('addressLabel')} <span className="required">*</span>
                </label>
                <input
                  id="addressLine"
                  type="text"
                  className="form-input"
                  placeholder={t('addressPlaceholder')}
                  value={formData.addressLine}
                  onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                />
                <span className="form-help">{t('addressHelp')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <Button variant="secondary" onClick={prevStep} icon={ArrowLeft}>
                  {t('backBtn')}
                </Button>
                <Button variant="primary" size="lg" onClick={nextStep} iconRight={ArrowRight}>
                  {t('continueToContact')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: CONTACT & SUBMISSION */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {t('step4Heading')}
              </h2>
              <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                {t('step4SubHeading')}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="contactName">{t('contactNameLabel')}</label>
                  <input
                    id="contactName"
                    type="text"
                    className="form-input"
                    placeholder="Sunil Perera"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contactPhone">
                    {t('mobilePhoneLabel')} <span className="required">*</span>
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    className="form-input"
                    placeholder="0771234567"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                  <span className="form-help">{t('phoneHelp')}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="altPhone">{t('altPhoneLabel')}</label>
                <input
                  id="altPhone"
                  type="tel"
                  className="form-input"
                  placeholder="0719876543"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                />
              </div>

              {/* Urgency Level Assessment */}
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">{t('urgencyLabel')}</label>
                <div className="urgency-selector-grid">
                  <div
                    className={`urgency-card-option critical ${formData.urgencyLevel === 'Critical' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, urgencyLevel: 'Critical' })}
                  >
                    <span style={{ fontWeight: 700, color: '#B91C1C', display: 'block' }}>{t('urgencyCritical')}</span>
                    <span style={{ fontSize: '0.75rem', color: '#7F1D1D' }}>{t('urgencyCriticalDesc')}</span>
                  </div>

                  <div
                    className={`urgency-card-option high ${formData.urgencyLevel === 'High' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, urgencyLevel: 'High' })}
                  >
                    <span style={{ fontWeight: 700, color: '#B45309', display: 'block' }}>{t('urgencyHigh')}</span>
                    <span style={{ fontSize: '0.75rem', color: '#78350F' }}>{t('urgencyHighDesc')}</span>
                  </div>

                  <div
                    className={`urgency-card-option medium ${formData.urgencyLevel === 'Medium' ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, urgencyLevel: 'Medium' })}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block' }}>{t('urgencyMedium')}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-600)' }}>{t('urgencyMediumDesc')}</span>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div style={{ backgroundColor: '#F0FDFA', border: '1px solid #CCFBF1', padding: '1rem', borderRadius: 'var(--radius-md)', margin: '1.5rem 0', fontSize: '0.8125rem', color: 'var(--color-primary-dark)' }}>
                {t('privacyAssurance')}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <Button variant="secondary" onClick={prevStep} icon={ArrowLeft} disabled={submitting}>
                  {t('backBtn')}
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSubmit}
                  loading={submitting}
                  icon={CheckCircle}
                >
                  {t('submitRequest')}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION & TRACKING REFERENCE DISPLAY */}
          {step === 5 && submittedData && (
            <div className="success-ref-card">
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <Check size={32} strokeWidth={3} />
              </div>

              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                {t('successTitle')}
              </h2>

              <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1rem', lineHeight: 1.5 }}>
                {t('successSubtitle')}
              </p>

              {/* Reference Code Box */}
              <div className="ref-code-box">
                <span className="ref-code-text">{submittedData.referenceNumber}</span>
                <button
                  type="button"
                  onClick={copyRefCode}
                  style={{
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary-dark)',
                    border: 'none',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? t('copiedBtn') : t('copyBtn')}</span>
                </button>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-slate-200)', maxWidth: '420px', margin: '0 auto 1.5rem', textAlign: 'left', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--color-slate-500)' }}>{t('categoryFieldLabel')}</span>
                  <strong>{submittedData.category}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ color: 'var(--color-slate-500)' }}>{t('initialStatusLabel')}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{t('submittedInQueue')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-slate-500)' }}>{t('verificationPhoneLabel')}</span>
                  <strong>{submittedData.contactPhone}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/track?ref=${submittedData.referenceNumber}&phone=${encodeURIComponent(submittedData.contactPhone)}`}
                  className="btn btn-primary btn-lg"
                >
                  {t('trackLiveBtn')}
                </Link>

                <Link to="/" className="btn btn-secondary btn-lg">
                  {t('returnHomeBtn')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
