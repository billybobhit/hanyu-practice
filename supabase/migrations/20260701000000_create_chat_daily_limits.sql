create table if not exists public.chat_daily_limits (
  identifier text not null,
  date date not null,
  session_count integer not null default 0 check (session_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (identifier, date)
);

create index if not exists chat_daily_limits_date_idx
  on public.chat_daily_limits (date);

alter table public.chat_daily_limits enable row level security;

drop function if exists public.get_chat_session_count(text, date);
create function public.get_chat_session_count(
  p_identifier text,
  p_date date
)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select session_count
      from public.chat_daily_limits
      where identifier = p_identifier
        and date = p_date
    ),
    0
  );
$$;

drop function if exists public.increment_chat_session_count(text, date);
create function public.increment_chat_session_count(
  p_identifier text,
  p_date date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  insert into public.chat_daily_limits (identifier, date, session_count, updated_at)
  values (p_identifier, p_date, 1, now())
  on conflict (identifier, date)
  do update set
    session_count = public.chat_daily_limits.session_count + 1,
    updated_at = now()
  returning session_count into next_count;

  return next_count;
end;
$$;

revoke all on public.chat_daily_limits from anon, authenticated;
grant execute on function public.get_chat_session_count(text, date) to anon, authenticated;
grant execute on function public.increment_chat_session_count(text, date) to anon, authenticated;
