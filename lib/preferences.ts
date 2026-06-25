import type { Currency, Locale } from "@/lib/i18n";

export const localePreferenceCookie = "simchacam_locale";
export const currencyPreferenceCookie = "simchacam_currency";
export const preferenceMaxAgeSeconds = 60 * 60 * 24 * 365;

const eurozoneCountries = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
]);

export function getRegionalDefaults(country?: string | null): {
  locale: Locale;
  currency: Currency;
} {
  const normalizedCountry = country?.toUpperCase();

  if (normalizedCountry === "IL") {
    return { locale: "he", currency: "ils" };
  }

  if (normalizedCountry === "US") {
    return { locale: "en", currency: "usd" };
  }

  if (normalizedCountry && eurozoneCountries.has(normalizedCountry)) {
    return { locale: "en", currency: "eur" };
  }

  return { locale: "en", currency: "gbp" };
}
