import React from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';

/**
 * Segmented Language Switcher
 * Order: සිංහල | தமிழ் | English
 * Reusable across Organization Portal & future Citizen Portal.
 */
export const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || 'en';

  const handleLanguageChange = (code) => {
    if (code !== currentLanguage) {
      i18n.changeLanguage(code);
    }
  };

  return (
    <div
      className={`org-language-switcher ${className}`}
      role="group"
      aria-label="Language selector"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        border: '1px solid #E2E8F0',
        borderRadius: '9999px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const isSelected = currentLanguage === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => handleLanguageChange(lang.code)}
            aria-pressed={isSelected}
            aria-label={`Switch to ${lang.label}`}
            style={{
              border: 'none',
              background: isSelected ? '#FFFFFF' : 'transparent',
              color: isSelected ? '#10756F' : '#334155',
              fontWeight: isSelected ? 700 : 500,
              fontSize: '12.5px',
              lineHeight: 1.2,
              padding: '5px 11px',
              borderRadius: '9999px',
              cursor: 'pointer',
              transition: 'all 0.18s ease-in-out',
              boxShadow: isSelected ? '0 1px 3px rgba(15, 23, 42, 0.12)' : 'none',
              whiteSpace: 'nowrap',
              fontFamily: lang.code === 'si'
                ? "'Noto Sans Sinhala', 'Iskoola Pota', system-ui, sans-serif"
                : (lang.code === 'ta'
                  ? "'Noto Sans Tamil', 'Latha', 'Vijaya', system-ui, sans-serif"
                  : 'inherit'),
            }}
            className={`org-lang-option ${isSelected ? 'selected' : ''}`}
          >
            {lang.nativeName}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
