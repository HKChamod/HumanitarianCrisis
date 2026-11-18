import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await publicApi.forgotPassword({ email });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div
            className="brand-icon-wrapper"
            style={{ margin: '0 auto 1rem', width: '3rem', height: '3rem' }}
          >
            <Shield size={26} strokeWidth={2.5} />
          </div>
          <h2>{t('forgotTitle')}</h2>
          <p>{t('forgotSubtitle')}</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
              {t('checkInboxTitle')}
            </h3>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.875rem', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {t('checkInboxMsg')} <strong>{email}</strong>, {t('checkInboxMsg2')}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              {t('backToSignIn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="resetEmail">{t('emailLabel')}</label>
              <input
                id="resetEmail"
                type="email"
                required
                className="form-input"
                placeholder="citizen@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {t('sendRecoveryBtn')}
            </Button>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: 'var(--color-slate-600)', fontWeight: 600 }}>
                <ArrowLeft size={14} /> {t('backToSignIn')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
