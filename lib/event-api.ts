import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const EVENT_API_SELECT =
  "id, name, slug, status, event_at, created_at, password";

export type EventRow = {
  created_at: string;
  event_at: string | null;
  id: string;
  name: string;
  password: string | null;
  slug: string;
  status: string | null;
};

type EntitlementRow = {
  download_enabled: boolean;
  event_id: string;
  plan: "free" | "premium";
  recording_enabled: boolean;
  replay_retention_days: number;
  status: string;
  stream_limit_seconds: number;
  viewer_limit: number;
};

type NominationRow = {
  accepted_at: string | null;
  created_at: string;
  event_id: string;
  id: string;
  nominated_email: string;
};

type RecordingRow = {
  event_id: string;
  expires_at: string | null;
  status: string;
};

export type EventApiEvent = ReturnType<typeof mapEventApiEvent>;

export class EventApiDataError extends Error {
  constructor(
    readonly code:
      | "EVENT_QUERY_FAILED"
      | "ENTITLEMENT_QUERY_FAILED"
      | "NOMINATION_QUERY_FAILED"
      | "RECORDING_QUERY_FAILED",
    message: string
  ) {
    super(message);
    this.name = "EventApiDataError";
  }
}

export async function listOwnedEventApiEvents(
  serviceSupabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await serviceSupabase
    .from("events")
    .select(EVENT_API_SELECT)
    .eq("user_id", userId);

  if (error) {
    console.error("Could not load events", error);
    throw new EventApiDataError("EVENT_QUERY_FAILED", "Could not load events");
  }

  const events = (data ?? []) as EventRow[];
  const hydratedEvents = await hydrateEventApiEvents(serviceSupabase, events);

  return hydratedEvents.sort((left, right) => {
    const leftDate = new Date(left.eventAt ?? left.createdAt).getTime();
    const rightDate = new Date(right.eventAt ?? right.createdAt).getTime();

    return leftDate - rightDate;
  });
}

export async function getOwnedEventApiEvent(
  serviceSupabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<EventApiEvent | null> {
  const { data, error } = await serviceSupabase
    .from("events")
    .select(EVENT_API_SELECT)
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not load event", error);
    throw new EventApiDataError("EVENT_QUERY_FAILED", "Could not load event");
  }

  if (!data) {
    return null;
  }

  return (await hydrateEventApiEvents(serviceSupabase, [data as EventRow]))[0];
}

async function hydrateEventApiEvents(
  serviceSupabase: SupabaseClient,
  events: EventRow[]
): Promise<EventApiEvent[]> {
  const eventIds = events.map((event) => event.id);

  if (eventIds.length === 0) {
    return [];
  }

  const [entitlementsResult, nominationsResult, recordingsResult] =
    await Promise.all([
      serviceSupabase
        .from("event_entitlements")
        .select(
          "event_id, plan, status, viewer_limit, recording_enabled, replay_retention_days, download_enabled, stream_limit_seconds"
        )
        .in("event_id", eventIds),
      serviceSupabase
        .from("event_streamer_nominations")
        .select("id, event_id, nominated_email, accepted_at, created_at")
        .in("event_id", eventIds)
        .is("revoked_at", null),
      serviceSupabase
        .from("event_recordings")
        .select("event_id, status, expires_at")
        .in("event_id", eventIds),
    ]);

  if (entitlementsResult.error) {
    console.error(
      "Could not load event entitlements",
      entitlementsResult.error
    );
    throw new EventApiDataError(
      "ENTITLEMENT_QUERY_FAILED",
      "Could not load event entitlements"
    );
  }

  if (nominationsResult.error) {
    console.error(
      "Could not load streamer nominations",
      nominationsResult.error
    );
    throw new EventApiDataError(
      "NOMINATION_QUERY_FAILED",
      "Could not load streamer nominations"
    );
  }

  if (recordingsResult.error) {
    console.error("Could not load event recordings", recordingsResult.error);
    throw new EventApiDataError(
      "RECORDING_QUERY_FAILED",
      "Could not load event recordings"
    );
  }

  const entitlementsByEventId = new Map(
    ((entitlementsResult.data ?? []) as EntitlementRow[]).map((entitlement) => [
      entitlement.event_id,
      entitlement,
    ])
  );
  const nominationsByEventId = new Map(
    ((nominationsResult.data ?? []) as NominationRow[]).map((nomination) => [
      nomination.event_id,
      nomination,
    ])
  );
  const recordingsByEventId = new Map(
    ((recordingsResult.data ?? []) as RecordingRow[]).map((recording) => [
      recording.event_id,
      recording,
    ])
  );

  return events.map((event) =>
    mapEventApiEvent(
      event,
      entitlementsByEventId.get(event.id) ?? null,
      nominationsByEventId.get(event.id) ?? null,
      recordingsByEventId.get(event.id) ?? null
    )
  );
}

function mapEventApiEvent(
  event: EventRow,
  entitlement: EntitlementRow | null,
  nomination: NominationRow | null,
  recording: RecordingRow | null
) {
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    status: event.status,
    eventAt: event.event_at,
    createdAt: event.created_at,
    hasPassword: Boolean(event.password),
    entitlement: entitlement
      ? {
          plan: entitlement.plan,
          status: entitlement.status,
          viewerLimit: entitlement.viewer_limit,
          recordingEnabled: entitlement.recording_enabled,
          replayEnabled: entitlement.replay_retention_days > 0,
          replayRetentionDays: entitlement.replay_retention_days,
          downloadEnabled: entitlement.download_enabled,
          streamDurationLimitSeconds: entitlement.stream_limit_seconds,
        }
      : null,
    nominatedStreamer: nomination
      ? {
          id: nomination.id,
          email: nomination.nominated_email,
          status: nomination.accepted_at ? ("accepted" as const) : ("pending" as const),
          acceptedAt: nomination.accepted_at,
          createdAt: nomination.created_at,
        }
      : null,
    recording: recording
      ? {
          status: recording.status,
          expiresAt: recording.expires_at,
        }
      : null,
  };
}
