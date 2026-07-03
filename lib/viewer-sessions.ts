import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STALE_VIEWER_MS = 90 * 1000;

type ViewerSessionAction = "start" | "heartbeat" | "end";

type ViewerSessionPayload = {
  viewerSessionId?: string;
};

type EventLookup = {
  id: string;
};

type ExistingViewerSession = {
  id: string;
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
};

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function cleanViewerSessionId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > 120) {
    return null;
  }

  return trimmed;
}

function detectDeviceType(userAgent: string) {
  if (/ipad|tablet/i.test(userAgent)) {
    return "tablet";
  }

  if (/mobi|iphone|android/i.test(userAgent)) {
    return "mobile";
  }

  return "desktop";
}

function detectBrowser(userAgent: string) {
  if (/Edg\//.test(userAgent)) {
    return "Edge";
  }

  if (/CriOS|Chrome\//.test(userAgent)) {
    return "Chrome";
  }

  if (/FxiOS|Firefox\//.test(userAgent)) {
    return "Firefox";
  }

  if (/Safari\//.test(userAgent)) {
    return "Safari";
  }

  return "Unknown";
}

function getWatchSeconds(joinedAt: string, now: Date) {
  const joined = new Date(joinedAt);

  if (Number.isNaN(joined.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((now.getTime() - joined.getTime()) / 1000));
}

async function getEventBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as EventLookup | null;
}

async function getOpenViewerSession(
  supabase: SupabaseClient,
  eventId: string,
  viewerSessionId: string
) {
  const { data, error } = await supabase
    .from("event_viewer_sessions")
    .select("id, joined_at, last_seen_at, left_at")
    .eq("event_id", eventId)
    .eq("viewer_session_id", viewerSessionId)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ExistingViewerSession | null;
}

export async function trackViewerSession({
  action,
  country,
  payload,
  slug,
  userAgent,
}: {
  action: ViewerSessionAction;
  country: string | null;
  payload: ViewerSessionPayload;
  slug: string;
  userAgent: string;
}) {
  const supabase = getServiceRoleClient();
  const viewerSessionId = cleanViewerSessionId(payload.viewerSessionId);

  if (!supabase) {
    return { error: "Viewer tracking is not configured", status: 500 };
  }

  if (!viewerSessionId) {
    return { error: "Missing viewer session", status: 400 };
  }

  const event = await getEventBySlug(supabase, slug);

  if (!event) {
    return { error: "Event not found", status: 404 };
  }

  const now = new Date();
  const openSession = await getOpenViewerSession(
    supabase,
    event.id,
    viewerSessionId
  );
  const openSessionLastSeen = openSession
    ? new Date(openSession.last_seen_at)
    : null;
  const openSessionIsStale =
    openSessionLastSeen &&
    now.getTime() - openSessionLastSeen.getTime() > STALE_VIEWER_MS;

  if (openSession && (action === "end" || openSessionIsStale)) {
    const watchSeconds = getWatchSeconds(openSession.joined_at, now);
    const { error } = await supabase
      .from("event_viewer_sessions")
      .update({
        last_seen_at: now.toISOString(),
        left_at: now.toISOString(),
        watch_seconds: watchSeconds,
      })
      .eq("id", openSession.id);

    if (error) {
      throw error;
    }

    if (action === "end") {
      return { ok: true };
    }
  }

  if (action === "end") {
    return { ok: true };
  }

  if (!openSession || openSessionIsStale) {
    const { error } = await supabase.from("event_viewer_sessions").insert({
      browser: detectBrowser(userAgent),
      country,
      device_type: detectDeviceType(userAgent),
      event_id: event.id,
      last_seen_at: now.toISOString(),
      user_agent: userAgent.slice(0, 500),
      viewer_session_id: viewerSessionId,
    });

    if (error) {
      throw error;
    }

    return { ok: true };
  }

  const watchSeconds = getWatchSeconds(openSession.joined_at, now);
  const { error } = await supabase
    .from("event_viewer_sessions")
    .update({
      last_seen_at: now.toISOString(),
      watch_seconds: watchSeconds,
    })
    .eq("id", openSession.id);

  if (error) {
    throw error;
  }

  return { ok: true };
}
