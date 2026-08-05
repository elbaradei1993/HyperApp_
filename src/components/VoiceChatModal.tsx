import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, MessageCircle, Mic, MicOff, RotateCcw, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';

import {
  askHyperAi,
  buildHyperAiReportContext,
  createHyperAiMessage,
  type HyperAiMessage,
} from '../services/hyperAi';
import { reportsService } from '../services/reports';
import { ttsService } from '../services/tts';
import type { Report } from '../types';

import { Modal, LoadingSpinner } from './shared';
import './VoiceChatModal.css';

const AI_PRIMARY = '#7065f0';
const AI_SECONDARY = '#38cfc3';
const CONVERSATION_STORAGE_KEY = 'hyper-ai-conversation-v2';

function loadStoredConversation(): HyperAiMessage[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(CONVERSATION_STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((message) => (
        message &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string'
      ))
      .slice(-20);
  } catch {
    return [];
  }
}


// Animated Listening Indicator Component with Speech Detection
const ListeningIndicator: React.FC<{ isActive: boolean; speechDetected?: boolean }> = ({ isActive, speechDetected = false }) => {
  const [bars, setBars] = useState([0.2, 0.4, 0.6, 0.8, 0.6, 0.4, 0.2]);
  const [intensity, setIntensity] = useState(1);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    // Increase intensity when speech is detected
    setIntensity(speechDetected ? 1.5 : 1);

    const interval = setInterval(() => {
      setBars(prev => prev.map((_, i) => {
        // Create wave-like animation with speech detection boost
        const time = Date.now() * 0.005;
        const baseHeight = 0.2 + 0.8 * Math.sin(time + i * 0.5) ** 2;
        return Math.min(1, baseHeight * intensity);
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, speechDetected, intensity]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      height: '40px',
    }}>
      {bars.map((height, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: `${height * 40}px`,
            backgroundColor: speechDetected ? AI_SECONDARY : AI_PRIMARY,
            borderRadius: '2px',
            transition: 'all 0.2s ease',
            opacity: isActive ? 1 : 0.3,
            boxShadow: speechDetected ? '0 0 10px rgba(56, 207, 195, 0.62)' : 'none',
          }}
        />
      ))}
    </div>
  );
};

// Animated Processing Indicator Component
const ProcessingIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [dots, setDots] = useState([0, 0, 0]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => prev.map((_, i) => {
        const time = Date.now() * 0.008;
        return Math.sin(time + i * 2) * 0.5 + 0.5;
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      height: '40px',
    }}>
      {dots.map((opacity, i) => (
        <div
          key={i}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: i === 1 ? AI_SECONDARY : AI_PRIMARY,
            opacity: isActive ? opacity : 0.3,
            transition: 'opacity 0.3s ease',
            animation: isActive ? `bounce 1.4s ease-in-out ${i * 0.16}s infinite both` : 'none',
          }}
        />
      ))}
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

// Animated Speaking Indicator Component
const SpeakingIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [waveform, setWaveform] = useState([0.3, 0.7, 0.5, 0.9, 0.2, 0.8, 0.4, 0.6]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setWaveform(prev => prev.map((_, i) => {
        // Create dynamic waveform animation
        const time = Date.now() * 0.01;
        const baseHeight = 0.3 + Math.sin(time * 0.5 + i * 0.3) * 0.3;
        const variation = Math.sin(time * 2 + i * 0.7) * 0.2;
        return Math.max(0.1, Math.min(1, baseHeight + variation));
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1px',
      height: '40px',
    }}>
      {waveform.map((height, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${height * 35}px`,
            backgroundColor: i % 2 === 0 ? AI_PRIMARY : AI_SECONDARY,
            borderRadius: '1px',
            transition: 'height 0.05s ease',
            opacity: isActive ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
};

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: [number, number] | null;
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
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type RecordingState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  userLocation,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<HyperAiMessage[]>(loadStoredConversation);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const conversationEndRef = useRef<React.ElementRef<'div'> | null>(null);
  const messagesRef = useRef<HyperAiMessage[]>(messages);
  const recordingStateRef = useRef<RecordingState>('idle');
  const handsFreeRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const isListeningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);

  const setVoiceState = (nextState: RecordingState) => {
    recordingStateRef.current = nextState;
    setRecordingState(nextState);
  };

  useEffect(() => {
    messagesRef.current = messages;
    try {
      window.sessionStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // Conversation memory remains available in React state when storage is restricted.
    }
    conversationEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      handsFreeRef.current = false;
      setIsHandsFreeMode(false);
      setVoiceState('idle');
      setDraft('');
      setErrorMessage('');
      loadNearbyReports();
      void ttsService.prepare();

      // Initialize speech recognition if available
      initializeSpeechRecognition();
    }

    return () => {
      isOpenRef.current = false;
      handsFreeRef.current = false;
      isListeningRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      ttsService.stop();
    };
  }, [isOpen, userLocation]);

  const initializeSpeechRecognition = () => {
    // Check for Web Speech API support
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US'; // Default to English, could be made configurable

      recognitionRef.current.onresult = (event) => {
        isListeningRef.current = false;
        const transcript = event.results[0][0].transcript;
        void processTranscript(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        isListeningRef.current = false;
        if (event.error === 'aborted') {
          return;
        }
        if (event.error === 'no-speech' && handsFreeRef.current) {
          setVoiceState('recording');
          return;
        }

        let friendlyMessage = 'Speech recognition failed. Please try again.';

        // Provide more specific error messages
        switch (event.error) {
        case 'network':
          friendlyMessage = 'Network error. Please check your internet connection.';
          break;
        case 'not-allowed':
          friendlyMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
          break;
        case 'no-speech':
          friendlyMessage = 'I did not hear anything. Tap Start conversation and try again.';
          break;
        case 'audio-capture':
          friendlyMessage = 'Microphone error. Please check your audio settings.';
          break;
        case 'service-not-allowed':
          friendlyMessage = 'Speech recognition service unavailable. Please try again later.';
          break;
        }

        setErrorMessage(friendlyMessage);
        handsFreeRef.current = false;
        setIsHandsFreeMode(false);
        setVoiceState('error');
      };

      recognitionRef.current.onend = () => {
        isListeningRef.current = false;
        if (
          handsFreeRef.current &&
          isOpenRef.current &&
          recordingStateRef.current === 'recording'
        ) {
          scheduleListeningRestart(350);
        }
      };
    }
  };

  const loadNearbyReports = async () => {
    if (!userLocation) {
      return;
    }

    try {
      // Get reports within 2km radius for better context
      const bounds = {
        northEast: [userLocation[0] + 0.02, userLocation[1] + 0.02] as [number, number],
        southWest: [userLocation[0] - 0.02, userLocation[1] - 0.02] as [number, number],
      };

      const reports = await reportsService.getReports({ bounds, limit: 200 });
      setNearbyReports(reports);
    } catch (error) {
      console.error('Error loading nearby reports:', error);
    }
  };

  const scheduleListeningRestart = (delayMs = 250) => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
    }
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      beginListening();
    }, delayMs);
  };

  const beginListening = () => {
    setErrorMessage('');
    const recognition = recognitionRef.current;
    if (!recognition) {
      handsFreeRef.current = false;
      setIsHandsFreeMode(false);
      setErrorMessage('Voice input is not supported in this browser. You can still type your question below.');
      setVoiceState('error');
      return;
    }
    if (!handsFreeRef.current || !isOpenRef.current || isListeningRef.current) {
      return;
    }
    if (recordingStateRef.current === 'processing' || recordingStateRef.current === 'speaking') {
      return;
    }

    try {
      ttsService.prepareForListening();
      isListeningRef.current = true;
      setVoiceState('recording');
      recognition.start();
    } catch {
      isListeningRef.current = false;
      scheduleListeningRestart(500);
    }
  };

  const startHandsFreeConversation = () => {
    handsFreeRef.current = true;
    setIsHandsFreeMode(true);
    // On iPhone, activate the speaker from this direct tap before handing the
    // audio session to speech recognition. The short tone also confirms that
    // sound is routed correctly before the first AI response.
    void ttsService.unlock(true).finally(() => beginListening());
  };

  const stopHandsFreeConversation = () => {
    handsFreeRef.current = false;
    setIsHandsFreeMode(false);
    isListeningRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.abort();
    ttsService.stop();
    ttsService.releaseAudioSession();
    setVoiceState('idle');
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const resetAfterResume = () => {
      if (document.visibilityState === 'visible') {
        ttsService.resetAudioOutput();
      }
    };
    const pauseConversation = () => {
      if (document.visibilityState !== 'hidden') {
        return;
      }
      handsFreeRef.current = false;
      setIsHandsFreeMode(false);
      isListeningRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      recognitionRef.current?.abort();
      ttsService.stop();
      ttsService.releaseAudioSession();
      setVoiceState('idle');
    };

    document.addEventListener('visibilitychange', pauseConversation);
    window.addEventListener('pageshow', resetAfterResume);
    return () => {
      document.removeEventListener('visibilitychange', pauseConversation);
      window.removeEventListener('pageshow', resetAfterResume);
    };
  }, [isOpen]);

  const processTranscript = async (transcriptText: string) => {
    const cleanedText = transcriptText.trim();
    if (!cleanedText) {
      return;
    }

    const userMessage = createHyperAiMessage('user', cleanedText);
    const nextMessages = [...messagesRef.current, userMessage].slice(-20);
    messagesRef.current = nextMessages;
    setMessages(nextMessages);

    try {
      setVoiceState('processing');
      if (isListeningRef.current) {
        isListeningRef.current = false;
        recognitionRef.current?.abort();
      }
      setErrorMessage('');

      const reportContext = buildHyperAiReportContext(nearbyReports, Boolean(userLocation));
      const { answer } = await askHyperAi(nextMessages, reportContext);
      setMessages((currentMessages) => {
        const updatedMessages = [
          ...currentMessages,
          createHyperAiMessage('assistant', answer),
        ].slice(-20);
        messagesRef.current = updatedMessages;
        return updatedMessages;
      });
      setVoiceState('speaking');

      if (isTTSEnabled) {
        await speakText(answer);
      } else {
        setVoiceState('idle');
        if (handsFreeRef.current) {
          scheduleListeningRestart();
        }
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      setErrorMessage(error instanceof Error ? error.message : 'I could not process that request. Please try again.');
      setVoiceState('error');
    }
  };

  const speakText = async (text: string) => {
    try {
      // Use more human-like speech parameters
      await ttsService.speak(text, {
        speed: 1.02,
        pitch: 1.02,
        volume: 1,
      });
    } catch (error) {
      console.error('TTS error:', error);
      setErrorMessage('I could not play the voice response, but the answer is shown above.');
    } finally {
      setVoiceState('idle');
      if (handsFreeRef.current) {
        scheduleListeningRestart();
      }
    }
  };

  const stopSpeaking = () => {
    ttsService.stop();
    setVoiceState('idle');
    if (handsFreeRef.current) {
      scheduleListeningRestart();
    }
  };

  const testSound = async () => {
    stopHandsFreeConversation();
    setErrorMessage('');
    setVoiceState('speaking');
    try {
      await ttsService.unlock(true);
      await ttsService.speak('Hyper AI sound is working.', {
        speed: 1.02,
        pitch: 1.02,
        volume: 1,
      });
      setVoiceState('idle');
    } catch (error) {
      console.error('Sound test failed:', error);
      setErrorMessage('Sound is blocked. Turn up media volume, disable Silent Mode, then tap Test sound again.');
      setVoiceState('error');
    }
  };

  const submitPrompt = (prompt: string) => {
    const cleanedPrompt = prompt.trim();
    if (!cleanedPrompt || recordingState === 'processing') {
      return;
    }

    // This handler runs inside the user's click/submit gesture, which is the
    // reliable moment to unlock delayed audio on desktop and mobile browsers.
    if (isTTSEnabled) {
      ttsService.unlock();
    }
    setDraft('');
    void processTranscript(cleanedPrompt);
  };

  const toggleVoicePlayback = () => {
    const nextEnabled = !isTTSEnabled;
    setIsTTSEnabled(nextEnabled);
    if (nextEnabled) {
      ttsService.unlock();
      void ttsService.prepare();
    } else if (recordingStateRef.current === 'speaking') {
      stopSpeaking();
    }
  };

  const startNewConversation = () => {
    stopHandsFreeConversation();
    messagesRef.current = [];
    setMessages([]);
    setDraft('');
    setErrorMessage('');
    try {
      window.sessionStorage.removeItem(CONVERSATION_STORAGE_KEY);
    } catch {
      // Nothing else is required when storage is restricted.
    }
  };

  const getStateDisplay = () => {
    switch (recordingState) {
    case 'recording':
      return {
        text: 'Listening...',
        color: AI_SECONDARY,
        icon: Mic,
        isLoadingSpinner: false,
        description: 'Speak now - I\'m listening',
      };
    case 'processing':
      return {
        text: 'Thinking...',
        color: AI_PRIMARY,
        icon: null,
        isLoadingSpinner: true,
        description: 'Reviewing the conversation and nearby community context',
      };
    case 'speaking':
      return {
        text: 'Speaking...',
        color: AI_SECONDARY,
        icon: Volume2,
        isLoadingSpinner: false,
        description: 'Here\'s what I found',
      };
    case 'error':
      return {
        text: 'Error',
        color: '#ef4444',
        icon: AlertTriangle,
        isLoadingSpinner: false,
        description: errorMessage || 'Something went wrong',
      };
    default:
      return {
        text: isHandsFreeMode ? 'Conversation active' : 'Ready when you are',
        color: AI_PRIMARY,
        icon: Mic,
        isLoadingSpinner: false,
        description: isHandsFreeMode
          ? 'I will listen again after every reply'
          : messages.length > 0
            ? 'I remember this conversation'
            : 'Ask about nearby safety and community reports',
      };
    }
  };

  const stateDisplay = getStateDisplay();
  const StateIcon = stateDisplay.icon;

  const isRecording = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';
  const isSpeaking = recordingState === 'speaking';
  const hasError = recordingState === 'error';

  const suggestions = [
    'How safe is my area?',
    'Are there recent alerts?',
    'How do I submit a report?',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      overlayClassName="ai-assistant-overlay"
      containerClassName="ai-assistant-modal"
    >
      <section className="ai-assistant-shell" aria-labelledby="ai-assistant-title">
        <button className="ai-assistant-close" type="button" onClick={onClose} aria-label="Close Hyper AI">
          <X size={18} />
        </button>

        <header className="ai-assistant-header">
          <div className="ai-assistant-brand-row">
            <span className="ai-assistant-brand-mark" aria-hidden="true"><Sparkles size={18} /></span>
            <div>
              <span className="ai-assistant-kicker">Secure cloud intelligence</span>
              <h2 id="ai-assistant-title">Hyper AI</h2>
            </div>
            <div className="ai-assistant-header-actions">
              {messages.length > 0 && (
                <button type="button" onClick={startNewConversation} aria-label="Start a new conversation" title="New conversation">
                  <RotateCcw size={14} />
                </button>
              )}
              <span className="ai-assistant-beta">Cloud</span>
            </div>
          </div>

          <div className={isRecording || isProcessing || isSpeaking ? 'ai-assistant-orb is-active' : 'ai-assistant-orb'}>
            <div className="ai-assistant-orb-inner">
              {isRecording ? (
                <ListeningIndicator isActive speechDetected />
              ) : isProcessing ? (
                <ProcessingIndicator isActive />
              ) : isSpeaking ? (
                <SpeakingIndicator isActive />
              ) : StateIcon ? (
                <StateIcon size={28} color={stateDisplay.color} />
              ) : null}
            </div>
          </div>

          <div className="ai-assistant-status">
            <strong style={{ color: stateDisplay.color }}>{stateDisplay.text}</strong>
            <span>{stateDisplay.description}</span>
          </div>
        </header>

        <div className="ai-assistant-body">
          {messages.length === 0 && (
            <div className="ai-assistant-suggestions" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => submitPrompt(suggestion)} disabled={isProcessing}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="ai-assistant-conversation" aria-live="polite">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === 'user' ? 'ai-message ai-message--user' : 'ai-message ai-message--assistant'}
                >
                  <span>
                    {message.role === 'assistant' && <Sparkles size={13} />}
                    {message.role === 'user' ? 'You' : 'Hyper AI'}
                  </span>
                  <p>{message.content}</p>
                </div>
              ))}
              {isProcessing && (
                <div className="ai-message ai-message--assistant ai-message--thinking" aria-label="Hyper AI is thinking">
                  <span><Sparkles size={13} /> Hyper AI</span>
                  <ProcessingIndicator isActive />
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>
          )}

          {hasError && errorMessage && (
            <div className="ai-assistant-error" role="alert">
              <AlertTriangle size={17} />
              <div><strong>Something went wrong</strong><span>{errorMessage}</span></div>
            </div>
          )}

          <form
            className="ai-assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              submitPrompt(draft);
            }}
          >
            <MessageCircle size={18} aria-hidden="true" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your area..."
              aria-label="Message Hyper AI"
              disabled={isProcessing}
            />
            <button type="submit" disabled={!draft.trim() || isProcessing} aria-label="Send message">
              {isProcessing ? <LoadingSpinner size="sm" /> : <Send size={17} />}
            </button>
          </form>

          <div className="ai-assistant-controls">
            <button
              type="button"
              className={isHandsFreeMode ? 'ai-voice-control is-recording' : 'ai-voice-control'}
              onClick={isHandsFreeMode ? stopHandsFreeConversation : startHandsFreeConversation}
              aria-pressed={isHandsFreeMode}
            >
              {isHandsFreeMode ? <MicOff size={17} /> : <Mic size={17} />}
              <span>{isHandsFreeMode ? 'End conversation' : 'Start conversation'}</span>
            </button>

            <button
              type="button"
              className="ai-audio-toggle"
              onClick={toggleVoicePlayback}
              aria-pressed={isTTSEnabled}
              aria-label={`${isTTSEnabled ? 'Disable' : 'Enable'} voice responses`}
            >
              {isTTSEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>

            <button
              type="button"
              className="ai-test-sound"
              onClick={() => void testSound()}
              disabled={isProcessing || isSpeaking}
            >
              Test sound
            </button>

            {isSpeaking && (
              <button type="button" className="ai-stop-speaking" onClick={stopSpeaking}>Stop audio</button>
            )}
          </div>

          <p className="ai-assistant-disclaimer">
            Hyper AI uses secure cloud inference and community-provided data, which may be incomplete.
            Contact emergency services for urgent help.
          </p>
        </div>
      </section>
    </Modal>
  );
};

export default VoiceChatModal;
