"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getLocaleFromPathname, getLocalizedPath, getMessages } from "@/lib/i18n";

type ProfileMenuProps = {
  onSignOut: () => void | Promise<void>;
  user: User;
};

function getInitial(user: User) {
  const firstName = user.user_metadata?.first_name;
  const source = typeof firstName === "string" && firstName ? firstName : user.email;

  return (source || "S").charAt(0).toUpperCase();
}

export default function ProfileMenu({ onSignOut, user }: ProfileMenuProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const [isOpen, setIsOpen] = useState(false);

  async function signOut() {
    setIsOpen(false);
    await onSignOut();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={messages.profile.ariaLabel}
        className="flex min-h-11 items-center gap-2 rounded-full border border-navy/10 bg-white/70 py-1.5 pl-1.5 pr-3 text-navy shadow-sm transition hover:border-gold/50 hover:bg-white"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-semibold text-warm-white">
          {getInitial(user)}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 text-navy/55 transition ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-gold/25 bg-warm-white shadow-[0_18px_45px_rgba(11,31,58,0.16)]">
          <Link
            href={getLocalizedPath(locale, "/my-events")}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-navy transition hover:bg-pale-gold/70"
          >
            {messages.profile.myEvents}
          </Link>
          <Link
            href="/account-settings"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-navy transition hover:bg-pale-gold/70"
          >
            {messages.profile.accountSettings}
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="block w-full border-t border-navy/10 px-4 py-3 text-left text-sm font-semibold text-navy/70 transition hover:bg-pale-gold/70 hover:text-navy"
          >
            {messages.profile.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
