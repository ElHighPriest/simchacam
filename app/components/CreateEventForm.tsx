"use client";

import Image from "next/image";
import Link from "next/link";
import EventPasswordInput from "@/app/components/EventPasswordInput";

type CreateEventFormProps = {
  eventName: string;
  homeHref?: string;
  isCreating: boolean;
  onBack: () => void;
  onCreate: () => void;
  onEventNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  password: string;
  premiumPriceLabel?: string;
};

export default function CreateEventForm({
  eventName,
  homeHref = "/",
  isCreating,
  onBack,
  onCreate,
  onEventNameChange,
  onPasswordChange,
  password,
  premiumPriceLabel = "£9.99 Premium Feature",
}: CreateEventFormProps) {
  return (
    <main id="create-event" className="min-h-screen bg-warm-white text-navy">
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5 sm:px-8">
          <Link
            href={homeHref}
            aria-label="SimchaCam home"
            className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
          >
            <Image
              src="/simchacam-logo.svg"
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
              name="simchacam_event_title"
              type="text"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/60"
              placeholder="Aryeh & Devorah Wedding"
              value={eventName}
              onChange={(event) => onEventNameChange(event.target.value)}
            />
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
            <EventPasswordInput
              id="event-password"
              name="simchacam_event_access_code"
              placeholder="Choose a password"
              value={password}
              onChange={onPasswordChange}
            />
          </section>

          <section className="rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
            <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
              Premium upgrade
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold">
              More time, more guests, and a lasting replay
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              Create your event first, then upgrade that event to Premium when
              you are ready. Premium gives families a fuller livestream
              experience for bigger simchas.
            </p>
            <div className="mt-5 grid gap-2 text-sm font-medium text-navy sm:grid-cols-2">
              {[
                "Event Scheduling (date and time)",
                "Automatic recording",
                "Replay for 30 days",
                "Download recording",
                "Up to 500 viewers",
                "Up to 6 hour livestreams",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-2 rounded-xl bg-white/45 px-3 py-2"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-gold/30 bg-white/55 px-4 py-3">
              <p className="text-sm font-semibold text-navy">
                {premiumPriceLabel}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-navy">
                Premium is purchased after event creation and applies only to
                this specific event.
              </p>
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
