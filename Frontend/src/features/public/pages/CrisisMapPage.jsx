import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapPin,
  Home,
  LifeBuoy,
} from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';

export function CrisisMapPage() {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const highlightedShelterId = searchParams.get('shelterId');

  const [crises, setCrises] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [filterType, setFilterType] = useState('all'); // all, crises, shelters
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, sRes] = await Promise.all([
          publicApi.getCrises(),
          publicApi.getShelters(),
        ]);
        setCrises(cRes.data);
        setShelters(sRes.data);

        // Highlight requested shelter if provided
        if (highlightedShelterId) {
          const found = sRes.data.find((s) => s.id === highlightedShelterId);
          if (found) {
            setSelectedItem({ type: 'shelter', data: found });
          }
        } else if (cRes.data.length > 0) {
          setSelectedItem({ type: 'crisis', data: cRes.data[0] });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [highlightedShelterId]);

  // Coordinates mapping to relative % position on Sri Lanka map viewBox
  // Sri Lanka bounds roughly: Lat 5.9° to 9.8° N, Lng 79.5° to 81.9° E
  const getMapCoordinates = (lat, lng) => {
    const minLat = 5.8;
    const maxLat = 9.9;
    const minLng = 79.4;
    const maxLng = 82.0;

    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    return { top: `${Math.max(5, Math.min(95, y))}%`, left: `${Math.max(5, Math.min(95, x))}%` };
  };

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', padding: '2rem 0 4rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="section-label">{t('geoVisLabel')}</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
              {t('mapPageTitle')}
            </h1>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#FFFFFF', padding: '0.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-slate-200)' }}>
            <button
              type="button"
              className={`lang-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              {t('mapAllPoints')}
            </button>
            <button
              type="button"
              className={`lang-btn ${filterType === 'crises' ? 'active' : ''}`}
              onClick={() => setFilterType('crises')}
            >
              {t('mapActiveCrises')} ({crises.length})
            </button>
            <button
              type="button"
              className={`lang-btn ${filterType === 'shelters' ? 'active' : ''}`}
              onClick={() => setFilterType('shelters')}
            >
              {t('mapShelters')} ({shelters.length})
            </button>
          </div>
        </div>

        {/* Map Layout */}
        <div className="crisis-map-layout">
          {/* Left Sidebar: Detailed info for selected marker or list */}
          <div className="map-sidebar">
            {selectedItem ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <Badge variant={selectedItem.type === 'crisis' ? 'critical' : 'open'}>
                    {selectedItem.type === 'crisis' ? t('mapActiveEmergency') : t('mapOpenShelter')}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', cursor: 'pointer' }}
                  >
                    {t('mapViewList')}
                  </button>
                </div>

                {selectedItem.type === 'crisis' ? (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '0.5rem' }}>
                      {lang === 'si' && selectedItem.data.crisisNameSi ? selectedItem.data.crisisNameSi : lang === 'ta' && selectedItem.data.crisisNameTa ? selectedItem.data.crisisNameTa : selectedItem.data.crisisName}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginBottom: '1rem' }}>
                      <MapPin size={14} color="var(--color-primary)" />
                      {lang === 'si' && selectedItem.data.districtNameSi ? selectedItem.data.districtNameSi : lang === 'ta' && selectedItem.data.districtNameTa ? selectedItem.data.districtNameTa : selectedItem.data.districtName} {t('districtSuffix')}
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      {lang === 'si' && selectedItem.data.descriptionSi ? selectedItem.data.descriptionSi : lang === 'ta' && selectedItem.data.descriptionTa ? selectedItem.data.descriptionTa : selectedItem.data.description}
                    </p>

                    <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-slate-200)', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span>{t('mapEstimatedImpact')}</span>
                        <strong>~{selectedItem.data.affectedPeopleEstimated?.toLocaleString()} {t('mapPeople')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('mapOpenSheltersZone')}</span>
                        <strong>{selectedItem.data.activeSheltersCount} {t('mapFacilities')}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <Link
                        to={`/request-help?crisisId=${selectedItem.data.id}&category=Food`}
                        className="btn btn-primary btn-sm"
                      >
                        <LifeBuoy size={14} /> {t('mapRequestAssistance')}
                      </Link>
                      <Link
                        to={`/crises/${selectedItem.data.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        {t('mapFullCrisisDetails')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '0.25rem' }}>
                      {selectedItem.data.name}
                    </h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginBottom: '1rem' }}>
                      {selectedItem.data.address}
                    </div>

                    <div style={{ backgroundColor: '#F0FDFA', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #CCFBF1', marginBottom: '1.25rem', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span>{t('mapUsedBeds')}</span>
                        <strong>{selectedItem.data.usedBeds} / {selectedItem.data.totalBeds}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t('mapAvailableSpaces')}</span>
                        <strong style={{ color: 'var(--color-primary-dark)' }}>
                          {selectedItem.data.totalBeds - selectedItem.data.usedBeds} {t('mapBeds')}
                        </strong>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-700)', display: 'block', marginBottom: '0.375rem' }}>
                        {t('mapAvailFacilities')}
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {selectedItem.data.amenities?.map((a, i) => (
                          <span key={i} className="tag-pill" style={{ fontSize: '0.75rem' }}>{a}</span>
                        ))}
                      </div>
                    </div>

                    <a href={`tel:${selectedItem.data.phone}`} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                      {t('mapCallShelter')} {selectedItem.data.phone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '0.75rem' }}>
                  {t('mapAllPoints')}
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginBottom: '1rem' }}>
                  {t('mapSelectMarker')}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {crises.map((c) => {
                    const cTitle = lang === 'si' && c.crisisNameSi ? c.crisisNameSi : lang === 'ta' && c.crisisNameTa ? c.crisisNameTa : c.crisisName;
                    const cDistrict = lang === 'si' && c.districtNameSi ? c.districtNameSi : lang === 'ta' && c.districtNameTa ? c.districtNameTa : c.districtName;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedItem({ type: 'crisis', data: c })}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-slate-200)',
                          cursor: 'pointer',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                          ⚠️ {cTitle}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                          {cDistrict} {t('districtSuffix')} • {c.severityLevel}
                        </div>
                      </div>
                    );
                  })}

                  {shelters.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedItem({ type: 'shelter', data: s })}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-slate-200)',
                        cursor: 'pointer',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                        🏠 {s.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '2px' }}>
                        {s.districtName} • {s.totalBeds - s.usedBeds} {t('mapBeds')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Map Canvas with Interactive Geo Points */}
          <div className="map-canvas-container" style={{ minHeight: '600px', backgroundColor: '#EFF6FF', position: 'relative' }}>
            {/* SVG Silhouette representation of Sri Lanka */}
            <svg
              viewBox="0 0 400 650"
              style={{
                width: '80%',
                maxHeight: '560px',
                filter: 'drop-shadow(0 15px 25px rgba(15, 118, 110, 0.15))',
              }}
            >
              <path
                d="M 180 50 Q 200 40 220 70 Q 250 120 270 190 Q 290 270 295 340 Q 300 430 260 520 Q 220 590 190 610 Q 150 620 130 570 Q 110 500 115 420 Q 120 330 130 250 Q 140 160 160 90 Z"
                fill="#CCFBF1"
                stroke="#0F766E"
                strokeWidth="2.5"
              />
              <path
                d="M 160 40 Q 180 20 200 30 Q 190 50 170 50 Z"
                fill="#CCFBF1"
                stroke="#0F766E"
                strokeWidth="1.5"
              />
            </svg>

            {/* Interactive Crisis Markers */}
            {(filterType === 'all' || filterType === 'crises') &&
              crises.map((c) => {
                const pos = getMapCoordinates(c.coordinates.lat, c.coordinates.lng);
                const isSelected = selectedItem?.data?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedItem({ type: 'crisis', data: c })}
                    style={{
                      position: 'absolute',
                      top: pos.top,
                      left: pos.left,
                      transform: 'translate(-50%, -50%)',
                      background: c.severityLevel === 'Critical' ? '#DC2626' : '#F59E0B',
                      color: '#FFFFFF',
                      width: isSelected ? '38px' : '30px',
                      height: isSelected ? '38px' : '30px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      border: '3px solid #FFFFFF',
                      cursor: 'pointer',
                      zIndex: 10,
                      transition: 'all 0.2s',
                    }}
                    title={`${c.crisisName} (${c.districtName})`}
                  >
                    ⚠️
                  </button>
                );
              })}

            {/* Interactive Shelter Markers */}
            {(filterType === 'all' || filterType === 'shelters') &&
              shelters.map((s) => {
                const pos = getMapCoordinates(s.coordinates.lat, s.coordinates.lng);
                const isSelected = selectedItem?.data?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedItem({ type: 'shelter', data: s })}
                    style={{
                      position: 'absolute',
                      top: pos.top,
                      left: pos.left,
                      transform: 'translate(-50%, -50%)',
                      background: 'var(--color-primary)',
                      color: '#FFFFFF',
                      width: isSelected ? '38px' : '28px',
                      height: isSelected ? '38px' : '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(15,118,110,0.35)',
                      border: '2px solid #FFFFFF',
                      cursor: 'pointer',
                      zIndex: 9,
                      transition: 'all 0.2s',
                    }}
                    title={`${s.name} (${s.districtName})`}
                  >
                    <Home size={14} />
                  </button>
                );
              })}

            {/* Map Legend */}
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                left: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--color-slate-200)',
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#DC2626' }} />
                <span>{t('urgencyCritical')} {t('mapLegendCrisis')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span>{t('urgencyHigh')} / {t('urgencyMedium')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#0F766E' }} />
                <span>{t('mapLegendShelter')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
