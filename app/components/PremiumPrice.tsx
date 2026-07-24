"use client";

import { usePathname } from "next/navigation";
import { useCurrencyPreference } from "@/app/components/useCurrencyPreference";
import { usePremiumPricing } from "@/app/components/usePremiumPricing";
import { getLocaleFromPathname } from "@/lib/i18n";

export default function PremiumPrice() {
  const locale = getLocaleFromPathname(usePathname());
  const { currency } = useCurrencyPreference(locale);
  const price = usePremiumPricing(currency, locale);

  return (
    <>
      <p className="font-display text-5xl font-semibold">{price.amount}</p>
      <p className="pb-1 text-sm text-warm-white/65">
        {locale === "he" ? "לאירוע" : "per event"}
      </p>
    </>
  );
}
