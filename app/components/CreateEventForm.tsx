"use client";

import Image from "next/image";
import Link from "next/link";

type CreateEventFormProps = {
  eventDate: string;
  eventName: string;
  eventTime: string;
  isCreating: boolean;
  onBack: () => void;
  onCreate: () => void;
  onEventDateChange: (value: string) => void;
  onEventNameChange: (value: string) => void;
  onEventTimeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  password: string;
};

export default function CreateEventForm({
  eventDate,
  eventName,
  eventTime,
  isCreating,
  onBack,
  onCreate,
  onEventDateChange,
  onEventNameChange,
  onEventTimeChange,
  onPasswordChange,
  password,
}: CreateEventFormProps) {
  return (
    <main className="min-h-screen bg-warm-white text-navy">
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5 sm:px-8">
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
          <button
            onClick={onBack}
            className="text-sm font-semibold text-navy/65 transition hover:text-navy"
          >
            Cancel
          </button>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-navy transition hover:text-navy"
        >
          <span aria-hidden="true">←</span>
          Back
        </button>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
          Create a celebration
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
          Create Event
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-navy">
          Set up a private livestream page for your simcha. You can share the
          event link as soon as it is created.
        </p>

        <div className="mt-10 space-y-6">
          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Event details
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Name your simcha
            </h2>
            <label
              className="mt-6 block text-sm font-semibold"
              htmlFor="event-name"
            >
              Event name
            </label>
            <input
              id="event-name"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/60"
              placeholder="Aryeh & Devorah Wedding"
              value={eventName}
              onChange={(event) => onEventNameChange(event.target.value)}
            />
          </section>

          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Date and time
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              When is the event?
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  className="block text-sm font-semibold"
                  htmlFor="event-date"
                >
                  Event date
                </label>
                <input
                  id="event-date"
                  type="date"
                  className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
                  value={eventDate}
                  onChange={(event) => onEventDateChange(event.target.value)}
                />
              </div>
              <div>
                <label
                  className="block text-sm font-semibold"
                  htmlFor="event-time"
                >
                  Event time
                </label>
                <input
                  id="event-time"
                  type="time"
                  className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
                  value={eventTime}
                  onChange={(event) => onEventTimeChange(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Privacy
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Private viewing
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              Add an optional password so only invited family and friends can
              enter the livestream and access its recording.
            </p>
            <label
              className="mt-6 block text-sm font-semibold"
              htmlFor="event-password"
            >
              Event password{" "}
              <span className="font-normal text-muted-navy">(optional)</span>
            </label>
            <input
              id="event-password"
              type="password"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/60"
              placeholder="Choose a password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </section>

          <section className="rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
                  Premium recording
                </div>
                <h2 className="mt-4 font-display text-3xl font-semibold">
                  Recording, Replay & Download
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  Keep the celebration available for invited viewers for 30
                  days after the event.
                </p>
                <p className="mt-4 font-semibold">£4.99 Premium Feature</p>
                <p className="mt-1 text-xs font-medium text-muted-navy">
                  Create the event first, then upgrade to Premium.
                </p>
              </div>

              <button
                type="button"
                disabled
                aria-label="Create the event first, then upgrade to Premium"
                className="flex h-8 w-14 shrink-0 cursor-not-allowed items-center rounded-full bg-navy/15 p-1"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-navy/45 shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
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
            onClick={onCreate}
            disabled={isCreating}
            className="min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
          >
            {isCreating ? "Creating Event..." : "Create Event"}
          </button>
        </div>
      </div>
    </main>
  );
}
