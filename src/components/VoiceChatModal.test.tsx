import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import VoiceChatModal from './VoiceChatModal';

const mocks = vi.hoisted(() => ({
  askHyperAi: vi.fn(),
  prepare: vi.fn(() => Promise.resolve()),
  speak: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
  unlock: vi.fn(),
}));

vi.mock('../services/hyperAi', () => ({
  askHyperAi: mocks.askHyperAi,
  buildHyperAiReportContext: vi.fn(() => ({ hasLocation: false })),
  createHyperAiMessage: vi.fn((role: 'user' | 'assistant', content: string) => ({
    id: `${role}-${content}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  })),
}));

vi.mock('../services/reports', () => ({
  reportsService: { getReports: vi.fn(() => Promise.resolve([])) },
}));

vi.mock('../services/tts', () => ({
  ttsService: {
    prepare: mocks.prepare,
    speak: mocks.speak,
    stop: mocks.stop,
    unlock: mocks.unlock,
  },
}));

interface MockRecognitionResult {
  results: Array<Array<{ transcript: string }>>;
}

class MockSpeechRecognition {
  static current: MockSpeechRecognition | null = null;

  continuous = false;
  interimResults = false;
  lang = '';
  // eslint-disable-next-line no-unused-vars
  onresult: ((event: MockRecognitionResult) => void) | null = null;
  // eslint-disable-next-line no-unused-vars
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    MockSpeechRecognition.current = this;
  }
}

describe('VoiceChatModal hands-free conversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockSpeechRecognition.current = null;
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: MockSpeechRecognition,
    });
  });

  it('keeps controls visible and listens again after voice playback', async () => {
    // eslint-disable-next-line no-unused-vars
    let resolveAnswer: ((value: { answer: string }) => void) | undefined;
    mocks.askHyperAi.mockReturnValue(new Promise((resolve) => {
      resolveAnswer = resolve;
    }));

    render(<VoiceChatModal isOpen onClose={vi.fn()} userLocation={null} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }));
    const recognition = MockSpeechRecognition.current;
    expect(recognition?.start).toHaveBeenCalledTimes(1);
    expect(mocks.unlock).toHaveBeenCalledTimes(1);

    act(() => {
      recognition?.onresult?.({ results: [[{ transcript: 'What changed nearby?' }]] });
    });

    expect(await screen.findByText('Thinking...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End conversation' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Message Hyper AI' })).toBeTruthy();

    await act(async () => {
      resolveAnswer?.({ answer: 'There are no verified changes nearby.' });
    });

    await waitFor(() => expect(mocks.speak).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(recognition?.start).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(screen.getByRole('button', { name: 'End conversation' })).toBeTruthy();
  });
});
