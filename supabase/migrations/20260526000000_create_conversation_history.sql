create table if not exists public.conversation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  language_code text not null default 'general',
  material_title text,
  difficulty text,
  messages jsonb not null default '[]',
  grade jsonb,
  elo_change integer,
  elo_after integer,
  created_at timestamptz not null default now()
);

create index if not exists conversation_history_user_language_created_idx
  on public.conversation_history (user_id, language_code, created_at desc);

alter table public.conversation_history enable row level security;

drop policy if exists "Users can read their own conversation history"
  on public.conversation_history;
drop policy if exists "Users can insert their own conversation history"
  on public.conversation_history;
drop policy if exists "Users can delete their own conversation history"
  on public.conversation_history;

create policy "Users can read their own conversation history"
  on public.conversation_history
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversation history"
  on public.conversation_history
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own conversation history"
  on public.conversation_history
  for delete
  using (auth.uid() = user_id);
