"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, getLocalizedPath, getMessages } from "@/lib/i18n";

export default function PublicFooter() {
  const locale = getLocaleFromPathname(usePathname());
  const messages = getMessages(locale);
  const homePath = getLocalizedPath(locale);

  return (
    <footer className="border-t border-navy/10 bg-warm-white text-navy">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-navy sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>© {new Date().getFullYear()} SimchaCam</p>
        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link
            href={`${homePath}#how-it-works`}
            className="transition hover:text-navy"
          >
            {messages.nav.howItWorks}
          </Link>
          <Link
            href={`${homePath}#pricing`}
            className="transition hover:text-navy"
          >
            {messages.nav.pricing}
          </Link>
          <Link
            href={getLocalizedPath(locale, "/privacy")}
            className="transition hover:text-navy"
          >
            {messages.common.privacy}
          </Link>
          <Link
            href={getLocalizedPath(locale, "/terms")}
            className="transition hover:text-navy"
          >
            {messages.common.terms}
          </Link>
          <Link
            href={getLocalizedPath(locale, "/support")}
            className="transition hover:text-navy"
          >
            {messages.common.support}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
