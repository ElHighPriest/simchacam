import enMessages from "@/messages/en.json";
import heMessages from "@/messages/he.json";

export const locales = ["en", "he"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
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

export function getPremiumPriceDisplay(locale: Locale) {
  return locale === "he"
    ? {
        currency: "ILS",
        featurePrice: "₪39 תכונת Premium",
        price: "₪39 לאירוע",
        upgradeButton: "שדרוג ל-Premium — ₪39",
      }
    : {
        currency: "GBP",
        featurePrice: "£9.99 Premium Feature",
        price: "£9.99 per event",
        upgradeButton: "Upgrade to Premium — £9.99",
      };
}
