"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EventPasswordInput from "@/app/components/EventPasswordInput";
import { isEmailVerified } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type EventRecord = {
  eventAt: string | null;
  id: string;
  name: string;
  hasRecording: boolean;
  plan: "free" | "premium";
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [password, setPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      const { data: userData } = await supabase.auth.getUser();

      if (!isEmailVerified(userData.user)) {
        router.push("/auth");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      const response = await fetch(`/api/events/id/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(data.error);
        alert("Event not found");
        router.push("/my-events");
        return;
      }

      const event = data as EventRecord;
      setName(event.name || "");
      setHasRecording(Boolean(event.hasRecording));
      setPlan(event.plan === "premium" ? "premium" : "free");

      if (event.eventAt) {
        const eventDateValue = new Date(event.eventAt);

        if (!Number.isNaN(eventDateValue.getTime())) {
          setEventDate(eventDateValue.toISOString().slice(0, 10));
          setEventTime(eventDateValue.toISOString().slice(11, 16));
        }
      }

      setLoading(false);
    }

    loadEvent();
  }, [id, router]);

  async function saveEvent() {
    if (!name.trim()) {
      alert("Please enter an event name");
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      router.push("/auth");
      return;
    }

    const payload: {
      eventAt?: string | null;
      name: string;
      password?: string;
    } = {
      name,
      ...(passwordChanged ? { password } : {}),
    };

    if (plan === "premium") {
      if (eventDate && eventTime) {
        const eventAt = new Date(`${eventDate}T${eventTime}`);

        if (Number.isNaN(eventAt.getTime())) {
          setSaving(false);
          alert("Please enter a valid event date and time");
          return;
        }

        payload.eventAt = eventAt.toISOString();
      } else {
        payload.eventAt = null;
      }
    }

    const response = await fetch(`/api/events/id/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    setSaving(false);

    if (!response.ok) {
      console.error(data.error);
      alert(data.error || "Could not save event");
      return;
    }

    router.push("/my-events");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            Loading event...
          </p>
        </div>
      </main>
    );
  }

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
              src="/simchacam-logo.svg"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>
          <Link
            href="/my-events"
            className="text-sm font-semibold text-navy/65 transition hover:text-navy"
          >
            Cancel
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href="/my-events"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-navy transition hover:text-navy"
        >
          <span aria-hidden="true">←</span>
          Back to My Events
        </Link>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
          Event settings
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
          Edit Event
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-navy">
          Update the event name or change how invited viewers access this
          private event.
        </p>

        <div className="mt-10 space-y-6">
          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Event details
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Event name
            </h2>
            <label
              className="mt-6 block text-sm font-semibold"
              htmlFor="edit-event-name"
            >
              Name shown to viewers
            </label>
            <input
              id="edit-event-name"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </section>

          {plan === "premium" ? (
            <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Event scheduling
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                Date and time
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-navy">
                Set when this Premium livestream is scheduled to take place.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="edit-event-date"
                  >
                    Event date
                  </label>
                  <input
                    id="edit-event-date"
                    type="date"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="edit-event-time"
                  >
                    Event time
                  </label>
                  <input
                    id="edit-event-time"
                    type="time"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
                    value={eventTime}
                    onChange={(event) => setEventTime(event.target.value)}
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
              <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
                Premium feature
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold">
                Event Scheduling
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-navy">
                Upgrade this event to Premium to unlock event scheduling,
                recording, replay and download.
              </p>
              <div className="mt-5 rounded-xl border border-gold/30 bg-white/55 px-4 py-3">
                <p className="text-sm font-semibold text-navy">
                  Locked on the Free plan
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-navy">
                  Premium features are enabled after upgrading this specific
                  event.
                </p>
              </div>
            </section>
          )}

          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Privacy
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              Private viewing
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              Enter a new password to replace the current one. Leave this field
              untouched to keep the existing password.
            </p>
            <label
              className="mt-6 block text-sm font-semibold"
              htmlFor="edit-event-password"
            >
              New event password{" "}
              <span className="font-normal text-muted-navy">(optional)</span>
            </label>
            <EventPasswordInput
              id="edit-event-password"
              name="simchacam_new_event_access_code"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setPasswordChanged(true);
              }}
            />
          </section>

          <section className="rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
            <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
              Premium recording
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold">
              Recording, Replay & Download
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              {hasRecording
                ? "Premium recording is enabled for this event."
                : "Premium recording is not enabled for this event."}
            </p>
          </section>

          <button
            onClick={saveEvent}
            disabled={saving}
            className="min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
