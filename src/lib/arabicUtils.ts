// Arabic numeral conversion utilities

/**
 * Converts Western Arabic numerals (0-9) to Eastern Arabic numerals (٠-٩)
 */
export const convertToArabicNumerals = (text: string | number): string => {
  if (text === null || text === undefined) {
    return '';
  }

  const textStr = String(text);

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

  return textStr.replace(/[0-9]/g, (digit) => numeralMap[digit]);
};

/**
 * Converts Eastern Arabic numerals (٠-٩) to Western Arabic numerals (0-9)
 */
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

/**
 * Formats a number according to the current language
 * - Arabic: Eastern Arabic numerals (٠-٩)
 * - Other languages: Western Arabic numerals (0-9)
 */
export const formatNumber = (num: number | string, language: string = 'en'): string => {
  if (num === null || num === undefined) {
    return '';
  }

  const numStr = String(num);

  if (language === 'ar') {
    return convertToArabicNumerals(numStr);
  }

  return numStr;
};

/**
 * Formats a number with locale-specific formatting and numerals
 */
export const formatNumberLocalized = (
  num: number,
  options?: Intl.NumberFormatOptions,
  language: string = 'en',
): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    return '';
  }

  // Use Intl.NumberFormat for proper locale formatting
  const formatter = new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', options);
  let formatted = formatter.format(num);

  // Convert numerals if Arabic
  if (language === 'ar') {
    formatted = convertToArabicNumerals(formatted);
  }

  return formatted;
};

/**
 * Formats temperature with proper numerals
 */
export const formatTemperature = (temp: number, language: string = 'en'): string => {
  return formatNumber(Math.round(temp), language) + '°';
};

/**
 * Formats percentage with proper numerals
 */
export const formatPercentage = (value: number, language: string = 'en'): string => {
  return formatNumber(Math.round(value), language) + '%';
};

/**
 * Formats distance with proper numerals
 */
export const formatDistance = (distance: number, unit: 'km' | 'm' = 'km', language: string = 'en'): string => {
  if (unit === 'm' && distance < 1000) {
    return formatNumber(Math.round(distance), language) + 'm';
  }

  const km = distance / 1000;
  return formatNumber(km.toFixed(1), language) + 'km';
};
