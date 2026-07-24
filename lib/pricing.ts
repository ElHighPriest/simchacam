import "server-only";

import type Stripe from "stripe";
import { currencies, type Currency } from "@/lib/i18n";
import { getStripePricingConfig } from "@/lib/stripe";

export type PremiumPrice = {
  currency: Uppercase<Currency>;
  amount: number;
  formatted: string;
};

export type PremiumPricing = Record<Uppercase<Currency>, PremiumPrice>;

type PricingCache = {
  expiresAt: number;
  premium: PremiumPricing;
  prices: Record<Currency, Stripe.Price>;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const currencyLocales: Record<Currency, string> = {
  gbp: "en-GB",
  ils: "he-IL",
  usd: "en-US",
  eur: "de-DE",
};

let cache: PricingCache | null = null;
let pendingLoad: Promise<{
  premium: PremiumPricing;
  prices: Record<Currency, Stripe.Price>;
}> | null = null;

function formatPrice(currency: Currency, amount: number) {
  const fractionDigits =
    new Intl.NumberFormat(currencyLocales[currency], {
      style: "currency",
      currency: currency.toUpperCase(),
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const majorAmount = amount / 10 ** fractionDigits;
  const hasFraction = amount % 10 ** fractionDigits !== 0;

  return new Intl.NumberFormat(currencyLocales[currency], {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: hasFraction ? fractionDigits : 0,
    maximumFractionDigits: fractionDigits,
  }).format(majorAmount);
}

function toPremiumPrice(
  expectedCurrency: Currency,
  price: Stripe.Price
): PremiumPrice {
  if (
    price.currency !== expectedCurrency ||
    price.unit_amount === null ||
    price.type !== "one_time"
  ) {
    throw new Error(
      `Stripe ${expectedCurrency.toUpperCase()} Premium price is invalid`
    );
  }

  return {
    currency: expectedCurrency.toUpperCase() as Uppercase<Currency>,
    amount: price.unit_amount,
    formatted: formatPrice(expectedCurrency, price.unit_amount),
  };
}

async function loadPremiumPricing() {
  const { client, premiumPriceIds } = getStripePricingConfig();
  const entries = await Promise.all(
    currencies.map(async (currency) => {
      const priceId = premiumPriceIds[currency];
      if (!priceId) {
        throw new Error(
          `Missing Stripe ${currency.toUpperCase()} price configuration`
        );
      }
      try {
        const price = await client.prices.retrieve(priceId);
        return { currency, price };
      } catch (error) {
        console.error("Stripe Premium price retrieval failed", {
          currency: currency.toUpperCase(),
          priceId,
          exceptionType:
            error instanceof Error ? error.constructor.name : typeof error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    })
  );

  return {
    premium: Object.fromEntries(
      entries.map(({ currency, price }) => [
        currency.toUpperCase(),
        toPremiumPrice(currency, price),
      ])
    ) as PremiumPricing,
    prices: entries.reduce(
      (result, { currency, price }) => {
        result[currency] = price;
        return result;
      },
      {} as Record<Currency, Stripe.Price>
    ),
  };
}

export async function getPremiumPricing(): Promise<PremiumPricing> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.premium;
  }

  pendingLoad ??= loadPremiumPricing();
  try {
    const loaded = await pendingLoad;
    cache = { ...loaded, expiresAt: now + CACHE_TTL_MS };
    return loaded.premium;
  } catch (error) {
    if (cache) {
      return cache.premium;
    }
    throw error;
  } finally {
    pendingLoad = null;
  }
}

export function resetPricingCacheForTests() {
  cache = null;
  pendingLoad = null;
}
