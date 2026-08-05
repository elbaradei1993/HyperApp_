import { describe, expect, it } from 'vitest';

import migration from '../../../supabase/migrations/20260805012000_ai_conversations.sql?raw';

describe('AI persistence security migration', () => {
  it('enables and forces RLS on every assistant table', () => {
    for (const table of ['ai_conversations', 'ai_messages', 'ai_user_memories']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`alter table public.${table} force row level security`);
    }
  });

  it('scopes policies to the authenticated user and cascades conversation deletion', () => {
    expect(migration.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(12);
    expect(migration).toContain('conversation_id uuid not null references public.ai_conversations(id) on delete cascade');
    expect(migration).toContain('revoke all on public.ai_conversations, public.ai_messages, public.ai_user_memories from anon');
  });
});
