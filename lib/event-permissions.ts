import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isEmailVerified } from "@/lib/auth";

export type EventAccessRole = "owner" | "nominated_streamer";

export class EventPermissionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "EventPermissionError";
  }
}

type EventRow = {
  id: string;
  mux_playback_id: string | null;
  mux_stream_id: string | null;
  name?: string | null;
  slug: string;
  status: string | null;
  stream_provider: "livekit" | "mux" | null;
  user_id: string;
};

type EventEntitlement = {
  plan: "free" | "premium";
  recording_enabled: boolean;
  status: string;
  stream_limit_seconds: number;
  viewer_limit: number;
};

export const NOMINATED_STREAMER_ACTIVE_CODE = "NOMINATED_STREAMER_ACTIVE";
export const NOMINATED_STREAMER_ACTIVE_MESSAGE =
  "Revoke the nominated streamer to go live yourself.";

export type StreamEventContext = {
  entitlement: EventEntitlement;
  event: EventRow;
  role: EventAccessRole;
  serviceSupabase: SupabaseClient;
  user: {
    email: string | null;
    id: string;
  };
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeNominationEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const atIndex = normalizedEmail.lastIndexOf("@");

  if (atIndex === -1) {
    return normalizedEmail;
  }

  const localPart = normalizedEmail.slice(0, atIndex);
  const domain = normalizedEmail.slice(atIndex + 1);

  if (domain === "googlemail.com") {
    return `${localPart}@gmail.com`;
  }

  return normalizedEmail;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new EventPermissionError("Missing server credentials", 500);
  }

  return { serviceRoleKey, supabaseAnonKey, supabaseUrl };
}

function createServiceClient(config = getSupabaseConfig()) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getAuthenticatedUser(accessToken: string) {
  const config = getSupabaseConfig();
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!isEmailVerified(user)) {
    throw new EventPermissionError("Unauthorized", 401);
  }

  return {
    config,
    user,
  };
}

async function loadEntitlement(
  serviceSupabase: SupabaseClient,
  eventId: string
) {
  const { data: entitlement, error } = await serviceSupabase
    .from("event_entitlements")
    .select(
      "plan, status, stream_limit_seconds, viewer_limit, recording_enabled"
    )
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Could not load event entitlement", error);
    throw new EventPermissionError("Could not load event entitlement", 500);
  }

  if (!entitlement || entitlement.status !== "active") {
    throw new EventPermissionError("Event entitlement is not active", 409);
  }

  if (entitlement.plan !== "free" && entitlement.plan !== "premium") {
    throw new EventPermissionError("Invalid event entitlement", 500);
  }

  return entitlement as EventEntitlement;
}

async function acceptMatchingNomination({
  eventId,
  normalizedEmail,
  serviceSupabase,
  userId,
}: {
  eventId: string;
  normalizedEmail: string;
  serviceSupabase: SupabaseClient;
  userId: string;
}) {
  const { data: nomination, error } = await serviceSupabase
    .from("event_streamer_nominations")
    .select("id, accepted_user_id, revoked_at")
    .eq("event_id", eventId)
    .eq("nominated_email_normalized", normalizedEmail)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("Could not load streamer nomination", error);
    throw new EventPermissionError("Could not load streamer nomination", 500);
  }

  if (!nomination) {
    return false;
  }

  if (
    nomination.accepted_user_id &&
    nomination.accepted_user_id !== userId
  ) {
    throw new EventPermissionError(
      "This nomination is linked to a different account",
      403
    );
  }

  if (!nomination.accepted_user_id) {
    const now = new Date().toISOString();
    const { error: updateError } = await serviceSupabase
      .from("event_streamer_nominations")
      .update({
        accepted_at: now,
        accepted_user_id: userId,
        updated_at: now,
      })
      .eq("id", nomination.id)
      .is("revoked_at", null);

    if (updateError) {
      console.error("Could not accept streamer nomination", updateError);
      throw new EventPermissionError("Could not accept nomination", 500);
    }
  }

  return true;
}

export async function getActiveStreamerNomination(
  serviceSupabase: SupabaseClient,
  eventId: string
) {
  const { data, error } = await serviceSupabase
    .from("event_streamer_nominations")
    .select("id, nominated_email, accepted_at, created_at")
    .eq("event_id", eventId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load active streamer nomination", error);
    throw new EventPermissionError("Could not load streamer nomination", 500);
  }

  return data;
}

export async function assertCanPublishStream(
  context: {
    event: { id: string };
    role: EventAccessRole;
    serviceSupabase: SupabaseClient;
  }
) {
  if (context.role !== "owner") {
    return;
  }

  const activeNomination = await getActiveStreamerNomination(
    context.serviceSupabase,
    context.event.id
  );

  if (activeNomination) {
    throw new EventPermissionError(
      NOMINATED_STREAMER_ACTIVE_MESSAGE,
      403,
      NOMINATED_STREAMER_ACTIVE_CODE
    );
  }
}

export async function getStreamEventContext(
  accessToken: string,
  eventId: string
): Promise<StreamEventContext> {
  const { config, user } = await getAuthenticatedUser(accessToken);
  const serviceSupabase = createServiceClient(config);
  const { data: event, error: eventError } = await serviceSupabase
    .from("events")
    .select(
      "id, name, slug, status, user_id, stream_provider, mux_stream_id, mux_playback_id"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    console.error("Could not load event for permission check", eventError);
    throw new EventPermissionError("Could not load event", 500);
  }

  if (!event) {
    throw new EventPermissionError("Event not found", 404);
  }

  const entitlement = await loadEntitlement(serviceSupabase, event.id);
  let role: EventAccessRole | null = null;

  if (event.user_id === user.id) {
    role = "owner";
  } else if (user.email && entitlement.plan === "premium") {
    const matched = await acceptMatchingNomination({
      eventId: event.id,
      normalizedEmail: normalizeNominationEmail(user.email),
      serviceSupabase,
      userId: user.id,
    });
    role = matched ? "nominated_streamer" : null;
  }

  if (!role) {
    throw new EventPermissionError("Forbidden", 403);
  }

  return {
    entitlement,
    event,
    role,
    serviceSupabase,
    user: {
      email: user.email ?? null,
      id: user.id,
    },
  };
}

export async function getStreamEventContextBySlug(
  accessToken: string,
  slug: string
) {
  const { config, user } = await getAuthenticatedUser(accessToken);
  const serviceSupabase = createServiceClient(config);
  const { data: event, error: eventError } = await serviceSupabase
    .from("events")
    .select(
      "id, name, slug, status, user_id, stream_provider, mux_stream_id, mux_playback_id"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (eventError) {
    console.error("Could not load event for permission check", eventError);
    throw new EventPermissionError("Could not load event", 500);
  }

  if (!event) {
    throw new EventPermissionError("Event not found", 404);
  }

  const entitlement = await loadEntitlement(serviceSupabase, event.id);
  let role: EventAccessRole | null = null;

  if (event.user_id === user.id) {
    role = "owner";
  } else if (user.email && entitlement.plan === "premium") {
    const matched = await acceptMatchingNomination({
      eventId: event.id,
      normalizedEmail: normalizeNominationEmail(user.email),
      serviceSupabase,
      userId: user.id,
    });
    role = matched ? "nominated_streamer" : null;
  }

  if (!role) {
    throw new EventPermissionError("Forbidden", 403);
  }

  return {
    entitlement,
    event,
    role,
    serviceSupabase,
    user: {
      email: user.email ?? null,
      id: user.id,
    },
  };
}

export async function getOwnerEventContext(
  accessToken: string,
  eventId: string
) {
  const context = await getStreamEventContext(accessToken, eventId);

  if (context.role !== "owner") {
    throw new EventPermissionError("Only the event owner can manage this", 403);
  }

  return context;
}

export function createServiceSupabaseClient() {
  return createServiceClient();
}
