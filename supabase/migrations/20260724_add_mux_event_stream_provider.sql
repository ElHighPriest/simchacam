begin;

alter table public.events
  add column if not exists stream_provider text not null default 'livekit',
  add column if not exists mux_stream_id text,
  add column if not exists mux_playback_id text;

alter table public.events
  add constraint events_stream_provider_check
  check (stream_provider in ('livekit', 'mux'));

create unique index if not exists events_mux_stream_id_unique
on public.events (mux_stream_id)
where mux_stream_id is not null;

create unique index if not exists events_mux_playback_id_unique
on public.events (mux_playback_id)
where mux_playback_id is not null;

comment on column public.events.stream_provider is
  'Hosting provider selected for this event. Existing and newly-created events default to LiveKit.';
comment on column public.events.mux_stream_id is
  'Server-side Mux Live Stream identifier. The Mux stream key is never persisted.';
comment on column public.events.mux_playback_id is
  'Stable public Mux playback identifier.';

commit;
