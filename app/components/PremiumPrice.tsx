"use client";

import { usePathname } from "next/navigation";
import { useCurrencyPreference } from "@/app/components/useCurrencyPreference";
import {
  getLocaleFromPathname,
  getPremiumPriceDisplay,
} from "@/lib/i18n";

export default function PremiumPrice() {
  const locale = getLocaleFromPathname(usePathname());
  const { currency } = useCurrencyPreference(locale);
  const price = getPremiumPriceDisplay(currency, locale);

  return (
    <>
      <p className="font-display text-5xl font-semibold">{price.amount}</p>
      <p className="pb-1 text-sm text-warm-white/65">
        {locale === "he" ? "לאירוע" : "per event"}
      </p>
    </>
  );
}
