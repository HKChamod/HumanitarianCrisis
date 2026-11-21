import { useLanguage } from '../../context/LanguageContext';

export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`language-selector ${className}`} role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn ${lang === 'si' ? 'active' : ''}`}
        onClick={() => setLang('si')}
      >
        සිංහල
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === 'ta' ? 'active' : ''}`}
        onClick={() => setLang('ta')}
      >
        தமிழ்
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
      >
        English
      </button>
    </div>
  );
}

export function ProgressBar({ current, total, label = '', showPercent = true }) {
  const percentage = Math.min(100, Math.round((current / (total || 1)) * 100));
  let colorClass = 'normal';
  if (percentage >= 85) colorClass = 'danger';
  else if (percentage >= 65) colorClass = 'warning';

  return (
    <div className="occupancy-meter">
      <div className="shelter-card-capacity-label">
        <span>{label}</span>
        {showPercent && <span style={{ fontWeight: 600 }}>{percentage}%</span>}
      </div>
      <div className="occupancy-bar-bg">
        <div
          className={`occupancy-bar-fill ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          padding: '2rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.25rem 0.5rem',
              color: 'var(--color-slate-400)',
              borderRadius: '6px',
              fontSize: '1.25rem',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
