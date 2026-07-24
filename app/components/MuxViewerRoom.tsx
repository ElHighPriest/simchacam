"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import {
  getLocaleDirection,
  getMessages,
  type Locale,
} from "@/lib/i18n";

type MuxViewerRoomProps = {
  eventName: string | null;
  eventAt: string | null;
  locale?: Locale;
  playbackId: string;
};

export default function MuxViewerRoom({
  eventName,
  eventAt,
  locale = "en",
  playbackId,
}: MuxViewerRoomProps) {
  const t = getMessages(locale).viewer;
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const videoShellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isTheatreMode) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsTheatreMode(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [isTheatreMode]);

  const isExpanded = isTheatreMode || isNativeFullscreen;

  async function enterFullscreen() {
    const videoShell = videoShellRef.current;

    if (document.fullscreenEnabled && videoShell?.requestFullscreen) {
      try {
        await videoShell.requestFullscreen();
        return;
      } catch {
        // Theatre mode is the reliable fallback when native fullscreen fails.
      }
    }

    setIsTheatreMode(true);
  }

  async function exitFullscreen() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Theatre mode cleanup below remains available.
      }
    }

    setIsTheatreMode(false);
  }

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#05070d] text-white"
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 py-3 sm:px-5 sm:py-4">
        <header className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-navy/70 px-3 py-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.22)] backdrop-blur sm:px-4 sm:py-3">
          <div className="min-w-0 max-w-full flex-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">
              {eventName}
            </h1>
            {eventAt && (
              <p className="hidden text-xs text-white/45 sm:block">
                {new Date(eventAt).toLocaleString(
                  locale === "he" ? "he-IL" : "en-GB"
                )}
              </p>
            )}
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <div className="flex items-center gap-2 rounded-full bg-recording-red/15 px-3 py-1.5 text-xs font-semibold text-[#ff7774]">
              <span className="h-2 w-2 rounded-full bg-recording-red" />
              {t.liveNow}
            </div>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-2 sm:py-4">
          <div
            ref={videoShellRef}
            className={
              isTheatreMode
                ? "fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] [padding-top:max(0.75rem,env(safe-area-inset-top))]"
                : isNativeFullscreen
                  ? "relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black p-3"
                  : "relative flex aspect-video w-full max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:rounded-3xl"
            }
          >
            <MuxPlayer
              playbackId={playbackId}
              streamType="live"
              autoPlay="muted"
              playsInline
              className="h-full max-h-full w-full max-w-full [border-radius:inherit]"
              metadata={{
                video_title: eventName || "SimchaCam live event",
              }}
            />

            <button
              type="button"
              onClick={isExpanded ? exitFullscreen : enterFullscreen}
              aria-label={isExpanded ? t.exitFullscreen : t.fullscreen}
              title={isExpanded ? t.exitFullscreen : t.fullscreen}
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-gold sm:right-4 sm:top-4"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isExpanded ? (
                  <>
                    <path d="M8 3v5H3" />
                    <path d="m3 3 5 5" />
                    <path d="M16 3v5h5" />
                    <path d="m21 3-5 5" />
                    <path d="M8 21v-5H3" />
                    <path d="m3 21 5-5" />
                    <path d="M16 21v-5h5" />
                    <path d="m21 21-5-5" />
                  </>
                ) : (
                  <>
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                    <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
