"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import MuxViewerRoom from "@/app/components/MuxViewerRoom";
import ViewerRoom from "@/app/components/ViewerRoom";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getLocalizedPath,
  getMessages,
  type Locale,
} from "@/lib/i18n";

type ViewerPageClientProps = {
  locale?: Locale;
  slug: string;
};

type EventRecord = {
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
  streamProvider: "livekit" | "mux";
  eventAt: string | null;
  hasPassword: boolean;
  recording: {
    status: "ready" | "processing" | "failed";
    expiresAt: string | null;
    downloadEnabled: boolean;
    segments?: {
      id: string | null;
      segmentIndex: number;
      readyAt: string | null;
      durationMs: number | null;
      sizeBytes: number | null;
    }[];
  } | null;
};

function formatEventDate(eventAt: string | null, locale: Locale) {
  if (!eventAt) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(eventAt));
}

function formatRecordingDate(eventAt: string | null, locale: Locale) {
  if (!eventAt) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(eventAt));
}

function ViewerHeader({ locale }: { locale: Locale }) {
  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
        <Link
          href={getLocalizedPath(locale)}
          aria-label="SimchaCam"
          className="relative h-10 w-36 overflow-hidden sm:h-12 sm:w-44"
        >
          <Image
            src="/simchacam-logo.svg"
            alt="SimchaCam"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover object-center mix-blend-multiply"
          />
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

function PoweredBySimchaCam({
  locale,
  t,
}: {
  locale: Locale;
  t: ReturnType<typeof getMessages>["viewer"];
}) {
  return (
    <section className="mt-5 rounded-[1.25rem] border border-gold/20 bg-white/55 px-5 py-5 text-center shadow-[0_12px_34px_rgba(11,31,58,0.04)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        {t.poweredByTitle}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-navy">
        {t.poweredByDescription}
      </p>
      <p className="mt-3 text-xs font-semibold tracking-[0.12em] text-navy/65">
        {t.poweredByTrust}
      </p>
      <Link
        href={getLocalizedPath(locale)}
        className="mt-4 inline-flex items-center rounded-full border border-gold/35 bg-pale-gold/55 px-4 py-2 text-sm font-semibold text-navy transition hover:bg-pale-gold"
      >
        {t.poweredByLearnMore}
      </Link>
    </section>
  );
}

function getOrCreateViewerSessionId() {
  const storageKey = "simchacam.viewerSessionId";

  try {
    const existing = window.localStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.localStorage.setItem(storageKey, generated);

    return generated;
  } catch {
    return `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function sendViewerSessionEvent(
  slug: string,
  action: "start" | "heartbeat" | "end",
  viewerSessionId: string,
  useBeacon = false
) {
  const url = `/api/events/${encodeURIComponent(slug)}/viewer-session/${action}`;
  const body = JSON.stringify({ viewerSessionId });

  if (useBeacon && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }

  fetch(url, {
    body,
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: action === "end",
    method: "POST",
  }).catch((error) => {
    console.error("Viewer analytics request failed", error);
  });
}

function useViewerSessionTracking({
  enabled,
  slug,
}: {
  enabled: boolean;
  slug: string;
}) {
  const viewerSessionIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const viewerSessionId =
      viewerSessionIdRef.current ?? getOrCreateViewerSessionId();
    viewerSessionIdRef.current = viewerSessionId;

    if (!startedRef.current) {
      startedRef.current = true;
      sendViewerSessionEvent(slug, "start", viewerSessionId);
    }

    const heartbeat = window.setInterval(() => {
      sendViewerSessionEvent(slug, "heartbeat", viewerSessionId);
    }, 25000);

    function endSession() {
      if (!startedRef.current) {
        return;
      }

      startedRef.current = false;
      sendViewerSessionEvent(slug, "end", viewerSessionId, true);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        endSession();
      }
    }

    window.addEventListener("pagehide", endSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", endSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      endSession();
    };
  }, [enabled, slug]);
}

export default function ViewerPageClient({
  locale: localeProp,
  slug,
}: ViewerPageClientProps) {
  const pathname = usePathname();
  const locale = localeProp ?? getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const t = messages.viewer;
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordPassed, setPasswordPassed] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [recordingAction, setRecordingAction] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [recordingPlayback, setRecordingPlayback] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const [viewerRoom, setViewerRoom] = useState<Room | null>(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState("");
  const viewerRoomRef = useRef<Room | null>(null);
  const hasLoadedEvent = useRef(false);

  function getViewerRoom() {
    if (!viewerRoomRef.current) {
      viewerRoomRef.current = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      setViewerRoom(viewerRoomRef.current);
    }

    return viewerRoomRef.current;
  }

  const loadEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}`);
      const data = await response.json();

      if (!response.ok) {
        console.error(data.error);
        if (!hasLoadedEvent.current) {
          setEventError(t.eventNotFound);
          setEventLoading(false);
        }
        return;
      }

      setEvent(data);
      hasLoadedEvent.current = true;
      setEventError("");
      setEventLoading(false);
    } catch (error) {
      console.error(error);
      if (!hasLoadedEvent.current) {
        setEventError(t.loadFailed);
        setEventLoading(false);
      }
    }
  }, [slug, t.eventNotFound, t.loadFailed]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadEvent();
    }, 0);

    const interval = setInterval(loadEvent, 3000);

    return () => {
      window.clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, [loadEvent]);

  function retryLoadEvent() {
    setEventLoading(true);
    setEventError("");
    void loadEvent();
  }

  const eventHasPassword = Boolean(event?.hasPassword);
  const muxPasswordAccepted = !eventHasPassword || passwordPassed;

  useEffect(() => {
    if (
      event?.streamProvider !== "mux" ||
      !muxPasswordAccepted ||
      event.status === "ended"
    ) {
      return;
    }

    let cancelled = false;

    async function checkMuxPlayback() {
      try {
        const response = await fetch(
          `/api/events/viewer/${encodeURIComponent(slug)}/mux-playback`,
          {
            body: JSON.stringify({ password: enteredPassword }),
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }
        );
        const data = await response.json();

        if (!cancelled && response.ok && data.ready && data.playbackId) {
          setMuxPlaybackId(data.playbackId);
        }
      } catch {
        // Preserve the waiting page and retry while Mux prepares the stream.
      }
    }

    const initialCheck = window.setTimeout(() => {
      void checkMuxPlayback();
    }, 0);
    const interval = window.setInterval(checkMuxPlayback, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(initialCheck);
      window.clearInterval(interval);
    };
  }, [
    enteredPassword,
    event?.status,
    event?.streamProvider,
    muxPasswordAccepted,
    slug,
  ]);

  const viewerTrackingEnabled = Boolean(
    event &&
      (!eventHasPassword || passwordPassed) &&
      (event.status === "live" ||
        muxPlaybackId ||
        event.recording?.status === "ready")
  );

  useViewerSessionTracking({
    enabled: viewerTrackingEnabled,
    slug,
  });

  useEffect(() => {
    return () => {
      viewerRoomRef.current?.disconnect();
      viewerRoomRef.current = null;
    };
  }, []);

  async function checkPassword() {
    const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: enteredPassword,
      }),
    });

    if (response.ok) {
      setPasswordPassed(true);
      setPasswordError("");
    } else {
      setPasswordError(t.incorrectPassword);
    }
  }

  async function joinLivestream() {
    setStreamLoading(true);
    setStreamError("");

    try {
      const room = getViewerRoom();

      try {
        await room.startAudio();
      } catch (error) {
        console.error(error);
        setStreamError(t.audioStartFailed);
        return;
      }

      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: slug,
          participantName: `viewer-${Math.random()
            .toString(36)
            .substring(2, 8)}`,
          password: enteredPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.code === "EVENT_FULL") {
          setToken("");
          setServerUrl("");
          setStreamError(
            t.eventFull
          );
          return;
        }

        if (response.status === 410 || data.code === "STREAM_ENDED") {
          setToken("");
          setServerUrl("");
          setEventError("");
          setEvent((currentEvent) =>
            currentEvent ? { ...currentEvent, status: "ended" } : currentEvent
          );
          return;
        }

        throw new Error(data.error);
      }

      setStreamError("");
      setToken(data.token);
      setServerUrl(data.url);
    } catch (error) {
      console.error(error);
      setStreamError(t.connectFailed);
    } finally {
      setStreamLoading(false);
    }
  }

  async function openRecording(
    action: "watch" | "download",
    segmentId?: string | null,
    segmentIndex?: number
  ) {
    const actionKey = segmentId ? `${action}:${segmentId}` : action;
    setRecordingAction(actionKey);
    setRecordingError("");

    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(slug)}/recording`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            password: enteredPassword,
            segmentId: segmentId || undefined,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 410 || data.code === "STREAM_ENDED") {
          setToken("");
          setServerUrl("");
          setEventError("");
          setEvent((currentEvent) =>
            currentEvent ? { ...currentEvent, status: "ended" } : currentEvent
          );
          return;
        }

        throw new Error(data.error);
      }

      if (action === "watch") {
        setRecordingPlayback({
          title: segmentIndex
            ? t.part.replace("{number}", String(segmentIndex))
            : t.eventRecording,
          url: data.url,
        });
        setRecordingAction(null);
        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      setRecordingError(t.recordingAccessFailed);
      setRecordingAction(null);
    }
  }

  if (eventLoading) {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-6 text-navy"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            {t.loading}
          </p>
        </div>
      </main>
    );
  }

  if (eventError || !event) {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-6 text-center text-navy"
      >
        <ViewerHeader locale={locale} />
        <div className="w-full min-w-0 max-w-md rounded-[1.5rem] border border-gold/30 bg-white/75 px-6 py-10 shadow-[0_18px_50px_rgba(11,31,58,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            {t.eventUnavailable}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold">
            {t.couldNotOpen}
          </h1>
          <p className="mt-4 text-muted-navy">
            {eventError || t.eventNotFound}
          </p>
          <button
            onClick={retryLoadEvent}
            className="mt-6 min-h-12 rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
          >
            {t.tryAgain}
          </button>
        </div>
      </main>
    );
  }

  const formattedDate = formatEventDate(event.eventAt, locale);
  const readyRecordingSegments =
    event.recording?.status === "ready" ? event.recording.segments ?? [] : [];
  const hasMultipleRecordingSegments = readyRecordingSegments.length > 1;

  if (recordingPlayback) {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-black text-white"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 [padding-top:max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0 text-start">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              {t.eventRecording}
            </p>
            <h1 className="wrap-anywhere mt-1 line-clamp-1 text-base font-semibold text-white sm:text-lg">
              {event.name}
            </h1>
          </div>
          <button
            onClick={() => setRecordingPlayback(null)}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            {t.backToRecordingOptions}
          </button>
        </div>

        <section className="flex min-h-0 flex-1 flex-col px-2 pb-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <p className="shrink-0 px-2 pb-2 text-start text-sm font-medium text-white/70">
            {recordingPlayback.title}
          </p>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <video
              key={recordingPlayback.url}
              src={recordingPlayback.url}
              className="h-full w-full bg-black object-contain"
              controls
              playsInline
              preload="metadata"
            />
          </div>
        </section>
      </main>
    );
  }

  if (eventHasPassword && !passwordPassed) {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy"
      >
        <ViewerHeader locale={locale} />
        <div className="w-full min-w-0 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {t.privateEvent}
          </p>
          <h1 className="wrap-anywhere mt-3 max-w-full font-display text-5xl font-semibold leading-none">
            {event.name}
          </h1>
          {formattedDate && (
            <p className="mt-4 font-medium text-muted-navy">{formattedDate}</p>
          )}

          <section className="mt-8 rounded-[1.5rem] border border-gold/30 bg-white/75 p-6 text-start shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-7">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-pale-gold text-gold">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold">
              {t.passwordTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              {t.passwordDescription}
            </p>
            <input
              type="password"
              dir="ltr"
              className="mt-5 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 text-navy placeholder:text-muted-navy/65"
              placeholder={t.passwordPlaceholder}
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
            />

            {passwordError && (
              <p className="mt-3 text-sm font-medium text-recording-red">
                {passwordError}
              </p>
            )}

            <button
              onClick={checkPassword}
              className="mt-5 min-h-12 w-full rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
            >
              {t.enterEvent}
            </button>
          </section>
          <PoweredBySimchaCam locale={locale} t={t} />
        </div>
      </main>
    );
  }

  if (token && serverUrl && viewerRoom) {
    return (
      <ViewerRoom
        room={viewerRoom}
        token={token}
        serverUrl={serverUrl}
        eventName={event.name}
        eventAt={event.eventAt}
        locale={locale}
        slug={slug}
      />
    );
  }

  if (event.status === "ended") {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy"
      >
        <ViewerHeader locale={locale} />
        <div className="w-full min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {t.eventRecording}
          </p>
          <h1 className="wrap-anywhere mt-3 max-w-full font-display text-5xl font-semibold leading-none sm:text-6xl">
            {event.name}
          </h1>
          {formattedDate && (
            <p className="mt-4 font-medium text-muted-navy">{formattedDate}</p>
          )}

          <section className="mt-9 rounded-[1.5rem] border border-gold/30 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-8">
            <p className="text-muted-navy">{t.streamEnded}</p>

            {event.recording?.status === "processing" && (
              <div className="py-6">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                <h2 className="mt-5 font-display text-3xl font-semibold">
                  {t.recordingProcessing}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  {t.recordingProcessingDescription}
                </p>
              </div>
            )}

            {event.recording?.status === "failed" && (
              <div className="py-6">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-recording-red">
                  <span className="text-xl font-semibold">!</span>
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold">
                  {t.recordingFailed}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  {t.recordingFailedDescription}
                </p>
              </div>
            )}

            {event.recording?.status === "ready" &&
              event.recording.expiresAt && (
                <div className="pt-6">
                  <div className="rounded-xl bg-pale-gold px-4 py-3 text-sm font-semibold text-navy">
                    {t.availableUntil.replace(
                      "{date}",
                      formatRecordingDate(event.recording.expiresAt, locale)
                    )}
                  </div>

                  {recordingError && (
                    <p className="mt-4 text-sm font-medium text-recording-red">
                      {recordingError}
                    </p>
                  )}

                  {hasMultipleRecordingSegments ? (
                    <div className="mt-5 grid gap-4">
                      {readyRecordingSegments.map((segment) => {
                        const watchKey = segment.id
                          ? `watch:${segment.id}`
                          : "watch";
                        const downloadKey = segment.id
                          ? `download:${segment.id}`
                          : "download";

                        return (
                          <div
                            key={`${segment.segmentIndex}-${segment.id || "legacy"}`}
                            className="rounded-2xl border border-gold/25 bg-warm-white/80 p-4 text-start"
                          >
                            <p className="text-sm font-semibold text-navy">
                              {t.part.replace(
                                "{number}",
                                String(segment.segmentIndex)
                              )}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <button
                                onClick={() =>
                                  openRecording(
                                    "watch",
                                    segment.id,
                                    segment.segmentIndex
                                  )
                                }
                                disabled={recordingAction !== null}
                                className="min-h-12 rounded-xl bg-navy px-4 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
                              >
                                {recordingAction === watchKey
                                  ? t.opening
                                  : t.watch}
                              </button>

                              {event.recording?.downloadEnabled && (
                                <button
                                  onClick={() =>
                                    openRecording("download", segment.id)
                                  }
                                  disabled={recordingAction !== null}
                                  className="min-h-12 rounded-xl border border-gold/50 bg-pale-gold/45 px-4 py-3 font-semibold text-navy transition hover:bg-pale-gold disabled:cursor-wait disabled:text-navy/40"
                                >
                                  {recordingAction === downloadKey
                                    ? t.preparing
                                    : t.download}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3">
                      <button
                        onClick={() => openRecording("watch")}
                        disabled={recordingAction !== null}
                        className="min-h-13 w-full rounded-xl bg-navy px-6 py-3.5 text-lg font-semibold text-warm-white transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
                      >
                        {recordingAction === "watch"
                          ? t.opening
                          : t.watchRecording}
                      </button>

                      {event.recording.downloadEnabled && (
                        <button
                          onClick={() => openRecording("download")}
                          disabled={recordingAction !== null}
                          className="min-h-13 w-full rounded-xl border border-gold/50 bg-pale-gold/45 px-6 py-3.5 text-lg font-semibold text-navy transition hover:bg-pale-gold disabled:cursor-wait disabled:text-navy/40"
                        >
                          {recordingAction === "download"
                            ? t.preparing
                            : t.downloadRecording}
                        </button>
                      )}
                    </div>
                  )}

                  <p className="mt-5 text-xs leading-5 text-muted-navy">
                    {t.recordingPrivacy}
                  </p>
                </div>
              )}

            {!event.recording && (
              <div className="pt-5">
                <h2 className="font-display text-3xl font-semibold">
                  {t.thankYou}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  {t.noRecording}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (event.streamProvider === "mux" && muxPlaybackId) {
    return (
      <MuxViewerRoom
        eventName={event.name}
        eventAt={event.eventAt}
        locale={locale}
        playbackId={muxPlaybackId}
      />
    );
  }

  if (event.streamProvider === "mux" || event.status !== "live") {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy"
      >
        <ViewerHeader locale={locale} />
        <div className="w-full min-w-0 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {t.invited}
          </p>
          <h1 className="wrap-anywhere mt-3 max-w-full font-display text-5xl font-semibold leading-none sm:text-6xl">
            {event.name}
          </h1>
          {formattedDate && (
            <p className="mt-5 font-medium text-muted-navy">{formattedDate}</p>
          )}

          <section className="mt-9 rounded-[1.5rem] border border-gold/30 bg-white/75 p-7 shadow-[0_18px_50px_rgba(11,31,58,0.07)]">
            <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-gold bg-pale-gold shadow-[0_0_0_8px_rgba(200,169,107,0.12)]" />
            <h2 className="mt-6 font-display text-3xl font-semibold">
              {t.waitingTitle}
            </h2>
            <p className="mt-3 leading-7 text-muted-navy">
              {t.waitingDescription}
            </p>
          </section>
          <PoweredBySimchaCam locale={locale} t={t} />
        </div>
      </main>
    );
  }

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy"
    >
      <ViewerHeader locale={locale} />
      <div className="w-full min-w-0 max-w-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-recording-red">
          <span className="h-2 w-2 rounded-full bg-recording-red shadow-[0_0_0_4px_rgba(229,57,53,0.12)]" />
          {t.liveNow}
        </div>
        <h1 className="wrap-anywhere mt-5 max-w-full font-display text-5xl font-semibold leading-none sm:text-6xl">
          {event.name}
        </h1>
        {formattedDate && (
          <p className="mt-4 font-medium text-muted-navy">{formattedDate}</p>
        )}
        <p className="mt-5 leading-7 text-muted-navy">
          {t.readyToWatch}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-navy">
          {t.watchLiveDescription}
        </p>

        {streamError && (
          <p className="mt-5 rounded-xl border border-gold/30 bg-white/75 px-4 py-3 text-sm font-semibold text-navy shadow-[0_12px_28px_rgba(11,31,58,0.08)]">
            {streamError}
          </p>
        )}

        <button
          onClick={joinLivestream}
          disabled={streamLoading}
          className="mt-8 min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
        >
          {streamLoading ? t.connecting : t.joinLivestream}
        </button>
        <PoweredBySimchaCam locale={locale} t={t} />
      </div>
    </main>
  );
}
