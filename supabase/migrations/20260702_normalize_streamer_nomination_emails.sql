begin;

drop policy if exists "Nominated streamers can view their active nominations"
on public.event_streamer_nominations;

alter table public.event_streamer_nominations
drop constraint if exists event_streamer_nominations_email_check;

drop index if exists event_streamer_nominations_one_active_email_per_event;

with normalized as (
  select
    id,
    case
      when split_part(lower(trim(nominated_email)), '@', 2) = 'googlemail.com'
        then split_part(lower(trim(nominated_email)), '@', 1) || '@gmail.com'
      else lower(trim(nominated_email))
    end as canonical_email
  from public.event_streamer_nominations
),
ranked as (
  select
    n.id,
    row_number() over (
      partition by esn.event_id, n.canonical_email
      order by esn.created_at asc, esn.id asc
    ) as duplicate_rank
  from normalized n
  join public.event_streamer_nominations esn on esn.id = n.id
  where esn.revoked_at is null
)
update public.event_streamer_nominations esn
set
  revoked_at = now(),
  updated_at = now()
from ranked
where esn.id = ranked.id
  and ranked.duplicate_rank > 1;

with normalized as (
  select
    id,
    case
      when split_part(lower(trim(nominated_email)), '@', 2) = 'googlemail.com'
        then split_part(lower(trim(nominated_email)), '@', 1) || '@gmail.com'
      else lower(trim(nominated_email))
    end as canonical_email
  from public.event_streamer_nominations
)
update public.event_streamer_nominations esn
set
  nominated_email_normalized = normalized.canonical_email,
  updated_at = now()
from normalized
where esn.id = normalized.id
  and esn.nominated_email_normalized is distinct from normalized.canonical_email;

alter table public.event_streamer_nominations
add constraint event_streamer_nominations_email_check
check (
  nominated_email_normalized =
    case
      when split_part(lower(trim(nominated_email)), '@', 2) = 'googlemail.com'
        then split_part(lower(trim(nominated_email)), '@', 1) || '@gmail.com'
      else lower(trim(nominated_email))
    end
  and nominated_email_normalized ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);

create unique index event_streamer_nominations_one_active_email_per_event
on public.event_streamer_nominations (event_id, nominated_email_normalized)
where revoked_at is null;

create policy "Nominated streamers can view their active nominations"
on public.event_streamer_nominations
for select
to authenticated
using (
  revoked_at is null
  and nominated_email_normalized =
    case
      when split_part(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '@', 2) = 'googlemail.com'
        then split_part(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '@', 1) || '@gmail.com'
      else lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    end
);

commit;
