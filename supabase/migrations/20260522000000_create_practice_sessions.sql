create table if not exists public.practice_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  session jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.practice_sessions enable row level security;

drop policy if exists "Users can read their own practice sessions"
  on public.practice_sessions;
drop policy if exists "Users can insert their own practice sessions"
  on public.practice_sessions;
drop policy if exists "Users can update their own practice sessions"
  on public.practice_sessions;
drop policy if exists "Users can delete their own practice sessions"
  on public.practice_sessions;

create policy "Users can read their own practice sessions"
  on public.practice_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own practice sessions"
  on public.practice_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own practice sessions"
  on public.practice_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own practice sessions"
  on public.practice_sessions
  for delete
  using (auth.uid() = user_id);
