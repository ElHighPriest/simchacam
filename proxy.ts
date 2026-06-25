import { NextResponse, type NextRequest } from "next/server";
import { isCurrency, isLocale, type Currency, type Locale } from "@/lib/i18n";
import {
  currencyPreferenceCookie,
  getRegionalDefaults,
  localePreferenceCookie,
  preferenceMaxAgeSeconds,
} from "@/lib/preferences";

function setPreferenceCookie(
  response: NextResponse,
  request: NextRequest,
  name: string,
  value: string
) {
  response.cookies.set({
    name,
    value,
    httpOnly: false,
    maxAge: preferenceMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
}

export function proxy(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country");
  const regionalDefaults = getRegionalDefaults(country);
  const savedLocaleValue = request.cookies.get(localePreferenceCookie)?.value;
  const savedCurrencyValue = request.cookies.get(
    currencyPreferenceCookie
  )?.value;
  const savedLocale: Locale | null =
    savedLocaleValue && isLocale(savedLocaleValue) ? savedLocaleValue : null;
  const savedCurrency: Currency | null =
    savedCurrencyValue && isCurrency(savedCurrencyValue)
      ? savedCurrencyValue
      : null;
  const pathLocaleValue = request.nextUrl.pathname
    .split("/")
    .filter(Boolean)[0];
  const pathLocale =
    pathLocaleValue && isLocale(pathLocaleValue) ? pathLocaleValue : null;

  const locale = savedLocale ?? pathLocale ?? regionalDefaults.locale;
  const currency = savedCurrency ?? regionalDefaults.currency;
  const response =
    request.nextUrl.pathname === "/"
      ? NextResponse.redirect(
          new URL(`/${locale}${request.nextUrl.search}`, request.url)
        )
      : NextResponse.next();

  if (!savedLocale) {
    setPreferenceCookie(
      response,
      request,
      localePreferenceCookie,
      locale
    );
  }

  if (!savedCurrency) {
    setPreferenceCookie(
      response,
      request,
      currencyPreferenceCookie,
      currency
    );
  }

  return response;
}

export const config = {
  matcher: ["/", "/en/:path*", "/he/:path*"],
};
