import { PhoneCall, ShieldAlert, HeartHandshake, Ambulance, Flame, Siren, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function ContactEmergencyPage() {
  const { t } = useLanguage();

  const EMERGENCY_HOTLINES = [
    { number: '117', name: 'Disaster Management Centre (DMC)', descKey: 'hotlineDMC', icon: ShieldAlert, color: '#DC2626' },
    { number: '1990', name: '1990 Suwa Seriya Ambulance', descKey: 'hotlineSuwa', icon: Ambulance, color: '#059669' },
    { number: '119', name: 'Sri Lanka Police Emergency Service', descKey: 'hotlinePolice', icon: Siren, color: '#2563EB' },
    { number: '110', name: 'Fire & Rescue Service', descKey: 'hotlineFire', icon: Flame, color: '#D97706' },
    { number: '011-2433215', name: 'Sri Lanka Red Cross Society', descKey: 'hotlineRedCross', icon: HeartHandshake, color: '#DC2626' },
    { number: '011-2588946', name: 'National Building Research Org (NBRO)', descKey: 'hotlineNBRO', icon: AlertTriangle, color: '#D97706' },
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="section-label">{t('nationalDirLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
            {t('contactPageTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1rem' }}>
            {t('contactPageSubtitle')}
          </p>
        </div>

        {/* Hotlines Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '1.25rem', marginBottom: '3.5rem' }}>
          {EMERGENCY_HOTLINES.map((h, i) => {
            const Icon = h.icon;
            return (
              <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: h.color }}>
                    <Icon size={22} />
                  </div>
                  <a
                    href={`tel:${h.number}`}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: 'var(--color-primary-dark)',
                      textDecoration: 'none',
                    }}
                  >
                    {h.number}
                  </a>
                </div>

                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '0.375rem' }}>
                  {h.name}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', lineHeight: 1.5, marginBottom: '1.25rem', flex: 1 }}>
                  {t(h.descKey) || h.desc}
                </p>

                <a
                  href={`tel:${h.number}`}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  <PhoneCall size={14} /> {t('callNowPrefix')} {h.number} {t('callNowSuffix')}
                </a>
              </div>
            );
          })}
        </div>

        {/* Immediate Citizen Safety Guidelines */}
        <div className="card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '1.5rem' }}>
            {t('safetyDirectivesTitle')}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.5rem' }}>
                {t('floodSafetyTitle')}
              </h4>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-slate-700)', lineHeight: 1.7 }}>
                <li>{t('floodSafety1')}</li>
                <li>{t('floodSafety2')}</li>
                <li>{t('floodSafety3')}</li>
                <li>{t('floodSafety4')}</li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#B45309', marginBottom: '0.5rem' }}>
                {t('landslideSafetyTitle')}
              </h4>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--color-slate-700)', lineHeight: 1.7 }}>
                <li>{t('landslideSafety1')}</li>
                <li>{t('landslideSafety2')}</li>
                <li>{t('landslideSafety3')}</li>
                <li>{t('landslideSafety4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
