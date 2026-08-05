/* global HTMLAudioElement, AudioBufferSourceNode, AudioContext, Blob, FileReader, Navigator, URL, Window */
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
const HOSTED_AUDIO_START_TIMEOUT_MS = 8000;
const HOSTED_AUDIO_MAX_PLAYBACK_MS = 60000;
type BrowserVoice = ReturnType<typeof window.speechSynthesis.getVoices>[number];
type AudioContextConstructor = new () => AudioContext;
type WebAudioSessionType = 'auto' | 'ambient' | 'playback' | 'play-and-record';

interface AudioWindow extends Window {
  webkitAudioContext?: AudioContextConstructor;
}

interface NavigatorWithAudioSession extends Navigator {
  audioSession?: {
    type: WebAudioSessionType;
  };
}

function isAppleMobileDevice(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function detectAudioMimeType(bytes: Uint8Array): 'audio/mpeg' | 'audio/wav' | null {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
  ) {
    return 'audio/wav';
  }
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }
  return null;
}

function readBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('Could not read hosted audio.'));
    reader.readAsArrayBuffer(blob);
  });
}

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
  private audioContext: AudioContext | null = null;
  private activeAudioSource: AudioBufferSourceNode | null = null;
  private cancelHostedPlayback: (() => void) | null = null;
  private audioCache = new Map<string, Blob>();
  private requestId = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
    this.audioElement = this.createAudioElement();
  }

  private createAudioElement(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
      return null;
    }
    const audio = new window.Audio();
    audio.preload = 'auto';
    audio.setAttribute?.('playsinline', '');
    audio.setAttribute?.('webkit-playsinline', '');
    return audio;
  }

  async unlock(playConfirmationTone = false): Promise<void> {
    this.speechSynthesis?.resume();
    void this.speechSynthesis?.getVoices();

    // Safari defaults Web Audio to an ambient session, which is inaudible
    // when an iPhone's silent switch is on. A playback session uses the media
    // speaker route and survives the async AI/TTS request that follows.
    this.prepareForPlayback();

    // iOS does not reliably preserve an HTMLMediaElement autoplay grant across
    // the async AI/TTS round trip. Resume Web Audio during the direct tap and
    // keep that context available for the delayed hosted response.
    // Start every permission-sensitive operation before the first await. iOS
    // only treats this synchronous portion as part of the user's tap.
    const audio = this.audioElement || this.createAudioElement();
    this.audioElement = audio;
    let mediaUnlockAttempt: Promise<void> = Promise.resolve();
    if (audio) {
      audio.muted = false;
      audio.src = SILENT_AUDIO_DATA_URI;
      try {
        const attempt = audio.play();
        if (attempt) {
          mediaUnlockAttempt = attempt.then(() => undefined).catch(() => undefined);
        }
      } catch {
        // Web Audio and browser speech remain available as compatibility paths.
      }
    }

    const context = this.getOrCreateAudioContext();
    const contextResumeAttempt = context?.resume().catch(() => undefined) || Promise.resolve();
    if (context) {
      try {
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, context.sampleRate || 44100);
        source.connect(context.destination);
        source.start(0);
        await contextResumeAttempt;
        if (playConfirmationTone && context.state === 'running') {
          await this.playActivationTone(context);
        }
      } catch {
        // The unlocked HTML audio element below remains the compatibility path.
      }
    }

    if (!audio) {
      return;
    }
    await mediaUnlockAttempt;
    audio.pause();
    audio.currentTime = 0;
  }

  resetAudioOutput(): void {
    this.stop();
    const previousContext = this.audioContext;
    this.audioContext = null;
    if (previousContext && previousContext.state !== 'closed') {
      void previousContext.close().catch(() => undefined);
    }
    this.audioElement = this.createAudioElement();
    this.releaseAudioSession();
  }

  prepareForListening(): void {
    this.setAudioSessionType('play-and-record');
  }

  prepareForPlayback(): void {
    this.setAudioSessionType('playback');
  }

  releaseAudioSession(): void {
    this.setAudioSessionType('auto');
  }

  private setAudioSessionType(type: WebAudioSessionType): void {
    if (typeof navigator === 'undefined') {
      return;
    }

    try {
      const audioSession = (navigator as NavigatorWithAudioSession).audioSession;
      if (audioSession) {
        audioSession.type = type;
      }
    } catch {
      // AudioSession is experimental; all other playback paths still work.
    }
  }

  private playActivationTone(context: AudioContext): Promise<void> {
    return new Promise((resolve) => {
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, now);
        oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.075, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        oscillator.connect(gain);
        gain.connect(context.destination);

        let settled = false;
        const finish = () => {
          if (settled) {
            return;
          }
          settled = true;
          window.clearTimeout(timeoutId);
          oscillator.onended = null;
          oscillator.disconnect();
          gain.disconnect();
          resolve();
        };
        const timeoutId = window.setTimeout(finish, 250);
        oscillator.onended = finish;
        oscillator.start(now);
        oscillator.stop(now + 0.11);
      } catch {
        resolve();
      }
    });
  }

  async prepare(): Promise<void> {
    await this.loadVoices();
  }

  private getOrCreateAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }
    if (typeof window === 'undefined') {
      return null;
    }

    const audioWindow = window as AudioWindow;
    const Context = window.AudioContext || audioWindow.webkitAudioContext;
    if (!Context) {
      return null;
    }

    try {
      this.audioContext = new Context();
      return this.audioContext;
    } catch {
      return null;
    }
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    const cleanedText = text.trim();
    if (!cleanedText) {
      return;
    }

    this.stop();
    this.prepareForPlayback();
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
      let audio = data;
      if (data.type === BINARY_AUDIO_CONTENT_TYPE) {
        const audioBuffer = await readBlobArrayBuffer(data);
        const signature = new Uint8Array(audioBuffer, 0, Math.min(12, audioBuffer.byteLength));
        const mimeType = detectAudioMimeType(signature);
        if (!mimeType) {
          throw new Error('Hosted voice returned an unsupported audio format.');
        }
        audio = new Blob([audioBuffer], { type: mimeType });
      }

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

  private async playHostedAudio(blob: Blob, options: TTSOptions, requestId: number): Promise<void> {
    // All iPhone browsers use WebKit. HTML media uses the media speaker route
    // more reliably than Web Audio after speech recognition has used the mic.
    if (isAppleMobileDevice() && this.audioElement) {
      try {
        await this.playHostedAudioWithElement(blob, options, requestId);
        return;
      } catch {
        if (requestId !== this.requestId) {
          return;
        }
        // Keep Web Audio as a second hosted-audio path on older iOS versions.
      }
    }

    if (this.audioContext) {
      try {
        await this.playHostedAudioWithWebAudio(blob, options, requestId);
        return;
      } catch {
        if (requestId !== this.requestId) {
          return;
        }
        // Decode or Web Audio output can still fail on older webviews. The
        // unlocked HTML element remains a safe second hosted-audio path.
      }
    }

    await this.playHostedAudioWithElement(blob, options, requestId);
  }

  private async playHostedAudioWithWebAudio(
    blob: Blob,
    options: TTSOptions,
    requestId: number,
  ): Promise<void> {
    const context = this.audioContext;
    if (!context) {
      throw new Error('Web Audio playback is unavailable on this device.');
    }

    await context.resume();
    if (context.state !== 'running') {
      throw new Error('Web Audio playback is still suspended.');
    }

    const decodedAudio = await context.decodeAudioData(await readBlobArrayBuffer(blob));
    if (requestId !== this.requestId) {
      return;
    }

    const { speed = 1, volume = 1 } = options;
    const playbackRate = Math.max(0.8, Math.min(1.2, speed));
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = decodedAudio;
    source.playbackRate.value = playbackRate;
    gain.gain.value = Math.max(0, Math.min(1, volume));
    source.connect(gain);
    gain.connect(context.destination);
    this.activeAudioSource = source;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(playbackTimeoutId);
        source.onended = null;
        source.disconnect();
        gain.disconnect();
        if (this.activeAudioSource === source) {
          this.activeAudioSource = null;
        }
        this.cancelHostedPlayback = null;
        if (requestId !== this.requestId) {
          resolve();
        } else if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const playbackTimeoutId = window.setTimeout(
        () => finish(new Error('Web Audio playback did not finish.')),
        Math.max(20000, (decodedAudio.duration / playbackRate) * 1000 + 5000),
      );

      this.cancelHostedPlayback = () => {
        try {
          source.stop();
        } catch {
          // A source that already ended can be treated as cancelled.
        }
        finish();
      };
      source.onended = () => finish();
      try {
        source.start(0);
      } catch {
        finish(new Error('Web Audio playback could not start.'));
      }
    });
  }

  private playHostedAudioWithElement(blob: Blob, options: TTSOptions, requestId: number): Promise<void> {
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
    audio.load?.();

    return new Promise((resolve, reject) => {
      let settled = false;
      let playbackTimeoutId = window.setTimeout(
        () => finish(new Error('Hosted voice playback did not start.')),
        HOSTED_AUDIO_START_TIMEOUT_MS,
      );
      const armPlaybackTimeout = () => {
        window.clearTimeout(playbackTimeoutId);
        const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
          ? (audio.duration / audio.playbackRate) * 1000 + 5000
          : 30000;
        playbackTimeoutId = window.setTimeout(
          () => finish(new Error('Hosted voice playback did not finish.')),
          Math.min(HOSTED_AUDIO_MAX_PLAYBACK_MS, Math.max(10000, durationMs)),
        );
      };
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        this.cancelHostedPlayback = null;
        window.clearTimeout(playbackTimeoutId);
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        audio.onloadedmetadata = null;
        URL.revokeObjectURL(objectUrl);
        if (requestId !== this.requestId) {
          resolve();
        } else if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      this.cancelHostedPlayback = () => finish();
      audio.onended = () => finish();
      audio.onerror = () => finish(new Error('Hosted voice playback failed.'));
      audio.onplaying = armPlaybackTimeout;
      audio.onloadedmetadata = armPlaybackTimeout;
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
    this.activeAudioSource = null;
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
