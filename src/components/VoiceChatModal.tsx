import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, AlertTriangle } from 'lucide-react';

import { transcriptionService } from '../services/transcription';
import { reportsService } from '../services/reports';
import { ttsService } from '../services/tts';
import type { Report } from '../types';

import { Modal, Button, LoadingSpinner } from './shared';


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
            backgroundColor: speechDetected ? '#10b981' : '#ef4444',
            borderRadius: '2px',
            transition: 'all 0.2s ease',
            opacity: isActive ? 1 : 0.3,
            boxShadow: speechDetected ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
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
            backgroundColor: '#f59e0b',
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
            backgroundColor: '#10b981',
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

type RecordingState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  userLocation,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setRecordingState('idle');
      setTranscript('');
      setResponse('');
      setErrorMessage('');
      speechSynthesisRef.current = window.speechSynthesis;

      loadNearbyReports();

      // Initialize speech recognition if available
      initializeSpeechRecognition();
    }

    return () => {
      stopRecording();
      stopSpeaking();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen, userLocation]);

  const initializeSpeechRecognition = () => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US'; // Default to English, could be made configurable

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        processTranscript(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
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
          friendlyMessage = 'No speech detected. Please speak clearly into your microphone.';
          break;
        case 'aborted':
          friendlyMessage = 'Speech recognition was interrupted. Please try again.';
          break;
        case 'audio-capture':
          friendlyMessage = 'Microphone error. Please check your audio settings.';
          break;
        case 'service-not-allowed':
          friendlyMessage = 'Speech recognition service unavailable. Please try again later.';
          break;
        }

        setErrorMessage(friendlyMessage);
        setRecordingState('error');
      };

      recognitionRef.current.onend = () => {
        setRecordingState('idle');
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

  const startRecording = async () => {
    setErrorMessage('');
    setTranscript('');
    setResponse('');

    // Try Web Speech API first (faster, no API costs)
    if (recognitionRef.current) {
      try {
        setRecordingState('recording');
        recognitionRef.current.start();
        return;
      } catch (error) {
        console.warn('Web Speech API failed, falling back to MediaRecorder');
      }
    }

    // Fallback to MediaRecorder + Whisper
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processAudioRecording();
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingState('recording');

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (recordingState === 'recording') {
          stopRecording();
        }
      }, 30000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('Could not access microphone. Please check permissions.');
      setRecordingState('error');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && recordingState === 'recording') {
      recognitionRef.current.stop();
    } else if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudioRecording = async () => {
    try {
      setRecordingState('processing');
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      // Validate audio file
      const validation = transcriptionService.validateAudioFile(new File([audioBlob], 'recording.webm'));
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid audio file');
        setRecordingState('error');
        return;
      }

      // Transcribe audio
      const transcriptionResult = await transcriptionService.transcribeAudio(audioBlob);
      const transcriptText = transcriptionResult.text.trim();

      if (!transcriptText) {
        setErrorMessage('Could not understand audio. Please try speaking more clearly.');
        setRecordingState('error');
        return;
      }

      setTranscript(transcriptText);
      await processTranscript(transcriptText);

    } catch (error) {
      console.error('Error processing audio:', error);
      setErrorMessage('Failed to process audio. Please try again.');
      setRecordingState('error');
    }
  };

  const processTranscript = async (transcriptText: string) => {
    try {
      setRecordingState('processing');

      // Provide a simple response since Safety Assistant has been removed
      const simpleResponse = `You said: "${transcriptText}". Voice chat feature is currently unavailable.`;

      setResponse(simpleResponse);
      setRecordingState('speaking');

      // Speak response if TTS is enabled
      if (isTTSEnabled) {
        speakText(simpleResponse);
      } else {
        setRecordingState('idle');
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      setErrorMessage('Failed to process request. Please try again.');
      setRecordingState('error');
    }
  };

  const speakText = async (text: string) => {
    try {
      // Use more human-like speech parameters
      await ttsService.speak(text, {
        speed: 0.75,  // Slower, more natural pace
        pitch: 1.1,   // Slightly higher pitch for more natural sound
        volume: 0.85,  // Good volume level
      });
      setRecordingState('idle');
    } catch (error) {
      console.error('TTS error:', error);
      setRecordingState('idle');
    }
  };

  const stopSpeaking = () => {
    ttsService.stop();
    setRecordingState('idle');
  };

  const getStateDisplay = () => {
    switch (recordingState) {
    case 'recording':
      return {
        text: 'Listening...',
        color: '#ef4444',
        icon: Mic,
        isLoadingSpinner: false,
        description: 'Speak now - I\'m listening',
      };
    case 'processing':
      return {
        text: 'Thinking...',
        color: '#f59e0b',
        icon: null,
        isLoadingSpinner: true,
        description: 'Processing your question',
      };
    case 'speaking':
      return {
        text: 'Speaking...',
        color: '#10b981',
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
        text: 'Tap to speak',
        color: '#6b7280',
        icon: Mic,
        isLoadingSpinner: false,
        description: 'Ask me about safety in your area',
      };
    }
  };

  const stateDisplay = getStateDisplay();
  const StateIcon = stateDisplay.icon;

  const isRecording = recordingState === 'recording';
  const isProcessing = recordingState === 'processing';
  const isSpeaking = recordingState === 'speaking';
  const hasError = recordingState === 'error';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '24px', maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* Animated State Indicator */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${stateDisplay.color}20, ${stateDisplay.color}10)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            border: `3px solid ${stateDisplay.color}40`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Background pulse animation */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `${stateDisplay.color}30`,
              transform: 'translate(-50%, -50%)',
              animation: (isRecording || isProcessing || isSpeaking) ? 'pulse 2s infinite' : 'none',
            }} />

            {/* State-specific animated content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {isRecording ? (
                <ListeningIndicator isActive={true} />
              ) : isProcessing ? (
                <ProcessingIndicator isActive={true} />
              ) : isSpeaking ? (
                <SpeakingIndicator isActive={true} />
              ) : StateIcon ? (
                <StateIcon size={32} color={stateDisplay.color} />
              ) : null}
            </div>
          </div>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: 'var(--text-primary)',
          }}>
            Voice Chat
          </h2>

          <p style={{
            color: stateDisplay.color,
            fontWeight: '600',
            fontSize: '16px',
            marginBottom: '4px',
          }}>
            {stateDisplay.text}
          </p>

          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            margin: 0,
          }}>
            {stateDisplay.description}
          </p>

          {/* Add pulse animation CSS */}
          <style>
            {`
              @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
              }
            `}
          </style>
        </div>

        {/* Recording Controls */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: isRecording ? '#ef4444' : 'var(--accent-primary)',
              border: 'none',
              color: 'white',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: `0 8px 24px ${stateDisplay.color}40`,
              opacity: isProcessing ? 0.6 : 1,
              margin: '0 auto',
            }}
          >
            {isProcessing ? (
              <LoadingSpinner size="lg" />
            ) : isRecording ? (
              <MicOff size={28} />
            ) : (
              <Mic size={28} />
            )}
            <span style={{ fontSize: '12px', fontWeight: '600' }}>
              {isRecording ? 'Stop' : 'Start'}
            </span>
          </button>
        </div>

        {/* Transcript */}
        {transcript && !hasError && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}>
              <MessageCircle size={16} color="var(--text-secondary)" />
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
              }}>
                You said:
              </span>
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontStyle: 'italic',
              color: 'var(--text-primary)',
            }}>
              "{transcript}"
            </div>
          </div>
        )}

        {/* Response */}
        {response && !hasError && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}>
              <Volume2 size={16} color="var(--accent-primary)" />
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--accent-primary)',
              }}>
                Voice Chat:
              </span>
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--accent-primary)',
              color: 'white',
              borderRadius: '8px',
              lineHeight: '1.5',
            }}>
              {response}
            </div>
          </div>
        )}

        {/* Error Message */}
        {hasError && errorMessage && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#dc2626',
            }}>
              <AlertTriangle size={16} />
              <span style={{ fontWeight: '600' }}>Error</span>
            </div>
            <p style={{
              margin: '8px 0 0 0',
              color: '#dc2626',
              fontSize: '14px',
            }}>
              {errorMessage}
            </p>
          </div>
        )}

        {/* TTS Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '24px',
        }}>
          <button
            onClick={() => setIsTTSEnabled(!isTTSEnabled)}
            style={{
              padding: '8px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
            }}
          >
            {isTTSEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Voice responses {isTTSEnabled ? 'enabled' : 'disabled'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {isSpeaking && (
            <Button onClick={stopSpeaking} variant="secondary">
              Stop Speaking
            </Button>
          )}
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VoiceChatModal;
