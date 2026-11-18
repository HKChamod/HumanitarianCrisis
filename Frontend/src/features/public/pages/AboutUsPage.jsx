import { Shield, Users, HeartHandshake, Award, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function AboutUsPage() {
  const { t } = useLanguage();

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="section-label">{t('systemOverviewLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
            {t('aboutTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1.0625rem' }}>
            {t('aboutSubtitle')}
          </p>
        </div>

        <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '1rem' }}>
            {t('missionTitle')}
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--color-slate-700)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            {t('missionText')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
            <div style={{ backgroundColor: '#F0FDFA', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #CCFBF1' }}>
              <Shield size={24} color="var(--color-primary)" style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{t('verifiedTitle')}</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', marginTop: '0.25rem' }}>
                {t('verifiedDesc')}
              </p>
            </div>

            <div style={{ backgroundColor: '#F0FDFA', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #CCFBF1' }}>
              <HeartHandshake size={24} color="var(--color-primary)" style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{t('impartialTitle')}</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', marginTop: '0.25rem' }}>
                {t('impartialDesc')}
              </p>
            </div>

            <div style={{ backgroundColor: '#F0FDFA', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #CCFBF1' }}>
              <Users size={24} color="var(--color-primary)" style={{ marginBottom: '0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{t('unityTitle')}</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-600)', marginTop: '0.25rem' }}>
                {t('unityDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Participating Stakeholders */}
        <div className="card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '1rem' }}>
            {t('stakeholdersTitle')}
          </h2>
          <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', listStyle: 'none', padding: 0 }}>
            {[
              'Disaster Management Centre (DMC) Sri Lanka',
              'Sri Lanka Red Cross Society (SLRCS)',
              'National Building Research Organisation (NBRO)',
              'Ministry of Health - Disaster Preparedness Unit',
              'Department of Meteorology Sri Lanka',
              'District & Divisional Secretariats (25 Districts)',
              '1990 Suwa Seriya Foundation',
              'Volunteer Rescue & Community Civil Defense Units',
            ].map((s, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-slate-700)' }}>
                <CheckCircle size={15} color="var(--color-primary)" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
