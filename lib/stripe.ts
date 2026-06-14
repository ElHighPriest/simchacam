import "server-only";

import Stripe from "stripe";

export type StripeConfig = {
  client: Stripe;
  premiumPriceId: string;
  siteUrl: URL;
};

export type StripeWebhookConfig = {
  client: Stripe;
  premiumPriceId: string;
  webhookSecret: string;
};

let stripeClient: Stripe | null = null;

function getStripeClientConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!secretKey || !premiumPriceId) {
    throw new Error("Missing Stripe server configuration");
  }

  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid Stripe secret key");
  }

  if (!premiumPriceId.startsWith("price_")) {
    throw new Error("Invalid Stripe Premium price ID");
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: "SimchaCam",
    },
  });

  return {
    client: stripeClient,
    premiumPriceId,
  };
}

export function getStripeConfig(): StripeConfig {
  const config = getStripeClientConfig();
  const siteUrlValue = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrlValue) {
    throw new Error("Missing Stripe server configuration");
  }

  const siteUrl = new URL(siteUrlValue);

  if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
    throw new Error("Invalid site URL");
  }

  return {
    ...config,
    siteUrl,
  };
}

export function getStripeWebhookConfig(): StripeWebhookConfig {
  const config = getStripeClientConfig();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing Stripe webhook configuration");
  }

  if (!webhookSecret.startsWith("whsec_")) {
    throw new Error("Invalid Stripe webhook secret");
  }

  return {
    ...config,
    webhookSecret,
  };
}
