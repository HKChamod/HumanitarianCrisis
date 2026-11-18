import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  AlertTriangle,
  Shield,
  Home,
  LifeBuoy,
  PhoneCall,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { ShelterCard } from '../../../components/public/ShelterCard';
import { useLanguage } from '../../../context/LanguageContext';

export function CrisisDetailsPage() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const [crisis, setCrisis] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await publicApi.getCrisisById(id);
        setCrisis(res.data);

        // Fetch related shelters in the same district
        const shRes = await publicApi.getShelters({ districtId: res.data.districtId });
        setShelters(shRes.data);
      } catch (err) {
        setError(t('crisisNotFound'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        {t('loadingCrisis')}
      </div>
    );
  }

  if (error || !crisis) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>{t('crisisNotFound')}</h2>
        <Link to="/crises" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          {t('backToAllCrises')}
        </Link>
      </div>
    );
  }

  const isCritical = crisis.severityLevel?.toLowerCase() === 'critical';
  const title = lang === 'si' && crisis.crisisNameSi ? crisis.crisisNameSi : lang === 'ta' && crisis.crisisNameTa ? crisis.crisisNameTa : crisis.crisisName;
  const desc = lang === 'si' && crisis.descriptionSi ? crisis.descriptionSi : lang === 'ta' && crisis.descriptionTa ? crisis.descriptionTa : crisis.description;
  const guidelines = lang === 'si' && crisis.guidelinesSi ? crisis.guidelinesSi : lang === 'ta' && crisis.guidelinesTa ? crisis.guidelinesTa : crisis.guidelines;
  const districtName = lang === 'si' && crisis.districtNameSi ? crisis.districtNameSi : lang === 'ta' && crisis.districtNameTa ? crisis.districtNameTa : crisis.districtName;
  const severityText = t(`severity_${crisis.severityLevel}`) || crisis.severityLevel;

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3rem 0 5rem' }}>
      <div className="container">
        {/* Back Link */}
        <Link
          to="/crises"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-slate-600)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
          }}
        >
          <ArrowLeft size={16} /> {t('backToCrises')}
        </Link>

        {/* Hero Card */}
        <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Badge variant={isCritical ? 'critical' : 'high'}>
                  {severityText} {t('severitySuffix')}
                </Badge>
                <Badge variant="verified">
                  {t('statusLabel')} {crisis.status}
                </Badge>
                <span className="badge badge-pill-light">{crisis.crisisType}</span>
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                {title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--color-slate-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={15} color="var(--color-primary)" />
                  {districtName} {t('districtSuffix')}, Sri Lanka
                </span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={15} />
                  {t('reportedLabel')} {new Date(crisis.startDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Link
              to={`/request-help?crisisId=${crisis.id}&category=Food`}
              className="btn btn-primary btn-lg"
            >
              <LifeBuoy size={18} /> {t('requestHelpForCrisis')}
            </Link>
          </div>

          <p style={{ fontSize: '1.0625rem', color: 'var(--color-slate-700)', lineHeight: 1.6, marginTop: '1.25rem' }}>
            {desc}
          </p>

          {/* Official Safety Guidance Callout */}
          {guidelines && (
            <div
              style={{
                backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB',
                border: isCritical ? '1px solid #FECACA' : '1px solid #FDE68A',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                marginTop: '1.75rem',
              }}
            >
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: isCritical ? '#991B1B' : '#92400E', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                <AlertTriangle size={18} /> {t('officialDirectives')}
              </h4>
              <p style={{ fontSize: '0.9375rem', color: isCritical ? '#7F1D1D' : '#78350F', lineHeight: 1.5 }}>
                {guidelines}
              </p>
            </div>
          )}

          {/* Affected Divisions */}
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '0.75rem' }}>
              {t('affectedDivisionsTitle')}
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {crisis.affectedDivisions?.map((div, i) => (
                <span key={i} className="tag-pill" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}>
                  <MapPin size={12} color="var(--color-primary)" />
                  {div}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Associated Shelters Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                {t('activeSheltersInDistrict')} {districtName} {t('districtSuffix')}
              </h3>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem' }}>
                {t('safeLocationsDesc')}
              </p>
            </div>
            <Link to="/shelters" style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
              {t('viewAllNationwideShelters')}
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {shelters.length > 0 ? (
              shelters.map((s) => <ShelterCard key={s.id} shelter={s} />)
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                <Home size={32} color="var(--color-slate-400)" style={{ margin: '0 auto 0.5rem' }} />
                <p>{t('noSheltersInDivision')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
