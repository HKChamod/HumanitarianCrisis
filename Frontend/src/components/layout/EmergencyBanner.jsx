import { AlertTriangle, PhoneCall } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function EmergencyBanner() {
  const { t } = useLanguage();

  return (
    <div className="emergency-top-banner" role="banner">
      <AlertTriangle size={15} className="banner-icon" />
      <span>{t('hotlineBanner')}</span>
      <a
        href="tel:117"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginLeft: '8px',
          textDecoration: 'underline',
          color: 'inherit',
        }}
      >
        <PhoneCall size={12} /> {t('callBanner')}
      </a>
    </div>
  );
}
