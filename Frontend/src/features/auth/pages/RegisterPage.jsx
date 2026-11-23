import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { DISTRICTS } from '../../../data/sriLankaAreas';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contactPhone: '',
    nicNumber: '',
    districtId: 'COL',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError(t('regErrorPasswordMatch'));
      return;
    }
    if (!formData.fullName || !formData.email || !formData.contactPhone) {
      setError(t('regErrorRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await publicApi.register(formData);
      setSuccess(t('regSuccess'));
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.detail || err.title || t('regFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <div
            style={{ margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src="/athwala-emblem.png"
              alt="Athwala"
              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
            />
          </div>
          <h2>{t('createAccountTitle')}</h2>
          <p>{t('registerSubtitle')}</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="regName">{t('fullNameRegLabel')} <span className="required">*</span></label>
            <input
              id="regName"
              type="text"
              required
              className="form-input"
              placeholder="Kasun Bandara"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="regEmail">{t('emailRegLabel')} <span className="required">*</span></label>
              <input
                id="regEmail"
                type="email"
                required
                className="form-input"
                placeholder="kasun@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="regPhone">{t('mobileRegLabel')} <span className="required">*</span></label>
              <input
                id="regPhone"
                type="tel"
                required
                className="form-input"
                placeholder="0771234567"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="regNic">{t('nicRegLabel')}</label>
              <input
                id="regNic"
                type="text"
                className="form-input"
                placeholder="199012345678"
                value={formData.nicNumber}
                onChange={(e) => setFormData({ ...formData, nicNumber: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="regDist">{t('primaryDistrictLabel')}</label>
              <select
                id="regDist"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="regPass">{t('passwordRegLabel')} <span className="required">*</span></label>
              <input
                id="regPass"
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="regConfirmPass">{t('confirmPasswordLabel')} <span className="required">*</span></label>
              <input
                id="regConfirmPass"
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div style={{ margin: '1rem 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-slate-600)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
              />
              <span>{t('agreeTermsLabel')}</span>
            </label>
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
            {t('createAccountBtn')}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
          {t('alreadyAccount')}{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            {t('signInHere')}
          </Link>
        </div>
      </div>
    </div>
  );
}
