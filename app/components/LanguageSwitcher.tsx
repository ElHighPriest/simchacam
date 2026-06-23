"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, getLocalizedPath, type Locale } from "@/lib/i18n";

function buildLanguageHref(pathname: string, locale: Locale) {
  const currentLocale = getLocaleFromPathname(pathname);

  if (pathname === "/" || pathname === `/${currentLocale}`) {
    return `/${locale}`;
  }

  if (pathname.startsWith(`/${currentLocale}/`)) {
    return `/${locale}${pathname.slice(currentLocale.length + 1)}`;
  }

  return getLocalizedPath(locale);
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const currentLocale = getLocaleFromPathname(pathname);

  return (
    <div className="flex items-center rounded-full border border-navy/10 bg-white/60 p-1 text-xs font-semibold text-navy shadow-sm">
      {(["en", "he"] as const).map((locale) => (
        <Link
          key={locale}
          href={buildLanguageHref(pathname, locale)}
          className={
            currentLocale === locale
              ? "rounded-full bg-navy px-3 py-1.5 text-warm-white"
              : "rounded-full px-3 py-1.5 text-navy/65 transition hover:text-navy"
          }
          hrefLang={locale}
          locale={false}
        >
          {locale === "he" ? "עברית" : "English"}
        </Link>
      ))}
    </div>
  );
}
