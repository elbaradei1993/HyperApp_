import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';
import frTranslations from './locales/fr.json';
import commonEnTranslations from './locales/common.json';
import commonArTranslations from './locales/common.ar.json';
import { translationService } from './services/translationService';
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatDistance,
  formatTemperature,
  formatSpeed,
  formatFileSize,
  formatDuration,
} from './lib/i18nUtils';

// Arabic pluralization rules - FIXED
const arabicPluralization = (count: number, ordinal?: boolean) => {
  if (ordinal) {
    return 'ordinal';
  }

  const absoluteCount = Math.abs(count);

  if (absoluteCount === 0) {
    return 'zero';
  }
  if (absoluteCount === 1) {
    return 'singular';
  }
  if (absoluteCount === 2) {
    return 'dual';
  }
  if (absoluteCount >= 3 && absoluteCount <= 10) {
    return 'plural_few';
  }

  // 11 and above
  return 'plural_many';
};

// Merge common translations with main translations
const resources = {
  en: {
    translation: {
      ...commonEnTranslations,
      ...enTranslations,
    },
  },
  ar: {
    translation: {
      ...commonArTranslations,
      ...arTranslations,
    },
  },
  fr: {
    translation: {
      ...commonEnTranslations, // Use English common as base
      ...frTranslations,        // Override with French translations
    },
  },
};

// Track missing keys to avoid duplicate translation requests
const translatingKeys = new Set<string>();

// Cache for translations to avoid repeated API calls
const translationCache = new Map<string, string>();

// Function to check if text is Arabic
const isArabicText = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // Arabic Unicode range: U+0600 to U+06FF, U+0750 to U+077F, U+08A0 to U+08FF, U+FB50 to U+FDFF, U+FE70 to U+FEFF
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
};

// Function to safely get English text without recursion
const getEnglishTextSafely = (key: string, fallbackValue: string): string => {
  try {
    // Direct access to English resources
    const enResources = resources.en?.translation;
    if (enResources && typeof enResources === 'object') {
      // Navigate nested objects using dot notation
      const keys = key.split('.');
      let current: any = enResources;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return fallbackValue;
        }
      }

      if (typeof current === 'string' && current.trim() !== '') {
        return current;
      }
    }
  } catch (error) {
    console.warn(`Error accessing English text for key "${key}":`, error);
  }

  return fallbackValue;
};

// CRITICAL: Pre-process Arabic translations to ensure they're properly formatted
const processArabicTranslations = () => {
  try {
    const arResources = resources.ar?.translation;
    if (!arResources) {
      return;
    }

    // Clean up common issues in Arabic translations
    const cleanup = (obj: any, path: string = ''): void => {
      if (!obj || typeof obj !== 'object') {
        return;
      }

      Object.keys(obj).forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'string') {
          // Clean up Arabic text
          let cleaned = value.trim();

          // Remove any remaining English placeholders
          cleaned = cleaned.replace(/{{.*?}}/g, match => match); // Keep template variables

          // Fix common spacing issues in Arabic
          cleaned = cleaned.replace(/\s+/g, ' ');
          cleaned = cleaned.replace(/(\S)\./g, '$1.');
          cleaned = cleaned.replace(/،\s*/g, '، ');

          obj[key] = cleaned;
        } else if (typeof value === 'object' && value !== null) {
          cleanup(value, fullPath);
        }
      });
    };

    cleanup(arResources);
    console.log('✅ Arabic translations pre-processed');
  } catch (error) {
    console.warn('⚠️ Error processing Arabic translations:', error);
  }
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: {
      'ar': ['en'],
      'fr': ['en'],
      'default': ['en'],
    },

    // Enable debug only in development
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes values
      format: (value: any, format?: string, lng?: string): string => {
        // Handle advanced formatting
        if (format) {
          switch (format) {
          // Date/Time formatting
          case 'date':
            return formatDate(value);
          case 'time':
            return formatTime(value);
          case 'datetime':
            return formatDateTime(value);
          case 'relativeTime':
            return formatRelativeTime(value);

            // Number formatting
          case 'number':
            return formatNumber(value);
          case 'currency':
            return formatCurrency(value);
          case 'percent':
            return formatPercent(value);

            // Custom formatters
          case 'distance':
            return formatDistance(value);
          case 'temperature':
            return formatTemperature(value);
          case 'speed':
            return formatSpeed(value);
          case 'fileSize':
            return formatFileSize(value);
          case 'duration':
            return formatDuration(value);

            // Arabic numeral conversion
          case 'arabicNumerals':
            if (typeof value === 'string' && lng === 'ar') {
              return convertToArabicNumerals(value);
            }
            return value;

          default:
            // Check for custom format options like 'currency:EUR' or 'date:short'
            const [formatter, option] = format.split(':');
            switch (formatter) {
            case 'currency':
              return formatCurrency(value, option || 'USD');
            case 'date':
              if (option === 'short') {
                return formatDate(value, { dateStyle: 'short' });
              } else if (option === 'long') {
                return formatDate(value, { dateStyle: 'long' });
              }
              return formatDate(value);
            case 'time':
              if (option === 'short') {
                return formatTime(value, { timeStyle: 'short' });
              }
              return formatTime(value);
            case 'number':
              if (option === 'integer') {
                return formatNumber(value, { maximumFractionDigits: 0 });
              }
              return formatNumber(value);
            case 'temperature':
              return formatTemperature(value, (option as 'C' | 'F') || 'C');
            case 'speed':
              return formatSpeed(value, (option as 'kmh' | 'mph') || 'kmh');
            }
            break;
          }
        }

        // Default: Convert numerals to Arabic when language is Arabic
        if (typeof value === 'string' && lng === 'ar') {
          return convertToArabicNumerals(value);
        }
        return value;
      },
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    // Language detection configuration
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    // Handle missing keys - OPTIMIZED FOR ARABIC
    missingKeyHandler: async (lngs: readonly string[], ns: string, key: string, fallbackValue: string) => {
      const targetLang = lngs[0];

      // Only handle Arabic translations
      if (targetLang !== 'ar') {
        return fallbackValue;
      }

      // Skip keys that are likely not user-facing text
      if (key.startsWith('_') || key.includes('__') ||
          key.toLowerCase().includes('api') ||
          key.toLowerCase().includes('url') ||
          key.toLowerCase().includes('endpoint')) {
        return fallbackValue;
      }

      // Check cache first
      const cacheKey = `en-ar-${key}`;
      if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey) || fallbackValue;
      }

      // Skip if already translating this key
      if (translatingKeys.has(cacheKey)) {
        return fallbackValue;
      }

      try {
        translatingKeys.add(cacheKey);

        // Get source text safely
        const sourceText = getEnglishTextSafely(key, fallbackValue);

        // Skip if not valid for translation
        if (!sourceText ||
            sourceText === key ||
            sourceText === fallbackValue ||
            sourceText.trim() === '' ||
            isArabicText(sourceText)) {
          return fallbackValue;
        }

        // Skip short technical texts
        if (sourceText.length < 3 ||
            /^[A-Z_]+$/.test(sourceText) || // UPPERCASE_WITH_UNDERSCORES
            /^[0-9]+$/.test(sourceText)) {  // Numbers only
          return fallbackValue;
        }

        // Translate using service
        const translatedText = await translationService.translate(
          sourceText,
          'en',
          'ar',
        );

        // Validate translated text
        if (translatedText &&
            translatedText !== sourceText &&
            translatedText.trim() !== '' &&
            isArabicText(translatedText)) {

          // Cache the translation
          translationCache.set(cacheKey, translatedText);

          // Add to resources
          i18n.addResource('ar', ns, key, translatedText);

          // Emit event for UI updates
          i18n.emit('added');

          console.log(`✅ Translated: "${sourceText.substring(0, 50)}..." → "${translatedText.substring(0, 50)}..."`);

          return translatedText;
        }

        return fallbackValue;

      } catch (error) {
        console.warn(`❌ Translation failed for key "${key}":`, error);
        return fallbackValue;
      } finally {
        translatingKeys.delete(cacheKey);
      }
    },

    // Configure saveMissing
    saveMissing: process.env.NODE_ENV === 'development',
  });

// Process Arabic translations after init
i18n.on('initialized', (options: any) => {
  processArabicTranslations();

  // Configure Arabic pluralization
  setTimeout(() => {
    try {
      if (i18n.services?.pluralResolver) {
        i18n.services.pluralResolver.addRule('ar', {
          name: 'arabic',
          numbers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 100],
          plurals: arabicPluralization,
        });

        console.log('✅ Arabic pluralization configured');
      }
    } catch (error) {
      console.warn('⚠️ Error configuring Arabic pluralization:', error);
    }
  }, 500);
});

// Handle language changes
i18n.on('languageChanged', (lng: string) => {
  // RTL only for Arabic — French and English are LTR
  const isRTL = lng === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;

  // Add language class for CSS
  document.documentElement.classList.toggle('rtl', isRTL);
  document.documentElement.classList.toggle('ltr', !isRTL);

  console.log(`🌐 Language changed to: ${lng} (${isRTL ? 'RTL' : 'LTR'})`);
});

// RTL languages — French is LTR, only Arabic is RTL
export const rtlLanguages = ['ar'];

/** All supported languages */
export const supportedLanguages = ['en', 'fr', 'ar'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Helper function to check if current language is RTL
export const isRTL = (): boolean => {
  return rtlLanguages.includes(i18n.language);
};

// Function to convert Western Arabic numerals to Eastern Arabic numerals
const convertToArabicNumerals = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const numeralMap: { [key: string]: string } = {
    '0': '٠',
    '1': '١',
    '2': '٢',
    '3': '٣',
    '4': '٤',
    '5': '٥',
    '6': '٦',
    '7': '٧',
    '8': '٨',
    '9': '٩',
  };

  return text.replace(/[0-9]/g, (digit) => numeralMap[digit]);
};

// Function to convert Eastern Arabic numerals to Western Arabic numerals
export const convertToWesternNumerals = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const numeralMap: { [key: string]: string } = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };

  return text.replace(/[٠-٩]/g, (digit) => numeralMap[digit]);
};

// Helper function to manually add Arabic translation
export const addArabicTranslation = (key: string, arabicText: string): void => {
  if (!key || !arabicText || !isArabicText(arabicText)) {
    console.warn('Invalid Arabic translation data');
    return;
  }

  // Add to cache
  const cacheKey = `en-ar-${key}`;
  translationCache.set(cacheKey, arabicText);

  // Add to resources
  i18n.addResource('ar', 'translation', key, arabicText);

  // Emit update
  i18n.emit('added');

  console.log(`📝 Manual Arabic translation added: "${key}"`);
};

export default i18n;
