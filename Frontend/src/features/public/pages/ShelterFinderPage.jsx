import { useState, useEffect } from 'react';
import { Search, MapPin, Check, Home, AlertCircle } from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { DISTRICTS } from '../../../data/sriLankaAreas';
import { ShelterCard } from '../../../components/public/ShelterCard';
import { useLanguage } from '../../../context/LanguageContext';

export function ShelterFinderPage() {
  const { t, lang } = useLanguage();
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [isOpenOnly, setIsOpenOnly] = useState(true);

  const fetchShelters = async () => {
    setLoading(true);
    try {
      const res = await publicApi.getShelters({
        search,
        districtId: districtFilter,
        isOpenOnly,
      });
      setShelters(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShelters();
  }, [districtFilter, isOpenOnly]);

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="section-label">{t('safeHavensLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
            {t('shelterFinderTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1.0625rem' }}>
            {t('shelterFinderSubtitle')}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchShelters();
            }}
            style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto auto', gap: '1rem', alignItems: 'flex-end' }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('searchShelterLabel')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('searchShelterPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('districtLabel')}</label>
              <select
                className="form-select"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                <option value="All">{t('allDistricts')}</option>
                {DISTRICTS.map((d) => {
                  const distName = lang === 'si' && d.nameSi ? d.nameSi : lang === 'ta' && d.nameTa ? d.nameTa : d.name;
                  return (
                    <option key={d.id} value={d.id}>{distName} ({d.name})</option>
                  );
                })}
              </select>
            </div>

            <div style={{ paddingBottom: '0.625rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isOpenOnly}
                  onChange={(e) => setIsOpenOnly(e.target.checked)}
                />
                <span>{t('openFacilitiesOnly')}</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
              <Search size={16} /> {t('searchBtn')}
            </button>
          </form>
        </div>

        {/* Shelter Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-slate-500)' }}>
            {t('loadingShelters')}
          </div>
        ) : shelters.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <Home size={44} color="var(--color-slate-400)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('noSheltersFound')}</h3>
            <p style={{ color: 'var(--color-slate-500)', marginTop: '0.375rem' }}>
              {t('noSheltersHint')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {shelters.map((shelter) => (
              <ShelterCard key={shelter.id} shelter={shelter} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
