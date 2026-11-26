import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitcher } from '../common/ProgressBar';
import { useAuth } from '../../app/providers/AuthProvider';
import { useOrganization } from '../../app/providers/OrganizationProvider';
import { getDefaultRouteForUser } from '../../app/authRouting';

export function Header() {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, authLoading, logout } = useAuth();
  const { approvedMemberships } = useOrganization();

  const portalRoute = isAuthenticated && user
    ? getDefaultRouteForUser(user, approvedMemberships)
    : '/login';
  const portalLabel =
    portalRoute === '/admin'
      ? 'Admin Portal'
      : portalRoute === '/organization'
        ? 'Organization Portal'
        : 'Citizen Portal';

  const navItems = [
    { label: t('navCrises'), path: '/crises' },
    { label: t('navShelters'), path: '/shelters' },
    { label: t('navMap'), path: '/map' },
    { label: t('navVolunteer'), path: '/volunteer' },
    { label: t('navDonations'), path: '/donations' },
    { label: t('navContact'), path: '/contact' },
  ];

  return (
    <header className="site-header">
      <div className="container">
        <nav className="navbar" aria-label="Main Navigation">
          {/* Brand Logo */}
          <Link to="/" className="brand-link" onClick={() => setMobileMenuOpen(false)}>
            <img
              src="/athwala-logo-full.png"
              alt="Athwala"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>

          {/* Desktop Nav Links */}
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Header Actions */}
          <div className="header-actions">
            <LanguageSwitcher />

            {!authLoading && isAuthenticated && user ? (
              <>
                <Link
                  to={portalRoute}
                  className="btn btn-primary btn-sm"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <LayoutDashboard size={14} />
                  <span>{portalLabel}</span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: '#DC2626',
                    borderColor: '#FECACA',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : !authLoading ? (
              <>
                <Link
                  to="/login"
                  className="header-login-link"
                >
                  {t('login')}
                </Link>

                <Link
                  to="/register"
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('register')}
                </Link>
              </>
            ) : null}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--color-slate-200)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '0.75rem 0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: location.pathname === item.path ? 'var(--color-primary)' : 'var(--color-slate-800)',
                borderBottom: '1px solid var(--color-slate-100)',
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
            <Link
              to="/request-help"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('requestHelpBtn')}
            </Link>
            <Link
              to="/track"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('trackMyRequestBtn')}
            </Link>
          </div>
          <div style={{ paddingTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
