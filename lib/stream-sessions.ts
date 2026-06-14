import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isEmailVerified } from "@/lib/auth";

type EntitlementPlan = "free" | "premium";
type StreamSessionStatus = "starting" | "live" | "ended";

type OwnedStreamContext = {
  entitlement: {
    plan: EntitlementPlan;
    recording_enabled: boolean;
    stream_limit_seconds: number;
    viewer_limit: number;
  };
  event: {
    id: string;
    slug: string;
    status: string | null;
    user_id: string;
  };
  serviceSupabase: SupabaseClient;
};

export type StreamSession = {
  id: string;
  event_id: string;
  room_name: string;
  status: StreamSessionStatus;
  plan: EntitlementPlan;
  stream_limit_seconds: number;
  viewer_limit: number;
  started_at: string;
  hard_ends_at: string;
};

export class StreamLifecycleError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "StreamLifecycleError";
  }
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new StreamLifecycleError("Missing server credentials", 500);
  }

  return { serviceRoleKey, supabaseAnonKey, supabaseUrl };
}

export async function getOwnedStreamContext(
  accessToken: string,
  eventId: string
): Promise<OwnedStreamContext> {
  const config = getSupabaseConfig();
  const authSupabase = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
  const {
    data: { user },
  } = await authSupabase.auth.getUser(accessToken);

  if (!isEmailVerified(user)) {
    throw new StreamLifecycleError("Unauthorized", 401);
  }

  const serviceSupabase = createClient(
    config.supabaseUrl,
    config.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const { data: event, error: eventError } = await serviceSupabase
    .from("events")
    .select("id, slug, status, user_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Could not load event for stream lifecycle", eventError);
    throw new StreamLifecycleError("Could not load event", 500);
  }

  if (!event) {
    throw new StreamLifecycleError("Event not found", 404);
  }

  if (event.user_id !== user.id) {
    throw new StreamLifecycleError("Forbidden", 403);
  }

  const { data: entitlement, error: entitlementError } = await serviceSupabase
    .from("event_entitlements")
    .select(
      "plan, status, stream_limit_seconds, viewer_limit, recording_enabled"
    )
    .eq("event_id", eventId)
    .maybeSingle();

  if (entitlementError) {
    console.error("Could not load stream entitlement", entitlementError);
    throw new StreamLifecycleError("Could not load event entitlement", 500);
  }

  if (!entitlement || entitlement.status !== "active") {
    throw new StreamLifecycleError("Event entitlement is not active", 409);
  }

  if (entitlement.plan !== "free" && entitlement.plan !== "premium") {
    throw new StreamLifecycleError("Invalid event entitlement", 500);
  }

  return {
    entitlement: {
      plan: entitlement.plan,
      recording_enabled: entitlement.recording_enabled,
      stream_limit_seconds: entitlement.stream_limit_seconds,
      viewer_limit: entitlement.viewer_limit,
    },
    event,
    serviceSupabase,
  };
}

async function loadActiveSession(
  serviceSupabase: SupabaseClient,
  eventId: string
) {
  const { data, error } = await serviceSupabase
    .from("event_stream_sessions")
    .select(
      "id, event_id, room_name, status, plan, stream_limit_seconds, viewer_limit, started_at, hard_ends_at"
    )
    .eq("event_id", eventId)
    .in("status", ["starting", "live"])
    .maybeSingle();

  if (error) {
    console.error("Could not load active stream session", error);
    throw new StreamLifecycleError("Could not load stream session", 500);
  }

  return data as StreamSession | null;
}

export async function createOrReuseStreamSession(
  context: OwnedStreamContext
) {
  const existingSession = await loadActiveSession(
    context.serviceSupabase,
    context.event.id
  );

  if (existingSession) {
    return { created: false, session: existingSession };
  }

  const startedAt = new Date();
  const hardEndsAt = new Date(
    startedAt.getTime() +
      context.entitlement.stream_limit_seconds * 1000
  );
  const { data, error } = await context.serviceSupabase
    .from("event_stream_sessions")
    .insert({
      event_id: context.event.id,
      room_name: context.event.slug,
      status: "starting",
      plan: context.entitlement.plan,
      stream_limit_seconds: context.entitlement.stream_limit_seconds,
      viewer_limit: context.entitlement.viewer_limit,
      started_at: startedAt.toISOString(),
      hard_ends_at: hardEndsAt.toISOString(),
      updated_at: startedAt.toISOString(),
    })
    .select(
      "id, event_id, room_name, status, plan, stream_limit_seconds, viewer_limit, started_at, hard_ends_at"
    )
    .single();

  if (error?.code === "23505") {
    const racedSession = await loadActiveSession(
      context.serviceSupabase,
      context.event.id
    );

    if (racedSession) {
      return { created: false, session: racedSession };
    }
  }

  if (error || !data) {
    console.error("Could not create stream session", error);
    throw new StreamLifecycleError("Could not create stream session", 500);
  }

  return { created: true, session: data as StreamSession };
}

export async function markStreamLive(
  context: OwnedStreamContext,
  sessionId: string
) {
  const now = new Date().toISOString();
  const { error: sessionError } = await context.serviceSupabase
    .from("event_stream_sessions")
    .update({
      status: "live",
      host_last_connected_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .in("status", ["starting", "live"]);

  if (sessionError) {
    console.error("Could not mark stream session live", sessionError);
    throw new StreamLifecycleError("Could not start stream session", 500);
  }

  const { error: eventError } = await context.serviceSupabase
    .from("events")
    .update({ status: "live" })
    .eq("id", context.event.id);

  if (eventError) {
    console.error("Could not mark event live", eventError);
    throw new StreamLifecycleError("Could not update event status", 500);
  }
}

export async function markCreatedSessionFailed(
  context: OwnedStreamContext,
  sessionId: string
) {
  const now = new Date().toISOString();
  const { error } = await context.serviceSupabase
    .from("event_stream_sessions")
    .update({
      status: "ended",
      ended_at: now,
      ended_reason: "error",
      updated_at: now,
    })
    .eq("id", sessionId)
    .in("status", ["starting", "live"]);

  if (error) {
    console.error("Could not mark failed stream session", error);
  }
}

export async function endActiveStreamSession(
  context: OwnedStreamContext
) {
  const session = await loadActiveSession(
    context.serviceSupabase,
    context.event.id
  );
  const now = new Date().toISOString();

  if (session) {
    const { error: sessionError } = await context.serviceSupabase
      .from("event_stream_sessions")
      .update({
        status: "ended",
        ended_at: now,
        ended_reason: "host_ended",
        host_last_disconnected_at: now,
        updated_at: now,
      })
      .eq("id", session.id)
      .in("status", ["starting", "live"]);

    if (sessionError) {
      console.error("Could not end stream session", sessionError);
      throw new StreamLifecycleError("Could not end stream session", 500);
    }
  }

  const { error: eventError } = await context.serviceSupabase
    .from("events")
    .update({ status: "ended" })
    .eq("id", context.event.id);

  if (eventError) {
    console.error("Could not mark event ended", eventError);
    throw new StreamLifecycleError("Could not update event status", 500);
  }

  return session;
}
