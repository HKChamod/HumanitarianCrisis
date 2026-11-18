import { Link } from 'react-router-dom';
import { Shield, Phone, Mail, Lock, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function Footer() {
  const { t, setLang } = useLanguage();

  return (
    <>
      {/* Bottom CTA Banner (Exact matching teal bar from screenshot) */}
      <section className="cta-banner-section" aria-label="Quick tracking bar">
        <div className="container">
          <div className="cta-banner-content">
            <div className="cta-banner-text">
              <h3>{t('alreadyAsked')}</h3>
              <p>{t('alreadyAskedDesc')}</p>
            </div>
            <div className="cta-banner-actions">
              <Link to="/track" className="btn-track-white">
                <SearchIcon size={16} />
                {t('trackMyRequestBtn')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dark Slate Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            {/* Column 1: Brand & Security Statement */}
            <div className="footer-brand">
              <Link to="/" className="brand-link" style={{ color: '#FFFFFF' }}>
                <div
                  className="brand-icon-wrapper"
                  style={{ backgroundColor: 'rgba(204, 251, 241, 0.15)', color: '#5EEAD4' }}
                >
                  <Shield size={20} strokeWidth={2.5} />
                </div>
                <span>
                  Relief<span style={{ color: '#5EEAD4' }}>Link</span>
                </span>
              </Link>

              <p>{t('footerProtection')}</p>

              <div className="tagline-pill">
                <Lock size={12} />
                <span>{t('footerCoordination')}</span>
              </div>
            </div>

            {/* Column 2: Emergency Contacts */}
            <div className="footer-col">
              <h4>{t('footerContact')}</h4>
              <div className="footer-contact-item">
                <Phone size={14} color="#5EEAD4" />
                <span>{t('emergencyHotline')}</span>
              </div>
              <div className="footer-contact-item">
                <Phone size={14} color="#5EEAD4" />
                <span>{t('footerAmbulance')}: <strong style={{ color: '#FFFFFF' }}>1990</strong></span>
              </div>
              <div className="footer-contact-item">
                <Mail size={14} color="#5EEAD4" />
                <a href="mailto:help@relieflink.org" style={{ color: '#94A3B8' }}>
                  help@relieflink.org
                </a>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/contact" style={{ color: '#5EEAD4', fontSize: '0.8125rem' }}>
                  {t('footerAllContacts')}
                </Link>
              </div>
            </div>

            {/* Column 3: Quick Navigation */}
            <div className="footer-col">
              <h4>{t('footerPortals')}</h4>
              <ul className="footer-links">
                <li><Link to="/request-help">{t('footerSubmitRequest')}</Link></li>
                <li><Link to="/track">{t('footerTrackRequest')}</Link></li>
                <li><Link to="/shelters">{t('footerShelterDir')}</Link></li>
                <li><Link to="/crises">{t('footerActiveCrises')}</Link></li>
                <li><Link to="/volunteer">{t('footerApplyVol')}</Link></li>
                <li><Link to="/donations">{t('footerDonation')}</Link></li>
              </ul>
            </div>

            {/* Column 4: Language Switcher */}
            <div className="footer-col">
              <h4>{t('footerLanguage')}</h4>
              <ul className="footer-links">
                <li>
                  <button
                    type="button"
                    onClick={() => setLang('si')}
                    style={{ color: '#94A3B8', cursor: 'pointer', textAlign: 'left' }}
                  >
                    සිංහල (Sinhala)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLang('ta')}
                    style={{ color: '#94A3B8', cursor: 'pointer', textAlign: 'left' }}
                  >
                    தமிழ் (Tamil)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    style={{ color: '#5EEAD4', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                  >
                    English
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Line */}
          <div className="footer-bottom">
            <span>{t('footerCopyright')}</span>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <Link to="/about" style={{ color: 'inherit' }}>{t('footerAbout')}</Link>
              <Link to="/contact" style={{ color: 'inherit' }}>{t('footerPrivacySafety')}</Link>
              <Link to="/login" style={{ color: 'inherit' }}>{t('footerResponder')}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating multilingual pill in bottom-right (as seen in screenshot) */}
      <Link to="/request-help" className="floating-lang-pill" title={t('needHelpAskInYourLang')}>
        <span className="pill-dot"></span>
        <MessageSquare size={14} />
        <span>{t('needHelpAskInYourLang')}</span>
      </Link>
    </>
  );
}

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}
