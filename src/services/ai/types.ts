export type SafetyLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export type MessageRole = 'user' | 'assistant' | 'system';
export type DeliveryStatus = 'pending' | 'sent' | 'failed';
export type MemorySource = 'user_explicit' | 'profile' | 'app_setting';

export type ConversationIntent =
  | 'general_safety'
  | 'nearby_reports'
  | 'decision_support'
  | 'emergency_help'
  | 'guardian_help'
  | 'location_help'
  | 'safety_planning'
  | 'app_help'
  | 'casual';

export type AssistantActionType =
  | 'SHARE_LOCATION'
  | 'START_SAFETY_TIMER'
  | 'CONTACT_GUARDIAN'
  | 'OPEN_NEARBY_REPORTS'
  | 'OPEN_MAP'
  | 'CALL_EMERGENCY_SERVICES'
  | 'SHOW_SAFETY_PLAN'
  | 'CHECK_IN'
  | 'REPORT_INCIDENT'
  | 'NONE';

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  deliveryStatus?: DeliveryStatus;
  safetyLevel?: SafetyLevel;
  referencedMessageId?: string;
}

export interface UserFact {
  id: string;
  key: string;
  value: string;
  sourceMessageId: string;
  createdAt: string;
  status: 'active' | 'superseded' | 'withdrawn';
  replacesFactId?: string;
}

export interface UserPreference {
  key: string;
  value: string;
  source: MemorySource;
  updatedAt: string;
}

export interface UnresolvedTopic {
  id: string;
  type:
    | 'safety_question'
    | 'pending_action'
    | 'missing_information'
    | 'failed_contact'
    | 'location_uncertainty';
  summary: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AssistantAction {
  type: AssistantActionType;
  status: 'suggested' | 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface AppActionDescriptor {
  type: AssistantActionType;
  label: string;
  description?: string;
  requiresConfirmation: boolean;
}

export interface SuggestedAction {
  type: AssistantActionType;
  label: string;
  reason?: string;
  requiresConfirmation: boolean;
}

export interface ProposedMemoryUpdate {
  key: string;
  value: string;
  source: MemorySource;
  reason?: string;
}

export interface ApproximateLocationContext {
  label?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt?: string;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unavailable';
  stale: boolean;
}

export interface HyperAppContext {
  currentScreen?: string;
  locale?: string;
  preferredLanguage?: string;
  currentTime?: string;
  approximateLocation?: ApproximateLocationContext;
  activeSafetySession?: {
    id: string;
    status: string;
    startedAt: string;
    expectedEndAt?: string;
  };
  guardianNetwork?: {
    configured: boolean;
    availableGuardianCount?: number;
    activeAlertStatus?: string;
  };
  nearbyReports?: Array<{
    type: string;
    description: string;
    distanceMeters?: number;
    reportedAt: string;
    verificationStatus?: string;
  }>;
  activeEmergencyAction?: {
    type: string;
    status: 'not_started' | 'pending' | 'completed' | 'failed';
  };
  availableAppActions: AppActionDescriptor[];
}

export interface ConversationState {
  conversationId: string;
  userId?: string;
  recentMessages: ConversationMessage[];
  rollingSummary?: string;
  knownFacts: UserFact[];
  userPreferences: UserPreference[];
  unresolvedTopics: UnresolvedTopic[];
  currentIntent?: ConversationIntent;
  previousIntent?: ConversationIntent;
  currentSafetyState: SafetyLevel;
  lastAssistantAction?: AssistantAction;
  lastQuestionsAsked: string[];
  lastActionsSuggested: AssistantActionType[];
  lastAdviceTopics: string[];
  appContext: HyperAppContext;
  persistenceEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantResponse {
  message: string;
  safetyLevel: SafetyLevel;
  suggestedActions: SuggestedAction[];
  requiresImmediateAttention: boolean;
  followUpNeeded: boolean;
  memoryUpdates?: ProposedMemoryUpdate[];
}

export interface GenerateAssistantResponseInput {
  conversationId: string;
  userMessage: string;
  userId: string;
  appContext: HyperAppContext;
  signal?: AbortSignal;
  retryMessageId?: string;
}

export interface ConversationTurnResult {
  response: AssistantResponse;
  state: ConversationState;
  assistantMessage: ConversationMessage;
}

export interface ContextWindow {
  recentMessages: ConversationMessage[];
  rollingSummary?: string;
  omittedMessages: ConversationMessage[];
  characterCount: number;
}
