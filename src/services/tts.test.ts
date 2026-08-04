/* global URL, Blob */
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

class TestAudio {
  preload = '';
  muted = false;
  src = '';
  volume = 1;
  playbackRate = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pause = vi.fn();
  play = vi.fn(() => {
    void Promise.resolve().then(() => this.onended?.());
    return Promise.resolve();
  });
}

describe('TTSService', () => {
  beforeEach(() => {
    invokeFunction.mockReset();
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
    const audioBlob = new Blob(['mp3-data'], { type: 'audio/mpeg' });
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
});
