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

function formatDurationMs(value: number | null) {
  if (value === null) {
    return "Unknown";
  }

  const minutesTotal = Math.max(0, Math.round(value / 60000));
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatBytes(value: number | null) {
  if (value === null) {
    return "Unknown";
  }

  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function maskViewerSessionId(value: string) {
  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function HealthBadge({ health }: { health: AdminEventDetailData["health"] }) {
  const classes = {
    critical: "bg-red-50 text-recording-red ring-recording-red/20",
    healthy: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${classes[health]}`}
    >
      {health}
    </span>
  );
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
          href="/admin/events"
          className="text-sm font-semibold text-muted-navy transition hover:text-navy"
        >
          Back to event analytics
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

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status" value={event.event.status || "Unknown"} />
            <Field label="Plan" value={event.plan} />
            <Field
              label="Duration"
              value={formatDurationMs(event.streamDurationMs)}
            />
            <Field
              label="Recording"
              value={event.recording?.status ?? event.recordingStatus ?? "Unknown"}
            />
            <Field label="Peak viewers" value={event.peakViewers ?? "Unknown"} />
            <Field
              label="Unique viewers"
              value={event.uniqueViewers ?? "Unknown"}
            />
            <Field
              label="Total watch time"
              value={formatDurationMs(event.totalWatchTimeMs)}
            />
            <Field
              label="Average watch time"
              value={formatDurationMs(event.averageWatchTimeMs)}
            />
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Host email" value={event.hostEmail || "Unknown"} />
            <Field label="Started at" value={formatDate(event.startedAt)} />
            <Field label="Ended at" value={formatDate(event.endedAt)} />
            <Field label="Hard ends at" value={formatDate(event.hardEndsAt)} />
            <Field
              label="Current viewers"
              value={event.currentViewers ?? "Unknown"}
            />
            <Field
              label="Session status"
              value={event.session?.status ?? "Unknown"}
            />
            <Field
              label="Health / outcome"
              value={
                <div>
                  <HealthBadge health={event.health} />
                  <p className="mt-2 text-xs font-medium leading-5 text-muted-navy">
                    {event.healthReasons.join("; ")}
                  </p>
                </div>
              }
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
                    <div>Ended: {formatDate(session.ended_at ?? null)}</div>
                    <div>
                      End reason: {session.ended_reason ?? "Unknown"}
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <h2 className="font-display text-3xl font-semibold">Recording</h2>
            <dl className="mt-5 grid gap-3 text-sm text-muted-navy sm:grid-cols-2">
              <div>Status: {event.recording?.status ?? "Unknown"}</div>
              <div>Segments: {event.recordingSegmentCount}</div>
              <div>
                Duration: {formatDurationMs(event.recordingTotalDurationMs)}
              </div>
              <div>File size: {formatBytes(event.recordingTotalSizeBytes)}</div>
              <div>Ready: {formatDate(event.recording?.ready_at ?? null)}</div>
              <div>Expires: {formatDate(event.recording?.expires_at ?? null)}</div>
            </dl>
            {event.recording?.error_message && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-recording-red">
                {event.recording.error_message}
              </p>
            )}

            <h3 className="mt-7 text-sm font-semibold uppercase tracking-[0.14em] text-navy/45">
              Recording segments
            </h3>
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
                    <div>
                      Duration: {formatDurationMs(segment.duration_ms ?? null)}
                    </div>
                    <div>Size: {formatBytes(segment.size_bytes ?? null)}</div>
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

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <h2 className="font-display text-3xl font-semibold">
              Viewer analytics
            </h2>
            <dl className="mt-5 grid gap-3 text-sm text-muted-navy sm:grid-cols-2">
              <div>Current viewers: {event.currentViewers ?? "Unknown"}</div>
              <div>Peak viewers: {event.peakViewers ?? "Unknown"}</div>
              <div>Unique viewers: {event.uniqueViewers ?? "Unknown"}</div>
              <div>Viewer sessions: {event.viewerSessionCount}</div>
              <div>
                Last activity: {formatDate(event.lastViewerActivityAt)}
              </div>
              <div>
                Total watch time: {formatDurationMs(event.totalWatchTimeMs)}
              </div>
              <div>
                Average watch time: {formatDurationMs(event.averageWatchTimeMs)}
              </div>
            </dl>
            <p className="mt-4 rounded-xl bg-pale-gold/40 px-4 py-3 text-sm text-muted-navy">
              Viewer analytics are anonymous. Missed unload events are handled
              by treating viewers as stale after recent heartbeat activity.
            </p>
            {event.viewerSessions.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-xl border border-navy/10 bg-white/70">
                <table className="min-w-[760px] divide-y divide-navy/10 text-left text-xs">
                  <thead className="bg-pale-gold/35 uppercase tracking-[0.12em] text-navy/55">
                    <tr>
                      <th className="px-3 py-3">Viewer</th>
                      <th className="px-3 py-3">Joined</th>
                      <th className="px-3 py-3">Last seen</th>
                      <th className="px-3 py-3">Left</th>
                      <th className="px-3 py-3">Watch</th>
                      <th className="px-3 py-3">Device</th>
                      <th className="px-3 py-3">Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/8">
                    {event.viewerSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-3 py-3 font-mono">
                          {maskViewerSessionId(session.viewer_session_id)}
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(session.joined_at)}
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(session.last_seen_at)}
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(session.left_at)}
                        </td>
                        <td className="px-3 py-3">
                          {formatDurationMs(
                            session.watch_seconds === null
                              ? null
                              : session.watch_seconds * 1000
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {session.device_type ?? "Unknown"}
                        </td>
                        <td className="px-3 py-3">
                          {session.browser ?? "Unknown"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-gold/25 bg-white/80 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
            <h2 className="font-display text-3xl font-semibold">
              Technical health
            </h2>
            <dl className="mt-5 grid gap-3 text-sm text-muted-navy sm:grid-cols-2">
              <div>Session status: {event.session?.status ?? "Unknown"}</div>
              <div>Hard end: {formatDate(event.hardEndsAt)}</div>
              <div>
                End reason: {event.session?.ended_reason ?? "Unknown"}
              </div>
              <div>
                Recording failures:{" "}
                {event.recordingSegments.some(
                  (segment) => segment.status === "failed"
                ) || event.recording?.status === "failed"
                  ? "Yes"
                  : "No"}
              </div>
            </dl>
            <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm text-muted-navy">
              <HealthBadge health={event.health} />
              <p className="mt-3 leading-6">{event.healthReasons.join("; ")}</p>
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
