import type { Report } from '../../types';

import { AI_CONTEXT_BUDGET } from './contextBudget';
import type { AppActionDescriptor, HyperAppContext } from './types';

const LOCATION_STALE_AFTER_MS = 5 * 60 * 1000;

export interface BuildHyperAppContextInput {
  currentScreen: string;
  locale?: string;
  preferredLanguage?: string;
  userLocation: [number, number] | null;
  locationCapturedAt?: string;
  locationPermissionStatus?: 'granted' | 'denied' | 'prompt' | 'unavailable';
  nearbyReports: Report[];
  guardianCount?: number;
  activeGuardianAlertStatus?: string;
  availableAppActions: AppActionDescriptor[];
}

function sanitizeText(value: string | undefined, maximum: number): string {
  return (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function approximateCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function distanceMeters(
  origin: [number, number],
  target: [number, number],
): number {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDistance = toRadians(target[0] - origin[0]);
  const longitudeDistance = toRadians(target[1] - origin[1]);
  const originLatitude = toRadians(origin[0]);
  const targetLatitude = toRadians(target[0]);
  const a = Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(targetLatitude) * Math.sin(longitudeDistance / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function verificationStatus(report: Report): string {
  if ((report.validation_count || 0) >= 2 && (report.credibility_score || 0) >= 0.65) {
    return 'community-verified';
  }
  return 'unverified community report';
}

export function buildHyperAppContext(input: BuildHyperAppContextInput): HyperAppContext {
  const now = Date.now();
  const capturedAt = input.locationCapturedAt ? Date.parse(input.locationCapturedAt) : Number.NaN;
  const stale = Boolean(input.userLocation) && (
    !Number.isFinite(capturedAt) || now - capturedAt > LOCATION_STALE_AFTER_MS
  );
  const reports = [...input.nearbyReports]
    .filter((report) => Number.isFinite(Date.parse(report.created_at)))
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, AI_CONTEXT_BUDGET.maxNearbyReports)
    .map((report) => ({
      type: sanitizeText(String(report.vibe_type || 'other'), 40),
      description: sanitizeText(report.notes || report.location || 'No description provided.', 220),
      distanceMeters: input.userLocation
        ? distanceMeters(input.userLocation, [report.latitude, report.longitude])
        : undefined,
      reportedAt: report.created_at,
      verificationStatus: verificationStatus(report),
    }));

  return {
    currentScreen: sanitizeText(input.currentScreen, 60),
    locale: sanitizeText(input.locale, 20) || undefined,
    preferredLanguage: sanitizeText(input.preferredLanguage, 20) || undefined,
    currentTime: new Date(now).toISOString(),
    approximateLocation: input.userLocation ? {
      latitude: approximateCoordinate(input.userLocation[0]),
      longitude: approximateCoordinate(input.userLocation[1]),
      capturedAt: Number.isFinite(capturedAt) ? new Date(capturedAt).toISOString() : undefined,
      permissionStatus: input.locationPermissionStatus || 'granted',
      stale,
    } : {
      permissionStatus: input.locationPermissionStatus || 'unavailable',
      stale: false,
    },
    guardianNetwork: {
      configured: (input.guardianCount || 0) > 0,
      availableGuardianCount: Math.max(0, input.guardianCount || 0),
      activeAlertStatus: sanitizeText(input.activeGuardianAlertStatus, 40) || undefined,
    },
    nearbyReports: reports,
    availableAppActions: input.availableAppActions.map((action) => ({
      ...action,
      label: sanitizeText(action.label, 80),
      description: sanitizeText(action.description, 160) || undefined,
    })),
  };
}

export const DEFAULT_ASSISTANT_ACTIONS: AppActionDescriptor[] = [
  { type: 'OPEN_MAP', label: 'Open map', requiresConfirmation: false },
  { type: 'OPEN_NEARBY_REPORTS', label: 'View nearby reports', requiresConfirmation: false },
  { type: 'REPORT_INCIDENT', label: 'Report an incident', requiresConfirmation: true },
  { type: 'SHARE_LOCATION', label: 'Turn on location sharing', requiresConfirmation: true },
  { type: 'CALL_EMERGENCY_SERVICES', label: 'Call emergency services', requiresConfirmation: true },
];

export function isLocationContextStale(context: HyperAppContext): boolean {
  return Boolean(context.approximateLocation?.stale);
}
