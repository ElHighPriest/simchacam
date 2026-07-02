import { NextRequest, NextResponse } from "next/server";
import {
  EventPermissionError,
  getOwnerEventContext,
  isValidEmail,
  normalizeNominationEmail,
} from "@/lib/event-permissions";
import { sendStreamerNominationEmail } from "@/lib/transactional-email";

export const runtime = "nodejs";

function getAccessToken(request: NextRequest) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const context = await getOwnerEventContext(accessToken, id);
    const { data, error } = await context.serviceSupabase
      .from("event_streamer_nominations")
      .select("id, nominated_email, accepted_at, revoked_at, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load streamer nominations", error);
      return NextResponse.json(
        { error: "Could not load streamer nominations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      nominations: (data ?? []).map((nomination) => ({
        acceptedAt: nomination.accepted_at,
        createdAt: nomination.created_at,
        email: nomination.nominated_email,
        id: nomination.id,
        revokedAt: nomination.revoked_at,
      })),
    });
  } catch (error) {
    if (error instanceof EventPermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Could not load streamer nominations", error);
    return NextResponse.json(
      { error: "Could not load streamer nominations" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      locale?: unknown;
    } | null;
    const email = typeof body?.email === "string" ? body.email : "";
    const normalizedEmail = normalizeNominationEmail(email);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const context = await getOwnerEventContext(accessToken, id);

    if (
      context.entitlement.status !== "active" ||
      context.entitlement.plan !== "premium"
    ) {
      return NextResponse.json(
        { error: "Free event cannot nominate streamer" },
        { status: 403 }
      );
    }

    if (
      context.user.email &&
      normalizeNominationEmail(context.user.email) === normalizedEmail
    ) {
      return NextResponse.json(
        { error: "You are already the event owner" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await context.serviceSupabase
      .from("event_streamer_nominations")
      .insert({
        event_id: context.event.id,
        nominated_email: email.trim(),
        nominated_email_normalized: normalizedEmail,
        owner_user_id: context.event.user_id,
        updated_at: now,
      })
      .select("id, nominated_email, accepted_at, revoked_at, created_at")
      .single();

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Nomination already exists" },
        { status: 409 }
      );
    }

    if (error || !data) {
      console.error("Could not create streamer nomination", error);
      return NextResponse.json(
        { error: "Could not create streamer nomination" },
        { status: 500 }
      );
    }

    await sendStreamerNominationEmail({
      eventName: context.event.name ?? "your SimchaCam event",
      locale: typeof body?.locale === "string" ? body.locale : null,
      nominatedEmail: data.nominated_email,
      slug: context.event.slug,
    });

    return NextResponse.json({
      nomination: {
        acceptedAt: data.accepted_at,
        createdAt: data.created_at,
        email: data.nominated_email,
        id: data.id,
        revokedAt: data.revoked_at,
      },
    });
  } catch (error) {
    if (error instanceof EventPermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Could not create streamer nomination", error);
    return NextResponse.json(
      { error: "Could not create streamer nomination" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as {
      nominationId?: unknown;
    } | null;
    const nominationId =
      typeof body?.nominationId === "string" ? body.nominationId : "";

    if (!nominationId) {
      return NextResponse.json(
        { error: "Missing nomination" },
        { status: 400 }
      );
    }

    const context = await getOwnerEventContext(accessToken, id);
    const now = new Date().toISOString();
    const { data, error } = await context.serviceSupabase
      .from("event_streamer_nominations")
      .update({
        revoked_at: now,
        updated_at: now,
      })
      .eq("id", nominationId)
      .eq("event_id", context.event.id)
      .eq("owner_user_id", context.event.user_id)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Could not revoke streamer nomination", error);
      return NextResponse.json(
        { error: "Could not revoke streamer nomination" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Nomination revoked" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "revoked" });
  } catch (error) {
    if (error instanceof EventPermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Could not revoke streamer nomination", error);
    return NextResponse.json(
      { error: "Could not revoke streamer nomination" },
      { status: 500 }
    );
  }
}
