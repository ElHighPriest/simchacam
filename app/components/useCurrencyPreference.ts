"use client";

import { useSyncExternalStore } from "react";
import {
  getDefaultCurrencyForLocale,
  isCurrency,
  type Currency,
  type Locale,
} from "@/lib/i18n";

const currencyStorageKey = "simchacam_currency";
const currencyCookieName = "simchacam_currency";
const currencyChangedEvent = "simchacam:currency-changed";

function getStoredCurrency(): Currency | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(currencyStorageKey);

  return stored && isCurrency(stored) ? stored : null;
}

function getCurrencySnapshot(locale: Locale): Currency {
  return getStoredCurrency() ?? getDefaultCurrencyForLocale(locale);
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
  document.cookie = `${currencyCookieName}=${currency}; path=/; max-age=31536000; samesite=lax`;
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
