import { NextRequest, NextResponse } from "next/server";
import {
  createServiceSupabaseClient,
  getAuthenticatedUser,
  normalizeNominationEmail,
} from "@/lib/event-permissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { user } = await getAuthenticatedUser(accessToken);

    if (!user.email) {
      return NextResponse.json({ events: [] });
    }

    const serviceSupabase = createServiceSupabaseClient();
    const { data: nominations, error: nominationsError } =
      await serviceSupabase
        .from("event_streamer_nominations")
        .select(
          "id, event_id, nominated_email, accepted_at, accepted_user_id, created_at"
        )
        .eq("nominated_email_normalized", normalizeNominationEmail(user.email))
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

    if (nominationsError) {
      console.error("Could not load nominated streamer events", nominationsError);
      return NextResponse.json(
        { error: "Could not load nominated events" },
        { status: 500 }
      );
    }

    const eventIds = [...new Set((nominations ?? []).map((item) => item.event_id))];

    if (eventIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    const [{ data: events, error: eventsError }, { data: entitlements, error: entitlementsError }] =
      await Promise.all([
        serviceSupabase
          .from("events")
          .select("id, name, slug, status, event_at")
          .in("id", eventIds),
        serviceSupabase
          .from("event_entitlements")
          .select("event_id, plan, status")
          .in("event_id", eventIds),
      ]);

    if (eventsError || entitlementsError) {
      console.error("Could not load nominated streamer event details", {
        entitlementsError,
        eventsError,
      });
      return NextResponse.json(
        { error: "Could not load nominated events" },
        { status: 500 }
      );
    }

    const eventMap = new Map((events ?? []).map((event) => [event.id, event]));
    const premiumEventIds = new Set(
      (entitlements ?? [])
        .filter(
          (entitlement) =>
            entitlement.plan === "premium" && entitlement.status === "active"
        )
        .map((entitlement) => entitlement.event_id)
    );
    const now = new Date().toISOString();
    const visibleEvents = [];

    for (const nomination of nominations ?? []) {
      const event = eventMap.get(nomination.event_id);

      if (!event || !premiumEventIds.has(nomination.event_id)) {
        continue;
      }

      visibleEvents.push({
        event_at: event.event_at,
        id: event.id,
        name: event.name,
        nominationEmail: nomination.nominated_email,
        nominationId: nomination.id,
        plan: "premium",
        role: "nominated_streamer",
        slug: event.slug,
        status: event.status,
      });

      if (!nomination.accepted_user_id) {
        await serviceSupabase
          .from("event_streamer_nominations")
          .update({
            accepted_at: now,
            accepted_user_id: user.id,
            updated_at: now,
          })
          .eq("id", nomination.id)
          .is("revoked_at", null)
          .is("accepted_user_id", null);
      }
    }

    return NextResponse.json({ events: visibleEvents });
  } catch (error) {
    console.error("Could not load nominated streamer events", error);
    return NextResponse.json(
      { error: "Could not load nominated events" },
      { status: 500 }
    );
  }
}
