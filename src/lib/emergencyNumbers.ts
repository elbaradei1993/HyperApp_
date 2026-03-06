/**
 * Emergency Number Lookup Utility
 *
 * Returns the correct emergency number for a given country code.
 * Designed for easy extension as HyperApp expands globally.
 *
 * Usage:
 *   import { getEmergencyNumber } from '../lib/emergencyNumbers';
 *   const number = getEmergencyNumber('CA'); // → '911'
 */

export interface EmergencyNumbers {
  /** General emergency / all services */
  general: string;
  /** Police */
  police: string;
  /** Fire department */
  fire: string;
  /** Ambulance / medical */
  ambulance: string;
  /** Display label shown in UI */
  label: string;
}

const EMERGENCY_MAP: Record<string, EmergencyNumbers> = {
  // North America
  CA: { general: '911', police: '911', fire: '911', ambulance: '911', label: '911' },
  US: { general: '911', police: '911', fire: '911', ambulance: '911', label: '911' },
  MX: { general: '911', police: '911', fire: '911', ambulance: '911', label: '911' },

  // Europe (most use 112)
  GB: { general: '999', police: '999', fire: '999', ambulance: '999', label: '999' },
  DE: { general: '112', police: '110', fire: '112', ambulance: '112', label: '112/110' },
  FR: { general: '112', police: '17', fire: '18', ambulance: '15', label: '112' },
  ES: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
  IT: { general: '112', police: '113', fire: '115', ambulance: '118', label: '112' },
  NL: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
  BE: { general: '112', police: '101', fire: '100', ambulance: '100', label: '112' },
  SE: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
  NO: { general: '112', police: '112', fire: '110', ambulance: '113', label: '112' },
  DK: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
  FI: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
  PL: { general: '112', police: '997', fire: '998', ambulance: '999', label: '112' },
  PT: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
  IE: { general: '999', police: '999', fire: '999', ambulance: '999', label: '999' },
  CH: { general: '112', police: '117', fire: '118', ambulance: '144', label: '112' },
  AT: { general: '112', police: '133', fire: '122', ambulance: '144', label: '112' },

  // Middle East / North Africa (legacy regions)
  EG: { general: '123', police: '122', fire: '180', ambulance: '123', label: '123' },
  AE: { general: '999', police: '999', fire: '997', ambulance: '998', label: '999' },
  SA: { general: '911', police: '999', fire: '998', ambulance: '997', label: '911' },
  TR: { general: '112', police: '155', fire: '110', ambulance: '112', label: '112' },

  // Asia-Pacific
  AU: { general: '000', police: '000', fire: '000', ambulance: '000', label: '000' },
  NZ: { general: '111', police: '111', fire: '111', ambulance: '111', label: '111' },
  JP: { general: '110', police: '110', fire: '119', ambulance: '119', label: '110/119' },
  KR: { general: '112', police: '112', fire: '119', ambulance: '119', label: '112/119' },
  CN: { general: '110', police: '110', fire: '119', ambulance: '120', label: '110' },
  IN: { general: '112', police: '100', fire: '101', ambulance: '102', label: '112' },
  SG: { general: '999', police: '999', fire: '995', ambulance: '995', label: '999' },

  // Default / EU fallback
  DEFAULT: { general: '112', police: '112', fire: '112', ambulance: '112', label: '112' },
};

/**
 * Returns emergency numbers for a given ISO 3166-1 alpha-2 country code.
 * Falls back to 112 (international standard) if country is not found.
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g. 'CA', 'US', 'GB')
 * @returns EmergencyNumbers object with number strings
 */
export function getEmergencyNumbers(countryCode: string): EmergencyNumbers {
  const code = countryCode.toUpperCase().trim();
  return EMERGENCY_MAP[code] ?? EMERGENCY_MAP['DEFAULT'];
}

/**
 * Returns the primary emergency number string for display.
 * Convenience wrapper around getEmergencyNumbers().
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns string like '911', '999', or '112'
 */
export function getEmergencyNumber(countryCode: string): string {
  return getEmergencyNumbers(countryCode).general;
}

/**
 * Returns an emergency tel: link for the given country.
 * Use this to make emergency numbers tappable on mobile.
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns tel: URI string, e.g. 'tel:911'
 */
export function getEmergencyTelLink(countryCode: string): string {
  return `tel:${getEmergencyNumber(countryCode)}`;
}

/** Countries currently in pilot — expand as HyperApp grows */
export const PILOT_COUNTRIES: Record<string, string> = {
  CA: 'Canada',
  US: 'United States',
};
