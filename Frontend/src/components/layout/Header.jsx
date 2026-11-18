import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitcher } from '../common/ProgressBar';

export function Header() {
  const { t } = useLanguage();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <div className="brand-icon-wrapper">
              <Shield size={20} strokeWidth={2.5} />
            </div>
            <span className="brand-name">
              Relief<span className="brand-highlight">Link</span>
            </span>
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
