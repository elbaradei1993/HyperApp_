import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Report } from '../types';

import { askHyperAi, buildHyperAiReportContext, createHyperAiMessage } from './hyperAi';

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: invokeMock },
  },
}));

const makeReport = (overrides: Partial<Report> = {}): Report => ({
  id: 1,
  user_id: 'user-1',
  vibe_type: 'safe' as Report['vibe_type'],
  latitude: 49.2,
  longitude: -122.8,
  emergency: false,
  upvotes: 0,
  downvotes: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Hyper AI conversation context', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    invokeMock.mockReset();
  });

  it('creates messages with a role, timestamp, and trimmed content', () => {
    const message = createHyperAiMessage('user', '  What changed nearby?  ');

    expect(message.role).toBe('user');
    expect(message.content).toBe('What changed nearby?');
    expect(message.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(message.createdAt))).toBe(false);
  });

  it('separates positive reports from attention signals', () => {
    const context = buildHyperAiReportContext([
      makeReport(),
      makeReport({ id: 2, vibe_type: 'dangerous' as Report['vibe_type'] }),
      makeReport({ id: 3, vibe_type: 'suspicious' as Report['vibe_type'], emergency: true }),
    ], true);

    expect(context.positiveSignals).toBe(1);
    expect(context.attentionSignals).toBe(2);
    expect(context.reportTypes).toEqual({ safe: 1, dangerous: 1, suspicious: 1 });
  });

  it('excludes old reports from the live 24-hour analysis', () => {
    const context = buildHyperAiReportContext([
      makeReport({ created_at: new Date(Date.now() - (48 * 60 * 60 * 1000)).toISOString() }),
    ], true);

    expect(context.totalNearby).toBe(1);
    expect(context.recent24Hours).toBe(0);
    expect(context.recentSignals).toEqual([]);
  });

  it('limits and sanitizes report details sent to the model', () => {
    const context = buildHyperAiReportContext([
      makeReport({ notes: 'x'.repeat(500), location: 'y'.repeat(200), upvotes: 4, downvotes: 1 }),
    ], true);

    expect(context.recentSignals[0].note).toHaveLength(180);
    expect(context.recentSignals[0].location).toHaveLength(100);
    expect(context.recentSignals[0].communityScore).toBe(3);
  });

  it('sends compact conversation context through the hosted edge function', async () => {
    invokeMock.mockResolvedValue({
      data: { answer: ' Hosted Hyper AI ready. ', model: 'claude-haiku-4-5-20251001' },
      error: null,
    });

    const result = await askHyperAi(
      [createHyperAiMessage('user', 'Are you ready?')],
      buildHyperAiReportContext([], false),
    );

    expect(result).toEqual({
      answer: 'Hosted Hyper AI ready.',
      model: 'claude-haiku-4-5-20251001',
    });
    expect(invokeMock).toHaveBeenCalledWith('hyper-ai', {
      body: {
        messages: [{ role: 'user', content: 'Are you ready?' }],
        reportContext: expect.objectContaining({ hasLocation: false, totalNearby: 0 }),
      },
    });
  });

  it('surfaces hosted function failures without exposing provider internals', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('Edge Function returned a non-2xx status code'),
    });

    await expect(askHyperAi(
      [createHyperAiMessage('user', 'Hello')],
      buildHyperAiReportContext([], false),
    )).rejects.toThrow('Edge Function returned a non-2xx status code');
  });
});
