begin;

alter table public.events enable row level security;

-- Replace any existing events policies so there is no accidental anon access.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  loop
    execute format(
      'drop policy %I on public.events',
      policy_record.policyname
    );
  end loop;
end;
$$;

create policy "Event owners can select their events"
on public.events
for select
to authenticated
using (user_id = auth.uid());

create policy "Authenticated users can create their own events"
on public.events
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Event owners can update their events"
on public.events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Event owners can delete their events"
on public.events
for delete
to authenticated
using (user_id = auth.uid());

-- Keep the sensitive password hash unreadable through the browser-facing API.
revoke all on table public.events from anon, authenticated;
revoke select (password) on table public.events from anon, authenticated;

grant select (
  id,
  name,
  slug,
  status,
  event_at,
  created_at,
  user_id
)
on table public.events
to authenticated;

grant insert (
  name,
  slug,
  status,
  event_at,
  password,
  user_id
)
on table public.events
to authenticated;

grant update (
  name,
  status,
  event_at,
  password
)
on table public.events
to authenticated;

grant delete
on table public.events
to authenticated;

grant select, insert, update, delete
on table public.events
to service_role;

-- This SECURITY DEFINER function is used only by the database trigger created
-- in 20260614_create_event_entitlements.sql. It is not a public RPC.
revoke execute
on function public.create_default_event_entitlement()
from PUBLIC, anon, authenticated;

grant execute
on function public.create_default_event_entitlement()
to service_role;

commit;
