begin;

create table public.event_streamer_nominations (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id) on delete cascade,

  owner_user_id uuid not null
    references auth.users(id) on delete cascade,

  nominated_email text not null,
  nominated_email_normalized text not null,

  accepted_user_id uuid
    references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint event_streamer_nominations_email_check
    check (
      nominated_email_normalized = lower(trim(nominated_email))
      and nominated_email_normalized ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
);

create unique index event_streamer_nominations_one_active_email_per_event
on public.event_streamer_nominations (event_id, nominated_email_normalized)
where revoked_at is null;

create index event_streamer_nominations_owner_idx
on public.event_streamer_nominations (owner_user_id, created_at desc);

create index event_streamer_nominations_email_idx
on public.event_streamer_nominations (nominated_email_normalized)
where revoked_at is null;

alter table public.event_streamer_nominations enable row level security;

create policy "Event owners can view streamer nominations"
on public.event_streamer_nominations
for select
to authenticated
using (owner_user_id = auth.uid());

create policy "Nominated streamers can view their active nominations"
on public.event_streamer_nominations
for select
to authenticated
using (
  revoked_at is null
  and nominated_email_normalized = lower(coalesce(auth.jwt() ->> 'email', ''))
);

revoke all
on table public.event_streamer_nominations
from anon;

grant select
on table public.event_streamer_nominations
to authenticated;

grant select, insert, update, delete
on table public.event_streamer_nominations
to service_role;

commit;
