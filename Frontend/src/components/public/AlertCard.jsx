import { MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { useLanguage } from '../../context/LanguageContext';

export function AlertCard({ alert }) {
  const { lang, t } = useLanguage();
  const isCritical = alert.severity?.toLowerCase() === 'critical';

  // Localized severity label
  const severityLabel =
    lang === 'si'
      ? alert.severitySi || t(`severity_${alert.severity}`) || alert.severity
      : lang === 'ta'
      ? alert.severityTa || t(`severity_${alert.severity}`) || alert.severity
      : alert.severity;

  // Localized verification agency
  const verifiedLabel =
    lang === 'si'
      ? alert.verifiedBySi || t('verifiedByDMC')
      : lang === 'ta'
      ? alert.verifiedByTa || t('verifiedByDMC')
      : alert.verifiedBy || t('verifiedByDMC');

  // Localized title & type
  const titleText =
    lang === 'si'
      ? alert.typeSi || alert.titleSi || alert.type || alert.title
      : lang === 'ta'
      ? alert.typeTa || alert.titleTa || alert.type || alert.title
      : alert.type || alert.title;

  // Localized body text
  const bodyText =
    lang === 'si' ? alert.bodySi || alert.body : lang === 'ta' ? alert.bodyTa || alert.body : alert.body;

  // Localized location
  const locationText =
    lang === 'si'
      ? alert.locationSi || alert.location
      : lang === 'ta'
      ? alert.locationTa || alert.location
      : alert.location;

  // Localized time
  const updatedText =
    lang === 'si'
      ? alert.updatedAgoSi || alert.updatedAgo
      : lang === 'ta'
      ? alert.updatedAgoTa || alert.updatedAgo
      : alert.updatedAgo || 'Updated recently';

  return (
    <article className={`alert-card ${isCritical ? 'critical' : 'high'}`}>
      <div className="alert-card-top">
        <Badge variant={isCritical ? 'critical' : 'high'}>
          {severityLabel}
        </Badge>

        <Badge variant="verified" icon={CheckCircle2}>
          {verifiedLabel}
        </Badge>
      </div>

      <h3 className="alert-card-title">{titleText}</h3>

      {bodyText && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
          {bodyText}
        </p>
      )}

      <div className="alert-card-meta">
        <span>
          <MapPin size={14} color="var(--color-slate-400)" />
          <strong>{locationText}</strong>
        </span>
        <span>
          <Clock size={14} color="var(--color-slate-400)" />
          {updatedText}
        </span>
      </div>
    </article>
  );
}
