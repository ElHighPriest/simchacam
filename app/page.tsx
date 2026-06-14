"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import CreateEventForm from "./components/CreateEventForm";
import PublicFooter from "./components/PublicFooter";
import StreamerRoom from "./components/StreamerRoom";
import { supabase } from "@/lib/supabase";
import { isEmailVerified } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [password, setPassword] = useState("");
  const [eventCreated, setEventCreated] = useState(false);
  const [eventId, setEventId] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setAuthLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const firstName = user?.user_metadata?.first_name;
  const displayName = firstName || user?.email || "there";

  const eventLink = eventSlug ? `https://simcha.cam/e/${eventSlug}` : "";

  const whatsAppMessage = encodeURIComponent(
    `Please join the livestream for ${eventName}: ${eventLink}`
  );

  function makeSlug(name: string) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");

    const randomCode = Math.random().toString(36).substring(2, 7);

    return `${baseSlug}-${randomCode}`;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setShowForm(false);
    setEventCreated(false);
  }

  async function createEvent() {
    if (!isEmailVerified(user)) {
      alert("Please confirm your email before creating an event");
      return;
    }

    if (!eventName.trim()) {
      alert("Please enter an event name");
      return;
    }

    if (!eventDate || !eventTime) {
      alert("Please enter an event date and time");
      return;
    }

    setIsCreating(true);

    const slug = makeSlug(eventName);
    const eventAt = new Date(`${eventDate}T${eventTime}`);

    if (Number.isNaN(eventAt.getTime())) {
      setIsCreating(false);
      alert("Please enter a valid event date and time");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsCreating(false);
      alert("Please log in before creating an event");
      return;
    }

    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: eventName,
        slug,
        eventAt: eventAt.toISOString(),
        password: password || null,
      }),
    });
    const data = await response.json();

    setIsCreating(false);

    if (!response.ok) {
      console.error(data.error);
      alert(data.error || "Could not create event");
      return;
    }

    setEventId(data.id);
    setEventSlug(slug);
    setEventCreated(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopyMessage("Link copied");
    } catch {
      setCopyMessage("Could not copy link");
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SimchaCam Livestream",
          text: `Please join the livestream for ${eventName}`,
          url: eventLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  async function goLive() {
    const { error: statusError } = await supabase
      .from("events")
      .update({
        status: "live",
      })
      .eq("id", eventId);

    if (statusError) {
      console.error(statusError);
      alert("Could not update event status");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Please log in before starting a livestream");
        return;
      }

      const eventResponse = await fetch(
        `/api/events/id/${encodeURIComponent(eventId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const eventData = await eventResponse.json();

      if (!eventResponse.ok) {
        alert(eventData.error || "Could not load event");
        return;
      }

      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          roomName: eventSlug,
          participantName: "streamer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not start livestream");
        return;
      }

      setLivekitToken(data.token);
      setLivekitUrl(data.url);
      setRecordingEnabled(Boolean(eventData.hasRecording));
      setIsGoingLive(true);
    } catch (error) {
      console.error(error);
      alert("Could not start livestream");
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading SimchaCam...
      </main>
    );
  }

  if (isGoingLive && livekitToken && livekitUrl) {
    return (
      <StreamerRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        eventId={eventId}
        recordingEnabled={recordingEnabled}
      />
    );
  }

  if (eventCreated) {
    const formattedEventDate = new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(`${eventDate}T${eventTime}`));

    return (
      <main className="min-h-screen bg-warm-white text-navy">
        <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
          <nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
            <Link
              href="/"
              aria-label="SimchaCam home"
              className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
            >
              <Image
                src="/simchacam-logo.png"
                alt="SimchaCam"
                fill
                sizes="(max-width: 640px) 144px, 176px"
                className="object-cover object-center mix-blend-multiply"
              />
            </Link>
            <Link
              href="/my-events"
              className="text-sm font-semibold text-navy/70 transition hover:text-navy"
            >
              My Events
            </Link>
          </nav>
        </header>

        <div className="mx-auto flex max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-14">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-pale-gold text-gold">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-gold">
              Event created
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] text-navy sm:text-6xl">
              Your event is ready
            </h1>
            <h2 className="mt-6 font-display text-3xl font-semibold leading-tight text-navy sm:text-4xl">
              {eventName}
            </h2>
            <p className="mt-3 text-base font-medium text-muted-navy">
              {formattedEventDate}
            </p>
          </div>

          <section className="mt-10 rounded-[1.5rem] border border-gold/30 bg-white/75 p-5 shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Your private event link
            </p>
            <Link
              href={`/e/${eventSlug}`}
              className="mt-3 block break-all rounded-xl bg-pale-gold/70 px-4 py-4 text-sm font-semibold text-navy transition hover:bg-pale-gold sm:text-base"
            >
              {eventLink}
            </Link>

            {copyMessage && (
              <p
                role="status"
                className="mt-3 text-sm font-medium text-[#56714f]"
              >
                {copyMessage}
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={copyLink}
                className="min-h-12 rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
              >
                Copy Link
              </button>
              <a
                href={`https://wa.me/?text=${whatsAppMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center rounded-xl bg-[#218c55] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#1b7648]"
              >
                Share on WhatsApp
              </a>
              <Link
                href={`/e/${eventSlug}`}
                className="flex min-h-12 items-center justify-center rounded-xl border border-navy/20 px-5 py-3 text-center font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/50"
              >
                Open Event Page
              </Link>
              <button
                onClick={shareLink}
                className="min-h-12 rounded-xl border border-navy/20 px-5 py-3 font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/50"
              >
                More Sharing Options
              </button>
            </div>
          </section>

          <section className="mt-8 border-t border-gold/30 pt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
              When you&apos;re ready
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-navy">
              Start the livestream when the celebration begins. You can also
              return and start it later from My Events.
            </p>
            <button
              onClick={goLive}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-recording-red px-6 py-4 text-lg font-semibold text-white shadow-[0_12px_28px_rgba(229,57,53,0.2)] transition hover:bg-[#cc302d]"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.18)]" />
              Go Live
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (showForm) {
    return (
      <CreateEventForm
        eventDate={eventDate}
        eventName={eventName}
        eventTime={eventTime}
        isCreating={isCreating}
        onBack={() => setShowForm(false)}
        onCreate={createEvent}
        onEventDateChange={setEventDate}
        onEventNameChange={setEventName}
        onEventTimeChange={setEventTime}
        onPasswordChange={setPassword}
        password={password}
      />
    );
  }

  if (false) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowForm(false)}
            className="text-sm text-gray-500 mb-6"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-bold mb-2">Create Event</h1>

          <p className="text-gray-600 mb-8">
            Set up a private livestream page for your simcha.
          </p>

          <label className="block mb-2 font-medium">Event Name</label>

          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            placeholder="Aryeh & Devorah Wedding"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />

          <label className="block mb-2 font-medium">Event Date</label>

          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />

          <label className="block mb-2 font-medium">Event Time</label>

          <input
            type="time"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
          />

          <label className="block mb-2 font-medium">Password (Optional)</label>

          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
            placeholder="Optional password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <section className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Recording, Replay & Download</p>
                <p className="text-sm text-gray-600 mt-1">
                  Available for 30 days after the event
                </p>
                <p className="text-sm font-medium text-amber-800 mt-2">
                  £4.99 Premium Feature
                </p>
                <p className="text-xs text-gray-500 mt-2">Coming soon</p>
              </div>

              <button
                type="button"
                disabled
                aria-label="Premium recording is coming soon"
                className="shrink-0 w-12 h-7 rounded-full bg-gray-300 p-1 cursor-not-allowed"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-gray-500">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
              </button>
            </div>
          </section>

          <button
            onClick={createEvent}
            disabled={isCreating}
            className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg disabled:bg-gray-400"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-warm-white">
      <header className="relative z-20 border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12"
        >
          <Link
            href="/"
            aria-label="SimchaCam home"
            className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
          >
            <Image
              src="/simchacam-logo.png"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center lg:flex">
              <Link
                href="/how-it-works"
                className="px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy"
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                className="px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy"
              >
                Pricing
              </Link>
            </div>
            {isEmailVerified(user) ? (
              <>
                <Link
                  href="/my-events"
                  className="hidden px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy sm:block"
                >
                  My Events
                </Link>
                <button
                  onClick={logout}
                  className="hidden px-3 py-2 text-sm font-medium text-navy/65 transition hover:text-navy md:block"
                >
                  Sign Out
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="min-h-11 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:px-5"
                >
                  Create Event
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="hidden px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth"
                  className="min-h-11 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:px-5"
                >
                  Create Event
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="relative">
        <div
          aria-hidden="true"
          className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-12 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-gold sm:text-sm">
              Every simcha, shared
            </p>
            <h1 className="font-display text-[3.25rem] font-semibold leading-[0.96] tracking-[-0.035em] text-navy sm:text-6xl lg:text-7xl">
              Bring everyone closer to the celebration.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-navy sm:text-xl">
              Simple, private livestreaming for weddings and family simchas.
              Share the moment beautifully with loved ones anywhere in the
              world.
            </p>

            {isEmailVerified(user) && (
              <p className="mt-5 text-sm font-medium text-navy/65">
                Welcome back, {displayName}
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isEmailVerified(user) ? (
                <>
                  <button
                    onClick={() => setShowForm(true)}
                    className="min-h-13 rounded-xl bg-navy px-7 py-3.5 text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
                  >
                    Create Your Livestream
                  </button>
                  <Link
                    href="/my-events"
                    className="min-h-13 rounded-xl border border-navy/20 px-7 py-3.5 text-center text-base font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/60"
                  >
                    My Events
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="min-h-13 rounded-xl bg-navy px-7 py-3.5 text-center text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
                  >
                    Create Your Livestream
                  </Link>
                  <Link
                    href="/auth"
                    className="min-h-13 rounded-xl border border-navy/20 px-7 py-3.5 text-center text-base font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/60"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-navy/65">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                No app required
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Private event links
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Live from your phone
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl lg:mx-0">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-[2rem] border border-gold/30 sm:-inset-4"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-navy shadow-[0_28px_70px_rgba(11,31,58,0.24)] sm:aspect-[16/11] sm:rounded-[1.75rem]">
              <Image
                src="/simchacam-hero.png"
                alt="A wedding chuppah being livestreamed to family through a phone"
                fill
                preload
                sizes="(max-width: 1024px) 100vw, 56vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/20 bg-navy/85 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur sm:bottom-6 sm:left-6">
                <span className="h-2 w-2 rounded-full bg-recording-red shadow-[0_0_0_4px_rgba(229,57,53,0.18)]" />
                LIVE
              </div>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
