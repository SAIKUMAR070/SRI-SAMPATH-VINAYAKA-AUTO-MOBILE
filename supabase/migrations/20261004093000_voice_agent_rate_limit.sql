create table if not exists public.voice_agent_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null
);

create index if not exists voice_agent_rate_limits_window_started_at_idx
  on public.voice_agent_rate_limits (window_started_at);

alter table public.voice_agent_rate_limits enable row level security;
revoke all on table public.voice_agent_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.voice_agent_rate_limits to service_role;

create or replace function public.consume_voice_agent_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_rate_key is null or length(p_rate_key) > 128
    or p_limit < 1 or p_limit > 1000
    or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from p_now) / p_window_seconds) * p_window_seconds
  );

  delete from public.voice_agent_rate_limits
  where window_started_at < p_now - interval '2 days';

  insert into public.voice_agent_rate_limits as rate_limit (rate_key, window_started_at, request_count)
  values (p_rate_key, v_window_start, 1)
  on conflict (rate_key) do update
    set window_started_at = excluded.window_started_at,
        request_count = case
          when rate_limit.window_started_at = excluded.window_started_at then rate_limit.request_count + 1
          else 1
        end
  returning request_count into v_request_count;

  return v_request_count <= p_limit;
end;
$$;

revoke all on function public.consume_voice_agent_rate_limit(text, integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.consume_voice_agent_rate_limit(text, integer, integer, timestamptz)
  to service_role;
