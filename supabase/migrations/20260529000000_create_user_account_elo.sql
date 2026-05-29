create table if not exists public.user_account_elo (
  user_id uuid primary key references auth.users(id) on delete cascade,
  elo integer not null default 0 check (elo >= 0),
  rank text not null default 'Noob',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_account_elo (user_id, elo, rank, updated_at)
select
  user_id,
  max(elo) as elo,
  case
    when max(elo) >= 23000 then 'Eternal'
    when max(elo) >= 16000 then 'Master'
    when max(elo) >= 11000 then 'Ethereal'
    when max(elo) >= 7500 then 'Diamond'
    when max(elo) >= 5000 then 'Gold'
    when max(elo) >= 3300 then 'Iron'
    when max(elo) >= 2100 then 'Pro'
    when max(elo) >= 1250 then 'Advanced'
    when max(elo) >= 650 then 'Intermediate'
    when max(elo) >= 250 then 'Beginner'
    else 'Noob'
  end as rank,
  now()
from public.user_language_elo
group by user_id
on conflict (user_id) do nothing;

alter table public.user_account_elo enable row level security;

drop policy if exists "Users can read their own account elo"
  on public.user_account_elo;
drop policy if exists "Users can insert their own account elo"
  on public.user_account_elo;
drop policy if exists "Users can update their own account elo"
  on public.user_account_elo;

create policy "Users can read their own account elo"
  on public.user_account_elo
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own account elo"
  on public.user_account_elo
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own account elo"
  on public.user_account_elo
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
