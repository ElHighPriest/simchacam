begin;

create table public.event_viewer_sessions (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id) on delete cascade,

  viewer_session_id text not null,
  viewer_label text,

  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,

  watch_seconds integer
    check (watch_seconds is null or watch_seconds >= 0),

  user_agent text,
  country text,
  device_type text,
  browser text,

  created_at timestamptz not null default now()
);

comment on table public.event_viewer_sessions is
'Anonymous operational viewer analytics for SimchaCam events. Stores browser session activity only; does not store viewer names or IP addresses.';

create index event_viewer_sessions_event_id_idx
on public.event_viewer_sessions (event_id);

create index event_viewer_sessions_event_viewer_idx
on public.event_viewer_sessions (event_id, viewer_session_id);

create index event_viewer_sessions_last_seen_idx
on public.event_viewer_sessions (last_seen_at);

create index event_viewer_sessions_joined_at_idx
on public.event_viewer_sessions (joined_at);

alter table public.event_viewer_sessions enable row level security;

revoke all
on table public.event_viewer_sessions
from anon, authenticated;

grant select, insert, update, delete
on table public.event_viewer_sessions
to service_role;

commit;
