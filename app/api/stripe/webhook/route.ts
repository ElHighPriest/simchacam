import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeWebhookConfig } from "@/lib/stripe";

export const runtime = "nodejs";

type PaymentRow = {
  currency: string;
  event_id: string;
  id: string;
  livemode: boolean;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_price_id: string;
  user_id: string;
};

function getStripeId(value: { id: string } | string | null) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

async function findPayment(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const paymentId = session.metadata?.payment_id;

  if (paymentId) {
    const { data, error } = await supabase
      .from("event_payments")
      .select(
        "id, event_id, user_id, status, livemode, currency, stripe_price_id, stripe_checkout_session_id"
      )
      .eq("id", paymentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as PaymentRow;
    }
  }

  const { data, error } = await supabase
    .from("event_payments")
    .select(
      "id, event_id, user_id, status, livemode, currency, stripe_price_id, stripe_checkout_session_id"
    )
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as PaymentRow | null;
}

async function markWebhookFailed(
  supabase: SupabaseClient,
  stripeEventId: string,
  message: string
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "failed",
      last_error: message,
      updated_at: now,
    })
    .eq("stripe_event_id", stripeEventId);

  if (error) {
    console.error("Could not mark Stripe webhook as failed", error);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let stripeConfig: ReturnType<typeof getStripeWebhookConfig>;

  try {
    stripeConfig = getStripeWebhookConfig();
  } catch (error) {
    console.error("Stripe webhook configuration is missing", error);
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = await stripeConfig.client.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeConfig.webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Stripe webhook Supabase configuration is missing");
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const webhookObject = stripeEvent.data.object as Stripe.Checkout.Session;
  const now = new Date().toISOString();
  const { error: webhookInsertError } = await supabase
    .from("stripe_webhook_events")
    .insert({
      stripe_event_id: stripeEvent.id,
      event_type: stripeEvent.type,
      stripe_object_id: webhookObject.id,
      status: "processing",
      livemode: stripeEvent.livemode,
      received_at: now,
      updated_at: now,
    });

  if (webhookInsertError?.code === "23505") {
    const { data: existingWebhook, error: existingWebhookError } =
      await supabase
        .from("stripe_webhook_events")
        .select("status, attempt_count")
        .eq("stripe_event_id", stripeEvent.id)
        .single();

    if (existingWebhookError) {
      console.error(
        "Could not load duplicate Stripe webhook",
        existingWebhookError
      );
      return NextResponse.json(
        { error: "Could not process webhook" },
        { status: 500 }
      );
    }

    if (existingWebhook.status === "processed") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const { error: retryError } = await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processing",
        attempt_count: existingWebhook.attempt_count + 1,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", stripeEvent.id);

    if (retryError) {
      console.error("Could not retry Stripe webhook", retryError);
      return NextResponse.json(
        { error: "Could not process webhook" },
        { status: 500 }
      );
    }
  } else if (webhookInsertError) {
    console.error("Could not register Stripe webhook", webhookInsertError);
    return NextResponse.json(
      { error: "Could not process webhook" },
      { status: 500 }
    );
  }

  try {
    const session = await stripeConfig.client.checkout.sessions.retrieve(
      webhookObject.id,
      {
        expand: [
          "line_items.data.price",
          "payment_intent.latest_charge",
          "discounts.coupon",
          "discounts.promotion_code",
        ],
      }
    );
    const payment = await findPayment(supabase, session);

    if (!payment) {
      throw new Error("Matching event payment was not found");
    }

    const { error: webhookPaymentError } = await supabase
      .from("stripe_webhook_events")
      .update({
        payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", stripeEvent.id);

    if (webhookPaymentError) {
      throw webhookPaymentError;
    }

    const metadata = session.metadata;

    if (
      metadata?.payment_id !== payment.id ||
      metadata.event_id !== payment.event_id ||
      metadata.user_id !== payment.user_id
    ) {
      throw new Error("Checkout metadata does not match the event payment");
    }

    if (
      payment.stripe_checkout_session_id &&
      payment.stripe_checkout_session_id !== session.id
    ) {
      throw new Error("Checkout Session does not match the event payment");
    }

    if (
      !stripeConfig.premiumPriceIds.includes(payment.stripe_price_id) ||
      payment.livemode !== session.livemode
    ) {
      throw new Error("Event payment does not match Stripe configuration");
    }

    const lineItems = session.line_items?.data ?? [];

    if (
      session.mode !== "payment" ||
      lineItems.length !== 1 ||
      lineItems[0].price?.id !== payment.stripe_price_id ||
      lineItems[0].quantity !== 1
    ) {
      throw new Error("Checkout Session does not contain the Premium price");
    }

    if (session.currency !== payment.currency) {
      throw new Error("Checkout Session currency is invalid");
    }

    const isPaid = session.payment_status === "paid";
    const isZeroTotal =
      session.amount_total === 0 &&
      session.payment_status === "no_payment_required";

    if (!isPaid && !isZeroTotal) {
      throw new Error("Checkout Session payment is incomplete");
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, user_id")
      .eq("id", payment.event_id)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    if (!event || event.user_id !== payment.user_id) {
      throw new Error("Event ownership does not match the event payment");
    }

    const paymentIntent =
      session.payment_intent &&
      typeof session.payment_intent !== "string"
        ? session.payment_intent
        : null;
    const firstDiscount = session.discounts?.[0] ?? null;
    const paymentUpdates = {
      status: "succeeded",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: getStripeId(session.payment_intent),
      stripe_charge_id: getStripeId(paymentIntent?.latest_charge ?? null),
      stripe_customer_id: getStripeId(session.customer),
      stripe_promotion_code_id: getStripeId(
        firstDiscount?.promotion_code ?? null
      ),
      stripe_coupon_id: getStripeId(firstDiscount?.coupon ?? null),
      currency: session.currency,
      amount_subtotal: session.amount_subtotal,
      amount_discount: session.total_details?.amount_discount ?? 0,
      amount_tax: session.total_details?.amount_tax ?? 0,
      amount_total: session.amount_total,
      amount_paid: session.amount_total,
      failure_code: null,
      failure_message: null,
      completed_at: now,
      updated_at: now,
    };
    const { data: updatedPayment, error: paymentUpdateError } = await supabase
      .from("event_payments")
      .update(paymentUpdates)
      .eq("id", payment.id)
      .select("id")
      .single();

    if (paymentUpdateError || !updatedPayment) {
      throw paymentUpdateError ?? new Error("Event payment was not updated");
    }

    const { data: updatedEntitlement, error: entitlementError } = await supabase
      .from("event_entitlements")
      .update({
        plan: "premium",
        status: "active",
        stream_limit_seconds: 21600,
        viewer_limit: 500,
        recording_enabled: true,
        replay_retention_days: 30,
        download_enabled: true,
        comments_enabled: false,
        source_payment_id: payment.id,
        premium_activated_at: now,
        premium_revoked_at: null,
        updated_at: now,
      })
      .eq("event_id", payment.event_id)
      .select("event_id")
      .single();

    if (entitlementError || !updatedEntitlement) {
      throw entitlementError ?? new Error("Event entitlement was not updated");
    }

    const { error: recordingError } = await supabase
      .from("event_recordings")
      .upsert(
        {
          event_id: payment.event_id,
          status: "pending",
          livekit_egress_id: null,
          object_key: null,
          started_at: null,
          ended_at: null,
          ready_at: null,
          expires_at: null,
          duration_ms: null,
          size_bytes: null,
          error_message: null,
          updated_at: now,
        },
        { onConflict: "event_id" }
      );

    if (recordingError) {
      throw recordingError;
    }

    const { error: webhookUpdateError } = await supabase
      .from("stripe_webhook_events")
      .update({
        payment_id: payment.id,
        status: "processed",
        last_error: null,
        processed_at: now,
        updated_at: now,
      })
      .eq("stripe_event_id", stripeEvent.id);

    if (webhookUpdateError) {
      throw webhookUpdateError;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Could not activate Premium from Stripe webhook", error);
    await markWebhookFailed(
      supabase,
      stripeEvent.id,
      "Premium activation failed"
    );

    return NextResponse.json(
      { error: "Could not process webhook" },
      { status: 500 }
    );
  }
}
