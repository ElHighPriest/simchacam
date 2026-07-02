begin;

alter table public.event_entitlements
drop constraint if exists event_entitlements_plan_values_check;

update public.event_entitlements
set
  stream_limit_seconds = 10800,
  updated_at = now()
where plan = 'premium'
  and stream_limit_seconds = 21600;

alter table public.event_entitlements
add constraint event_entitlements_plan_values_check check (
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
    and stream_limit_seconds = 10800
    and viewer_limit = 500
    and recording_enabled = true
    and replay_retention_days = 30
    and download_enabled = true
    and comments_enabled = false
  )
);

commit;
