import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ArrowRight, MapPin, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { USE_MOCK_API } from '../../../services/api/apiConfig';
import { citizenApi } from '../../../services/api/citizenApi';

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
  const [alerts, setAlerts] = useState(USE_MOCK_API ? SAMPLE_ALERTS : []);
  const [loading, setLoading] = useState(!USE_MOCK_API);
  const [error, setError] = useState('');

  const loadAlerts = useCallback(async () => {
    if (USE_MOCK_API) return;
    setLoading(true);
    setError('');
    try {
      const items = await citizenApi.getActiveCrisisAlerts();
      setAlerts(items.slice(0, 4));
    } catch (err) {
      setError(err?.detail || err?.message || 'Unable to load verified crisis advisories.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

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

      {loading ? (
        <div style={{ padding: '1.25rem 0', fontSize: '0.82rem', color: '#64748B' }}>
          Loading live verified crisis alerts...
        </div>
      ) : error ? (
        <div style={{ padding: '0.85rem', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={loadAlerts}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#FFFFFF', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ padding: '1.25rem 0', fontSize: '0.82rem', color: '#64748B' }}>
          No active crisis advisories are currently in effect.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map((alert) => {
            const timeLabel = alert.updatedAgo
              ? `Updated ${alert.updatedAgo}`
              : alert.startDate
                ? `Active since ${new Date(alert.startDate).toLocaleDateString()}`
                : 'Active';
            return (
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
                    <Clock size={12} /> {timeLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
