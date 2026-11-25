import { useState, useEffect, useCallback } from 'react';
import { MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { USE_MOCK_API } from '../../../services/api/apiConfig';
import { citizenApi } from '../../../services/api/citizenApi';

const SAMPLE_SHELTERS = [
  {
    id: 'sh-1',
    name: 'Kalutara Central College',
    distance: '1.2 km away',
    status: 'Open Now',
    used: 62,
    total: 100,
    facilities: ['Wheelchair access', 'Medical help', 'Food available'],
  },
  {
    id: 'sh-2',
    name: "St. Mary's Community Hall",
    distance: '2.8 km away',
    status: 'Open Now',
    used: 38,
    total: 80,
    facilities: ['Medical help', 'Food available'],
  },
  {
    id: 'sh-3',
    name: 'Bandaragama Sports Centre',
    distance: '4.5 km away',
    status: 'Open Now',
    used: 92,
    total: 150,
    facilities: ['Wheelchair access', 'Food available'],
  },
];

export function NearbySheltersWidget() {
  const [shelters, setShelters] = useState(USE_MOCK_API ? SAMPLE_SHELTERS : []);
  const [loading, setLoading] = useState(!USE_MOCK_API);
  const [error, setError] = useState('');

  const loadShelters = useCallback(async () => {
    if (USE_MOCK_API) return;
    setLoading(true);
    setError('');
    try {
      const items = await citizenApi.getOpenShelters();
      const openOrFull = items
        .filter((s) => !['closed', 'maintenance'].includes(String(s.status || '').toLowerCase()))
        .slice(0, 4);
      setShelters(openOrFull);
    } catch (err) {
      setError(err?.detail || err?.message || 'Unable to load open shelters.');
      setShelters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShelters();
  }, [loadShelters]);

  return (
    <div className="widget-card" aria-label="Open Shelters Nearby">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div>
          <div className="section-eyebrow">Safe Places Nearby</div>
          <h3 className="section-heading" style={{ fontSize: '1.1rem' }}>
            Open Shelters
          </h3>
        </div>
        <Link to="/shelters" style={{ fontSize: '0.78rem', color: '#0F766E', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
          View all shelters <ArrowRight size={13} />
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '1.25rem 0', fontSize: '0.82rem', color: '#64748B' }}>
          Loading live shelter capacity...
        </div>
      ) : error ? (
        <div style={{ padding: '0.85rem', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={loadShelters}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#FFFFFF', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : shelters.length === 0 ? (
        <div style={{ padding: '1.25rem 0', fontSize: '0.82rem', color: '#64748B' }}>
          No active emergency shelters are currently listed.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shelters.map((sh) => {
            const percent = Math.min(100, Math.round((sh.used / Math.max(1, sh.total)) * 100));
            return (
              <div key={sh.id} className="shelter-item-box">
                <div className="shelter-header">
                  <div>
                    <p className="shelter-name">{sh.name}</p>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {sh.distance}
                    </span>
                  </div>
                  <span className="shelter-status-tag">{sh.status}</span>
                </div>

                <div className="shelter-capacity-bar-wrap">
                  <div className="capacity-labels">
                    <span>Capacity</span>
                    <span>{sh.used} of {sh.total} spaces used ({percent}%)</span>
                  </div>
                  <div className="capacity-track">
                    <div
                      className={`capacity-fill ${percent > 80 ? 'high' : ''}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>

                {sh.facilities && sh.facilities.length > 0 && (
                  <div className="shelter-facilities">
                    {sh.facilities.map((fac, idx) => (
                      <span key={idx} className="facility-chip">
                        {fac}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
