import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapPin,
  LifeBuoy,
} from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { Badge } from '../../../components/common/Badge';
import { useLanguage } from '../../../context/LanguageContext';
import {
  MapView,
  adaptCollectionToMapItems,
  adaptCrisisToMapItem,
  adaptShelterToMapItem,
} from '../../../shared/maps';

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

  const unifiedMapData = useMemo(() => {
    const crisisResult =
      filterType === 'all' || filterType === 'crises'
        ? adaptCollectionToMapItems(crises, adaptCrisisToMapItem)
        : { items: [], missingCoordinatesCount: 0 };
    const shelterResult =
      filterType === 'all' || filterType === 'shelters'
        ? adaptCollectionToMapItems(shelters, adaptShelterToMapItem)
        : { items: [], missingCoordinatesCount: 0 };
    return {
      items: [...crisisResult.items, ...shelterResult.items],
      missingCoordinatesCount:
        crisisResult.missingCoordinatesCount + shelterResult.missingCoordinatesCount,
    };
  }, [crises, shelters, filterType]);

  const activeMapItem = useMemo(() => {
    if (!selectedItem?.data?.id) return null;
    return unifiedMapData.items.find((i) => i.id === selectedItem.data.id) || null;
  }, [unifiedMapData.items, selectedItem]);

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

          {/* Right Map Canvas with Unified MapLibre Interactive Map */}
          <div className="map-canvas-container p-3" style={{ minHeight: '600px', backgroundColor: '#F8FAFC' }}>
            <MapView
              items={unifiedMapData.items}
              missingCoordinatesCount={unifiedMapData.missingCoordinatesCount}
              selectedItem={activeMapItem}
              onSelectItem={(item) => {
                if (!item) {
                  setSelectedItem(null);
                  return;
                }
                setSelectedItem({
                  type: item.type === 'shelter' ? 'shelter' : 'crisis',
                  data: item.properties?.raw,
                });
              }}
              loading={loading}
              heightClass="h-[560px]"
              emptyMessage="No crises or shelters with valid coordinates match the current filter."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
