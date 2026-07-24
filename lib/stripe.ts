import "server-only";

import Stripe from "stripe";
import type { Currency } from "@/lib/i18n";

export type StripeConfig = {
  client: Stripe;
  premiumCurrency: Currency;
  premiumPriceId: string;
  siteUrl: URL;
};

export type StripeWebhookConfig = {
  client: Stripe;
  premiumPriceIds: string[];
  webhookSecret: string;
};

let stripeClient: Stripe | null = null;

export class StripePriceConfigurationError extends Error {
  currency: Currency;

  constructor(currency: Currency) {
    super(`Premium checkout is not configured for ${currency.toUpperCase()}`);
    this.name = "StripePriceConfigurationError";
    this.currency = currency;
  }
}

function getStripeClientConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const premiumPriceIds: Partial<Record<Currency, string>> = {
    gbp: process.env.STRIPE_PRICE_GBP || process.env.STRIPE_PREMIUM_PRICE_ID,
    ils: process.env.STRIPE_PRICE_ILS,
    usd: process.env.STRIPE_PRICE_USD,
    eur: process.env.STRIPE_PRICE_EUR,
  };

  if (!secretKey || !premiumPriceIds.gbp) {
    throw new Error("Missing Stripe server configuration");
  }

  if (!secretKey.startsWith("sk_")) {
    throw new Error("Invalid Stripe secret key");
  }

  for (const [currency, priceId] of Object.entries(premiumPriceIds)) {
    if (priceId && !/^price_[A-Za-z0-9]+$/.test(priceId)) {
      throw new Error(`Invalid Stripe ${currency.toUpperCase()} price ID`);
    }
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: "SimchaCam",
    },
  });

  return {
    client: stripeClient,
    premiumPriceIds,
  };
}

export function getStripePricingConfig() {
  return getStripeClientConfig();
}

export function getStripeConfig(
  preference: { currency?: Currency } = {}
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

  const premiumCurrency = preference.currency ?? "gbp";
  const premiumPriceId = config.premiumPriceIds[premiumCurrency];

  if (!premiumPriceId) {
    throw new StripePriceConfigurationError(premiumCurrency);
  }

  return {
    client: config.client,
    premiumCurrency,
    premiumPriceId,
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
      ...new Set(Object.values(config.premiumPriceIds).filter(Boolean)),
    ] as string[],
    webhookSecret,
  };
}
