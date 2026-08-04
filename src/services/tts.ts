/* global HTMLAudioElement, Blob, URL */
import { supabase } from '../lib/supabase';

export interface TTSOptions {
  speed?: number;
  pitch?: number;
  volume?: number;
}

interface HostedTtsError extends Error {
  context?: {
    clone: () => { json: () => Promise<unknown> };
  };
}

interface HostedTtsErrorBody {
  error?: string;
}

const VOICE_LOAD_TIMEOUT_MS = 1600;
const VOICE_START_TIMEOUT_MS = 5000;
const HOSTED_TTS_TIMEOUT_MS = 18000;
const MAX_SPEECH_CHUNK_LENGTH = 220;
const MAX_AUDIO_CACHE_ENTRIES = 16;
const BINARY_AUDIO_CONTENT_TYPE = 'application/octet-stream';
const SILENT_AUDIO_DATA_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAA=';
type BrowserVoice = ReturnType<typeof window.speechSynthesis.getVoices>[number];

function splitForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [text];
  const chunks: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= MAX_SPEECH_CHUNK_LENGTH) {
      chunks.push(sentence);
      continue;
    }

    const words = sentence.split(/\s+/);
    let chunk = '';
    for (const word of words) {
      const next = chunk ? `${chunk} ${word}` : word;
      if (next.length > MAX_SPEECH_CHUNK_LENGTH && chunk) {
        chunks.push(chunk);
        chunk = word;
      } else {
        chunk = next;
      }
    }
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function scoreVoice(voice: BrowserVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang === 'en-us') {
    score += 45;
  } else if (lang === 'en-ca' || lang === 'en-gb') {
    score += 38;
  } else if (lang.startsWith('en')) {
    score += 25;
  }

  if (/natural|neural/.test(name)) {
    score += 120;
  }
  if (/google us english|google uk english/.test(name)) {
    score += 105;
  }
  if (/premium|enhanced|online/.test(name)) {
    score += 85;
  }
  if (/samantha|ava|aria|jenny|emma|serena|susan/.test(name)) {
    score += 70;
  }
  if (!voice.localService) {
    score += 25;
  }
  if (/david|mark|zira|desktop|compact/.test(name)) {
    score -= 45;
  }

  return score;
}

async function getFunctionErrorMessage(error: HostedTtsError): Promise<string> {
  try {
    const payload = await error.context?.clone().json() as HostedTtsErrorBody | undefined;
    if (payload?.error) {
      return payload.error;
    }
  } catch {
    // A stable client-side fallback is safer than leaking provider diagnostics.
  }
  return error.message || 'Hosted voice is temporarily unavailable.';
}

export class TTSService {
  private speechSynthesis: typeof window.speechSynthesis | null = null;
  private voicesPromise: Promise<BrowserVoice[]> | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private cancelHostedPlayback: (() => void) | null = null;
  private audioCache = new Map<string, Blob>();
  private requestId = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
    if (typeof window !== 'undefined' && typeof window.Audio === 'function') {
      this.audioElement = new window.Audio();
      this.audioElement.preload = 'auto';
    }
  }

  unlock(): void {
    this.speechSynthesis?.resume();
    void this.speechSynthesis?.getVoices();

    const audio = this.audioElement;
    if (!audio) {
      return;
    }
    // The file itself is silent. Keep the element unmuted so iOS/Safari and
    // desktop autoplay policies register this user gesture for later speech.
    audio.muted = false;
    audio.src = SILENT_AUDIO_DATA_URI;
    const unlockAttempt = audio.play();
    if (unlockAttempt) {
      void unlockAttempt.then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => undefined);
    }
  }

  async prepare(): Promise<void> {
    await this.loadVoices();
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const cleanedText = text.trim();
    if (!cleanedText) {
      return;
    }

    this.stop();
    const requestId = this.requestId;

    try {
      const audio = await this.getHostedAudio(cleanedText);
      if (requestId !== this.requestId) {
        return;
      }
      await this.playHostedAudio(audio, options, requestId);
      return;
    } catch {
      if (requestId !== this.requestId) {
        return;
      }
      await this.speakWithBrowser(cleanedText, options, requestId);
    }
  }

  private async getHostedAudio(text: string): Promise<Blob> {
    const cached = this.audioCache.get(text);
    if (cached) {
      this.audioCache.delete(text);
      this.audioCache.set(text, cached);
      return cached;
    }

    let timeoutId: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('Hosted voice took too long to respond.')),
        HOSTED_TTS_TIMEOUT_MS,
      );
    });

    try {
      const invocation = supabase.functions.invoke<Blob>('hyper-tts', {
        body: { text, language: 'en' },
      });
      const { data, error } = await Promise.race([invocation, timeout]);
      if (error) {
        throw new Error(await getFunctionErrorMessage(error as HostedTtsError));
      }
      if (
        !(data instanceof Blob) ||
        data.size === 0 ||
        (!data.type.startsWith('audio/') && data.type !== BINARY_AUDIO_CONTENT_TYPE)
      ) {
        throw new Error('Hosted voice returned invalid audio.');
      }

      // Supabase needs an octet-stream response to preserve the binary body.
      // Restore the real MIME type before handing the object URL to browsers.
      const audio = data.type === BINARY_AUDIO_CONTENT_TYPE
        ? new Blob([data], { type: 'audio/mpeg' })
        : data;

      this.audioCache.set(text, audio);
      while (this.audioCache.size > MAX_AUDIO_CACHE_ENTRIES) {
        const oldestKey = this.audioCache.keys().next().value as string | undefined;
        if (!oldestKey) {
          break;
        }
        this.audioCache.delete(oldestKey);
      }
      return audio;
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  private playHostedAudio(blob: Blob, options: TTSOptions, requestId: number): Promise<void> {
    const audio = this.audioElement;
    if (!audio) {
      return Promise.reject(new Error('Hosted audio playback is unavailable on this device.'));
    }

    const objectUrl = URL.createObjectURL(blob);
    const { speed = 1, volume = 1 } = options;
    audio.muted = false;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.playbackRate = Math.max(0.8, Math.min(1.2, speed));
    audio.src = objectUrl;

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        this.cancelHostedPlayback = null;
        window.clearTimeout(playbackTimeoutId);
        audio.onended = null;
        audio.onerror = null;
        URL.revokeObjectURL(objectUrl);
        if (requestId !== this.requestId) {
          resolve();
        } else if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const playbackTimeoutId = window.setTimeout(
        () => finish(new Error('Hosted voice playback did not finish.')),
        Math.max(20000, blob.size * 3),
      );

      this.cancelHostedPlayback = () => finish();
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('Hosted voice playback failed.'));
      const playAttempt = audio.play();
      if (playAttempt) {
        void playAttempt.catch(() => finish(new Error('Hosted voice playback was blocked.')));
      }
    });
  }

  private async speakWithBrowser(text: string, options: TTSOptions, requestId: number): Promise<void> {
    if (!this.speechSynthesis) {
      throw new Error('Voice playback is unavailable on this device.');
    }

    const voices = await this.loadVoices();
    const preferredVoice = [...voices].sort((left, right) => scoreVoice(right) - scoreVoice(left))[0] || null;

    for (const chunk of splitForSpeech(text)) {
      if (requestId !== this.requestId) {
        return;
      }

      try {
        await this.speakChunk(chunk, preferredVoice, options, requestId);
      } catch (error) {
        if (requestId !== this.requestId) {
          return;
        }
        this.speechSynthesis.cancel();
        this.speechSynthesis.resume();
        await this.speakChunk(chunk, null, options, requestId).catch(() => {
          throw error;
        });
      }
    }
  }

  private loadVoices(): Promise<BrowserVoice[]> {
    if (!this.speechSynthesis) {
      return Promise.resolve([]);
    }

    const available = this.speechSynthesis.getVoices();
    if (available.length > 0) {
      return Promise.resolve(available);
    }
    if (this.voicesPromise) {
      return this.voicesPromise;
    }

    this.voicesPromise = new Promise((resolve) => {
      const synthesis = this.speechSynthesis;
      if (!synthesis) {
        resolve([]);
        return;
      }

      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        synthesis.removeEventListener('voiceschanged', finish);
        window.clearTimeout(timeoutId);
        const voices = synthesis.getVoices();
        if (voices.length === 0) {
          this.voicesPromise = null;
        }
        resolve(voices);
      };
      const timeoutId = window.setTimeout(finish, VOICE_LOAD_TIMEOUT_MS);
      synthesis.addEventListener('voiceschanged', finish, { once: true });
    });

    return this.voicesPromise;
  }

  private speakChunk(
    text: string,
    voice: BrowserVoice | null,
    options: TTSOptions,
    requestId: number,
  ): Promise<void> {
    const synthesis = this.speechSynthesis;
    if (!synthesis) {
      return Promise.reject(new Error('Voice playback is unavailable on this device.'));
    }

    const { speed = 1, pitch = 1, volume = 1 } = options;
    return new Promise((resolve, reject) => {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = Math.max(0.72, Math.min(1.25, speed));
      utterance.pitch = Math.max(0.75, Math.min(1.25, pitch));
      utterance.volume = Math.max(0, Math.min(1, volume));
      if (voice) {
        utterance.voice = voice;
      }

      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(startTimeoutId);
        window.clearTimeout(playbackTimeoutId);
        if (requestId !== this.requestId) {
          resolve();
        } else if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      const startTimeoutId = window.setTimeout(() => {
        synthesis.cancel();
        finish(new Error('Voice playback did not start.'));
      }, VOICE_START_TIMEOUT_MS);
      const estimatedDuration = Math.max(12000, text.split(/\s+/).length * 850);
      const playbackTimeoutId = window.setTimeout(() => {
        synthesis.cancel();
        finish(new Error('Voice playback did not finish.'));
      }, estimatedDuration);

      utterance.onstart = () => window.clearTimeout(startTimeoutId);
      utterance.onend = () => finish();
      utterance.onerror = (event) => finish(new Error(`Voice playback failed: ${event.error}`));

      synthesis.resume();
      synthesis.speak(utterance);
    });
  }

  stop(): void {
    this.requestId += 1;
    this.cancelHostedPlayback?.();
    this.cancelHostedPlayback = null;
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.speechSynthesis?.cancel();
  }

  isReady(): boolean {
    return Boolean(this.audioElement || this.speechSynthesis);
  }

  getAvailableVoices(): string[] {
    return this.speechSynthesis?.getVoices().map((voice) => voice.name || voice.lang) || [];
  }
}

export const ttsService = new TTSService();
export default ttsService;
