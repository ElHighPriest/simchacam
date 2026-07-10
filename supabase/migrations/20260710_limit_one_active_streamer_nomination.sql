begin;

with ranked_active_nominations as (
  select
    id,
    row_number() over (
      partition by event_id
      order by created_at desc, id desc
    ) as nomination_rank
  from public.event_streamer_nominations
  where revoked_at is null
)
update public.event_streamer_nominations
set
  revoked_at = now(),
  updated_at = now()
where id in (
  select id
  from ranked_active_nominations
  where nomination_rank > 1
);

create unique index if not exists event_streamer_nominations_one_active_per_event
on public.event_streamer_nominations (event_id)
where revoked_at is null;

commit;
