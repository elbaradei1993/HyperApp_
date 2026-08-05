/* global AudioBuffer, AudioBufferSourceNode, AudioContextState, AudioDestinationNode, GainNode, URL, Blob */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeFunction } = vi.hoisted(() => ({
  invokeFunction: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: invokeFunction },
  },
}));

import { TTSService } from './tts';

type TestVoice = ReturnType<typeof window.speechSynthesis.getVoices>[number];
const createdAudioElements: TestAudio[] = [];

class TestAudio {
  preload = '';
  muted = false;
  src = '';
  volume = 1;
  playbackRate = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onloadedmetadata: (() => void) | null = null;
  duration = 0.1;
  setAttribute = vi.fn();
  pause = vi.fn();
  load = vi.fn();
  play = vi.fn(() => {
    void Promise.resolve().then(() => this.onended?.());
    return Promise.resolve();
  });

  constructor() {
    createdAudioElements.push(this);
  }
}

describe('TTSService', () => {
  beforeEach(() => {
    invokeFunction.mockReset();
    createdAudioElements.length = 0;
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:hosted-voice'),
      revokeObjectURL: vi.fn(),
    });
    Object.defineProperty(window, 'Audio', {
      configurable: true,
      value: TestAudio,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('plays hosted neural audio and caches repeated replies', async () => {
    // supabase-js preserves binary function responses as octet-stream Blobs.
    const audioBlob = new Blob([
      new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
      ]),
    ], { type: 'application/octet-stream' });
    invokeFunction.mockResolvedValue({ data: audioBlob, error: null });
    const browserSpeak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: browserSpeak,
        cancel: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const service = new TTSService();
    await service.speak('A natural hosted reply.');
    await service.speak('A natural hosted reply.');

    expect(invokeFunction).toHaveBeenCalledTimes(1);
    expect(invokeFunction).toHaveBeenCalledWith('hyper-tts', {
      body: { text: 'A natural hosted reply.', language: 'en' },
    });
    expect(browserSpeak).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect((vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).type).toBe('audio/wav');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('falls back to the best natural browser voice when hosted audio is unavailable', async () => {
    invokeFunction.mockResolvedValue({ data: null, error: new Error('Not configured') });

    class TestUtterance {
      text: string;
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: TestVoice | null = null;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(value: string) {
        this.text = value;
      }
    }
    const speak = vi.fn((utterance: TestUtterance) => {
      void Promise.resolve().then(() => {
        utterance.onstart?.();
        utterance.onend?.();
      });
    });
    const voices = [
      { name: 'Microsoft David Desktop', lang: 'en-US', localService: true },
      { name: 'Microsoft Aria Online (Natural)', lang: 'en-US', localService: false },
    ] as TestVoice[];
    const speechSynthesis = {
      speak,
      cancel: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => voices),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as typeof window.speechSynthesis;

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speechSynthesis,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: TestUtterance,
    });
    const service = new TTSService();
    await service.speak('  Natural fallback reply.  ');

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Natural fallback reply.');
    expect(speak.mock.calls[0][0].voice?.name).toContain('Aria');
  });

  it('uses a user-unlocked Web Audio context for delayed iPhone playback', async () => {
    const audioBlob = new Blob(['mp3-data'], { type: 'audio/mpeg' });
    Object.defineProperty(audioBlob, 'arrayBuffer', {
      configurable: true,
      value: vi.fn(async () => new ArrayBuffer(8)),
    });
    invokeFunction.mockResolvedValue({ data: audioBlob, error: null });

    const sources: Array<{
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      playbackRate: { value: number };
    }> = [];
    const decodeAudioData = vi.fn(async () => ({ duration: 0.1 } as AudioBuffer));

    class TestAudioContext {
      state: AudioContextState = 'suspended';
      sampleRate = 44100;
      destination = {} as AudioDestinationNode;
      resume = vi.fn(async () => {
        this.state = 'running';
      });
      createBuffer = vi.fn(() => ({} as AudioBuffer));
      decodeAudioData = decodeAudioData;
      createGain = vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      } as unknown as GainNode));
      createBufferSource = vi.fn(() => {
        const source = {
          buffer: null,
          playbackRate: { value: 1 },
          onended: null as (() => void) | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        source.start.mockImplementation(() => {
          void Promise.resolve().then(() => source.onended?.());
        });
        source.stop.mockImplementation(() => source.onended?.());
        sources.push(source);
        return source as unknown as AudioBufferSourceNode;
      });
    }

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: TestAudioContext,
    });

    const service = new TTSService();
    await service.unlock();
    await service.speak('This should play on an iPhone.', { speed: 1.1, volume: 0.8 });

    expect(decodeAudioData).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(2);
    expect(sources[1].playbackRate.value).toBe(1.1);
    expect(sources[1].start).toHaveBeenCalledWith(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('uses the iPhone media route and switches the Safari audio session to playback', async () => {
    const audioBlob = new Blob(['mp3-data'], { type: 'audio/mpeg' });
    invokeFunction.mockResolvedValue({ data: audioBlob, error: null });
    const audioSession = { type: 'ambient' };
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    });
    Object.defineProperty(window.navigator, 'audioSession', {
      configurable: true,
      value: audioSession,
    });

    const service = new TTSService();
    await service.speak('Use the iPhone speaker.');

    expect(audioSession.type).toBe('playback');
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('starts the iOS media unlock synchronously before waiting for Web Audio', async () => {
    let finishResume: (() => void) | undefined;
    const resumePromise = new Promise<void>((resolve) => {
      finishResume = resolve;
    });

    class DelayedAudioContext {
      state: AudioContextState = 'suspended';
      sampleRate = 44100;
      destination = {} as AudioDestinationNode;
      resume = vi.fn(() => resumePromise.then(() => {
        this.state = 'running';
      }));
      close = vi.fn(async () => undefined);
      createBuffer = vi.fn(() => ({} as AudioBuffer));
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      } as unknown as AudioBufferSourceNode));
    }
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: DelayedAudioContext,
    });

    const service = new TTSService();
    const unlockPromise = service.unlock();

    expect(createdAudioElements[0].play).toHaveBeenCalledTimes(1);
    finishResume?.();
    await unlockPromise;
  });
});
