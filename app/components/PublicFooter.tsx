"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, getLocalizedPath, getMessages } from "@/lib/i18n";

const socialLinks = [
  {
    href: "https://www.instagram.com/simchacam/",
    label: "SimchaCam on Instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          fill="currentColor"
          d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm8.7 2.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
        />
      </svg>
    ),
  },
  {
    href: "https://www.tiktok.com/@simchacam",
    label: "SimchaCam on TikTok",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          fill="currentColor"
          d="M16.6 2c.4 3 2.1 4.8 5.1 5v3.4a8.8 8.8 0 0 1-5-1.6v7.2c0 3.7-2.6 6-6.2 6a6 6 0 0 1-6.2-5.9 6 6 0 0 1 7.6-5.8v3.6a2.7 2.7 0 0 0-1.4-.3 2.5 2.5 0 0 0-2.6 2.5 2.5 2.5 0 0 0 2.7 2.4c1.6 0 2.6-.9 2.6-2.8V2h3.4Z"
        />
      </svg>
    ),
  },
  {
    href: "https://www.facebook.com/share/1CBWa6s1rz/",
    label: "SimchaCam on Facebook",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          fill="currentColor"
          d="M14 8.3V6.7c0-.8.5-1 1.2-1H17V2.4c-.9-.1-1.8-.2-2.7-.2-2.7 0-4.5 1.6-4.5 4.5v1.6H6.8V12h3v9.8H14V12h2.8l.5-3.7H14Z"
        />
      </svg>
    ),
  },
  {
    href: "https://www.youtube.com/@SimchaCam",
    label: "SimchaCam on YouTube",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          fill="currentColor"
          d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.3V8.7l5.8 3.3-5.8 3.3Z"
        />
      </svg>
    ),
  },
];

export default function PublicFooter() {
  const locale = getLocaleFromPathname(usePathname());
  const messages = getMessages(locale);
  const homePath = getLocalizedPath(locale);

  return (
    <footer className="border-t border-navy/10 bg-warm-white text-navy">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-muted-navy sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>© {new Date().getFullYear()} SimchaCam</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
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
            {locale === "en" && (
              <Link href="/en/blog" className="transition hover:text-navy">
                Guides
              </Link>
            )}
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

          <nav
            aria-label="Social media"
            className="flex items-center gap-2"
          >
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy/10 text-muted-navy transition hover:border-gold/50 hover:bg-pale-gold/45 hover:text-navy"
              >
                {link.icon}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
