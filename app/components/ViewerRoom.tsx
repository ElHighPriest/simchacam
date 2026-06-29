"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import type { Room } from "livekit-client";
import { Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import {
  getLocaleDirection,
  getMessages,
  type Locale,
} from "@/lib/i18n";

type ViewerRoomProps = {
  room: Room;
  token: string;
  serverUrl: string;
  eventName: string | null;
  eventAt: string | null;
  locale?: Locale;
  slug: string;
};

function isIOSOrIPadOSBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function ViewerContent({
  eventName,
  eventAt,
  locale = "en",
  slug,
}: {
  eventName: string | null;
  eventAt: string | null;
  locale?: Locale;
  slug: string;
}) {
  const messages = getMessages(locale);
  const t = messages.viewer;
  const [status, setStatus] = useState<string | null>(null);
  const [showHostDelayMessage, setShowHostDelayMessage] = useState(false);
  const [isTheatreMode, setIsTheatreMode] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const videoShellRef = useRef<HTMLDivElement | null>(null);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const streamerTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === "streamer"
  );

  useEffect(() => {
    if (streamerTrack) {
      const reset = window.setTimeout(() => {
        setShowHostDelayMessage(false);
      }, 0);

      return () => window.clearTimeout(reset);
    }

    const timeout = window.setTimeout(() => {
      setShowHostDelayMessage(true);
    }, 30000);

    return () => window.clearTimeout(timeout);
  }, [streamerTrack]);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status || null);
        }
      } catch {
        // Keep the current state and retry on the next polling interval.
      }
    }

    checkStatus();

    const interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [slug]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
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

  async function enterFullscreen() {
    const videoShell = videoShellRef.current;

    if (!videoShell) {
      return;
    }

    if (isIOSOrIPadOSBrowser()) {
      setIsTheatreMode(true);
      return;
    }

    if (document.fullscreenEnabled && videoShell.requestFullscreen) {
      try {
        await videoShell.requestFullscreen();
        return;
      } catch {
        // iOS Safari commonly refuses fullscreen on arbitrary containers.
      }
    }

    setIsTheatreMode(true);
  }

  async function exitFullscreen() {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Keep theatre mode cleanup below as the reliable fallback.
      }
    }

    setIsTheatreMode(false);
  }

  if (!streamerTrack && status === "ended") {
    return (
      <main className="relative flex h-screen w-full max-w-full items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="min-w-0 max-w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            SimchaCam
          </p>
          <h1 className="wrap-anywhere mt-4 max-w-full font-display text-4xl font-semibold">
            {eventName}
          </h1>
          <p className="mt-4 text-white/70">{t.streamEnded}</p>
        </div>
      </main>
    );
  }

  if (!streamerTrack) {
    return (
      <main className="relative flex h-screen w-full max-w-full items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="min-w-0 max-w-full">
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full border-2 border-gold bg-gold/10" />
          <h1 className="wrap-anywhere mt-5 max-w-full font-display text-4xl font-semibold">
            {eventName}
          </h1>
          <p className="mt-3 text-white/70">
            {showHostDelayMessage
              ? t.hostNotPresent
              : t.connectingToLivestream}
          </p>
        </div>
      </main>
    );
  }

  const isExpanded = isTheatreMode || isNativeFullscreen;

  return (
    <main className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#05070d] text-white">
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
              LIVE
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
          <ParticipantTile
            trackRef={streamerTrack}
            className="h-full max-h-full w-full max-w-full overflow-hidden [border-radius:inherit] [&_.lk-participant-media-video]:h-full [&_.lk-participant-media-video]:w-full [&_.lk-participant-media-video]:object-contain [&_.lk-participant-metadata]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
          />

          <button
            type="button"
            onClick={isExpanded ? exitFullscreen : enterFullscreen}
            aria-label={isExpanded ? t.exitFullscreen : t.fullscreen}
            title={isExpanded ? t.exitFullscreen : t.fullscreen}
            className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-gold sm:right-4 sm:top-4"
          >
            {isExpanded ? (
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
                <path d="M8 3v5H3" />
                <path d="m3 3 5 5" />
                <path d="M16 3v5h5" />
                <path d="m21 3-5 5" />
                <path d="M8 21v-5H3" />
                <path d="m3 21 5-5" />
                <path d="M16 21v-5h5" />
                <path d="m21 21-5-5" />
              </svg>
            ) : (
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
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
              </svg>
            )}
          </button>
        </div>
      </section>
      </div>

      <RoomAudioRenderer />
    </main>
  );
}

export default function ViewerRoom({
  room,
  token,
  serverUrl,
  eventName,
  eventAt,
  locale = "en",
  slug,
}: ViewerRoomProps) {
  return (
    <LiveKitRoom
      lang={locale}
      dir={getLocaleDirection(locale)}
      room={room}
      video={false}
      audio={false}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{
        height: "100dvh",
        maxWidth: "100vw",
        overflow: "hidden",
        width: "100%",
      }}
      connectOptions={{
        autoSubscribe: true,
      }}
    >
      <ViewerContent
        eventName={eventName}
        eventAt={eventAt}
        locale={locale}
        slug={slug}
      />
    </LiveKitRoom>
  );
}
