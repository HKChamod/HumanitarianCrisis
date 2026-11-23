import { Link } from 'react-router-dom';
import { MapPin, ExternalLink, Check } from 'lucide-react';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { useLanguage } from '../../context/LanguageContext';

export function ShelterCard({ shelter }) {
  const { lang, t } = useLanguage();
  const bedsRemaining = Math.max(0, (shelter.totalBeds || 0) - (shelter.usedBeds || 0));

  // Localized district tag
  const districtLabel =
    lang === 'si'
      ? `${shelter.districtNameSi || shelter.districtName} ${t('districtSuffix')}`
      : lang === 'ta'
      ? `${shelter.districtNameTa || shelter.districtName} ${t('districtSuffix')}`
      : `${shelter.districtName} ${t('districtSuffix')}`;

  // Localized shelter name
  const nameLabel =
    lang === 'si'
      ? shelter.nameSi || shelter.name
      : lang === 'ta'
      ? shelter.nameTa || shelter.name
      : shelter.name;

  // Localized distance
  const distanceLabel =
    lang === 'si'
      ? shelter.distanceSi || shelter.distance || shelter.address
      : lang === 'ta'
      ? shelter.distanceTa || shelter.distance || shelter.address
      : shelter.distance || shelter.address;

  // Localized capacity text
  const capacityText = (t('capacityLabel') || 'Capacity: {used} of {total} beds used')
    .replace('{used}', shelter.usedBeds)
    .replace('{total}', shelter.totalBeds);

  // Localized available text
  const availableText = (t('spacesAvailable') || '{count} spaces currently available').replace(
    '{count}',
    bedsRemaining
  );

  // Localized amenities list
  const amenitiesList =
    lang === 'si' && shelter.amenitiesSi
      ? shelter.amenitiesSi
      : lang === 'ta' && shelter.amenitiesTa
      ? shelter.amenitiesTa
      : shelter.amenities || [];

  return (
    <article className="shelter-card">
      <div className="shelter-card-top">
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          {districtLabel}
        </span>
        {shelter.isOpen ? (
          <Badge variant="open">{t('openNow')}</Badge>
        ) : (
          <Badge variant="critical">{t('fullClosed')}</Badge>
        )}
      </div>

      <h3 className="shelter-card-name">{nameLabel}</h3>

      <div className="shelter-card-dist">
        <MapPin size={13} />
        <span>{distanceLabel}</span>
      </div>

      {/* Capacity Progress Bar */}
      <ProgressBar
        current={shelter.usedBeds}
        total={shelter.totalBeds}
        label={capacityText}
      />

      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '-0.25rem' }}>
        <strong>{availableText}</strong>
      </div>

      {/* Amenity Tags */}
      <div className="shelter-tags-row">
        {amenitiesList.slice(0, 3).map((amenity, idx) => (
          <span key={idx} className="tag-pill">
            <Check size={11} color="var(--color-primary)" />
            {amenity}
          </span>
        ))}
      </div>

      {/* Map Link */}
      <Link to={`/map?shelterId=${shelter.id}`} className="shelter-view-map-btn">
        <span>{t('viewOnMap')}</span>
        <ExternalLink size={14} />
      </Link>
    </article>
  );
}
