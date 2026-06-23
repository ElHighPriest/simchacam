"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import ViewerRoom from "@/app/components/ViewerRoom";
import {
  getLocaleDirection,
  getLocaleFromPathname,
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

function ViewerHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-10">
      <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
        <div className="relative h-10 w-36 overflow-hidden sm:h-12 sm:w-44">
          <Image
            src="/simchacam-logo.svg"
            alt="SimchaCam"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover object-center mix-blend-multiply"
          />
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
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
  const autoJoinStarted = useRef(false);

  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (!response.ok) {
          console.error(data.error);
          setEventError(t.eventNotFound);
          setEventLoading(false);
          return;
        }

        setEvent(data);
        setEventLoading(false);
      } catch (error) {
        console.error(error);
      }
    }

    loadEvent();

    const interval = setInterval(loadEvent, 3000);

    return () => clearInterval(interval);
  }, [slug, t.eventNotFound]);

  const eventHasPassword = Boolean(event?.hasPassword);

  useEffect(() => {
    if (
      event?.status !== "live" ||
      (eventHasPassword && !passwordPassed) ||
      autoJoinStarted.current
    ) {
      return;
    }

    autoJoinStarted.current = true;

    async function autoJoinLivestream() {
      try {
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
            autoJoinStarted.current = false;
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
        autoJoinStarted.current = false;
        console.error(error);
        setEventError(t.connectFailed);
      }
    }

    autoJoinLivestream();
  }, [
    enteredPassword,
    event?.status,
    eventHasPassword,
    passwordPassed,
    slug,
    t.connectFailed,
    t.eventFull,
  ]);

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
          autoJoinStarted.current = false;
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
      setEventError(t.connectFailed);
    } finally {
      setStreamLoading(false);
    }
  }

  async function openRecording(
    action: "watch" | "download",
    segmentId?: string | null
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
          autoJoinStarted.current = false;
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
        <ViewerHeader />
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
        </div>
      </main>
    );
  }

  const formattedDate = formatEventDate(event.eventAt, locale);
  const readyRecordingSegments =
    event.recording?.status === "ready" ? event.recording.segments ?? [] : [];
  const hasMultipleRecordingSegments = readyRecordingSegments.length > 1;

  if (eventHasPassword && !passwordPassed) {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy"
      >
        <ViewerHeader />
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
        </div>
      </main>
    );
  }

  if (token && serverUrl) {
    return (
      <ViewerRoom
        token={token}
        serverUrl={serverUrl}
        eventId={event.id}
        eventName={event.name}
        eventAt={event.eventAt}
        locale={locale}
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
        <ViewerHeader />
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
                                  openRecording("watch", segment.id)
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

  if (event.status !== "live") {
    return (
      <main
        lang={locale}
        dir={getLocaleDirection(locale)}
        className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy"
      >
        <ViewerHeader />
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
      <ViewerHeader />
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
        <p className="mt-5 text-muted-navy">
          {t.readyToWatch}
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
      </div>
    </main>
  );
}
