import "server-only";

import Stripe from "stripe";

export type StripeConfig = {
  client: Stripe;
  premiumPriceId: string;
  siteUrl: URL;
};

let stripeClient: Stripe | null = null;

export function getStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  const siteUrlValue = process.env.NEXT_PUBLIC_SITE_URL;

  if (!secretKey || !premiumPriceId || !siteUrlValue) {
    throw new Error("Missing Stripe server configuration");
  }

  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid Stripe secret key");
  }

  if (!premiumPriceId.startsWith("price_")) {
    throw new Error("Invalid Stripe Premium price ID");
  }

  const siteUrl = new URL(siteUrlValue);

  if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
    throw new Error("Invalid site URL");
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: "SimchaCam",
    },
  });

  return {
    client: stripeClient,
    premiumPriceId,
    siteUrl,
  };
}
