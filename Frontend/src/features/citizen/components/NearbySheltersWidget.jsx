import { Home, MapPin, ArrowRight, Accessibility, Stethoscope, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {SAMPLE_SHELTERS.map((sh) => {
          const percent = Math.round((sh.used / sh.total) * 100);
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

              {/* Capacity Progress Bar */}
              <div className="shelter-capacity-bar-wrap">
                <div className="capacity-labels">
                  <span>Capacity</span>
                  <span>{sh.used} of {sh.total} beds used ({percent}%)</span>
                </div>
                <div className="capacity-track">
                  <div
                    className={`capacity-fill ${percent > 80 ? 'high' : ''}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>

              {/* Facility Tags */}
              <div className="shelter-facilities">
                {sh.facilities.map((fac, idx) => (
                  <span key={idx} className="facility-chip">
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
