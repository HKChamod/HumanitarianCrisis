import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, ArrowRight, Search, CheckCircle2, MapPin, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { publicApi } from '../../../api/publicApi';
import { CategoryCard } from '../../../components/public/CategoryCard';
import { AlertCard } from '../../../components/public/AlertCard';
import { ShelterCard } from '../../../components/public/ShelterCard';
import { StepCard } from '../../../components/public/StepCard';

export function LandingPage() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [noticesRes, sheltersRes] = await Promise.all([
          publicApi.getNotices(),
          publicApi.getShelters(),
        ]);
        setAlerts(noticesRes.data.slice(0, 2)); // Top 2 verified alerts as in design
        setShelters(sheltersRes.data.slice(0, 3)); // Top 3 shelters as in design
      } catch (err) {
        console.error('Failed to load landing data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = [
    { key: 'Food', title: t('catFood') },
    { key: 'Medicine', title: t('catMedicine') },
    { key: 'Shelter', title: t('catShelter') },
    { key: 'Transport', title: t('catTransport') },
    { key: 'Accessibility Support', title: t('catAccessibility') },
    { key: 'Other', title: t('catOther') },
  ];

  return (
    <div className="landing-page-root">
      {/* 1. HERO SECTION (Pixel-matched with design) */}
      <section className="hero-section" aria-label="Emergency Assistance Hero">
        <div className="container">
          <div className="hero-grid">
            {/* Left Content */}
            <div className="hero-text-content">
              <div className="hero-badge-pill">
                <ShieldCheck size={16} color="var(--color-primary)" />
                <span>{t('tagline')}</span>
              </div>

              <h1 className="hero-title">{t('heroTitle')}</h1>

              <p className="hero-subtitle">{t('heroSubtitle')}</p>

              <div className="hero-actions">
                <Link to="/request-help" className="btn btn-primary btn-lg">
                  <span>{t('requestHelpBtn')}</span>
                  <ArrowRight size={18} />
                </Link>

                <Link to="/track" className="btn btn-secondary btn-lg">
                  <Search size={18} />
                  <span>{t('trackMyRequestBtn')}</span>
                </Link>
              </div>

              <div className="hero-microcopy">
                <CheckCircle2 size={16} className="check-icon" />
                <span>{t('freeToUse')}</span>
              </div>
            </div>

            {/* Right Graphic Card (Athwala Emblem Card from Screenshot) */}
            <div className="hero-visual-container">
              <div className="hero-card-display">
                <div className="hero-icon-bubble" style={{ background: '#FFFFFF', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src="/athwala-emblem.png"
                    alt="Athwala Supporting Hands"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div className="hero-pin-badge" title="Active responder location">
                    <MapPin size={16} />
                  </div>
                </div>

                <div className="hero-status-pill">
                  <span className="pulse-dot"></span>
                  <span>{t('respondersActive')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY SELECTION: "What do you need?" */}
      <section className="categories-section" aria-label="Need Categories">
        <div className="container">
          <div className="section-header">
            <span className="section-label">{t('startHere')}</span>
            <h2 className="section-title">{t('whatDoYouNeed')}</h2>
            <p className="section-subtitle">{t('chooseCategoryDesc')}</p>
          </div>

          <div className="categories-grid">
            {categories.map((cat) => (
              <CategoryCard key={cat.key} categoryKey={cat.key} title={cat.title} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. LOCAL UPDATES: "Verified alerts near you" */}
      <section className="alerts-section" aria-label="Verified Local Alerts">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="section-label">{t('localUpdates')}</span>
              <h2 className="section-title">{t('verifiedAlerts')}</h2>
            </div>
            <Link
              to="/crises"
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t('seeAllAlerts')} &gt;
            </Link>
          </div>

          <div className="alerts-grid">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. SAFE PLACES NEARBY: "Open shelters" */}
      <section className="shelters-section" aria-label="Nearby Open Shelters">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="section-label">{t('safePlacesNearby')}</span>
              <h2 className="section-title">{t('openShelters')}</h2>
              <p className="section-subtitle">{t('shelterCapacityDesc')}</p>
            </div>
            <Link
              to="/shelters"
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {t('viewAllShelters')} &gt;
            </Link>
          </div>

          <div className="shelters-grid">
            {shelters.map((shelter) => (
              <ShelterCard key={shelter.id} shelter={shelter} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS: "Simple and supported" */}
      <section className="how-it-works-section" id="how-it-works" aria-label="How HCMS Works">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <span className="section-label">{t('simpleAndSupported')}</span>
            <h2 className="section-title">{t('howItWorks')}</h2>
          </div>

          <div className="how-it-works-grid">
            <StepCard number="1" title={t('step1Title')} description={t('step1Desc')} />
            <StepCard number="2" title={t('step2Title')} description={t('step2Desc')} />
            <StepCard number="3" title={t('step3Title')} description={t('step3Desc')} />
          </div>

          {/* Reassurance Callout Bar */}
          <div className="reviewer-callout-bar">
            <ShieldCheck size={20} color="var(--color-primary)" />
            <span>{t('reviewedByHuman')}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
