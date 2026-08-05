export type GuardSafetyLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface SafetyGuardResult {
  minimumLevel: GuardSafetyLevel;
  reasons: string[];
  deescalated: boolean;
  silentModeRecommended: boolean;
}

const LEVEL_ORDER: Record<GuardSafetyLevel, number> = {
  LOW: 0,
  ELEVATED: 1,
  HIGH: 2,
  CRITICAL: 3,
};

const NON_CURRENT_MARKERS = /\b(hypothetical|hypothetically|in a story|in a movie|in a book|the news|yesterday|last year|used to|what if|training exercise)\b/i;
const CURRENT_MARKERS = /\b(now|right now|currently|here|still|just happened|cannot|can't|won't let me)\b/i;
const DEESCALATION = /\b(i am safe now|i'm safe now|we are safe now|reached (?:a )?(?:safe place|store|station)|got away|the (?:person|car|man|woman|threat) left|they left)\b/i;

function isCurrentSituation(text: string): boolean {
  return !NON_CURRENT_MARKERS.test(text) || CURRENT_MARKERS.test(text);
}

export function maxSafetyLevel(
  left: GuardSafetyLevel,
  right: GuardSafetyLevel,
): GuardSafetyLevel {
  return LEVEL_ORDER[left] >= LEVEL_ORDER[right] ? left : right;
}

export function evaluateSafetyRisk(message: string): SafetyGuardResult {
  const text = message.replace(/\s+/g, ' ').trim();
  const reasons: string[] = [];
  const deescalated = DEESCALATION.test(text);
  const current = isCurrentSituation(text);
  let minimumLevel: GuardSafetyLevel = 'LOW';

  if (!current || deescalated) {
    return { minimumLevel, reasons, deescalated, silentModeRecommended: false };
  }

  const notBreathing = /\b(not breathing|stopped breathing|cannot breathe|can't breathe|unconscious and not breathing)\b/i.test(text);
  const severeInjury = /\b(heavy bleeding|bleeding heavily|severe bleeding|arterial bleeding|life[- ]threatening injury)\b/i.test(text);
  const activeAttack = /\b(attacking me|trying to kill me|strangling me|stabbing me|shooting at me|beating me|forcing me into|holding me hostage)\b/i.test(text);
  const occupiedFire = /\b(fire|smoke)\b/i.test(text) && /\b(here|inside|room|house|building|apartment|car)\b/i.test(text);
  const overdose = /\b(overdose|overdosed)\b/i.test(text) && /\b(now|here|not breathing|unconscious|won't wake|will not wake)\b/i.test(text);
  const weaponThreat = /\b(has|holding|pointing|pulled|with)\b.{0,28}\b(gun|knife|weapon)\b/i.test(text)
    && /\b(me|us|threat|toward|at me|outside|following)\b/i.test(text);
  const trapped = /\b(trapped|locked in|won't let me leave|cannot leave|can't leave|forcibly confined)\b/i.test(text);
  const vulnerablePerson = /\b(child|baby|elderly person|vulnerable person)\b/i.test(text)
    && /\b(immediate danger|being attacked|not breathing|trapped|abducted|kidnapped)\b/i.test(text);

  if (activeAttack || notBreathing || occupiedFire || overdose) {
    minimumLevel = 'CRITICAL';
    reasons.push('clear life-threatening danger');
  } else if (severeInjury || weaponThreat || trapped || vulnerablePerson) {
    minimumLevel = 'HIGH';
    reasons.push('credible immediate danger');
  } else {
    const following = /\b(following me|walking behind me|same car came back|crossed when i crossed|waiting outside|still there)\b/i.test(text);
    const failedContact = /\b(they did not answer|they didn't answer|cannot reach|can't reach|no one answered)\b/i.test(text);
    const unsafe = /\b(i feel unsafe|i'm scared|i am scared|suspicious person|someone is watching me)\b/i.test(text);
    if (following || failedContact || unsafe) {
      minimumLevel = 'ELEVATED';
      reasons.push('situation could become dangerous');
    }
  }

  const silentModeRecommended = /\b(cannot safely speak|can't safely speak|do not make noise|quiet or they will hear|hiding from)\b/i.test(text);
  if (silentModeRecommended) {
    minimumLevel = maxSafetyLevel(minimumLevel, 'HIGH');
    reasons.push('speaking may increase danger');
  }

  return { minimumLevel, reasons, deescalated, silentModeRecommended };
}
