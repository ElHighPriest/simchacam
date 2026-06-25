"use client";

import { useSyncExternalStore } from "react";
import {
  getDefaultCurrencyForLocale,
  isCurrency,
  type Currency,
  type Locale,
} from "@/lib/i18n";
import {
  currencyPreferenceCookie,
  preferenceMaxAgeSeconds,
} from "@/lib/preferences";

const currencyStorageKey = "simchacam_currency";
const currencyChangedEvent = "simchacam:currency-changed";

function getStoredCurrency(): Currency | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(currencyStorageKey);

  return stored && isCurrency(stored) ? stored : null;
}

function getCookieCurrency(): Currency | null {
  if (typeof document === "undefined") {
    return null;
  }

  const stored = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${currencyPreferenceCookie}=`))
    ?.split("=")[1];

  return stored && isCurrency(stored) ? stored : null;
}

function getCurrencySnapshot(locale: Locale): Currency {
  return (
    getStoredCurrency() ??
    getCookieCurrency() ??
    getDefaultCurrencyForLocale(locale)
  );
}

function subscribeToCurrencyChanges(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === currencyStorageKey) {
      onStoreChange();
    }
  }

  window.addEventListener(currencyChangedEvent, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(currencyChangedEvent, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function persistCurrency(currency: Currency) {
  window.localStorage.setItem(currencyStorageKey, currency);
  document.cookie = `${currencyPreferenceCookie}=${currency}; path=/; max-age=${preferenceMaxAgeSeconds}; samesite=lax`;
  window.dispatchEvent(new Event(currencyChangedEvent));
}

export function useCurrencyPreference(locale: Locale) {
  const currency = useSyncExternalStore(
    subscribeToCurrencyChanges,
    () => getCurrencySnapshot(locale),
    () => getDefaultCurrencyForLocale(locale)
  );

  return { currency, setCurrency: persistCurrency };
}
