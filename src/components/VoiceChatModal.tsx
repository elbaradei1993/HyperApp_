import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  MessageCircle,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  buildHyperAppContext,
  DEFAULT_ASSISTANT_ACTIONS,
  isLocationContextStale,
} from '../services/ai/contextBuilder';
import { conversationEngine, generateAssistantResponse } from '../services/ai/conversationEngine';
import { conversationRepository } from '../services/ai/conversationRepository';
import type {
  AssistantActionType,
  ConversationMessage,
  ConversationState,
  SuggestedAction,
  UserPreference,
} from '../services/ai/types';
import { guardianService } from '../services/guardian';
import { reportsService } from '../services/reports';
import { ttsService } from '../services/tts';
import type { Report } from '../types';

import { Modal, LoadingSpinner } from './shared';
import './VoiceChatModal.css';

const AI_PRIMARY = '#7065f0';
const AI_SECONDARY = '#38cfc3';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: [number, number] | null;
  locationCapturedAt?: string;
  locationPermissionStatus?: 'granted' | 'denied' | 'prompt' | 'unavailable';
  onNavigate: (tab: 'map' | 'reports') => void;
  onNewReport: () => void;
}

interface SpeechRecognitionResultEventLike {
  results: ArrayLike<{ 0: { transcript: string } }>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  // eslint-disable-next-line no-unused-vars
  onresult: ((_event: SpeechRecognitionResultEventLike) => void) | null;
  // eslint-disable-next-line no-unused-vars
  onerror: ((_event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

const StatusAnimation: React.FC<{ state: VoiceState }> = ({ state }) => {
  if (state === 'processing') return <LoadingSpinner size="sm" />;
  if (state === 'recording') return <Mic size={27} color={AI_SECONDARY} />;
  if (state === 'speaking') return <Volume2 size={27} color={AI_SECONDARY} />;
  if (state === 'error') return <AlertTriangle size={27} color="#ef4444" />;
  return <Sparkles size={27} color={AI_PRIMARY} />;
};

function formatMessageTime(timestamp: string, locale: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  locationCapturedAt,
  locationPermissionStatus,
  onNavigate,
  onNewReport,
}) => {
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { i18n } = useTranslation();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [draft, setDraft] = useState('');
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [guardianCount, setGuardianCount] = useState(0);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [completedActions, setCompletedActions] = useState<AssistantActionType[]>([]);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [showDataControls, setShowDataControls] = useState(false);
  const [isTestingSound, setIsTestingSound] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const conversationRef = useRef<ConversationState | null>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const isOpenRef = useRef(isOpen);
  const handsFreeRef = useRef(false);
  const listeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const generationControllerRef = useRef<AbortController | null>(null);
  const voiceStateRef = useRef<VoiceState>('idle');
  const processingRef = useRef(false);

  const transitionVoiceState = useCallback((state: VoiceState) => {
    voiceStateRef.current = state;
    processingRef.current = state === 'processing';
    setVoiceState(state);
  }, []);

  const locale = i18n.language || user?.language || 'en';
  const messages = conversation?.recentMessages || [];
  const isProcessing = voiceState === 'processing';
  const isSpeaking = voiceState === 'speaking';
  const availableActions = useMemo(() => DEFAULT_ASSISTANT_ACTIONS.filter((action) => (
    !(action.type === 'SHARE_LOCATION' && settings.locationSharing)
  )), [settings.locationSharing]);

  const appContext = useMemo(() => buildHyperAppContext({
    currentScreen: 'dashboard',
    locale,
    preferredLanguage: user?.language || locale,
    userLocation,
    locationCapturedAt,
    locationPermissionStatus: locationPermissionStatus || (userLocation ? 'granted' : 'unavailable'),
    nearbyReports,
    guardianCount,
    availableAppActions: availableActions,
  }), [
    availableActions,
    guardianCount,
    locale,
    locationCapturedAt,
    locationPermissionStatus,
    nearbyReports,
    user?.language,
    userLocation,
  ]);

  const preferences = useMemo<UserPreference[]>(() => {
    const now = new Date().toISOString();
    return [
      ...(user?.first_name ? [{ key: 'preferred_name', value: user.first_name, source: 'profile' as const, updatedAt: now }] : []),
      { key: 'preferred_language', value: user?.language || locale, source: 'profile', updatedAt: now },
      { key: 'location_sharing', value: String(settings.locationSharing), source: 'app_setting', updatedAt: now },
    ];
  }, [locale, settings.locationSharing, user?.first_name, user?.language]);

  const updateConversation = useCallback((state: ConversationState) => {
    conversationRef.current = state;
    setConversation(state);
  }, []);

  useEffect(() => {
    if (!isOpen || !user?.id) return undefined;
    let active = true;
    isOpenRef.current = true;
    setIsLoadingConversation(true);
    setErrorMessage('');

    const initialize = async () => {
      const bounds = userLocation ? {
        northEast: [userLocation[0] + 0.02, userLocation[1] + 0.02] as [number, number],
        southWest: [userLocation[0] - 0.02, userLocation[1] - 0.02] as [number, number],
      } : undefined;
      const [reports, guardians] = await Promise.all([
        bounds ? reportsService.getReports({ bounds, limit: 50 }).catch(() => []) : Promise.resolve([]),
        guardianService.getUserGuardians(user.id).catch(() => []),
      ]);
      if (!active) return;
      setNearbyReports(reports);
      setGuardianCount(guardians.length);
      const initialContext = buildHyperAppContext({
        currentScreen: 'dashboard',
        locale,
        preferredLanguage: user.language || locale,
        userLocation,
        locationCapturedAt,
        locationPermissionStatus: locationPermissionStatus || (userLocation ? 'granted' : 'unavailable'),
        nearbyReports: reports,
        guardianCount: guardians.length,
        availableAppActions: availableActions,
      });
      const state = await conversationEngine.initialize(user.id, initialContext, preferences, true);
      if (active) updateConversation(state);
    };

    void initialize().finally(() => active && setIsLoadingConversation(false));
    void ttsService.prepare();
    return () => {
      active = false;
      isOpenRef.current = false;
      generationControllerRef.current?.abort();
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      recognitionRef.current?.abort();
      ttsService.stop();
    };
  }, [
    isOpen,
    availableActions,
    locale,
    locationCapturedAt,
    locationPermissionStatus,
    preferences,
    updateConversation,
    user?.id,
    user?.language,
    userLocation,
  ]);

  useEffect(() => {
    if (!conversationListRef.current || !isNearBottomRef.current) return;
    const list = conversationListRef.current;
    if (typeof list.scrollTo === 'function') {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    } else {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, voiceState]);

  const scheduleListeningRestart = useCallback((delayMs = 250) => {
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      const recognition = recognitionRef.current;
      if (!recognition || !handsFreeRef.current || !isOpenRef.current || listeningRef.current) return;
      try {
        ttsService.prepareForListening();
        listeningRef.current = true;
        transitionVoiceState('recording');
        recognition.start();
      } catch {
        scheduleListeningRestart(500);
      }
    }, delayMs);
  }, [transitionVoiceState]);

  const speakText = useCallback(async (text: string) => {
    if (!isTTSEnabled) {
      transitionVoiceState('idle');
      if (handsFreeRef.current) scheduleListeningRestart();
      return;
    }
    try {
      transitionVoiceState('speaking');
      await ttsService.speak(text, { speed: 1.02, pitch: 1.02, volume: 1 });
    } catch {
      setErrorMessage('The response is shown, but audio playback was unavailable.');
    } finally {
      transitionVoiceState('idle');
      if (handsFreeRef.current) scheduleListeningRestart();
    }
  }, [isTTSEnabled, scheduleListeningRestart, transitionVoiceState]);

  const processMessage = useCallback(async (text: string, retryMessageId?: string) => {
    const state = conversationRef.current;
    if (!user?.id || !state || processingRef.current) return;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;

    const generationController = new AbortController();
    generationControllerRef.current = generationController;
    transitionVoiceState('processing');
    setErrorMessage('');
    setSuggestedActions([]);
    listeningRef.current = false;
    recognitionRef.current?.abort();
    try {
      const pendingTurn = generateAssistantResponse({
        conversationId: state.conversationId,
        userMessage: cleaned,
        userId: user.id,
        appContext,
        signal: generationController.signal,
        retryMessageId,
      });
      const pendingState = conversationEngine.getState(state.conversationId);
      if (pendingState) updateConversation(pendingState);
      const result = await pendingTurn;
      updateConversation(result.state);
      setSuggestedActions(result.response.suggestedActions);
      await speakText(result.response.message);
    } catch (error) {
      const latestState = conversationEngine.getState(state.conversationId);
      if (latestState) updateConversation(latestState);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setErrorMessage('Generation stopped. You can retry the message.');
        transitionVoiceState('idle');
      } else {
        setErrorMessage(error instanceof Error
          ? error.message
          : 'I couldn’t generate a response right now. Your previous messages are still available. Try again.');
        transitionVoiceState('error');
      }
    } finally {
      generationControllerRef.current = null;
    }
  }, [appContext, speakText, transitionVoiceState, updateConversation, user?.id]);

  useEffect(() => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!isOpen || !SpeechRecognition) return undefined;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = user?.language === 'ar' ? 'ar' : 'en-US';
    recognition.onresult = (event) => {
      listeningRef.current = false;
      void processMessage(event.results[0][0].transcript);
    };
    recognition.onerror = (event) => {
      listeningRef.current = false;
      if (event.error === 'aborted') return;
      const permissionError = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      setErrorMessage(permissionError
        ? 'Microphone access is unavailable. You can still type your message.'
        : 'I could not hear that clearly. Tap Start conversation and try again.');
      handsFreeRef.current = false;
      setIsHandsFreeMode(false);
      transitionVoiceState('error');
    };
    recognition.onend = () => {
      listeningRef.current = false;
      if (handsFreeRef.current && voiceStateRef.current === 'recording') scheduleListeningRestart(350);
    };
    recognitionRef.current = recognition;
    return () => {
      recognition.abort();
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
  }, [isOpen, processMessage, scheduleListeningRestart, transitionVoiceState, user?.language]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const pause = () => {
      if (document.visibilityState !== 'hidden') return;
      handsFreeRef.current = false;
      setIsHandsFreeMode(false);
      recognitionRef.current?.abort();
      ttsService.stop();
      transitionVoiceState('idle');
    };
    const resume = () => document.visibilityState === 'visible' && ttsService.resetAudioOutput();
    document.addEventListener('visibilitychange', pause);
    window.addEventListener('pageshow', resume);
    return () => {
      document.removeEventListener('visibilitychange', pause);
      window.removeEventListener('pageshow', resume);
    };
  }, [isOpen, transitionVoiceState]);

  const submitDraft = () => {
    if (!draft.trim() || isProcessing) return;
    if (isTTSEnabled) void ttsService.unlock();
    const value = draft;
    setDraft('');
    void processMessage(value);
  };

  const startHandsFree = () => {
    if (!recognitionRef.current) {
      setErrorMessage('Voice input is not supported by this browser. You can still type, and voice responses can still play.');
      return;
    }
    handsFreeRef.current = true;
    setIsHandsFreeMode(true);
    void ttsService.unlock(true).finally(() => scheduleListeningRestart(0));
  };

  const stopHandsFree = () => {
    handsFreeRef.current = false;
    setIsHandsFreeMode(false);
    recognitionRef.current?.abort();
    ttsService.stop();
    ttsService.releaseAudioSession();
    transitionVoiceState('idle');
  };

  const testSound = async () => {
    if (isTestingSound) return;
    setIsTestingSound(true);
    setErrorMessage('');
    try {
      await ttsService.unlock(true);
      await ttsService.speak('Hyper AI voice is ready.', { speed: 1, pitch: 1, volume: 1 });
    } catch {
      setErrorMessage('Audio could not play. Check that the phone is not muted, raise media volume, then tap Test sound again.');
    } finally {
      setIsTestingSound(false);
    }
  };

  const startNewConversation = async () => {
    if (!user?.id) return;
    stopHandsFree();
    const state = await conversationEngine.createConversation(
      user.id,
      appContext,
      preferences,
      conversation?.persistenceEnabled ?? true,
    );
    updateConversation(state);
    setSuggestedActions([]);
    setErrorMessage('');
  };

  const deleteCurrentConversation = async () => {
    if (!user?.id || !conversation) return;
    const deleted = await conversationEngine.deleteConversation(user.id, conversation.conversationId);
    if (!deleted) {
      setErrorMessage('The conversation could not be deleted from your account. Try again.');
      return;
    }
    await startNewConversation();
  };

  const clearAllHistory = async () => {
    if (!user?.id) return;
    const cleared = await conversationEngine.clearHistory(user.id);
    if (!cleared) {
      setErrorMessage('Saved AI history could not be cleared. Try again.');
      return;
    }
    await startNewConversation();
  };

  const togglePersistence = async () => {
    if (!conversation) return;
    try {
      updateConversation(await conversationEngine.setPersistence(
        conversation.conversationId,
        !conversation.persistenceEnabled,
      ));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Conversation persistence could not be changed.');
    }
  };

  const runAction = async (action: SuggestedAction) => {
    if (!appContext.availableAppActions.some((available) => available.type === action.type)) return;
    if (action.type === 'OPEN_MAP') {
      onClose();
      onNavigate('map');
    }
    if (action.type === 'OPEN_NEARBY_REPORTS') {
      onClose();
      onNavigate('reports');
    }
    if (action.type === 'REPORT_INCIDENT') {
      onClose();
      onNewReport();
      return;
    }
    if (action.type === 'CALL_EMERGENCY_SERVICES') {
      window.location.assign('tel:911');
      return;
    }
    if (action.type === 'SHARE_LOCATION') {
      try {
        await updateSettings({ locationSharing: true });
      } catch {
        if (conversation) {
          void conversationEngine.recordActionOutcome(conversation.conversationId, action.type, 'failed');
        }
        setErrorMessage('Location sharing did not turn on. Call local emergency services directly if you are in immediate danger.');
        return;
      }
    }
    if (conversation) {
      void conversationEngine.recordActionOutcome(conversation.conversationId, action.type, 'completed');
    }
    setCompletedActions((current) => [...new Set([...current, action.type])]);
  };

  const status = voiceState === 'recording'
    ? ['Listening…', 'Speak now']
    : voiceState === 'processing'
      ? ['Thinking…', 'Using this conversation and current HyperApp context']
      : voiceState === 'speaking'
        ? ['Speaking…', 'Voice response is playing']
        : voiceState === 'error'
          ? ['Response unavailable', errorMessage]
          : ['Ready when you are', messages.length ? 'This conversation has context' : 'Ask about safety or nearby reports'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      overlayClassName="ai-assistant-overlay"
      containerClassName="ai-assistant-modal"
    >
      <section
        className="ai-assistant-shell"
        aria-labelledby="ai-assistant-title"
        aria-busy={isProcessing}
        dir={i18n.dir()}
      >
        <button className="ai-assistant-close" type="button" onClick={onClose} aria-label="Close Hyper AI">
          <X size={18} />
        </button>

        <header className="ai-assistant-header">
          <div className="ai-assistant-brand-row">
            <span className="ai-assistant-brand-mark" aria-hidden="true"><Sparkles size={18} /></span>
            <div><span className="ai-assistant-kicker">Context-aware safety support</span><h2 id="ai-assistant-title">Hyper AI</h2></div>
            <div className="ai-assistant-header-actions">
              <button type="button" onClick={() => void startNewConversation()} aria-label="Start a new conversation" title="New conversation">
                <RotateCcw size={14} />
              </button>
              <button type="button" onClick={() => setShowDataControls((shown) => !shown)} aria-label="Conversation data controls" title="Data controls">
                <Trash2 size={14} />
              </button>
              <span className="ai-assistant-beta">AI</span>
            </div>
          </div>

          <div className={voiceState !== 'idle' ? 'ai-assistant-orb is-active' : 'ai-assistant-orb'}>
            <div className="ai-assistant-orb-inner"><StatusAnimation state={voiceState} /></div>
          </div>
          <div className="ai-assistant-status" role="status" aria-live="polite">
            <strong>{status[0]}</strong><span>{status[1]}</span>
          </div>
        </header>

        <div className="ai-assistant-body">
          {showDataControls && (
            <div className="ai-data-controls">
              <label>
                <input type="checkbox" checked={conversation?.persistenceEnabled ?? true} onChange={() => void togglePersistence()} />
                Save this conversation to my account
              </label>
              <button type="button" onClick={() => void deleteCurrentConversation()}>Delete this conversation</button>
              <button type="button" onClick={() => void clearAllHistory()}>Clear all AI history</button>
            </div>
          )}

          {conversationRepository.hasPersistenceWarning() && (
            <div className="ai-context-warning" role="status">
              This conversation is available on this device, but account sync is temporarily unavailable.
            </div>
          )}
          {isLocationContextStale(appContext) && (
            <div className="ai-context-warning" role="status">
              Location context may be outdated. Open the map to refresh it before relying on nearby information.
            </div>
          )}
          {appContext.approximateLocation?.permissionStatus === 'denied' && (
            <div className="ai-context-warning" role="status">
              Location access is denied. Hyper AI can still help, but it cannot use your current area or nearby reports.
            </div>
          )}

          {messages.length === 0 && !isLoadingConversation && (
            <div className="ai-assistant-suggestions" aria-label="Suggested questions">
              {['What should I set up before going out?', 'Are there recent nearby reports?', 'Help me make a safety plan.'].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => void processMessage(suggestion)} disabled={isProcessing}>{suggestion}</button>
              ))}
            </div>
          )}

          <div
            ref={conversationListRef}
            className="ai-assistant-conversation"
            aria-live="polite"
            onScroll={(event) => {
              const element = event.currentTarget;
              isNearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            }}
          >
            {isLoadingConversation && <div className="ai-message-loading"><LoadingSpinner size="sm" /> Loading conversation…</div>}
            {messages.map((message: ConversationMessage) => (
              <article key={message.id} className={message.role === 'user' ? 'ai-message ai-message--user' : 'ai-message ai-message--assistant'}>
                <span>{message.role === 'assistant' && <Sparkles size={13} />} {message.role === 'user' ? 'You' : 'Hyper AI'}</span>
                <p>{message.content}</p>
                <footer>
                  <time dateTime={message.timestamp}>{formatMessageTime(message.timestamp, locale)}</time>
                  {message.deliveryStatus === 'pending' && <span>Sending…</span>}
                  {message.deliveryStatus === 'failed' && message.role === 'user' && (
                    <button type="button" onClick={() => void processMessage(message.content, message.id)}>Retry</button>
                  )}
                </footer>
              </article>
            ))}
            {isProcessing && (
              <div className="ai-message ai-message--assistant ai-message--thinking" aria-label="Hyper AI is generating a response">
                <span><Sparkles size={13} /> Hyper AI</span><LoadingSpinner size="sm" />
              </div>
            )}
          </div>

          {suggestedActions.length > 0 && (
            <div className="ai-suggested-actions" aria-label="Suggested HyperApp actions">
              {suggestedActions.map((action) => (
                <button
                  key={action.type}
                  type="button"
                  onClick={() => void runAction(action)}
                  disabled={completedActions.includes(action.type)}
                >
                  {completedActions.includes(action.type) ? <Check size={14} /> : <Sparkles size={14} />}
                  {completedActions.includes(action.type) ? `${action.label} completed` : action.label}
                </button>
              ))}
            </div>
          )}

          {errorMessage && <div className="ai-assistant-error" role="alert"><AlertTriangle size={17} /><span>{errorMessage}</span></div>}

          <form className="ai-assistant-composer" onSubmit={(event) => { event.preventDefault(); submitDraft(); }}>
            <MessageCircle size={18} aria-hidden="true" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message Hyper AI…"
              aria-label="Message Hyper AI"
              disabled={isProcessing || isLoadingConversation}
              maxLength={1500}
            />
            <button type="submit" disabled={!draft.trim() || isProcessing || isLoadingConversation} aria-label="Send message">
              {isProcessing ? <LoadingSpinner size="sm" /> : <Send size={17} />}
            </button>
          </form>

          <div className="ai-assistant-controls">
            <button type="button" className={isHandsFreeMode ? 'ai-voice-control is-recording' : 'ai-voice-control'} onClick={isHandsFreeMode ? stopHandsFree : startHandsFree}>
              {isHandsFreeMode ? <MicOff size={17} /> : <Mic size={17} />}
              <span>{isHandsFreeMode ? 'End conversation' : 'Start conversation'}</span>
            </button>
            <button type="button" className="ai-audio-toggle" onClick={() => { setIsTTSEnabled((enabled) => !enabled); ttsService.stop(); }} aria-label={`${isTTSEnabled ? 'Disable' : 'Enable'} voice responses`}>
              {isTTSEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            {isProcessing && (
              <button type="button" className="ai-stop-speaking" onClick={() => conversation && conversationEngine.cancel(conversation.conversationId)}>
                <Square size={13} /> Stop generating
              </button>
            )}
            {isSpeaking && <button type="button" className="ai-stop-speaking" onClick={() => { ttsService.stop(); transitionVoiceState('idle'); }}>Stop audio</button>}
            <button type="button" className="ai-test-sound" onClick={() => void testSound()} disabled={isTestingSound}>
              {isTestingSound ? 'Testing sound...' : 'Test sound'}
            </button>
            <button type="button" className="ai-emergency-action" onClick={() => window.location.assign('tel:911')}>Emergency call</button>
          </div>

          <p className="ai-assistant-disclaimer">Hyper is an AI assistant, not an emergency dispatcher. Community reports may be incomplete or unverified.</p>
        </div>
      </section>
    </Modal>
  );
};

export default VoiceChatModal;
