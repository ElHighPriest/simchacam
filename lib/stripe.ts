import "server-only";

import Stripe from "stripe";

export type StripeConfig = {
  client: Stripe;
  premiumCurrency: "gbp" | "ils";
  premiumPriceId: string;
  siteUrl: URL;
};

export type StripeWebhookConfig = {
  client: Stripe;
  premiumPriceIds: string[];
  webhookSecret: string;
};

let stripeClient: Stripe | null = null;

function getStripeClientConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const premiumPriceGbp =
    process.env.STRIPE_PRICE_GBP || process.env.STRIPE_PREMIUM_PRICE_ID;
  const premiumPriceIls = process.env.STRIPE_PRICE_ILS;

  if (!secretKey || !premiumPriceGbp) {
    throw new Error("Missing Stripe server configuration");
  }

  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid Stripe secret key");
  }

  if (!premiumPriceGbp.startsWith("price_")) {
    throw new Error("Invalid Stripe GBP price ID");
  }

  if (premiumPriceIls && !premiumPriceIls.startsWith("price_")) {
    throw new Error("Invalid Stripe ILS price ID");
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: "SimchaCam",
    },
  });

  return {
    client: stripeClient,
    premiumPriceGbp,
    premiumPriceIls,
  };
}

export function getStripeConfig(
  preference: { currency?: "gbp" | "ils"; locale?: string } | string = "en"
): StripeConfig {
  const config = getStripeClientConfig();
  const siteUrlValue = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrlValue) {
    throw new Error("Missing Stripe server configuration");
  }

  const siteUrl = new URL(siteUrlValue);

  if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
    throw new Error("Invalid site URL");
  }

  const requestedCurrency =
    typeof preference === "object" ? preference.currency : undefined;
  const locale = typeof preference === "string" ? preference : preference.locale;
  const shouldUseIls =
    requestedCurrency === "ils" ||
    (!requestedCurrency && locale === "he" && Boolean(config.premiumPriceIls));

  return {
    client: config.client,
    premiumCurrency: shouldUseIls && config.premiumPriceIls ? "ils" : "gbp",
    premiumPriceId:
      shouldUseIls && config.premiumPriceIls
        ? config.premiumPriceIls
        : config.premiumPriceGbp,
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
    client: config.client,
    premiumPriceIds: [
      config.premiumPriceGbp,
      ...(config.premiumPriceIls ? [config.premiumPriceIls] : []),
    ],
    webhookSecret,
  };
}
