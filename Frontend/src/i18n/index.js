import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import si from './locales/si';
import ta from './locales/ta';

export const SUPPORTED_LANGUAGES = [
  { code: 'si', label: 'සිංහල', nativeName: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்', nativeName: 'தமிழ்' },
  { code: 'en', label: 'English', nativeName: 'English' },
];

export const LANGUAGE_STORAGE_KEY = 'relieflink_language';

// Detect initial language: localStorage -> 'en' fallback
const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && ['en', 'si', 'ta'].includes(saved)) {
      return saved;
    }
  } catch (err) {
    console.warn('Could not read saved language from localStorage:', err);
  }
  return 'en'; // English is default for first-time visitors
};

const initialLang = getInitialLanguage();

// Set initial document language attribute
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      si: { translation: si },
      ta: { translation: ta },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

// Keep localStorage & document.documentElement.lang in sync on language changes
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  } catch (err) {
    console.warn('Could not persist language to localStorage:', err);
  }
});

export default i18n;
