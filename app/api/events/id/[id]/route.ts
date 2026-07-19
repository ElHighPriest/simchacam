import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
} from "@/lib/api-auth";
import { createGetEventDetailsHandler } from "@/lib/event-details-handler";
import { hashPassword } from "@/lib/password";

export const GET = createGetEventDetailsHandler();

function patchAuthenticationErrorResponse(error: unknown) {
  if (error instanceof ApiAuthenticationError) {
    return NextResponse.json(
      { error: error.status === 401 ? "Unauthorized" : error.message },
      { status: error.status }
    );
  }

  throw error;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let authenticated: Awaited<ReturnType<typeof authenticateApiRequest>>;

  try {
    authenticated = await authenticateApiRequest(request);
  } catch (error) {
    return patchAuthenticationErrorResponse(error);
  }

  const { authenticatedSupabase, user } = authenticated;
  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Missing event name" }, { status: 400 });
  }

  const updates: {
    event_at?: string | null;
    name: string;
    password?: string | null;
  } = { name };

  if (Object.hasOwn(body, "password")) {
    updates.password = body.password ? await hashPassword(body.password) : null;
  }

  if (Object.hasOwn(body, "eventAt")) {
    const { data: entitlement, error: entitlementError } =
      await authenticatedSupabase
        .from("event_entitlements")
        .select("plan")
        .eq("event_id", id)
        .maybeSingle();

    if (entitlementError) {
      console.error("Could not load event entitlement:", entitlementError);
      return NextResponse.json(
        { error: "Could not verify Premium access" },
        { status: 500 }
      );
    }

    if (entitlement?.plan !== "premium") {
      return NextResponse.json(
        { error: "Event scheduling requires Premium" },
        { status: 403 }
      );
    }

    if (body.eventAt) {
      const eventDate = new Date(body.eventAt);

      if (Number.isNaN(eventDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid event date" },
          { status: 400 }
        );
      }

      updates.event_at = eventDate.toISOString();
    } else {
      updates.event_at = null;
    }
  }

  const { data, error } = await authenticatedSupabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save event" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
