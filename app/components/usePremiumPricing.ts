"use client";

import { useEffect, useState } from "react";
import type { Currency, Locale } from "@/lib/i18n";

type PremiumPrice = {
  currency: Uppercase<Currency>;
  amount: number;
  formatted: string;
};

type PricingResponse = {
  premium: Record<Uppercase<Currency>, PremiumPrice>;
};

let cachedPricing: PricingResponse | null = null;
let pricingRequest: Promise<PricingResponse> | null = null;

function loadPricing() {
  pricingRequest ??= fetch("/api/pricing")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Pricing is unavailable");
      }
      return (await response.json()) as PricingResponse;
    })
    .then((pricing) => {
      cachedPricing = pricing;
      return pricing;
    })
    .finally(() => {
      pricingRequest = null;
    });
  return pricingRequest;
}

export function usePremiumPricing(currency: Currency, locale: Locale) {
  const [pricing, setPricing] = useState<PricingResponse | null>(cachedPricing);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (pricing) {
      return;
    }
    let active = true;
    loadPricing()
      .then((result) => {
        if (active) {
          setPricing(result);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [pricing]);

  const selected = pricing?.premium[currency.toUpperCase() as Uppercase<Currency>];
  const amount = selected?.formatted;
  const loadingText = locale === "he" ? "המחיר נטען..." : "Loading price...";
  const fallbackText =
    locale === "he"
      ? "המחיר הסופי יוצג באופן מאובטח ב-Stripe"
      : "Final price shown securely in Stripe";
  const displayAmount = amount ?? (failed ? fallbackText : loadingText);

  return locale === "he"
    ? {
        amount: displayAmount,
        currency: selected?.currency,
        featurePrice: amount ? `${amount} לאירוע פרימיום` : displayAmount,
        price: amount ? `${amount} לאירוע` : displayAmount,
        upgradeButton: amount ? `שדרוג לפרימיום — ${amount}` : displayAmount,
        loading: !selected && !failed,
      }
    : {
        amount: displayAmount,
        currency: selected?.currency,
        featurePrice: amount ? `${amount} Premium Feature` : displayAmount,
        price: amount ? `${amount} per event` : displayAmount,
        upgradeButton: amount ? `Upgrade to Premium — ${amount}` : displayAmount,
        loading: !selected && !failed,
      };
}
