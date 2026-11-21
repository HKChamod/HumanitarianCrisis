import { AlertTriangle, ShieldCheck, ArrowRight, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const SAMPLE_ALERTS = [
  {
    id: 'alt-1',
    severity: 'High',
    title: 'Flood Warning (Kalu Ganga Basin)',
    location: 'Kalutara District',
    updatedAgo: '20 min ago',
    verifiedBy: 'Disaster Management Centre',
    instructions: 'Water levels rising in low-lying areas. Evacuate to higher ground if ordered.',
  },
  {
    id: 'alt-2',
    severity: 'Critical',
    title: 'Landslide Early Warning Stage 3',
    location: 'Ratnapura District',
    updatedAgo: '35 min ago',
    verifiedBy: 'NBRO & Disaster Management Centre',
    instructions: 'Evacuation required for high-risk slope settlements in Pelmadulla.',
  },
];

export function VerifiedAlertsWidget() {
  return (
    <div className="widget-card" aria-label="Verified Local Alerts">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div>
          <div className="section-eyebrow">Local Updates</div>
          <h3 className="section-heading" style={{ fontSize: '1.1rem' }}>
            Verified Alerts Near You
          </h3>
        </div>
        <Link to="/crises" style={{ fontSize: '0.78rem', color: '#0F766E', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
          See all alerts <ArrowRight size={13} />
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {SAMPLE_ALERTS.map((alert) => (
          <div
            key={alert.id}
            className={`alert-item-box ${alert.severity === 'Critical' ? 'critical' : ''}`}
          >
            <div className="alert-top">
              <span className={`alert-severity-badge ${alert.severity === 'Critical' ? 'badge-critical' : 'badge-high'}`}>
                {alert.severity} Alert
              </span>
              <span className="alert-verified-tag">
                <ShieldCheck size={13} /> {alert.verifiedBy}
              </span>
            </div>
            <p className="alert-title">{alert.title}</p>
            <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 0.4rem' }}>
              {alert.instructions}
            </p>
            <div className="alert-meta">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={12} /> {alert.location}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={12} /> Updated {alert.updatedAgo}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
