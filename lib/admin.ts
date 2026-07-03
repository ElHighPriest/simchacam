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
  ended_at: string | null;
  error_message: string | null;
  event_id: string;
  expires_at: string | null;
  livekit_egress_id: string | null;
  object_key: string | null;
  ready_at: string | null;
  started_at: string | null;
  status: string | null;
  updated_at: string | null;
};

type RecordingSegmentRow = {
  ended_at: string | null;
  error_message: string | null;
  event_id: string;
  livekit_egress_id: string | null;
  object_key: string | null;
  ready_at: string | null;
  segment_index: number | null;
  started_at: string | null;
  status: string | null;
  updated_at: string | null;
};

export type AdminHealth = "healthy" | "warning" | "critical";

export type AdminLiveEvent = {
  currentViewers: number | null;
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
};

export type AdminEventDetail = AdminLiveEvent & {
  recording: RecordingRow | null;
  recordingSegments: RecordingSegmentRow[];
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
  session,
}: {
  currentViewers: number | null;
  event: EventRow;
  recording: RecordingRow | null;
  session: StreamSessionRow | null;
}) {
  const now = new Date();
  const reasons: string[] = [];
  let health: AdminHealth = "healthy";
  const hardEndsAt = dateFrom(session?.hard_ends_at);
  const updatedAt = dateFrom(session?.updated_at);
  const disconnectedAt = dateFrom(session?.host_last_disconnected_at);
  const connectedAt = dateFrom(session?.host_last_connected_at);

  if (event.status !== "live") {
    health = "critical";
    reasons.push("Event is not marked live");
  }

  if (!session) {
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
      health = health === "critical" ? health : "warning";
      reasons.push("Close to hard end time");
    }

    if (disconnectedAt && (!connectedAt || disconnectedAt > connectedAt)) {
      const disconnectedForMs = now.getTime() - disconnectedAt.getTime();

      if (disconnectedForMs >= 10 * 60 * 1000) {
        health = "critical";
        reasons.push("Host has been disconnected for over 10 minutes");
      } else {
        health = health === "critical" ? health : "warning";
        reasons.push("Host is inside reconnect grace period");
      }
    }

    if (updatedAt && now.getTime() - updatedAt.getTime() > 15 * 60 * 1000) {
      health = health === "critical" ? health : "warning";
      reasons.push("Session update is older than 15 minutes");
    }
  }

  if (session?.plan === "premium" && !recording) {
    health = health === "critical" ? health : "warning";
    reasons.push("Premium recording status is unknown");
  }

  if (recording?.status === "failed") {
    health = health === "critical" ? health : "warning";
    reasons.push("Recording is marked failed");
  }

  if (currentViewers === null) {
    health = health === "critical" ? health : "warning";
    reasons.push("Current viewer count unavailable");
  }

  return {
    health,
    healthReasons: reasons.length > 0 ? reasons : ["Live session appears active"],
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

async function buildAdminEventRows(
  supabase: SupabaseClient,
  events: EventRow[],
  activeSessions: StreamSessionRow[],
  recordings: RecordingRow[]
) {
  const sessionByEventId = new Map(
    activeSessions.map((session) => [session.event_id, session])
  );
  const recordingByEventId = new Map(
    recordings.map((recording) => [recording.event_id, recording])
  );
  const hostEmails = await getHostEmails(
    supabase,
    events.map((event) => event.user_id)
  );

  return Promise.all(
    events.map(async (event) => {
      const session = sessionByEventId.get(event.id) ?? null;
      const recording = recordingByEventId.get(event.id) ?? null;
      const currentViewers = await getViewerCount(session?.room_name ?? event.slug);
      const health = deriveHealth({
        currentViewers,
        event,
        recording,
        session,
      });

      return {
        currentViewers,
        event,
        hardEndsAt: session?.hard_ends_at ?? null,
        ...health,
        hostEmail: event.user_id ? hostEmails.get(event.user_id) ?? null : null,
        lastUpdatedAt: session?.updated_at ?? null,
        peakViewers: null,
        plan:
          session?.plan === "free" || session?.plan === "premium"
            ? session.plan
            : "unknown",
        recordingStatus: recording?.status ?? null,
        session,
        startedAt: session?.started_at ?? null,
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
          "event_id, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, expires_at, error_message, updated_at"
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
        "event_id, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, expires_at, error_message, updated_at"
      )
      .eq("event_id", eventId)
      .maybeSingle(),
    supabase
      .from("event_recording_segments")
      .select(
        "event_id, segment_index, status, livekit_egress_id, object_key, started_at, ended_at, ready_at, error_message, updated_at"
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
  const activeSession =
    streamSessions.find((session) =>
      ["starting", "live"].includes(session.status ?? "")
    ) ?? null;
  const [row] = await buildAdminEventRows(
    supabase,
    [event as EventRow],
    activeSession ? [activeSession] : [],
    recording ? [recording as RecordingRow] : []
  );
  const segments = (recordingSegments ?? []) as RecordingSegmentRow[];
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
    sessions: streamSessions,
    timeline,
  };
}
