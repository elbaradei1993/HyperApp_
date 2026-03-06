import i18n from '../i18n';

// Date/Time Localization
export class DateTimeFormatter {
  private static getLocale(language: string = i18n.language): string {
    // Map language codes to locale codes
    const localeMap: { [key: string]: string } = {
      'en': 'en-US',
      'ar': 'ar-SA',
      // Add more language-to-locale mappings as needed
    };

    return localeMap[language] || language;
  }

  static formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions, language?: string): string {
    const locale = this.getLocale(language);
    const dateObj = new Date(date);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  }

  static formatTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions, language?: string): string {
    const locale = this.getLocale(language);
    const dateObj = new Date(date);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  }

  static formatDateTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions, language?: string): string {
    const locale = this.getLocale(language);
    const dateObj = new Date(date);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
  }

  static formatRelativeTime(date: Date | string | number, language?: string): string {
    const locale = this.getLocale(language);
    const dateObj = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffInSeconds) < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (Math.abs(diffInSeconds) < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (Math.abs(diffInSeconds) < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (Math.abs(diffInSeconds) < 604800) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (Math.abs(diffInSeconds) < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
    } else if (Math.abs(diffInSeconds) < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  }
}

// Number and Currency Formatting
export class NumberFormatter {
  private static getLocale(language: string = i18n.language): string {
    const localeMap: { [key: string]: string } = {
      'en': 'en-US',
      'ar': 'ar-SA',
    };

    return localeMap[language] || language;
  }

  static formatNumber(num: number, options?: Intl.NumberFormatOptions, language?: string): string {
    const locale = this.getLocale(language);

    const defaultOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    };

    return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(num);
  }

  static formatCurrency(amount: number, currency: string = 'USD', options?: Intl.NumberFormatOptions, language?: string): string {
    const locale = this.getLocale(language);

    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency,
    };

    return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(amount);
  }

  static formatPercent(value: number, options?: Intl.NumberFormatOptions, language?: string): string {
    const locale = this.getLocale(language);

    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    };

    return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(value);
  }
}

// Custom Formatters for App-Specific Data
export class CustomFormatter {
  static formatDistance(meters: number, language: string = i18n.language): string {
    if (meters < 1000) {
      return `${NumberFormatter.formatNumber(meters, { maximumFractionDigits: 0 })}m`;
    } else {
      const km = meters / 1000;
      return `${NumberFormatter.formatNumber(km, { maximumFractionDigits: 1 })}km`;
    }
  }

  static formatTemperature(celsius: number, unit: 'C' | 'F' = 'C', language: string = i18n.language): string {
    const temp = unit === 'F' ? (celsius * 9/5) + 32 : celsius;
    const symbol = unit === 'F' ? '°F' : '°C';
    return `${NumberFormatter.formatNumber(temp, { maximumFractionDigits: 1 })}${symbol}`;
  }

  static formatSpeed(kmh: number, unit: 'kmh' | 'mph' = 'kmh', language: string = i18n.language): string {
    const speed = unit === 'mph' ? kmh * 0.621371 : kmh;
    const symbol = unit === 'mph' ? 'mph' : 'km/h';
    return `${NumberFormatter.formatNumber(speed, { maximumFractionDigits: 1 })} ${symbol}`;
  }

  static formatFileSize(bytes: number, language: string = i18n.language): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${NumberFormatter.formatNumber(size, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
  }

  static formatDuration(seconds: number, language: string = i18n.language): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }
}

// Context-aware translations
export class ContextTranslator {
  static translateWithContext(key: string, context: string, options?: any): string {
    // Try context-specific key first
    const contextKey = `${key}_${context}`;
    let translation = i18n.t(contextKey, { ...options, defaultValue: '' }) as string;

    // Fall back to base key if context-specific doesn't exist
    if (!translation) {
      translation = i18n.t(key, options) as string;
    }

    return translation;
  }

  static translatePluralWithContext(key: string, count: number, context: string, options?: any): string {
    const contextKey = `${key}_${context}`;
    let translation = i18n.t(contextKey, { ...options, count, defaultValue: '' }) as string;

    if (!translation) {
      translation = i18n.t(key, { ...options, count }) as string;
    }

    return translation;
  }
}

// Validation utilities
export class TranslationValidator {
  static validateTranslations(): { missing: string[], invalid: string[], stats: any } {
    const missing: string[] = [];
    const invalid: string[] = [];
    const stats = {
      totalKeys: 0,
      translatedKeys: 0,
      languages: Object.keys(i18n.services.resourceStore.data),
    };

    // This is a basic implementation - in a real app you'd want more sophisticated validation
    const enResources = i18n.services.resourceStore.data.en?.translation;
    if (enResources) {
      const traverse = (obj: any, path: string = '') => {
        Object.keys(obj).forEach(key => {
          const fullPath = path ? `${path}.${key}` : key;
          const value = obj[key];

          if (typeof value === 'string') {
            stats.totalKeys++;

            // Check if translation exists in other languages
            stats.languages.forEach(lang => {
              if (lang !== 'en') {
                const langResources = i18n.services.resourceStore.data[lang]?.translation;
                if (langResources && !this.getNestedValue(langResources, fullPath)) {
                  missing.push(`${lang}:${fullPath}`);
                } else {
                  stats.translatedKeys++;
                }
              }
            });

            // Basic validation - check for common issues
            if (value.includes('{{') && !value.includes('}}')) {
              invalid.push(`Unclosed interpolation: ${fullPath}`);
            }
          } else if (typeof value === 'object') {
            traverse(value, fullPath);
          }
        });
      };

      traverse(enResources);
    }

    return { missing, invalid, stats };
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export convenience functions
export const formatDate = DateTimeFormatter.formatDate.bind(DateTimeFormatter);
export const formatTime = DateTimeFormatter.formatTime.bind(DateTimeFormatter);
export const formatDateTime = DateTimeFormatter.formatDateTime.bind(DateTimeFormatter);
export const formatRelativeTime = DateTimeFormatter.formatRelativeTime.bind(DateTimeFormatter);

export const formatNumber = NumberFormatter.formatNumber.bind(NumberFormatter);
export const formatCurrency = NumberFormatter.formatCurrency.bind(NumberFormatter);
export const formatPercent = NumberFormatter.formatPercent.bind(NumberFormatter);

export const formatDistance = CustomFormatter.formatDistance.bind(CustomFormatter);
export const formatTemperature = CustomFormatter.formatTemperature.bind(CustomFormatter);
export const formatSpeed = CustomFormatter.formatSpeed.bind(CustomFormatter);
export const formatFileSize = CustomFormatter.formatFileSize.bind(CustomFormatter);
export const formatDuration = CustomFormatter.formatDuration.bind(CustomFormatter);

export const translateWithContext = ContextTranslator.translateWithContext.bind(ContextTranslator);
export const translatePluralWithContext = ContextTranslator.translatePluralWithContext.bind(ContextTranslator);

export const validateTranslations = TranslationValidator.validateTranslations.bind(TranslationValidator);
