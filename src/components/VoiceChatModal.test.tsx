/* global Event */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationState, ConversationTurnResult } from '../services/ai/types';

import VoiceChatModal from './VoiceChatModal';

const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  createConversation: vi.fn(),
  generate: vi.fn(),
  getState: vi.fn(),
  cancel: vi.fn(),
  setPersistence: vi.fn(),
  deleteConversation: vi.fn(),
  clearHistory: vi.fn(),
  recordActionOutcome: vi.fn(),
  updateSettings: vi.fn(),
  prepare: vi.fn(() => Promise.resolve()),
  speak: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
  unlock: vi.fn(() => Promise.resolve()),
  prepareForListening: vi.fn(),
  releaseAudioSession: vi.fn(),
  resetAudioOutput: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en-CA', dir: () => 'ltr' },
  }),
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-a', first_name: 'Fatehi', language: 'en' } }),
}));
vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { locationSharing: false }, updateSettings: mocks.updateSettings }),
}));
vi.mock('../services/ai/conversationEngine', () => ({
  conversationEngine: {
    initialize: mocks.initialize,
    createConversation: mocks.createConversation,
    getState: mocks.getState,
    cancel: mocks.cancel,
    setPersistence: mocks.setPersistence,
    deleteConversation: mocks.deleteConversation,
    clearHistory: mocks.clearHistory,
    recordActionOutcome: mocks.recordActionOutcome,
  },
  generateAssistantResponse: mocks.generate,
}));
vi.mock('../services/ai/conversationRepository', () => ({
  conversationRepository: { hasPersistenceWarning: () => false },
}));
vi.mock('../services/reports', () => ({ reportsService: { getReports: vi.fn(() => Promise.resolve([])) } }));
vi.mock('../services/guardian', () => ({ guardianService: { getUserGuardians: vi.fn(() => Promise.resolve([])) } }));
vi.mock('../services/tts', () => ({
  ttsService: {
    prepare: mocks.prepare,
    speak: mocks.speak,
    stop: mocks.stop,
    unlock: mocks.unlock,
    prepareForListening: mocks.prepareForListening,
    prepareForPlayback: vi.fn(),
    releaseAudioSession: mocks.releaseAudioSession,
    resetAudioOutput: mocks.resetAudioOutput,
  },
}));

function state(messages: ConversationState['recentMessages'] = []): ConversationState {
  return {
    conversationId: 'conversation-a',
    userId: 'user-a',
    recentMessages: messages,
    knownFacts: [],
    userPreferences: [],
    unresolvedTopics: [],
    currentSafetyState: 'LOW',
    lastQuestionsAsked: [],
    lastActionsSuggested: [],
    lastAdviceTopics: [],
    appContext: { availableAppActions: [] },
    persistenceEnabled: true,
    createdAt: '2026-08-05T00:00:00Z',
    updatedAt: '2026-08-05T00:00:00Z',
  };
}

function result(message = 'Move toward the staffed entrance.'): ConversationTurnResult {
  const assistantMessage = {
    id: 'assistant-1',
    role: 'assistant' as const,
    content: message,
    timestamp: '2026-08-05T00:00:02Z',
    deliveryStatus: 'sent' as const,
  };
  return {
    assistantMessage,
    response: {
      message,
      safetyLevel: 'LOW',
      suggestedActions: [],
      requiresImmediateAttention: false,
      followUpNeeded: false,
      memoryUpdates: [],
    },
    state: state([assistantMessage]),
  };
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  userLocation: null,
  onNavigate: vi.fn(),
  onNewReport: vi.fn(),
};

describe('VoiceChatModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const initial = state();
    mocks.initialize.mockResolvedValue(initial);
    mocks.createConversation.mockResolvedValue(initial);
    mocks.getState.mockReturnValue(initial);
    mocks.generate.mockResolvedValue(result());
    mocks.setPersistence.mockResolvedValue(initial);
    mocks.deleteConversation.mockResolvedValue(true);
    mocks.clearHistory.mockResolvedValue(true);
    mocks.updateSettings.mockResolvedValue(undefined);
  });

  it('submits once, announces generation, and plays the returned response', async () => {
    let resolveTurn: ((value: ConversationTurnResult) => void) | undefined;
    mocks.generate.mockReturnValue(new Promise((resolve) => { resolveTurn = resolve; }));
    mocks.getState.mockReturnValue(state([{
      id: 'user-pending',
      role: 'user',
      content: 'He is still there.',
      timestamp: '2026-08-05T00:00:01Z',
      deliveryStatus: 'pending',
    }]));
    render(<VoiceChatModal {...defaultProps} />);
    const input = await screen.findByRole('textbox', { name: 'Message Hyper AI' });
    fireEvent.change(input, { target: { value: 'He is still there.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('He is still there.')).toBeInTheDocument();
    expect(screen.getByText('Sending…')).toBeInTheDocument();
    expect(screen.getByLabelText('Hyper AI is generating a response')).toBeInTheDocument();
    resolveTurn?.(result('Go inside the staffed store now.'));
    await waitFor(() => expect(mocks.speak).toHaveBeenCalledWith(
      'Go inside the staffed store now.',
      expect.objectContaining({ volume: 1 }),
    ));
  });

  it('keeps emergency controls usable when generation fails', async () => {
    mocks.generate.mockRejectedValue(new Error('Hyper AI took too long to respond. Your conversation is still available.'));
    render(<VoiceChatModal {...defaultProps} />);
    const input = await screen.findByRole('textbox', { name: 'Message Hyper AI' });
    fireEvent.change(input, { target: { value: 'Help me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('took too long');
    expect(screen.getByRole('button', { name: 'Emergency call' })).toBeEnabled();
  });

  it('shows and retries a failed user message', async () => {
    const pendingState = state([{
      id: 'failed-user',
      role: 'user',
      content: 'Use the other location.',
      timestamp: '2026-08-05T00:00:01Z',
      deliveryStatus: 'pending',
    }]);
    const failedState = state([{ ...pendingState.recentMessages[0], deliveryStatus: 'failed' }]);
    mocks.getState
      .mockReturnValueOnce(pendingState)
      .mockReturnValueOnce(failedState)
      .mockReturnValue(failedState);
    mocks.generate
      .mockRejectedValueOnce(new Error('I could not generate a response right now.'))
      .mockResolvedValueOnce(result('Using the corrected location.'));
    render(<VoiceChatModal {...defaultProps} />);
    const input = await screen.findByRole('textbox', { name: 'Message Hyper AI' });
    fireEvent.change(input, { target: { value: 'Use the other location.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mocks.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({ retryMessageId: 'failed-user' }),
    ));
  });

  it('shows stale location context and preserves the direct sound test', async () => {
    render(
      <VoiceChatModal
        {...defaultProps}
        userLocation={[49.19, -122.83]}
        locationCapturedAt="2020-01-01T00:00:00Z"
        locationPermissionStatus="granted"
      />,
    );

    expect(await screen.findByText(/Location context may be outdated/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Test sound' }));
    expect(mocks.unlock).toHaveBeenCalledWith(true);
    await waitFor(() => expect(mocks.speak).toHaveBeenCalledWith(
      'Hyper AI voice is ready.',
      expect.objectContaining({ volume: 1 }),
    ));
  });

  it('renders only validated actions returned by the engine and invokes navigation', async () => {
    const turn = result();
    turn.response.suggestedActions = [{
      type: 'OPEN_MAP',
      label: 'Open map',
      requiresConfirmation: false,
    }];
    mocks.generate.mockResolvedValue(turn);
    const onNavigate = vi.fn();
    render(<VoiceChatModal {...defaultProps} onNavigate={onNavigate} />);
    const input = await screen.findByRole('textbox', { name: 'Message Hyper AI' });
    fireEvent.change(input, { target: { value: 'Show me the map' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Open map' }));
    expect(onNavigate).toHaveBeenCalledWith('map');
  });

  it('stops an active request through the conversation engine', async () => {
    mocks.generate.mockReturnValue(new Promise(() => undefined));
    render(<VoiceChatModal {...defaultProps} />);
    const input = await screen.findByRole('textbox', { name: 'Message Hyper AI' });
    fireEvent.change(input, { target: { value: 'Generate something' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stop generating' }));
    expect(mocks.cancel).toHaveBeenCalledWith('conversation-a');
  });
});
