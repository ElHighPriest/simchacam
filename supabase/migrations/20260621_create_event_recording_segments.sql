begin;

create table public.event_recording_segments (
  id uuid primary key default gen_random_uuid(),

  event_recording_id uuid not null
    references public.event_recordings(event_id) on delete cascade,

  event_id uuid not null
    references public.events(id) on delete cascade,

  segment_index integer not null
    check (segment_index > 0),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'starting',
        'recording',
        'processing',
        'ready',
        'failed'
      )
    ),

  livekit_egress_id text unique,
  object_key text,

  started_at timestamptz,
  ended_at timestamptz,
  ready_at timestamptz,

  duration_ms bigint
    check (duration_ms is null or duration_ms >= 0),

  size_bytes bigint
    check (size_bytes is null or size_bytes >= 0),

  error_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_recording_segments_unique_index_per_recording
    unique (event_recording_id, segment_index),

  constraint event_recording_segments_ready_requires_object_key
    check (status <> 'ready' or object_key is not null)
);

create unique index event_recording_segments_one_active_per_recording
on public.event_recording_segments (event_recording_id)
where status in ('pending', 'starting', 'recording');

create index event_recording_segments_recording_index_idx
on public.event_recording_segments (event_recording_id, segment_index);

create index event_recording_segments_event_status_idx
on public.event_recording_segments (event_id, status);

create index event_recording_segments_ready_idx
on public.event_recording_segments (event_recording_id, ready_at)
where status = 'ready';

create index event_recording_segments_livekit_egress_idx
on public.event_recording_segments (livekit_egress_id)
where livekit_egress_id is not null;

insert into public.event_recording_segments (
  event_recording_id,
  event_id,
  segment_index,
  status,
  livekit_egress_id,
  object_key,
  started_at,
  ended_at,
  ready_at,
  duration_ms,
  size_bytes,
  error_message,
  created_at,
  updated_at
)
select
  event_recordings.event_id,
  event_recordings.event_id,
  1,
  event_recordings.status,
  event_recordings.livekit_egress_id,
  event_recordings.object_key,
  event_recordings.started_at,
  event_recordings.ended_at,
  event_recordings.ready_at,
  event_recordings.duration_ms,
  event_recordings.size_bytes,
  event_recordings.error_message,
  event_recordings.created_at,
  event_recordings.updated_at
from public.event_recordings
where (
    event_recordings.object_key is not null
    or event_recordings.livekit_egress_id is not null
  )
  and not exists (
    select 1
    from public.event_recording_segments
    where event_recording_segments.event_recording_id = event_recordings.event_id
      and event_recording_segments.segment_index = 1
  );

alter table public.event_recording_segments enable row level security;

create policy "Event owners can view recording segments"
on public.event_recording_segments
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_recording_segments.event_id
      and events.user_id = auth.uid()
  )
);

revoke all
on table public.event_recording_segments
from anon, authenticated;

grant select
on table public.event_recording_segments
to authenticated;

grant select, insert, update, delete
on table public.event_recording_segments
to service_role;

commit;
