import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertOctagon, MapPin, Users, Home, LifeBuoy, ArrowRight, Filter } from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { DISTRICTS } from '../../../data/sriLankaAreas';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';

export function ActiveCrisesPage() {
  const { t, lang } = useLanguage();
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');

  const fetchCrises = async () => {
    setLoading(true);
    try {
      const res = await publicApi.getCrises({
        search,
        severity: severityFilter,
        type: typeFilter,
        districtId: districtFilter,
      });
      setCrises(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrises();
  }, [severityFilter, typeFilter, districtFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCrises();
  };

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="section-label">{t('nationalOpsLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)', letterSpacing: '-0.02em' }}>
            {t('crisesPageTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1.0625rem' }}>
            {t('crisesPageSubtitle')}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="crisisSearch">{t('searchCrisesLabel')}</label>
              <input
                id="crisisSearch"
                type="text"
                className="form-input"
                placeholder={t('searchCrisesPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('severityFilterLabel')}</label>
              <select className="form-select" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <option value="All">{t('allSeverities')}</option>
                <option value="Critical">{t('criticalImmediate')}</option>
                <option value="High">{t('highPriority')}</option>
                <option value="Moderate">{t('moderatePriority')}</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('crisisTypeLabel')}</label>
              <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="All">{t('allTypes')}</option>
                <option value="Flood">{t('monsoonFlood')}</option>
                <option value="Landslide">{t('landslideRisk')}</option>
                <option value="Flash Flood">{t('flashFlood')}</option>
                <option value="Reservoir Flood">{t('reservoirFlood')}</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('districtFilterLabel')}</label>
              <select className="form-select" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
                <option value="All">{t('allDistricts')}</option>
                {DISTRICTS.map((d) => {
                  const distName = lang === 'si' && d.nameSi ? d.nameSi : lang === 'ta' && d.nameTa ? d.nameTa : d.name;
                  return (
                    <option key={d.id} value={d.id}>{distName}</option>
                  );
                })}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
              <Search size={16} /> {t('filterBtn')}
            </button>
          </form>
        </div>

        {/* Crisis Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-slate-500)' }}>
            {t('loadingCrises')}
          </div>
        ) : crises.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <AlertOctagon size={44} color="var(--color-slate-400)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('noCrisesFound')}</h3>
            <p style={{ color: 'var(--color-slate-500)', marginTop: '0.375rem' }}>
              {t('noCrisesHint')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {crises.map((crisis) => {
              const isCritical = crisis.severityLevel?.toLowerCase() === 'critical';
              const isHigh = crisis.severityLevel?.toLowerCase() === 'high';

              const title = lang === 'si' && crisis.crisisNameSi ? crisis.crisisNameSi : lang === 'ta' && crisis.crisisNameTa ? crisis.crisisNameTa : crisis.crisisName;
              const desc = lang === 'si' && crisis.descriptionSi ? crisis.descriptionSi : lang === 'ta' && crisis.descriptionTa ? crisis.descriptionTa : crisis.description;
              const district = lang === 'si' && crisis.districtNameSi ? crisis.districtNameSi : lang === 'ta' && crisis.districtNameTa ? crisis.districtNameTa : crisis.districtName;
              const severityText = t(`severity_${crisis.severityLevel}`) || crisis.severityLevel;

              return (
                <article
                  key={crisis.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: isCritical ? '4px solid var(--color-red)' : isHigh ? '4px solid var(--color-amber)' : '4px solid var(--color-primary)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                    <Badge variant={isCritical ? 'critical' : isHigh ? 'high' : 'moderate'}>
                      {severityText} {t('severitySuffix')}
                    </Badge>
                    <span className="badge badge-pill-light">{crisis.crisisType}</span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '0.5rem' }}>
                    {title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginBottom: '1rem' }}>
                    <MapPin size={14} color="var(--color-primary)" />
                    <span>{district} {t('districtSuffix')} ({crisis.affectedAreaCount} {t('divisionsAffected')})</span>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', lineHeight: 1.5, marginBottom: '1.25rem', flex: 1 }}>
                    {desc}
                  </p>

                  {/* Impact Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: 'var(--color-surface-subtle)', padding: '0.875rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--color-slate-500)', display: 'block' }}>{t('affectedPeopleLabel')}</span>
                      <strong style={{ color: 'var(--color-slate-800)', fontSize: '0.9375rem' }}>
                        ~{(crisis.affectedPeopleEstimated || 0).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-slate-500)', display: 'block' }}>{t('activeSheltersLabel')}</span>
                      <strong style={{ color: 'var(--color-slate-800)', fontSize: '0.9375rem' }}>
                        {crisis.activeSheltersCount || 0} {t('openCount')}
                      </strong>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', borderTop: '1px solid var(--color-slate-100)', paddingTop: '1rem' }}>
                    <Link
                      to={`/crises/${crisis.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      {t('detailsBtn')}
                    </Link>
                    <Link
                      to={`/request-help?crisisId=${crisis.id}&category=Food`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      {t('requestHelpCrisis')}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
