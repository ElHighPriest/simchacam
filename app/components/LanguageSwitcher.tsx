"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getMessages,
  isLocale,
  type Locale,
} from "@/lib/i18n";

type PreferenceTab = "language" | "currency";
type PopoverPosition = {
  left: number;
  top: number;
};

const POPOVER_WIDTH = 384;
const POPOVER_MARGIN = 12;
const POPOVER_GAP = 10;

function buildLanguageHref(pathname: string, locale: Locale) {
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (pathname === "/" || !pathname) {
    return `/${locale}`;
  }

  if (firstSegment && isLocale(firstSegment)) {
    if (segments.length === 1) {
      return `/${locale}`;
    }

    return `/${locale}/${segments.slice(1).join("/")}`;
  }

  return `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function Checkmark() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = getLocaleFromPathname(pathname);
  const messages = getMessages(currentLocale);
  const t = messages.preferences;
  const direction = getLocaleDirection(currentLocale);
  const currentCurrency = currentLocale === "he" ? "ils" : "gbp";
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PreferenceTab>("language");
  const [popoverPosition, setPopoverPosition] =
    useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function updatePopoverPosition() {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (viewportWidth < 640) {
      setPopoverPosition(null);
      return;
    }

    const estimatedPopoverHeight = 360;
    const maxLeft = viewportWidth - POPOVER_WIDTH - POPOVER_MARGIN;
    const left = Math.max(
      POPOVER_MARGIN,
      Math.min(rect.right - POPOVER_WIDTH, Math.max(POPOVER_MARGIN, maxLeft))
    );
    const belowTop = rect.bottom + POPOVER_GAP;
    const top =
      belowTop + estimatedPopoverHeight <= viewportHeight - POPOVER_MARGIN
        ? belowTop
        : Math.max(POPOVER_MARGIN, viewportHeight - estimatedPopoverHeight - POPOVER_MARGIN);

    setPopoverPosition({ left, top });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [isOpen]);

  function selectLanguage(locale: Locale) {
    setIsOpen(false);
    router.push(buildLanguageHref(pathname, locale));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t.buttonLabel}
        onClick={() => {
          setActiveTab("language");
          updatePopoverPosition();
          setIsOpen(true);
        }}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-navy/10 bg-white/70 px-3 py-2 text-sm font-semibold text-navy shadow-sm transition hover:border-gold/45 hover:bg-white"
      >
        <span aria-hidden="true">🌐</span>
        <span>{currentLocale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-navy/45 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="preferences-title"
            dir={direction}
            style={
              popoverPosition
                ? {
                    left: popoverPosition.left,
                    top: popoverPosition.top,
                  }
                : undefined
            }
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] top-auto flex max-h-[min(88dvh,34rem)] flex-col overflow-hidden rounded-[1.5rem] border border-gold/25 bg-warm-white text-navy shadow-[0_24px_70px_rgba(11,31,58,0.24)] sm:inset-auto sm:w-[24rem] sm:max-w-[calc(100vw-1.5rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-4 border-b border-navy/10 px-5 py-4">
              <h2
                id="preferences-title"
                className="font-display text-2xl font-semibold"
              >
                {t.selectPreferences}
              </h2>
              <button
                type="button"
                aria-label={messages.common.cancel}
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-navy/55 transition hover:bg-navy/5 hover:text-navy"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  ×
                </span>
              </button>
            </header>

            <div className="border-b border-navy/10 px-5 pt-4">
              <div className="grid grid-cols-2 rounded-full bg-white/70 p-1 text-sm font-semibold">
                {(
                  [
                    ["language", t.language],
                    ["currency", t.currency],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={
                      activeTab === tab
                        ? "rounded-full bg-navy px-4 py-2.5 text-warm-white"
                        : "rounded-full px-4 py-2.5 text-navy/65 transition hover:text-navy"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5">
              {activeTab === "language" ? (
                <div className="space-y-3">
                  {(
                    [
                      ["en", t.english],
                      ["he", t.hebrew],
                    ] as const
                  ).map(([locale, label]) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => selectLanguage(locale)}
                      className="flex min-h-12 w-full items-center justify-between rounded-xl border border-navy/10 bg-white/70 px-4 py-3 text-start font-semibold text-navy transition hover:border-gold/50 hover:bg-white"
                    >
                      <span>{label}</span>
                      {currentLocale === locale && (
                        <span className="text-gold">
                          <Checkmark />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* TODO: Store an independent currency preference when pricing is decoupled from locale. */}
                  {(
                    [
                      ["gbp", t.gbp],
                      ["ils", t.ils],
                    ] as const
                  ).map(([currency, label]) => (
                    <button
                      key={currency}
                      type="button"
                      disabled
                      className="flex min-h-12 w-full items-center justify-between rounded-xl border border-navy/10 bg-white/60 px-4 py-3 text-start font-semibold text-navy disabled:cursor-default"
                    >
                      <span>{label}</span>
                      {currentCurrency === currency && (
                        <span className="text-gold">
                          <Checkmark />
                        </span>
                      )}
                    </button>
                  ))}
                  <p className="text-sm leading-6 text-muted-navy">
                    {t.currencyDescription}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
