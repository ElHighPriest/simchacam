"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  AdminEventDateFilter,
  AdminEventsResponse,
  AdminEventStatusFilter,
  AdminLiveEvent,
} from "@/lib/admin";

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
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

function HealthBadge({ health }: { health: AdminLiveEvent["health"] }) {
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

export default function AdminEventsPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminEventsResponse | null>(null);
  const [dateFilter, setDateFilter] = useState<AdminEventDateFilter>("30d");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] =
    useState<AdminEventStatusFilter>("ended");

  const loadEvents = useCallback(async () => {
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/auth");
      return;
    }

    const params = new URLSearchParams({
      date: dateFilter,
      status: statusFilter,
    });
    const response = await fetch(`/api/admin/events?${params.toString()}`, {
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
      setError(body?.error || "Could not load events");
      setLoading(false);
      return;
    }

    setData(body as AdminEventsResponse);
    setLoading(false);
  }, [dateFilter, router, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadEvents]);

  const totalCurrentViewers = useMemo(() => {
    if (data?.summary.totalCurrentViewers === null) {
      return "Unknown";
    }

    return String(data?.summary.totalCurrentViewers ?? 0);
  }, [data]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            Loading event analytics...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-center text-navy">
        <section className="max-w-md rounded-[1.5rem] border border-gold/25 bg-white/80 p-8 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            Admin
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold">
            {error}
          </h1>
          <p className="mt-4 text-muted-navy">
            This area is restricted to SimchaCam administrators.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-warm-white px-5 py-8 text-navy sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-semibold text-muted-navy transition hover:text-navy"
            >
              Back to live operations
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-gold">
              SimchaCam Admin
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              Event analytics
            </h1>
            <p className="mt-3 max-w-2xl text-muted-navy">
              Review live and completed events using the stream, recording and
              session data already stored by SimchaCam.
            </p>
          </div>
          <button
            type="button"
            onClick={loadEvents}
            className="min-h-11 rounded-xl border border-navy/10 bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-pale-gold/45"
          >
            Refresh
          </button>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Events", data?.summary.events ?? 0],
            ["Current viewers", totalCurrentViewers],
            ["Healthy", data?.summary.healthy ?? 0],
            ["Warning", data?.summary.warning ?? 0],
            ["Critical", data?.summary.critical ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[1.25rem] border border-gold/25 bg-white/80 p-5 shadow-[0_14px_40px_rgba(11,31,58,0.06)]"
            >
              <p className="text-sm text-muted-navy">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 flex flex-col gap-3 rounded-[1.25rem] border border-gold/25 bg-white/80 p-4 shadow-[0_14px_40px_rgba(11,31,58,0.06)] sm:flex-row sm:items-center">
          <label className="text-sm font-semibold text-navy">
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as AdminEventStatusFilter)
              }
              className="mt-1 block min-h-11 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-medium"
            >
              <option value="live">Live</option>
              <option value="ended">Ended</option>
              <option value="all">All</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-navy">
            Date
            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as AdminEventDateFilter)
              }
              className="mt-1 block min-h-11 rounded-xl border border-navy/10 bg-white px-3 py-2 text-sm font-medium"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
        </section>

        <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-gold/25 bg-white/80 shadow-[0_18px_50px_rgba(11,31,58,0.08)]">
          <div className="overflow-x-auto">
            <table className="min-w-[1420px] divide-y divide-navy/10 text-left text-sm">
              <thead className="bg-pale-gold/40 text-xs uppercase tracking-[0.14em] text-navy/60">
                <tr>
                  <th className="px-4 py-4">Event</th>
                  <th className="px-4 py-4">Slug</th>
                  <th className="px-4 py-4">Host email</th>
                  <th className="px-4 py-4">Plan</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Started</th>
                  <th className="px-4 py-4">Ended</th>
                  <th className="px-4 py-4">Duration</th>
                  <th className="px-4 py-4">Recording</th>
                  <th className="px-4 py-4">Current</th>
                  <th className="px-4 py-4">Peak</th>
                  <th className="px-4 py-4">Unique</th>
                  <th className="px-4 py-4">Sessions</th>
                  <th className="px-4 py-4">Watch time</th>
                  <th className="px-4 py-4">Last activity</th>
                  <th className="px-4 py-4">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/8">
                {data?.events.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-muted-navy" colSpan={16}>
                      No events match these filters.
                    </td>
                  </tr>
                )}
                {data?.events.map((event) => (
                  <tr key={event.event.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/events/${event.event.id}`}
                        className="font-semibold text-navy underline-offset-4 hover:underline"
                      >
                        {event.event.name || "Untitled event"}
                      </Link>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">
                      {event.event.slug || "Unknown"}
                    </td>
                    <td className="px-4 py-4" dir="ltr">
                      {event.hostEmail || "Unknown"}
                    </td>
                    <td className="px-4 py-4 capitalize">{event.plan}</td>
                    <td className="px-4 py-4 capitalize">
                      {event.event.status || "Unknown"}
                    </td>
                    <td className="px-4 py-4">{formatDate(event.startedAt)}</td>
                    <td className="px-4 py-4">{formatDate(event.endedAt)}</td>
                    <td className="px-4 py-4">
                      {formatDurationMs(event.streamDurationMs)}
                    </td>
                    <td className="px-4 py-4">
                      {event.recordingStatus ?? "Unknown"}
                    </td>
                    <td className="px-4 py-4">
                      {event.currentViewers ?? "Unknown"}
                    </td>
                    <td className="px-4 py-4">
                      {event.peakViewers ?? "Unknown"}
                    </td>
                    <td className="px-4 py-4">
                      {event.uniqueViewers ?? "Unknown"}
                    </td>
                    <td className="px-4 py-4">{event.viewerSessionCount}</td>
                    <td className="px-4 py-4">
                      {formatDurationMs(event.totalWatchTimeMs)}
                    </td>
                    <td className="px-4 py-4">
                      {formatDate(event.lastViewerActivityAt)}
                    </td>
                    <td className="px-4 py-4">
                      <HealthBadge health={event.health} />
                      <p className="mt-2 max-w-48 text-xs leading-5 text-muted-navy">
                        {event.healthReasons.join("; ")}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
