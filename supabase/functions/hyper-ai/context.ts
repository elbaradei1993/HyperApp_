import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { maxSafetyLevel, evaluateSafetyRisk, type GuardSafetyLevel } from '../_shared/safetyGuard.ts';

type SafetyLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
type Message = { role: 'user' | 'assistant'; content: string };

export interface DeviceLocationHint {
  latitude: number;
  longitude: number;
  capturedAt?: string;
}

interface LocalVibeSnapshot {
  radiusMeters: number;
  dataWindowHours: number;
  reportCount: number;
  emergencyReportCount: number;
  observedTags: Array<{ tag: string; count: number }>;
  latestReports: Array<{
    tag: string;
    description: string;
    distanceMeters: number;
    reportedAt: string;
    verificationStatus: string;
  }>;
  dataAsOf: string;
}

export interface ServerConversationContext {
  rollingSummary: string;
  recentMessages: Message[];
  currentSafetyState: SafetyLevel;
  activeFacts: Array<{ key: string; value: string; createdAt: string }>;
  durablePreferences: Array<{ key: string; value: string; source: 'user_explicit' | 'profile' | 'app_setting' }>;
  unresolvedTopics: Array<{ type: string; summary: string; createdAt: string }>;
  repetitionState: {
    lastQuestionsAsked: string[];
    lastActionsSuggested: string[];
    lastAdviceTopics: string[];
  };
}

const MAX_MESSAGES = 200;
const RECENT_MESSAGES = 20;
const SUMMARY_LIMIT = 2500;
const LOCATION_STALE_AFTER_MS = 5 * 60 * 1000;
const LOCAL_CONTEXT_RADIUS_METERS = 5_000;
const LOCAL_CONTEXT_WINDOW_HOURS = 72;
const LOCAL_EVENT_RADIUS_METERS = 10_000;
const LOCAL_EVENT_WINDOW_DAYS = 7;
const REVERSE_GEOCODE_TIMEOUT_MS = 2_500;

let reverseGeocodeCache: {
  key: string;
  label: string | null;
  expiresAt: number;
} | null = null;

const AVAILABLE_ACTIONS = [
  { type: 'OPEN_MAP', label: 'Open map', requiresConfirmation: false },
  { type: 'OPEN_NEARBY_REPORTS', label: 'View nearby reports', requiresConfirmation: false },
  { type: 'REPORT_INCIDENT', label: 'Report an incident', requiresConfirmation: true },
  { type: 'CALL_EMERGENCY_SERVICES', label: 'Call emergency services', requiresConfirmation: true },
];

function clean(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
    : '';
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function distanceMeters(a: [number, number], b: [number, number]): number {
  const radius = 6_371_000;
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const aLat = rad(a[0]);
  const bLat = rad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat) * Math.cos(bLat) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

async function reverseGeocodeArea(latitude: number, longitude: number): Promise<string | null> {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  if (reverseGeocodeCache && reverseGeocodeCache.key === key && reverseGeocodeCache.expiresAt > Date.now()) {
    return reverseGeocodeCache.label;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'HyperApp/1.0 (https://github.com/elbaradei1993/HyperApp_)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(REVERSE_GEOCODE_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`Reverse geocoding failed: ${response.status}`);
    const data = await response.json() as { address?: Record<string, unknown> };
    const address = data.address || {};
    const label = [
      address.neighbourhood,
      address.suburb,
      address.city || address.town || address.village || address.municipality,
      address.state,
    ].find((value) => typeof value === 'string' && value.trim()) as string | undefined;
    const cleanLabel = label ? clean(label, 120) : null;
    reverseGeocodeCache = { key, label: cleanLabel, expiresAt: Date.now() + 10 * 60 * 1000 };
    return cleanLabel;
  } catch {
    reverseGeocodeCache = { key, label: null, expiresAt: Date.now() + 2 * 60 * 1000 };
    return null;
  }
}

function normalizeLocationHint(input?: DeviceLocationHint) {
  if (!input) return null;
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;

  const parsed = typeof input.capturedAt === 'string' ? Date.parse(input.capturedAt) : Number.NaN;
  const age = Number.isFinite(parsed) ? Date.now() - parsed : Number.POSITIVE_INFINITY;
  const stale = !Number.isFinite(parsed) || age > LOCATION_STALE_AFTER_MS || age < -120_000;

  return {
    latitude: Math.round(latitude * 1000) / 1000,
    longitude: Math.round(longitude * 1000) / 1000,
    capturedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined,
    stale,
  };
}

function activeFacts(messages: Array<{ role: string; content: string; created_at: string }>) {
  const facts = new Map<string, { key: string; value: string; createdAt: string }>();
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = compact(message.content);
    const location = text.match(/\b(?:i am|i'm|we are|we're)\s+(?:at|near|in)\s+([^.!?]{2,100})/i)?.[1];
    if (location) facts.set('current_location', {
      key: 'current_location',
      value: clean(location, 180),
      createdAt: message.created_at,
    });
    if (/\b(i am|i'm) alone\b/i.test(text)) facts.set('companionship', {
      key: 'companionship',
      value: 'alone',
      createdAt: message.created_at,
    });
  }
  return Array.from(facts.values());
}

function unresolvedTopics(messages: Array<{ role: string; content: string; created_at: string }>) {
  const latest = [...messages].reverse().find((item) => item.role === 'user');
  if (!latest) return [];
  if (/\b(i am safe now|i'm safe now|we are safe now|got away|they left)\b/i.test(latest.content)) return [];
  if (/\b(they did not answer|they didn't answer|cannot reach|can't reach|no one answered)\b/i.test(latest.content)) {
    return [{ type: 'failed_contact', summary: clean(latest.content, 220), createdAt: latest.created_at }];
  }
  if (/\b(where|location|station|near )\b/i.test(latest.content)) {
    return [{ type: 'location_uncertainty', summary: clean(latest.content, 220), createdAt: latest.created_at }];
  }
  return [];
}

function lastQuestions(messages: Array<{ role: string; content: string }>): string[] {
  return messages
    .filter((item) => item.role === 'assistant')
    .flatMap((item) => item.content.match(/[^?]{3,180}\?/g) || [])
    .map(compact)
    .slice(-8);
}

function lastAdviceTopics(messages: Array<{ role: string; content: string }>): string[] {
  const patterns: Array<[string, RegExp]> = [
    ['staffed_place', /\b(staffed|populated|well-lit|secure place)\b/i],
    ['emergency_services', /\bemergency services\b/i],
    ['nearby_reports', /\bnearby reports?\b/i],
    ['avoid_confrontation', /\b(do not|don't) confront\b/i],
  ];
  const result: string[] = [];
  for (const item of messages.filter((item) => item.role === 'assistant')) {
    for (const [topic, pattern] of patterns) {
      if (pattern.test(item.content) && !result.includes(topic)) result.push(topic);
    }
  }
  return result.slice(-8);
}

function deriveSafetyState(messages: Array<{ role: 'user' | 'assistant'; content: string }>): GuardSafetyLevel {
  let level: GuardSafetyLevel = 'LOW';
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const guard = evaluateSafetyRisk(message.content);
    if (guard.deescalated && guard.minimumLevel === 'LOW') {
      level = 'LOW';
      continue;
    }
    level = maxSafetyLevel(level, guard.minimumLevel);
  }
  return level;
}

function rollingSummary(messages: Array<{ role: string; content: string }>): string {
  if (messages.length <= RECENT_MESSAGES) return '';
  const lines = messages.slice(0, -RECENT_MESSAGES).map((item) => {
    const body = compact(item.content).slice(0, 320);
    return body ? (item.role === 'user' ? 'User: ' : 'Hyper: ') + body : '';
  }).filter(Boolean);
  let result = '';
  for (const line of lines) {
    const next = result ? result + '\n' + line : line;
    result = next.length <= SUMMARY_LIMIT ? next : next.slice(-SUMMARY_LIMIT);
  }
  return result;
}

export async function loadServerConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
): Promise<ServerConversationContext | null> {
  const { data: conversation, error } = await supabase
    .from('ai_conversations')
    .select('id,user_id,current_safety_level,persistence_enabled,state_metadata')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !conversation) return null;

  const metadata = conversation.state_metadata && typeof conversation.state_metadata === 'object'
    ? conversation.state_metadata as Record<string, unknown>
    : {};
  const expiry = typeof metadata.ephemeralExpiresAt === 'string' ? Date.parse(metadata.ephemeralExpiresAt) : Number.NaN;
  if (!conversation.persistence_enabled && Number.isFinite(expiry) && expiry <= Date.now()) {
    await supabase.from('ai_conversations').delete().eq('id', conversationId).eq('user_id', userId);
    return null;
  }

  const { data: rows, error: messageError } = await supabase
    .from('ai_messages')
    .select('role,content,created_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .neq('delivery_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES);
  if (messageError) return null;

  const messages = (rows || []).filter((row) => row.role === 'user' || row.role === 'assistant') as Array<{
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;

  const memoriesResult = conversation.persistence_enabled
    ? await supabase
      .from('ai_user_memories')
      .select('memory_key,memory_value,source')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20)
    : { data: [] };

  const durablePreferences = (memoriesResult.data || []).flatMap((row) => {
    const source = String(row.source);
    if (!['user_explicit', 'profile', 'app_setting'].includes(source)) return [];
    const key = clean(row.memory_key, 80);
    const value = clean(row.memory_value, 180);
    return key && value ? [{ key, value, source: source as 'user_explicit' | 'profile' | 'app_setting' }] : [];
  });

  return {
    rollingSummary: rollingSummary(messages),
    recentMessages: messages.slice(-RECENT_MESSAGES).map((item) => ({
      role: item.role,
      content: clean(item.content, 1500),
    })),
    currentSafetyState: deriveSafetyState(messages),
    activeFacts: activeFacts(messages),
    durablePreferences,
    unresolvedTopics: unresolvedTopics(messages),
    repetitionState: {
      lastQuestionsAsked: lastQuestions(messages),
      lastActionsSuggested: [],
      lastAdviceTopics: lastAdviceTopics(messages),
    },
  };
}

export async function buildServerAppContext(
  supabase: SupabaseClient,
  user: User,
  locationHint?: DeviceLocationHint,
): Promise<Record<string, unknown>> {
  const location = normalizeLocationHint(locationHint);
  const metadata = user.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata as Record<string, unknown>
    : {};
  const preferredLanguage = typeof metadata.language === 'string'
    ? clean(metadata.language, 20)
    : typeof metadata.locale === 'string' ? clean(metadata.locale, 20) : undefined;

  const context: Record<string, unknown> = {
    currentScreen: 'hyper-ai',
    locale: preferredLanguage || 'en',
    preferredLanguage,
    currentTime: new Date().toISOString(),
    approximateLocation: location
      ? {
        latitude: location.latitude,
        longitude: location.longitude,
        capturedAt: location.capturedAt,
        permissionStatus: 'granted',
        stale: location.stale,
        source: 'device-hint',
      }
      : { permissionStatus: 'unavailable', stale: false },
    currentArea: null,
    localVibeSnapshot: null,
    nearbyReports: [],
    nearbyEvents: [],
    availableAppActions: AVAILABLE_ACTIONS,
  };

  if (!location || location.stale) return context;

  const origin: [number, number] = [location.latitude, location.longitude];
  const now = new Date();
  const nowIso = now.toISOString();
  const reportCutoff = new Date(now.getTime() - LOCAL_CONTEXT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const eventCutoff = new Date(now.getTime() + LOCAL_EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [area, reportsResult, eventsResult] = await Promise.all([
    reverseGeocodeArea(location.latitude, location.longitude),
    supabase.from('reports')
      .select('id,vibe_type,notes,location,latitude,longitude,created_at,emergency,status,resolved,credibility_score,validation_count')
      .gte('created_at', reportCutoff)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('events')
      .select('id,title,description,start_time,end_time,location,category,latitude,longitude,address,organizer,source,updated_at')
      .gte('end_time', nowIso)
      .lte('start_time', eventCutoff)
      .order('start_time', { ascending: true })
      .limit(50),
  ]);

  context.currentArea = area;

  const reports = (reportsResult.data || []).flatMap((report) => {
    const latitude = Number(report.latitude);
    const longitude = Number(report.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const distance = distanceMeters(origin, [latitude, longitude]);
    if (distance > LOCAL_CONTEXT_RADIUS_METERS) return [];
    const tag = clean(report.vibe_type, 60) || 'other';
    const description = clean(report.notes || report.location || 'Community report', 220);
    const verification = Number(report.validation_count || 0) >= 2 && Number(report.credibility_score || 0) >= 0.65
      ? 'community-verified'
      : 'unverified community report';
    return [{
      tag,
      description,
      distanceMeters: distance,
      reportedAt: clean(report.created_at, 40),
      verificationStatus: verification,
      emergency: Boolean(report.emergency),
      resolved: Boolean(report.resolved),
    }];
  });

  const tagCounts = new Map<string, number>();
  for (const report of reports) {
    tagCounts.set(report.tag, (tagCounts.get(report.tag) || 0) + 1);
  }

  const latestReports = [...reports]
    .sort((a, b) => a.distanceMeters - b.distanceMeters || b.reportedAt.localeCompare(a.reportedAt))
    .slice(0, 6)
    .map((report) => ({
      tag: report.tag,
      description: report.description,
      distanceMeters: report.distanceMeters,
      reportedAt: report.reportedAt,
      verificationStatus: report.verificationStatus,
    }));

  const localVibeSnapshot: LocalVibeSnapshot = {
    radiusMeters: LOCAL_CONTEXT_RADIUS_METERS,
    dataWindowHours: LOCAL_CONTEXT_WINDOW_HOURS,
    reportCount: reports.length,
    emergencyReportCount: reports.filter((report) => report.emergency && !report.resolved).length,
    observedTags: Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count })),
    latestReports,
    dataAsOf: nowIso,
  };

  context.localVibeSnapshot = localVibeSnapshot;
  context.nearbyReports = latestReports;

  const events = (eventsResult.data || []).flatMap((event) => {
    const latitude = Number(event.latitude);
    const longitude = Number(event.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const distance = distanceMeters(origin, [latitude, longitude]);
    if (distance > LOCAL_EVENT_RADIUS_METERS) return [];
    return [{
      title: clean(event.title, 120),
      description: clean(event.description, 240),
      category: clean(event.category, 60),
      location: clean(event.address || String(event.location || ''), 160),
      distanceMeters: distance,
      startTime: clean(event.start_time, 40),
      endTime: clean(event.end_time, 40),
      organizer: clean(event.organizer, 100),
      source: clean(event.source, 80),
      updatedAt: clean(event.updated_at, 40),
    }];
  });

  context.nearbyEvents = events
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime() || a.distanceMeters - b.distanceMeters)
    .slice(0, 8);

  return context;
}
