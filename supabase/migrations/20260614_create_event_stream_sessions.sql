begin;

create table public.event_stream_sessions (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id) on delete cascade,

  room_name text not null,

  status text not null default 'starting'
    check (status in ('starting', 'live', 'ended')),

  plan text not null
    check (plan in ('free', 'premium')),

  stream_limit_seconds integer not null
    check (stream_limit_seconds > 0),

  viewer_limit integer not null
    check (viewer_limit > 0),

  started_at timestamptz not null default now(),
  hard_ends_at timestamptz not null,
  ended_at timestamptz,

  ended_reason text
    check (
      ended_reason is null
      or ended_reason in (
        'host_ended',
        'time_limit',
        'room_closed',
        'admin',
        'error'
      )
    ),

  host_last_connected_at timestamptz,
  host_last_disconnected_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_stream_sessions_deadline_check
    check (hard_ends_at > started_at),

  constraint event_stream_sessions_ended_state_check
    check (
      (status = 'ended' and ended_at is not null)
      or status <> 'ended'
    )
);

create unique index event_stream_sessions_one_active_per_event
on public.event_stream_sessions (event_id)
where status in ('starting', 'live');

create index event_stream_sessions_due_idx
on public.event_stream_sessions (hard_ends_at)
where status in ('starting', 'live');

alter table public.event_stream_sessions enable row level security;

create policy "Event owners can view stream sessions"
on public.event_stream_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_stream_sessions.event_id
      and events.user_id = auth.uid()
  )
);

grant select
on table public.event_stream_sessions
to authenticated;

grant select, insert, update, delete
on table public.event_stream_sessions
to service_role;

commit;
