import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

type SafetyLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export interface DeviceLocationHint {
  latitude: number;
  longitude: number;
  capturedAt?: string;
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

const AVAILABLE_ACTIONS = [
  { type: 'OPEN_MAP', label: 'Open map', requiresConfirmation: false },
  { type: 'OPEN_NEARBY_REPORTS', label: 'View nearby reports', requiresConfirmation: false },
  { type: 'REPORT_INCIDENT', label: 'Report an incident', requiresConfirmation: true },
  { type: 'CALL_EMERGENCY_SERVICES', label: 'Call emergency services', requiresConfirmation: true },
];

function clean(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/[\\u0000-\\u001f\\u007f]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, max)
    : '';
}

function compact(value: string): string {
  return value.replace(/\\s+/g, ' ').trim();
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
    const location = text.match(/\\b(?:i am|i'm|we are|we're)\\s+(?:at|near|in)\\s+([^.!?]{2,100})/i)?.[1];
    if (location) facts.set('current_location', {
      key: 'current_location',
      value: clean(location, 180),
      createdAt: message.created_at,
    });
    if (/\\b(i am|i'm) alone\\b/i.test(text)) facts.set('companionship', {
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
  if (/\\b(i am safe now|i'm safe now|we are safe now|got away|they left)\\b/i.test(latest.content)) return [];
  if (/\\b(they did not answer|they didn't answer|cannot reach|can't reach|no one answered)\\b/i.test(latest.content)) {
    return [{ type: 'failed_contact', summary: clean(latest.content, 220), createdAt: latest.created_at }];
  }
  if (/\\b(where|location|station|near )\\b/i.test(latest.content)) {
    return [{ type: 'location_uncertainty', summary: clean(latest.content, 220), createdAt: latest.created_at }];
  }
  return [];
}

function lastQuestions(messages: Array<{ role: string; content: string }>): string[] {
  return messages
    .filter((item) => item.role === 'assistant')
    .flatMap((item) => item.content.match(/[^?]{3,180}\\?/g) || [])
    .map(compact)
    .slice(-8);
}

function lastAdviceTopics(messages: Array<{ role: string; content: string }>): string[] {
  const patterns: Array<[string, RegExp]> = [
    ['staffed_place', /\\b(staffed|populated|well-lit|secure place)\\b/i],
    ['emergency_services', /\\bemergency services\\b/i],
    ['nearby_reports', /\\bnearby reports?\\b/i],
    ['avoid_confrontation', /\\b(do not|don't) confront\\b/i],
  ];
  const result: string[] = [];
  for (const item of messages.filter((item) => item.role === 'assistant')) {
    for (const [topic, pattern] of patterns) {
      if (pattern.test(item.content) && !result.includes(topic)) result.push(topic);
    }
  }
  return result.slice(-8);
}

function rollingSummary(messages: Array<{ role: string; content: string }>): string {
  if (messages.length <= RECENT_MESSAGES) return '';
  const lines = messages.slice(0, -RECENT_MESSAGES).map((item) => {
    const body = compact(item.content).slice(0, 320);
    return body ? (item.role === 'user' ? 'User: ' : 'Hyper: ') + body : '';
  }).filter(Boolean);
  let result = '';
  for (const line of lines) {
    const next = result ? result + '\\n' + line : line;
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

  const { data: memories } = await supabase
    .from('ai_user_memories')
    .select('memory_key,memory_value,source')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);

  const durablePreferences = (memories || []).flatMap((row) => {
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
    currentSafetyState: ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'].includes(String(conversation.current_safety_level))
      ? conversation.current_safety_level as SafetyLevel
      : 'LOW',
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
      }
      : { permissionStatus: 'unavailable', stale: false },
    availableAppActions: AVAILABLE_ACTIONS,
    nearbyReports: [],
  };

  if (!location || location.stale) return context;

  const origin: [number, number] = [location.latitude, location.longitude];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const [vibesResult, hazardsResult] = await Promise.all([
    supabase.from('vibe_reports')
      .select('id,tag,created_at,spot_id,reporter_lat,reporter_lng')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase.from('hazard_reports')
      .select('id,spot_id,created_at,expires_at,resolved')
      .eq('resolved', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  const vibes = vibesResult.data || [];
  const hazards = hazardsResult.data || [];
  const spotIds = Array.from(new Set([
    ...vibes.map((item) => Number(item.spot_id)).filter(Number.isFinite),
    ...hazards.map((item) => Number(item.spot_id)).filter(Number.isFinite),
  ]));

  const spotMap = new Map<number, { name: string; location: string; lat: number; lng: number }>();
  if (spotIds.length) {
    const { data: spots } = await supabase.from('spots')
      .select('id,name,location,lat,lng')
      .in('id', spotIds);
    for (const spot of spots || []) {
      if (Number.isFinite(Number(spot.lat)) && Number.isFinite(Number(spot.lng))) {
        spotMap.set(Number(spot.id), {
          name: clean(spot.name, 100),
          location: clean(spot.location, 120),
          lat: Number(spot.lat),
          lng: Number(spot.lng),
        });
      }
    }
  }

  const reports = [
    ...vibes.flatMap((report) => {
      const spot = spotMap.get(Number(report.spot_id));
      const lat = Number.isFinite(Number(report.reporter_lat)) ? Number(report.reporter_lat) : spot?.lat;
      const lng = Number.isFinite(Number(report.reporter_lng)) ? Number(report.reporter_lng) : spot?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      const distance = distanceMeters(origin, [lat, lng]);
      if (distance > 5_000) return [];
      const tag = clean(report.tag, 60) || 'community report';
      const label = spot?.name || spot?.location;
      return [{
        type: tag,
        description: label ? tag + ' reported at ' + label : tag + ' community report',
        distanceMeters: distance,
        reportedAt: clean(report.created_at, 40),
        verificationStatus: 'unverified community report',
      }];
    }),
    ...hazards.flatMap((report) => {
      const spot = spotMap.get(Number(report.spot_id));
      if (!spot) return [];
      const distance = distanceMeters(origin, [spot.lat, spot.lng]);
      if (distance > 5_000) return [];
      return [{
        type: 'hazard',
        description: 'Active hazard report at ' + (spot.name || spot.location || 'a nearby spot'),
        distanceMeters: distance,
        reportedAt: clean(report.created_at, 40),
        verificationStatus: 'unverified community report',
      }];
    }),
  ]
    .sort((a, b) => a.distanceMeters - b.distanceMeters || b.reportedAt.localeCompare(a.reportedAt))
    .slice(0, 6);

  context.nearbyReports = reports;
  return context;
}
