import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isEmailVerified } from "@/lib/auth";
import { getStripeConfig } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = "en";

  try {
    const body = (await request.json()) as { locale?: unknown };
    locale = body.locale === "he" ? "he" : "en";
  } catch {
    // Existing clients may POST without a JSON body. Keep GBP as the default.
  }

  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const authSupabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await authSupabase.auth.getUser(accessToken);

  if (!isEmailVerified(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { id } = await params;
  const { data: event, error: eventError } = await serviceSupabase
    .from("events")
    .select("id, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (eventError) {
    console.error("Could not load event for Checkout", eventError);
    return NextResponse.json(
      { error: "Could not load event" },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (event.status === "ended") {
    return NextResponse.json(
      { error: "Ended events cannot be upgraded" },
      { status: 409 }
    );
  }

  const { data: entitlement, error: entitlementError } = await serviceSupabase
    .from("event_entitlements")
    .select("plan")
    .eq("event_id", event.id)
    .maybeSingle();

  if (entitlementError) {
    console.error("Could not load entitlement for Checkout", entitlementError);
    return NextResponse.json(
      { error: "Could not load event entitlement" },
      { status: 500 }
    );
  }

  if (!entitlement) {
    return NextResponse.json(
      { error: "Event entitlement not found" },
      { status: 409 }
    );
  }

  if (entitlement.plan === "premium") {
    return NextResponse.json(
      { error: "Event is already Premium" },
      { status: 409 }
    );
  }

  try {
    const { client, premiumCurrency, premiumPriceId, siteUrl } =
      getStripeConfig(locale);
    const price = await client.prices.retrieve(premiumPriceId);
    const productId =
      typeof price.product === "string" ? price.product : price.product.id;

    if (
      !price.active ||
      price.type !== "one_time" ||
      price.currency !== premiumCurrency ||
      price.unit_amount === null
    ) {
      return NextResponse.json(
        { error: "Premium price is not configured correctly" },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const { data: payment, error: paymentError } = await serviceSupabase
      .from("event_payments")
      .insert({
        event_id: event.id,
        user_id: user.id,
        status: "checkout_created",
        currency: price.currency,
        listed_amount: price.unit_amount,
        stripe_product_id: productId,
        stripe_price_id: price.id,
        livemode: price.livemode,
        checkout_created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      console.error("Could not create event payment", paymentError);
      return NextResponse.json(
        { error: "Could not initialize Checkout" },
        { status: 500 }
      );
    }

    const metadata = {
      event_id: event.id,
      locale,
      user_id: user.id,
      payment_id: payment.id,
    };
    const successUrl =
      `${new URL("/my-events", siteUrl).toString()}` +
      "?checkout=success&session_id={CHECKOUT_SESSION_ID}";
    const cancelUrl =
      `${new URL("/my-events", siteUrl).toString()}` +
      "?checkout=cancelled";

    try {
      const session = await client.checkout.sessions.create(
        {
          mode: "payment",
          line_items: [{ price: premiumPriceId, quantity: 1 }],
          allow_promotion_codes: true,
          client_reference_id: payment.id,
          customer_email: user.email,
          locale: "auto",
          metadata,
          payment_intent_data: {
            metadata,
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        {
          idempotencyKey: `event-payment-${payment.id}`,
        }
      );

      if (!session.url) {
        throw new Error("Stripe Checkout Session has no URL");
      }

      const { error: checkoutUpdateError } = await serviceSupabase
        .from("event_payments")
        .update({
          stripe_checkout_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (checkoutUpdateError) {
        console.error(
          "Could not save Stripe Checkout Session",
          checkoutUpdateError
        );
        await client.checkout.sessions.expire(session.id).catch(
          (expireError) => {
            console.error(
              "Could not expire untracked Stripe Checkout Session",
              expireError
            );
          }
        );
        throw new Error("Could not save Stripe Checkout Session");
      }

      return NextResponse.json({ url: session.url });
    } catch (error) {
      console.error("Could not create Stripe Checkout Session", error);
      await serviceSupabase
        .from("event_payments")
        .update({
          status: "failed",
          failure_message: "Could not create Stripe Checkout Session",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      return NextResponse.json(
        { error: "Could not create Checkout Session" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Could not configure Stripe Checkout", error);
    return NextResponse.json(
      { error: "Checkout is not configured" },
      { status: 500 }
    );
  }
}
