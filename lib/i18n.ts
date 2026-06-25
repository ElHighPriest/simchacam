import enMessages from "@/messages/en.json";
import heMessages from "@/messages/he.json";

export const locales = ["en", "he"] as const;
export type Locale = (typeof locales)[number];

export const currencies = ["gbp", "ils", "usd", "eur"] as const;
export type Currency = (typeof currencies)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function isCurrency(value: string): value is Currency {
  return currencies.includes(value as Currency);
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment && isLocale(segment) ? segment : defaultLocale;
}

export function getMessages(locale: Locale) {
  return locale === "he" ? heMessages : enMessages;
}

export function getLocaleDirection(locale: Locale) {
  return locale === "he" ? "rtl" : "ltr";
}

export function getLocalizedPath(locale: Locale, path = "") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function getDefaultCurrencyForLocale(locale: Locale): Currency {
  return locale === "he" ? "ils" : "gbp";
}

export function getPremiumPriceDisplay(
  preference: Locale | Currency,
  displayLocale?: Locale
) {
  const currency: Currency =
    preference === "en" || preference === "he"
      ? getDefaultCurrencyForLocale(preference)
      : preference;
  const locale =
    displayLocale ??
    (preference === "en" || preference === "he" ? preference : "en");
  const prices: Record<
    Currency,
    { amount: string; currency: Uppercase<Currency> }
  > = {
    gbp: { amount: "£9.99", currency: "GBP" },
    ils: { amount: "₪39", currency: "ILS" },
    usd: { amount: "$12.99", currency: "USD" },
    eur: { amount: "€11.99", currency: "EUR" },
  };
  const selected = prices[currency];

  return locale === "he"
    ? {
        ...selected,
        featurePrice: `${selected.amount} תכונת Premium`,
        price: `${selected.amount} לאירוע`,
        upgradeButton: `שדרוג ל-Premium — ${selected.amount}`,
      }
    : {
        ...selected,
        featurePrice: `${selected.amount} Premium Feature`,
        price: `${selected.amount} per event`,
        upgradeButton: `Upgrade to Premium — ${selected.amount}`,
      };
}
