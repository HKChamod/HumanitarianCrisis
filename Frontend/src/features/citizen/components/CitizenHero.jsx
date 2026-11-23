import { ShieldCheck, ArrowRight, Search, HeartHandshake, MapPin } from 'lucide-react';

export function CitizenHero({ onOpenSubmitModal, onOpenTrackModal, district = 'Kalutara District' }) {
  return (
    <section className="citizen-hero-card" aria-label="Citizen Portal Assistance">
      <div>
        <div className="citizen-hero-pill">
          <ShieldCheck size={14} /> Safe, Verified Humanitarian Support
        </div>
        <h1 className="citizen-hero-title">Need help? We are here.</h1>
        <p className="citizen-hero-subtitle">
          Submit an emergency assistance request for food, medical care, shelter, or transport.
          Our coordinated humanitarian response teams will verify and dispatch support to your location.
        </p>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="citizen-responders-pill">
            <span className="pulse-dot"></span>
            Responders active in <strong>{district}</strong>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            Free service &bull; No payment ever requested
          </span>
        </div>
      </div>

      <div className="citizen-hero-actions">
        <button
          type="button"
          className="btn-teal-primary"
          onClick={() => onOpenSubmitModal()}
        >
          Request Help <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="btn-teal-outline"
          onClick={onOpenTrackModal}
        >
          <Search size={16} /> Track My Request
        </button>
      </div>
    </section>
  );
}
