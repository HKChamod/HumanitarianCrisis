import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useOrganization } from '../../../app/providers/OrganizationProvider';
import { isAdminUser, resolvePostLoginRoute } from '../../../app/authRouting';
import { organizationService } from '../../../services/api/adminServices';
import { USE_MOCK_API } from '../../../services/api/apiConfig';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, authLoading, isAuthenticated, loginWithCredentials } = useAuth();
  const { memberships: contextMemberships, orgLoading } = useOrganization();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect already-authenticated users (e.g. page refresh or direct navigation to /login)
  useEffect(() => {
    if (loading || success || authLoading || !isAuthenticated || !user) return;
    if (!isAdminUser(user) && orgLoading) return;

    const target = resolvePostLoginRoute({
      user,
      requestedPath: location.state?.from,
      memberships: contextMemberships,
      isMock: USE_MOCK_API,
    });
    navigate(target, { replace: true });
  }, [authLoading, isAuthenticated, user, orgLoading, contextMemberships, loading, success, location.state, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      setError(t('loginErrorRequired'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const loggedInUser = await loginWithCredentials(email.trim(), password);
      setSuccess(t('loginSuccess'));

      let memberships = [];
      try {
        const res = await organizationService.getMyMemberships();
        if (Array.isArray(res)) memberships = res;
      } catch {
        memberships = [];
      }

      const target = resolvePostLoginRoute({
        user: loggedInUser,
        requestedPath: location.state?.from,
        memberships,
        isMock: USE_MOCK_API,
      });

      navigate(target, { replace: true });
    } catch (err) {
      setError(err?.detail || err?.title || t('loginErrorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
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
          <h2>{t('welcomeBack')}</h2>
          <p>{t('loginSubtitle')}</p>
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

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="loginEmail">{t('emailLabel')}</label>
            <input
              id="loginEmail"
              type="email"
              required
              className="form-input"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <label className="form-label" htmlFor="loginPass" style={{ marginBottom: 0 }}>{t('passwordLabel')}</label>
              <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                {t('forgotPasswordLink')}
              </Link>
            </div>
            <input
              id="loginPass"
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {t('signInBtn')}
          </Button>
        </form>

        {/* Demo Fast Fill for Reviewers (mock mode only) */}
        {USE_MOCK_API && (
          <div className="demo-credentials-box">
            <p>{t('quickTestCredentials')}</p>
            <div className="demo-buttons-row">
              <button
                type="button"
                className="tag-pill"
                onClick={() => fillDemo('citizen@relieflink.lk', 'CitizenPass2026!')}
              >
                {t('citizenAccount')}
              </button>
              <button
                type="button"
                className="tag-pill"
                onClick={() => fillDemo('officer@dmc.gov.lk', 'OfficerPass2026!')}
              >
                {t('dmcOfficer')}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
          {t('noAccount')}{' '}
          <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            {t('registerAsCitizen')}
          </Link>
        </div>
      </div>
    </div>
  );
}
