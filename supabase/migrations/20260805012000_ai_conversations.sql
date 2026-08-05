-- HyperApp conversational safety assistant persistence.
-- The browser uses the signed-in user's JWT; no service-role credential is required.

create extension if not exists pgcrypto;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Safety conversation' check (char_length(title) between 1 and 120),
  rolling_summary text check (rolling_summary is null or char_length(rolling_summary) <= 5000),
  current_safety_level text not null default 'LOW'
    check (current_safety_level in ('LOW', 'ELEVATED', 'HIGH', 'CRITICAL')),
  state_metadata jsonb not null default '{}'::jsonb,
  persistence_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (char_length(content) between 1 and 4000),
  delivery_status text not null default 'sent'
    check (delivery_status in ('pending', 'sent', 'failed')),
  safety_level text check (safety_level is null or safety_level in ('LOW', 'ELEVATED', 'HIGH', 'CRITICAL')),
  referenced_message_id uuid references public.ai_messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null check (char_length(memory_key) between 1 and 80),
  memory_value text not null check (char_length(memory_value) between 1 and 500),
  source text not null check (source in ('user_explicit', 'profile', 'app_setting')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, memory_key)
);

create index if not exists ai_conversations_user_updated_idx
  on public.ai_conversations (user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at asc);
create index if not exists ai_messages_user_idx on public.ai_messages (user_id);
create index if not exists ai_user_memories_user_idx on public.ai_user_memories (user_id);

create or replace function public.set_ai_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row execute function public.set_ai_updated_at();

drop trigger if exists ai_user_memories_set_updated_at on public.ai_user_memories;
create trigger ai_user_memories_set_updated_at
before update on public.ai_user_memories
for each row execute function public.set_ai_updated_at();

alter table public.ai_conversations enable row level security;
alter table public.ai_conversations force row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_messages force row level security;
alter table public.ai_user_memories enable row level security;
alter table public.ai_user_memories force row level security;

drop policy if exists ai_conversations_select_own on public.ai_conversations;
create policy ai_conversations_select_own on public.ai_conversations
for select to authenticated using (user_id = auth.uid());

drop policy if exists ai_conversations_insert_own on public.ai_conversations;
create policy ai_conversations_insert_own on public.ai_conversations
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists ai_conversations_update_own on public.ai_conversations;
create policy ai_conversations_update_own on public.ai_conversations
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ai_conversations_delete_own on public.ai_conversations;
create policy ai_conversations_delete_own on public.ai_conversations
for delete to authenticated using (user_id = auth.uid());

drop policy if exists ai_messages_select_own on public.ai_messages;
create policy ai_messages_select_own on public.ai_messages
for select to authenticated using (
  user_id = auth.uid()
  and exists (
    select 1 from public.ai_conversations conversation
    where conversation.id = conversation_id and conversation.user_id = auth.uid()
  )
);

drop policy if exists ai_messages_insert_own on public.ai_messages;
create policy ai_messages_insert_own on public.ai_messages
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.ai_conversations conversation
    where conversation.id = conversation_id and conversation.user_id = auth.uid()
  )
);

drop policy if exists ai_messages_update_own on public.ai_messages;
create policy ai_messages_update_own on public.ai_messages
for update to authenticated using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.ai_conversations conversation
    where conversation.id = conversation_id and conversation.user_id = auth.uid()
  )
);

drop policy if exists ai_messages_delete_own on public.ai_messages;
create policy ai_messages_delete_own on public.ai_messages
for delete to authenticated using (user_id = auth.uid());

drop policy if exists ai_user_memories_select_own on public.ai_user_memories;
create policy ai_user_memories_select_own on public.ai_user_memories
for select to authenticated using (user_id = auth.uid());

drop policy if exists ai_user_memories_insert_own on public.ai_user_memories;
create policy ai_user_memories_insert_own on public.ai_user_memories
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists ai_user_memories_update_own on public.ai_user_memories;
create policy ai_user_memories_update_own on public.ai_user_memories
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ai_user_memories_delete_own on public.ai_user_memories;
create policy ai_user_memories_delete_own on public.ai_user_memories
for delete to authenticated using (user_id = auth.uid());

revoke all on public.ai_conversations, public.ai_messages, public.ai_user_memories from anon;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;
grant select, insert, update, delete on public.ai_user_memories to authenticated;
