import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isEmailVerified } from "@/lib/auth";
import { getActiveViewerCount } from "@/lib/livekit-rooms";

type AdminAuthResult =
  | {
      ok: true;
      email: string;
      serviceSupabase: SupabaseClient;
    }
  | {
      ok: false;
      error: string;
      status: 401 | 403 | 500;
    };

type EventRow = {
  created_at: string | null;
  event_at: string | null;
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
  user_id: string | null;
};

type StreamSessionRow = {
  ended_at?: string | null;
  ended_reason?: string | null;
  event_id: string;
  hard_ends_at: string | null;
  host_last_connected_at: string | null;
  host_last_disconnected_at: string | null;
  id: string;
  plan: "free" | "premium" | string | null;
  room_name: string | null;
  started_at: string | null;
  status: string | null;
  stream_limit_seconds?: number | null;
  updated_at: string | null;
  viewer_limit: number | null;
};

type RecordingRow = {
  duration_ms?: number | null;
  ended_at: string | null;
  error_message: string | null;
  event_id: string;
  expires_at: string | null;
  livekit_egress_id: string | null;
  object_key: string | null;
  ready_at: string | null;
  size_bytes?: number | null;
  started_at: string | null;
  status: string | null;
  updated_at: string | null;
};

type RecordingSegmentRow = {
  duration_ms?: number | null;
  ended_at: string | null;
  error_message: string | null;
  event_id: string;
  livekit_egress_id: string | null;
  object_key: string | null;
  ready_at: string | null;
  segment_index: number | null;
  size_bytes?: number | null;
  started_at: string | null;
  status: string | null;
  updated_at: string | null;
};

export type AdminHealth = "healthy" | "warning" | "critical";

export type AdminLiveEvent = {
  averageWatchTimeMs: number | null;
  currentViewers: number | null;
  endedAt: string | null;
  event: EventRow;
  hardEndsAt: string | null;
  health: AdminHealth;
  healthReasons: string[];
  hostEmail: string | null;
  lastUpdatedAt: string | null;
  peakViewers: number | null;
  plan: "free" | "premium" | "unknown";
  recordingStatus: string | null;
  session: StreamSessionRow | null;
  startedAt: string | null;
  streamDurationMs: number | null;
  totalWatchTimeMs: number | null;
  uniqueViewers: number | null;
};

export type AdminEventDetail = AdminLiveEvent & {
  recording: RecordingRow | null;
  recordingSegments: RecordingSegmentRow[];
  recordingSegmentCount: number;
  recordingTotalDurationMs: number | null;
  recordingTotalSizeBytes: number | null;
  sessions: StreamSessionRow[];
  timeline: {
    at: string | null;
    label: string;
  }[];
};

export type AdminLiveEventsResponse = {
  events: AdminLiveEvent[];
  summary: {
    critical: number;
    healthy: number;
    liveEvents: number;
    totalCurrentViewers: number | null;
    warning: number;
  };
};

export type AdminEventStatusFilter = "live" | "ended" | "all";
export type AdminEventDateFilter = "7d" | "30d" | "all";

export type AdminEventsResponse = {
  events: AdminLiveEvent[];
  filters: {
    date: AdminEventDateFilter;
    status: AdminEventStatusFilter;
  };
  summary: {
    critical: number;
    events: number;
    healthy: number;
    totalCurrentViewers: number | null;
    warning: number;
  };
};

function upgradeToWarning(health: AdminHealth): AdminHealth {
  return health === "critical" ? health : "warning";
}

function parseAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return null;
  }

  return {
    anonKey,
    serviceRoleKey,
    supabaseUrl,
  };
}

export async function authenticateAdmin(
  authorization: string | null
): Promise<AdminAuthResult> {
  const config = getSupabaseConfig();
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!config) {
    return { ok: false, error: "Admin is not configured", status: 500 };
  }

  if (!accessToken) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  const authSupabase = createClient(config.supabaseUrl, config.anonKey);
  const {
    data: { user },
  } = await authSupabase.auth.getUser(accessToken);

  if (!isEmailVerified(user) || !user.email) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  if (!parseAdminEmails().has(user.email.toLowerCase())) {
    return { ok: false, error: "Not authorised", status: 403 };
  }

  return {
    ok: true,
    email: user.email,
    serviceSupabase: createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}

function dateFrom(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function deriveHealth({
  currentViewers,
  event,
  recording,
  activeSession,
  primarySession,
}: {
  currentViewers: number | null;
  event: EventRow;
  recording: RecordingRow | null;
  activeSession: StreamSessionRow | null;
  primarySession: StreamSessionRow | null;
}) {
  const now = new Date();
  const reasons: string[] = [];
  let health: AdminHealth = "healthy";
  const hardEndsAt = dateFrom(activeSession?.hard_ends_at);
  const updatedAt = dateFrom(activeSession?.updated_at);
  const disconnectedAt = dateFrom(activeSession?.host_last_disconnected_at);
  const connectedAt = dateFrom(activeSession?.host_last_connected_at);

  if (event.status === "live") {
    if (!activeSession) {
      health = "critical";
      reasons.push("No active stream session found");
    } else {
      if (hardEndsAt && hardEndsAt <= now) {
        health = "critical";
        reasons.push("Session is past hard end time");
      } else if (
        hardEndsAt &&
        hardEndsAt.getTime() - now.getTime() <= 10 * 60 * 1000
      ) {
        health = upgradeToWarning(health);
        reasons.push("Close to hard end time");
      }

      if (disconnectedAt && (!connectedAt || disconnectedAt > connectedAt)) {
        const disconnectedForMs = now.getTime() - disconnectedAt.getTime();

        if (disconnectedForMs >= 10 * 60 * 1000) {
          health = "critical";
          reasons.push("Host has been disconnected for over 10 minutes");
        } else {
          health = upgradeToWarning(health);
          reasons.push("Host is inside reconnect grace period");
        }
      }

      if (updatedAt && now.getTime() - updatedAt.getTime() > 15 * 60 * 1000) {
        health = upgradeToWarning(health);
        reasons.push("Session update is older than 15 minutes");
      }
    }
  } else if (event.status === "ended") {
    if (activeSession) {
      health = "critical";
      reasons.push("Event is ended but still has an active session");
    } else if (!primarySession) {
      health = "warning";
      reasons.push("No stream session found");
    } else {
      reasons.push("Event is ended");
    }
  } else {
    health = "warning";
    reasons.push(`Event status is ${event.status ?? "unknown"}`);
  }

  if (primarySession?.plan === "premium" && !recording) {
    health = upgradeToWarning(health);
    reasons.push("Premium recording status is unknown");
  }

  if (recording?.status === "failed") {
    health = upgradeToWarning(health);
    reasons.push("Recording is marked failed");
  }

  if (event.status === "live" && currentViewers === null) {
    health = upgradeToWarning(health);
    reasons.push("Current viewer count unavailable");
  }

  return {
    health,
    healthReasons: reasons.length > 0 ? reasons : ["No obvious issues found"],
  };
}

async function getHostEmails(
  supabase: SupabaseClient,
  userIds: (string | null)[]
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))] as string[];
  const hostEmails = new Map<string, string | null>();

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { data, error } = await supabase.auth.admin.getUserById(userId);

      if (error) {
        console.error("Could not load admin host email", { userId, error });
        hostEmails.set(userId, null);
        return;
      }

      hostEmails.set(userId, data.user?.email ?? null);
    })
  );

  return hostEmails;
}

async function getViewerCount(roomName: string | null) {
  if (!roomName) {
    return null;
  }

  try {
    return await getActiveViewerCount(roomName);
  } catch (error) {
    console.error("Could not load admin viewer count", { roomName, error });
    return null;
  }
}

function isActiveSession(session: StreamSessionRow | null | undefined) {
  return ["starting", "live"].includes(session?.status ?? "");
}

function getPrimarySession(sessions: StreamSessionRow[]) {
  return (
    sessions.find((session) => isActiveSession(session)) ??
    sessions.find((session) => session.started_at || session.ended_at) ??
    sessions[0] ??
    null
  );
}

function getStreamDurationMs(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
  isLive: boolean
) {
  const start = dateFrom(startedAt);

  if (!start) {
    return null;
  }

  const end = dateFrom(endedAt) ?? (isLive ? new Date() : null);

  if (!end) {
    return null;
  }

  return Math.max(0, end.getTime() - start.getTime());
}

async function buildAdminEventRows(
  supabase: SupabaseClient,
  events: EventRow[],
  sessions: StreamSessionRow[],
  recordings: RecordingRow[]
) {
  const sessionsByEventId = new Map<string, StreamSessionRow[]>();

  sessions.forEach((session) => {
    const rows = sessionsByEventId.get(session.event_id) ?? [];
    rows.push(session);
    sessionsByEventId.set(session.event_id, rows);
  });

  const recordingByEventId = new Map(
    recordings.map((recording) => [recording.event_id, recording])
  );
  const hostEmails = await getHostEmails(
    supabase,
    events.map((event) => event.user_id)
  );

  return Promise.all(
    events.map(async (event) => {
      const eventSessions = sessionsByEventId.get(event.id) ?? [];
      const primarySession = getPrimarySession(eventSessions);
      const activeSession =
        eventSessions.find((session) => isActiveSession(session)) ?? null;
      const recording = recordingByEventId.get(event.id) ?? null;
      const shouldLoadCurrentViewers = event.status === "live" && activeSession;
      const currentViewers = shouldLoadCurrentViewers
        ? await getViewerCount(activeSession.room_name ?? event.slug)
        : null;
      const health = deriveHealth({
        activeSession,
        currentViewers,
        event,
        primarySession,
        recording,
      });

      // TODO: add an event_viewer_sessions table in a future phase for true
      // unique viewers, peak viewers, and watch-time analytics.
      return {
        averageWatchTimeMs: null,
        currentViewers,
        endedAt: primarySession?.ended_at ?? null,
        event,
        hardEndsAt: primarySession?.hard_ends_at ?? null,
        ...health,
        hostEmail: event.user_id ? hostEmails.get(event.user_id) ?? null : null,
        lastUpdatedAt: primarySession?.updated_at ?? null,
        peakViewers: null,
        plan:
          primarySession?.plan === "free" || primarySession?.plan === "premium"
            ? primarySession.plan
            : "unknown",
        recordingStatus: recording?.status ?? null,
        session: primarySession,
        startedAt: primarySession?.started_at ?? null,
        streamDurationMs: getStreamDurationMs(
          primarySession?.started_at,
          primarySession?.ended_at,
          event.status === "live"
        ),
        totalWatchTimeMs: null,
        uniqueViewers: null,
      } satisfies AdminLiveEvent;
    })
  );
}

export async function loadAdminLiveEvents(
  supabase: SupabaseClient
): Promise<AdminLiveEventsResponse> {
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, name, slug, status, user_id, event_at, created_at")
    .eq("status", "live")
    .order("created_at", { ascending: false });

  if (eventsError) {
    throw eventsError;
  }

  const liveEvents = (events ?? []) as EventRow[];
  const eventIds = liveEvents.map((event) => event.id);

  if (eventIds.length === 0) {
    return {
      events: [],
      summary: {
        critical: 0,
        healthy: 0,
        liveEvents: 0,
        totalCurrentViewers: 0,
        warning: 0,
      },
    };
  }

  const [{ data: sessions, error: sessionsError }, { data: recordings, error: recordingsError }] =
    await Promise.all([
      supabase
        .from("event_stream_sessions")
        .select(
          "id, event_id, room_name, status, plan, stream_limit_seconds, viewer_limit, started_at, hard_ends_at, ended_at, ended_reason, host_last_connected_at, host_last_disconnected_at, updated_at"
        )
        .in("event_id", eventIds)
        .in("status", ["starting", "live"]),
      supabase
        .from("event_recordings")
        .select(
          "event_id, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, expires_at, duration_ms, size_bytes, error_message, updated_at"
        )
        .in("event_id", eventIds),
    ]);

  if (sessionsError) {
    throw sessionsError;
  }

  if (recordingsError) {
    throw recordingsError;
  }

  const rows = await buildAdminEventRows(
    supabase,
    liveEvents,
    (sessions ?? []) as StreamSessionRow[],
    (recordings ?? []) as RecordingRow[]
  );
  const viewerCounts = rows.map((row) => row.currentViewers);

  return {
    events: rows,
    summary: {
      critical: rows.filter((row) => row.health === "critical").length,
      healthy: rows.filter((row) => row.health === "healthy").length,
      liveEvents: rows.length,
      totalCurrentViewers: viewerCounts.every((count) => count !== null)
        ? (viewerCounts as number[]).reduce((sum, count) => sum + count, 0)
        : null,
      warning: rows.filter((row) => row.health === "warning").length,
    },
  };
}

function normalizeStatusFilter(value: string | null): AdminEventStatusFilter {
  return value === "live" || value === "ended" || value === "all"
    ? value
    : "ended";
}

function normalizeDateFilter(value: string | null): AdminEventDateFilter {
  return value === "7d" || value === "30d" || value === "all"
    ? value
    : "30d";
}

function getDateFilterCutoff(filter: AdminEventDateFilter) {
  const now = Date.now();

  if (filter === "7d") {
    return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (filter === "30d") {
    return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  return null;
}

export async function loadAdminEvents(
  supabase: SupabaseClient,
  options: {
    date?: string | null;
    status?: string | null;
  }
): Promise<AdminEventsResponse> {
  const status = normalizeStatusFilter(options.status ?? null);
  const date = normalizeDateFilter(options.date ?? null);
  const cutoff = getDateFilterCutoff(date);
  let eventsQuery = supabase
    .from("events")
    .select("id, name, slug, status, user_id, event_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    eventsQuery = eventsQuery.eq("status", status);
  }

  if (cutoff) {
    eventsQuery = eventsQuery.gte("created_at", cutoff);
  }

  const { data: events, error: eventsError } = await eventsQuery;

  if (eventsError) {
    throw eventsError;
  }

  const adminEvents = (events ?? []) as EventRow[];
  const eventIds = adminEvents.map((event) => event.id);

  if (eventIds.length === 0) {
    return {
      events: [],
      filters: { date, status },
      summary: {
        critical: 0,
        events: 0,
        healthy: 0,
        totalCurrentViewers: 0,
        warning: 0,
      },
    };
  }

  const [{ data: sessions, error: sessionsError }, { data: recordings, error: recordingsError }] =
    await Promise.all([
      supabase
        .from("event_stream_sessions")
        .select(
          "id, event_id, room_name, status, plan, stream_limit_seconds, viewer_limit, started_at, hard_ends_at, ended_at, ended_reason, host_last_connected_at, host_last_disconnected_at, updated_at"
        )
        .in("event_id", eventIds)
        .order("started_at", { ascending: false }),
      supabase
        .from("event_recordings")
        .select(
          "event_id, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, expires_at, duration_ms, size_bytes, error_message, updated_at"
        )
        .in("event_id", eventIds),
    ]);

  if (sessionsError) {
    throw sessionsError;
  }

  if (recordingsError) {
    throw recordingsError;
  }

  const rows = await buildAdminEventRows(
    supabase,
    adminEvents,
    (sessions ?? []) as StreamSessionRow[],
    (recordings ?? []) as RecordingRow[]
  );
  const viewerCounts = rows
    .filter((row) => row.event.status === "live")
    .map((row) => row.currentViewers);

  return {
    events: rows,
    filters: { date, status },
    summary: {
      critical: rows.filter((row) => row.health === "critical").length,
      events: rows.length,
      healthy: rows.filter((row) => row.health === "healthy").length,
      totalCurrentViewers:
        viewerCounts.length > 0 && viewerCounts.every((count) => count !== null)
          ? (viewerCounts as number[]).reduce((sum, count) => sum + count, 0)
          : viewerCounts.length === 0
            ? 0
            : null,
      warning: rows.filter((row) => row.health === "warning").length,
    },
  };
}

export async function loadAdminEventDetail(
  supabase: SupabaseClient,
  eventId: string
): Promise<AdminEventDetail | null> {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, slug, status, user_id, event_at, created_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    return null;
  }

  const [
    { data: sessions, error: sessionsError },
    { data: recording, error: recordingError },
    { data: recordingSegments, error: segmentsError },
  ] = await Promise.all([
    supabase
      .from("event_stream_sessions")
      .select(
        "id, event_id, room_name, status, plan, stream_limit_seconds, viewer_limit, started_at, hard_ends_at, ended_at, ended_reason, host_last_connected_at, host_last_disconnected_at, updated_at"
      )
      .eq("event_id", eventId)
      .order("started_at", { ascending: false }),
    supabase
      .from("event_recordings")
      .select(
        "event_id, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, expires_at, duration_ms, size_bytes, error_message, updated_at"
      )
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("event_recording_segments")
      .select(
        "event_id, segment_index, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, duration_ms, size_bytes, error_message, updated_at"
      )
      .eq("event_id", eventId)
      .order("segment_index", { ascending: true }),
  ]);

  if (sessionsError) {
    throw sessionsError;
  }

  if (recordingError) {
    throw recordingError;
  }

  if (segmentsError) {
    throw segmentsError;
  }

  const streamSessions = (sessions ?? []) as StreamSessionRow[];
  const [row] = await buildAdminEventRows(
    supabase,
    [event as EventRow],
    streamSessions,
    recording ? [recording as RecordingRow] : []
  );
  const segments = (recordingSegments ?? []) as RecordingSegmentRow[];
  const readySegments = segments.filter((segment) => segment.status === "ready");
  const segmentDurationMs = readySegments.reduce(
    (total, segment) => total + (segment.duration_ms ?? 0),
    0
  );
  const segmentSizeBytes = readySegments.reduce(
    (total, segment) => total + (segment.size_bytes ?? 0),
    0
  );
  const timeline = [
    { at: event.created_at, label: "Event created" },
    ...streamSessions.flatMap((session) => [
      { at: session.started_at, label: `Session ${session.status} started` },
      {
        at: session.host_last_connected_at,
        label: "Host last connected",
      },
      {
        at: session.host_last_disconnected_at,
        label: "Host last disconnected",
      },
      {
        at: session.ended_at ?? null,
        label: `Session ended${session.ended_reason ? `: ${session.ended_reason}` : ""}`,
      },
    ]),
    ...(recording
      ? [
          { at: recording.started_at, label: "Recording started" },
          { at: recording.ended_at, label: "Recording ended" },
          { at: recording.ready_at, label: "Recording ready" },
        ]
      : []),
    ...segments.flatMap((segment) => [
      {
        at: segment.started_at,
        label: `Recording part ${segment.segment_index ?? "?"} started`,
      },
      {
        at: segment.ended_at,
        label: `Recording part ${segment.segment_index ?? "?"} ended`,
      },
      {
        at: segment.ready_at,
        label: `Recording part ${segment.segment_index ?? "?"} ready`,
      },
    ]),
  ]
    .filter((item) => item.at)
    .sort(
      (left, right) =>
        new Date(left.at || 0).getTime() - new Date(right.at || 0).getTime()
    );

  return {
    ...row,
    recording: recording ? (recording as RecordingRow) : null,
    recordingSegments: segments,
    recordingSegmentCount: segments.length,
    recordingTotalDurationMs:
      segmentDurationMs > 0
        ? segmentDurationMs
        : ((recording as RecordingRow | null)?.duration_ms ?? null),
    recordingTotalSizeBytes:
      segmentSizeBytes > 0
        ? segmentSizeBytes
        : ((recording as RecordingRow | null)?.size_bytes ?? null),
    sessions: streamSessions,
    timeline,
  };
}
