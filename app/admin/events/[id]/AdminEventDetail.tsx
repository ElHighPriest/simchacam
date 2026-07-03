"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminEventDetail as AdminEventDetailData } from "@/lib/admin";

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-navy/45">
        {label}
      </p>
      <div className="wrap-anywhere mt-2 text-sm font-semibold text-navy">
        {value ?? "Unknown"}
      </div>
    </div>
  );
}

export default function AdminEventDetail({ id }: { id: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<AdminEventDetailData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      const response = await fetch(`/api/admin/events/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const body = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push("/auth");
        return;
      }

      if (response.status === 403) {
        setError("Not authorised");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(body?.error || "Could not load event detail");
        setLoading(false);
        return;
      }

      setEvent(body.event as AdminEventDetailData);
      setLoading(false);
    }

    void loadEvent();
  }, [id, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            Loading event detail...
          </p>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-center text-navy">
        <section className="max-w-md rounded-[1.5rem] border border-gold/25 bg-white/80 p-8 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            Admin
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold">
            {error || "Event unavailable"}
          </h1>
          <Link
            href="/admin"
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-warm-white"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-white px-5 py-8 text-navy sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-muted-navy transition hover:text-navy"
        >
          Back to live operations
        </Link>

        <div className="mt-6 rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            Event detail
          </p>
          <h1 className="wrap-anywhere mt-3 font-display text-4xl font-semibold sm:text-5xl">
            {event.event.name || "Untitled event"}
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-navy">
            {event.event.slug || "Unknown slug"}
          </p>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Host email" value={event.hostEmail || "Unknown"} />
            <Field label="Event status" value={event.event.status || "Unknown"} />
            <Field label="Plan / tier" value={event.plan} />
            <Field label="Started at" value={formatDate(event.startedAt)} />
            <Field label="Hard ends at" value={formatDate(event.hardEndsAt)} />
            <Field
              label="Current viewers"
              value={event.currentViewers ?? "Unknown"}
            />
            <Field label="Peak viewers" value={event.peakViewers ?? "Unknown"} />
            <Field
              label="Recording status"
              value={event.recording?.status ?? event.recordingStatus ?? "Unknown"}
            />
            <Field
              label="Session status"
              value={event.session?.status ?? "Unknown"}
            />
          </section>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <h2 className="font-display text-3xl font-semibold">
              Stream sessions
            </h2>
            <div className="mt-5 space-y-3">
              {event.sessions.length === 0 && (
                <p className="text-sm text-muted-navy">No sessions found.</p>
              )}
              {event.sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-navy/10 bg-white/70 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold capitalize">{session.status}</p>
                    <p className="font-mono text-xs text-muted-navy">
                      {session.id}
                    </p>
                  </div>
                  <dl className="mt-3 grid gap-2 text-muted-navy sm:grid-cols-2">
                    <div>Started: {formatDate(session.started_at)}</div>
                    <div>Hard end: {formatDate(session.hard_ends_at)}</div>
                    <div>
                      Host connected:{" "}
                      {formatDate(session.host_last_connected_at)}
                    </div>
                    <div>
                      Host disconnected:{" "}
                      {formatDate(session.host_last_disconnected_at)}
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <h2 className="font-display text-3xl font-semibold">
              Recording segments
            </h2>
            <div className="mt-5 space-y-3">
              {event.recordingSegments.length === 0 && (
                <p className="text-sm text-muted-navy">
                  No recording segments found.
                </p>
              )}
              {event.recordingSegments.map((segment) => (
                <div
                  key={`${segment.segment_index}-${segment.livekit_egress_id}`}
                  className="rounded-xl border border-navy/10 bg-white/70 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">
                      Part {segment.segment_index ?? "?"}:{" "}
                      {segment.status ?? "Unknown"}
                    </p>
                    <p className="font-mono text-xs text-muted-navy">
                      {segment.livekit_egress_id || "No egress ID"}
                    </p>
                  </div>
                  <dl className="mt-3 grid gap-2 text-muted-navy sm:grid-cols-2">
                    <div>Started: {formatDate(segment.started_at)}</div>
                    <div>Ended: {formatDate(segment.ended_at)}</div>
                    <div>Ready: {formatDate(segment.ready_at)}</div>
                    <div>
                      Object:{" "}
                      <span className="font-mono text-xs">
                        {segment.object_key || "Unknown"}
                      </span>
                    </div>
                  </dl>
                  {segment.error_message && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-recording-red">
                      {segment.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
          <h2 className="font-display text-3xl font-semibold">Timeline</h2>
          <ol className="mt-5 space-y-3">
            {event.timeline.length === 0 && (
              <li className="text-sm text-muted-navy">
                No timeline timestamps available.
              </li>
            )}
            {event.timeline.map((item, index) => (
              <li
                key={`${item.at}-${index}`}
                className="flex flex-col gap-1 rounded-xl border border-navy/10 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-semibold">{item.label}</span>
                <span className="text-sm text-muted-navy">
                  {formatDate(item.at)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
