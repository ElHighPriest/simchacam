begin;

create table public.event_payments (
  id uuid primary key default gen_random_uuid(),

  event_id uuid not null
    references public.events(id) on delete restrict,

  user_id uuid not null
    references auth.users(id) on delete restrict,

  status text not null default 'checkout_created'
    check (
      status in (
        'checkout_created',
        'pending',
        'succeeded',
        'failed',
        'expired',
        'partially_refunded',
        'refunded',
        'disputed',
        'dispute_won',
        'dispute_lost'
      )
    ),

  currency text not null default 'gbp'
    check (currency = lower(currency) and char_length(currency) = 3),

  listed_amount integer not null default 999
    check (listed_amount >= 0),

  amount_subtotal integer
    check (amount_subtotal is null or amount_subtotal >= 0),

  amount_discount integer
    check (amount_discount is null or amount_discount >= 0),

  amount_tax integer
    check (amount_tax is null or amount_tax >= 0),

  amount_total integer
    check (amount_total is null or amount_total >= 0),

  amount_paid integer
    check (amount_paid is null or amount_paid >= 0),

  amount_refunded integer not null default 0
    check (amount_refunded >= 0),

  stripe_product_id text not null,
  stripe_price_id text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_customer_id text,
  stripe_promotion_code_id text,
  stripe_coupon_id text,

  livemode boolean not null default false,

  failure_code text,
  failure_message text,

  checkout_created_at timestamptz,
  completed_at timestamptz,
  refunded_at timestamptz,
  disputed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_payments_event_created_idx
on public.event_payments (event_id, created_at desc);

create index event_payments_user_created_idx
on public.event_payments (user_id, created_at desc);

create index event_payments_status_idx
on public.event_payments (status);

create index event_payments_stripe_charge_idx
on public.event_payments (stripe_charge_id)
where stripe_charge_id is not null;

create unique index event_payments_one_entitling_payment_per_event
on public.event_payments (event_id)
where status in (
  'succeeded',
  'partially_refunded',
  'disputed',
  'dispute_won'
);

create table public.stripe_webhook_events (
  stripe_event_id text primary key,

  event_type text not null,
  stripe_object_id text,
  payment_id uuid
    references public.event_payments(id) on delete set null,

  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),

  livemode boolean not null default false,
  attempt_count integer not null default 1
    check (attempt_count > 0),

  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index stripe_webhook_events_status_received_idx
on public.stripe_webhook_events (status, received_at);

create index stripe_webhook_events_payment_idx
on public.stripe_webhook_events (payment_id)
where payment_id is not null;

alter table public.event_entitlements
add column source_payment_id uuid
  references public.event_payments(id) on delete set null,
add column premium_activated_at timestamptz,
add column premium_revoked_at timestamptz;

create index event_entitlements_source_payment_idx
on public.event_entitlements (source_payment_id)
where source_payment_id is not null;

alter table public.event_payments enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy "Event owners can view their payments"
on public.event_payments
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events
    where events.id = event_payments.event_id
      and events.user_id = auth.uid()
  )
);

revoke all
on table public.event_payments
from anon, authenticated;

revoke all
on table public.stripe_webhook_events
from anon, authenticated;

grant select
on table public.event_payments
to authenticated;

grant select, insert, update, delete
on table public.event_payments
to service_role;

grant select, insert, update, delete
on table public.stripe_webhook_events
to service_role;

grant select, insert, update, delete
on table public.event_entitlements
to service_role;

commit;
