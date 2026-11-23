import { useState } from 'react';
import { UserPlus, CheckCircle } from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { DISTRICTS } from '../../../data/sriLankaAreas';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

const SKILLS = [
  { id: 'First Aid / Medical Care', key: 'skillFirstAid' },
  { id: 'Boat Driving & Water Rescue', key: 'skillBoat' },
  { id: 'Heavy Vehicle / 4x4 Driving', key: 'skillHeavyVehicle' },
  { id: 'Food Cooking & Supply Packing', key: 'skillFood' },
  { id: 'Translation (Sinhala / Tamil / English)', key: 'skillTranslation' },
  { id: 'Child Care & Psychosocial Support', key: 'skillChildCare' },
  { id: 'Ham Radio / Communication Equipment', key: 'skillRadio' },
  { id: 'General Manual Labor & Debris Clearing', key: 'skillLabor' },
];

export function VolunteerRegistrationPage() {
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    nicNumber: '',
    mobileNumber: '',
    email: '',
    districtId: 'KAL',
    availability: 'On-Call Emergencies',
    selectedSkills: [],
    experienceNotes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.selectedSkills.includes(skill);
      return {
        ...prev,
        selectedSkills: exists
          ? prev.selectedSkills.filter((s) => s !== skill)
          : [...prev.selectedSkills, skill],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.mobileNumber) {
      setError(t('errorVolRequired'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const dist = DISTRICTS.find((d) => d.id === formData.districtId);
      const res = await publicApi.submitVolunteerApplication({
        ...formData,
        districtName: dist?.name,
      });
      setResult(res.data);
    } catch (err) {
      setError(t('errorVolFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '780px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="section-label">{t('communityReliefLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
            {t('volunteerTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1rem' }}>
            {t('volunteerSubtitle')}
          </p>
        </div>

        {result ? (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
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
              <CheckCircle size={32} />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
              {t('applicationReceived')}
            </h2>
            <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1rem', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
              {t('thankYouPrefix')} <strong>{result.fullName}</strong>. {t('profileRecorded')}
            </p>

            <div
              style={{
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary-dark)',
                fontFamily: 'monospace',
                fontSize: '1.5rem',
                fontWeight: 800,
                padding: '0.75rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                display: 'inline-block',
                marginBottom: '1.5rem',
              }}
            >
              {result.referenceNumber}
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)', lineHeight: 1.5, maxWidth: '480px', margin: '0 auto 2rem' }}>
              {t('coordinatorContact')} ({result.mobileNumber}) {t('toVerifyQualifications')}
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setResult(null);
                setFormData({
                  fullName: '',
                  nicNumber: '',
                  mobileNumber: '',
                  email: '',
                  districtId: 'KAL',
                  availability: 'On-Call Emergencies',
                  selectedSkills: [],
                  experienceNotes: '',
                });
              }}
            >
              {t('registerAnotherVol')}
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: '2.5rem' }}>
            {error && (
              <div style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="volName">{t('fullNameLabel')} <span className="required">*</span></label>
                  <input
                    id="volName"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Kasun Perera"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="volPhone">{t('mobilePhoneVolLabel')} <span className="required">*</span></label>
                  <input
                    id="volPhone"
                    type="tel"
                    required
                    className="form-input"
                    placeholder="0773344556"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="volNic">{t('nicLabel')}</label>
                  <input
                    id="volNic"
                    type="text"
                    className="form-input"
                    placeholder="199512345678"
                    value={formData.nicNumber}
                    onChange={(e) => setFormData({ ...formData, nicNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="volDistrict">{t('operatingDistrictLabel')} <span className="required">*</span></label>
                  <select
                    id="volDistrict"
                    className="form-select"
                    value={formData.districtId}
                    onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                  >
                    {DISTRICTS.map((d) => {
                      const distName = lang === 'si' && d.nameSi ? d.nameSi : lang === 'ta' && d.nameTa ? d.nameTa : d.name;
                      return (
                        <option key={d.id} value={d.id}>{distName} ({d.name})</option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Skills selection */}
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">{t('skillsLabel')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '0.5rem' }}>
                  {SKILLS.map((sk) => {
                    const isChecked = formData.selectedSkills.includes(sk.id);
                    return (
                      <label
                        key={sk.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.625rem 0.875rem',
                          borderRadius: 'var(--radius-md)',
                          border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-slate-200)',
                          backgroundColor: isChecked ? '#F0FDFA' : '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          fontWeight: isChecked ? 600 : 400,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSkill(sk.id)}
                        />
                        <span>{t(sk.key) || sk.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Availability */}
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label">{t('availabilityLabel')}</label>
                <select
                  className="form-select"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                >
                  <option value="On-Call Emergencies">{t('availOnCall')}</option>
                  <option value="Weekends Only">{t('availWeekends')}</option>
                  <option value="Full-Time (Relief Deployment)">{t('availFullTime')}</option>
                  <option value="Remote Coordination">{t('availRemote')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <Button type="submit" variant="primary" size="lg" loading={submitting} icon={UserPlus}>
                  {t('submitVolBtn')}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
