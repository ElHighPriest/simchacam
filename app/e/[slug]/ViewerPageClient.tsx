"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ViewerRoom from "@/app/components/ViewerRoom";

type ViewerPageClientProps = {
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

function formatEventDate(eventAt: string | null) {
  if (!eventAt) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
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
      <div className="mx-auto flex h-20 max-w-5xl items-center justify-center px-5">
        <div className="relative h-10 w-36 overflow-hidden sm:h-12 sm:w-44">
          <Image
            src="/simchacam-logo.svg"
            alt="SimchaCam"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover object-center mix-blend-multiply"
          />
        </div>
      </div>
    </header>
  );
}

export default function ViewerPageClient({ slug }: ViewerPageClientProps) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordPassed, setPasswordPassed] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
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
          setEventError("Event not found.");
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
  }, [slug]);

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
          throw new Error(data.error);
        }

        setToken(data.token);
        setServerUrl(data.url);
      } catch (error) {
        autoJoinStarted.current = false;
        console.error(error);
        setEventError("Could not connect to livestream.");
      }
    }

    autoJoinLivestream();
  }, [enteredPassword, event?.status, eventHasPassword, passwordPassed, slug]);

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
      setPasswordError("Incorrect password");
    }
  }

  async function joinLivestream() {
    setStreamLoading(true);

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
        throw new Error(data.error);
      }

      setToken(data.token);
      setServerUrl(data.url);
    } catch (error) {
      console.error(error);
      setEventError("Could not connect to livestream.");
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
        throw new Error(data.error);
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      setRecordingError("Could not access recording.");
      setRecordingAction(null);
    }
  }

  if (eventLoading) {
    return (
      <main className="flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            Loading event...
          </p>
        </div>
      </main>
    );
  }

  if (eventError || !event) {
    return (
      <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-6 text-center text-navy">
        <ViewerHeader />
        <div className="w-full min-w-0 max-w-md rounded-[1.5rem] border border-gold/30 bg-white/75 px-6 py-10 shadow-[0_18px_50px_rgba(11,31,58,0.07)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            Event unavailable
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold">
            We couldn&apos;t open this event
          </h1>
          <p className="mt-4 text-muted-navy">
            {eventError || "Event not found."}
          </p>
        </div>
      </main>
    );
  }

  const formattedDate = formatEventDate(event.eventAt);
  const readyRecordingSegments =
    event.recording?.status === "ready" ? event.recording.segments ?? [] : [];
  const hasMultipleRecordingSegments = readyRecordingSegments.length > 1;

  if (eventHasPassword && !passwordPassed) {
    return (
      <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy">
        <ViewerHeader />
        <div className="w-full min-w-0 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            Private event
          </p>
          <h1 className="wrap-anywhere mt-3 max-w-full font-display text-5xl font-semibold leading-none">
            {event.name}
          </h1>
          {formattedDate && (
            <p className="mt-4 font-medium text-muted-navy">{formattedDate}</p>
          )}

          <section className="mt-8 rounded-[1.5rem] border border-gold/30 bg-white/75 p-6 text-left shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-7">
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
              Enter the event password
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              This livestream is private. Enter the password shared by the
              host to continue.
            </p>
            <input
              type="password"
              className="mt-5 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 text-navy placeholder:text-muted-navy/65"
              placeholder="Event password"
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
              Enter Event
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
      />
    );
  }

  if (event.status === "ended") {
    return (
      <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy">
        <ViewerHeader />
        <div className="w-full min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            Event recording
          </p>
          <h1 className="wrap-anywhere mt-3 max-w-full font-display text-5xl font-semibold leading-none sm:text-6xl">
            {event.name}
          </h1>
          {formattedDate && (
            <p className="mt-4 font-medium text-muted-navy">{formattedDate}</p>
          )}

          <section className="mt-9 rounded-[1.5rem] border border-gold/30 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-8">
            <p className="text-muted-navy">This livestream has ended.</p>

            {event.recording?.status === "processing" && (
              <div className="py-6">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                <h2 className="mt-5 font-display text-3xl font-semibold">
                  Recording is processing
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  The replay is being prepared. This page will update
                  automatically when it is ready.
                </p>
              </div>
            )}

            {event.recording?.status === "failed" && (
              <div className="py-6">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-recording-red">
                  <span className="text-xl font-semibold">!</span>
                </div>
                <h2 className="mt-5 font-display text-3xl font-semibold">
                  Recording failed
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  Unfortunately, a replay is not available for this event.
                </p>
              </div>
            )}

            {event.recording?.status === "ready" &&
              event.recording.expiresAt && (
                <div className="pt-6">
                  <div className="rounded-xl bg-pale-gold px-4 py-3 text-sm font-semibold text-navy">
                    Available until{" "}
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(event.recording.expiresAt))}
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
                            className="rounded-2xl border border-gold/25 bg-warm-white/80 p-4 text-left"
                          >
                            <p className="text-sm font-semibold text-navy">
                              Part {segment.segmentIndex}
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
                                  ? "Opening..."
                                  : "Watch"}
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
                                    ? "Preparing..."
                                    : "Download"}
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
                          ? "Opening..."
                          : "Watch Recording"}
                      </button>

                      {event.recording.downloadEnabled && (
                        <button
                          onClick={() => openRecording("download")}
                          disabled={recordingAction !== null}
                          className="min-h-13 w-full rounded-xl border border-gold/50 bg-pale-gold/45 px-6 py-3.5 text-lg font-semibold text-navy transition hover:bg-pale-gold disabled:cursor-wait disabled:text-navy/40"
                        >
                          {recordingAction === "download"
                            ? "Preparing..."
                            : "Download Recording"}
                        </button>
                      )}
                    </div>
                  )}

                  <p className="mt-5 text-xs leading-5 text-muted-navy">
                    Please share this private recording only with invited
                    family and friends.
                  </p>
                </div>
              )}

            {!event.recording && (
              <div className="pt-5">
                <h2 className="font-display text-3xl font-semibold">
                  Thank you for joining
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  No recording is currently available for this event.
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
      <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy">
        <ViewerHeader />
        <div className="w-full min-w-0 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            You&apos;re invited
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
              Waiting for the host
            </h2>
            <p className="mt-3 leading-7 text-muted-navy">
              The livestream has not started yet. It will begin automatically
              on this page when the host goes live.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-warm-white px-5 py-28 text-center text-navy">
      <ViewerHeader />
      <div className="w-full min-w-0 max-w-lg">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-recording-red">
          <span className="h-2 w-2 rounded-full bg-recording-red shadow-[0_0_0_4px_rgba(229,57,53,0.12)]" />
          Live now
        </div>
        <h1 className="wrap-anywhere mt-5 max-w-full font-display text-5xl font-semibold leading-none sm:text-6xl">
          {event.name}
        </h1>
        {formattedDate && (
          <p className="mt-4 font-medium text-muted-navy">{formattedDate}</p>
        )}
        <p className="mt-5 text-muted-navy">
          The livestream is ready to watch.
        </p>

        <button
          onClick={joinLivestream}
          disabled={streamLoading}
          className="mt-8 min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
        >
          {streamLoading ? "Connecting..." : "Join Livestream"}
        </button>
      </div>
    </main>
  );
}
