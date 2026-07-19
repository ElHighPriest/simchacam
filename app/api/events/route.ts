import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
  createServiceRoleClient,
} from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { sendFreeEventCreatedEmail } from "@/lib/transactional-email";

type EventRow = {
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
  status: "ready" | "processing" | "failed" | string;
};

function authenticationErrorResponse(error: unknown) {
  if (error instanceof ApiAuthenticationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }

  throw error;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(request);
    const serviceSupabase = createServiceRoleClient();
    const { data: events, error: eventsError } = await serviceSupabase
      .from("events")
      .select("id, name, slug, status, event_at, created_at, password")
      .eq("user_id", user.id);

    if (eventsError) {
      console.error("Could not load events", eventsError);
      return NextResponse.json(
        { error: "Could not load events" },
        { status: 500 }
      );
    }

    const eventRows = (events ?? []) as EventRow[];
    const eventIds = eventRows.map((event) => event.id);

    if (eventIds.length === 0) {
      return NextResponse.json({ events: [] });
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
      console.error("Could not load event entitlements", entitlementsResult.error);
      return NextResponse.json(
        { error: "Could not load event entitlements" },
        { status: 500 }
      );
    }

    if (nominationsResult.error) {
      console.error("Could not load streamer nominations", nominationsResult.error);
      return NextResponse.json(
        { error: "Could not load streamer nominations" },
        { status: 500 }
      );
    }

    if (recordingsResult.error) {
      console.error("Could not load event recordings", recordingsResult.error);
      return NextResponse.json(
        { error: "Could not load event recordings" },
        { status: 500 }
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

    const responseEvents = eventRows
      .sort((left, right) => {
        const leftDate = new Date(left.event_at ?? left.created_at).getTime();
        const rightDate = new Date(right.event_at ?? right.created_at).getTime();

        return leftDate - rightDate;
      })
      .map((event) => {
        const entitlement = entitlementsByEventId.get(event.id) ?? null;
        const nomination = nominationsByEventId.get(event.id) ?? null;
        const recording = recordingsByEventId.get(event.id) ?? null;

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
                streamDurationLimitSeconds:
                  entitlement.stream_limit_seconds,
              }
            : null,
          nominatedStreamer: nomination
            ? {
                id: nomination.id,
                email: nomination.nominated_email,
                status: nomination.accepted_at ? "accepted" : "pending",
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
      });

    return NextResponse.json({ events: responseEvents });
  } catch (error) {
    return authenticationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let authenticated: Awaited<ReturnType<typeof authenticateApiRequest>>;

  try {
    authenticated = await authenticateApiRequest(request);
  } catch (error) {
    return authenticationErrorResponse(error);
  }

  const { user } = authenticated;

  const { name, slug, eventAt, password } = await request.json();

  if (!name?.trim() || !slug) {
    return NextResponse.json(
      { error: "Missing event name or slug" },
      { status: 400 }
    );
  }

  const eventDate = eventAt ? new Date(eventAt) : null;

  if (eventDate && Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  }

  const { authenticatedSupabase } = authenticated;

  const { data, error } = await authenticatedSupabase
    .from("events")
    .insert({
      name,
      slug,
      event_at: eventDate ? eventDate.toISOString() : null,
      password: password ? await hashPassword(password) : null,
      user_id: user.id,
      status: "offline",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }

  await sendFreeEventCreatedEmail({
    eventId: data.id,
    eventName: name,
    hasPassword: Boolean(password),
    locale:
      typeof user.user_metadata?.locale === "string"
        ? user.user_metadata.locale
        : null,
    recipientEmail: user.email,
    slug,
  });

  return NextResponse.json({ id: data.id });
}
