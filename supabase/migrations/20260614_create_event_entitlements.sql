begin;

create table public.event_entitlements (
  event_id uuid primary key
    references public.events(id) on delete cascade,

  plan text not null default 'free'
    check (plan in ('free', 'premium')),

  status text not null default 'active'
    check (status in ('active', 'pending_payment', 'revoked', 'refunded')),

  stream_limit_seconds integer not null default 2700
    check (stream_limit_seconds > 0),

  viewer_limit integer not null default 30
    check (viewer_limit > 0),

  recording_enabled boolean not null default false,
  replay_retention_days integer not null default 0
    check (replay_retention_days >= 0),
  download_enabled boolean not null default false,
  comments_enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_entitlements_plan_values_check check (
    (
      plan = 'free'
      and stream_limit_seconds = 2700
      and viewer_limit = 30
      and recording_enabled = false
      and replay_retention_days = 0
      and download_enabled = false
      and comments_enabled = false
    )
    or
    (
      plan = 'premium'
      and stream_limit_seconds = 21600
      and viewer_limit = 500
      and recording_enabled = true
      and replay_retention_days = 30
      and download_enabled = true
      and comments_enabled = false
    )
  )
);

alter table public.event_entitlements enable row level security;

create policy "Event owners can view entitlements"
on public.event_entitlements
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_entitlements.event_id
      and events.user_id = auth.uid()
  )
);

create or replace function public.create_default_event_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.event_entitlements (event_id)
  values (new.id)
  on conflict (event_id) do nothing;

  return new;
end;
$$;

create trigger create_default_event_entitlement_after_event_insert
after insert on public.events
for each row
execute function public.create_default_event_entitlement();

insert into public.event_entitlements (event_id)
select events.id
from public.events
on conflict (event_id) do nothing;

commit;
