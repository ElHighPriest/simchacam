import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
  createServiceRoleClient,
} from "@/lib/api-auth";
import {
  EventApiDataError,
  listOwnedEventApiEvents,
} from "@/lib/event-api";
import { hashPassword } from "@/lib/password";
import { sendFreeEventCreatedEmail } from "@/lib/transactional-email";

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
    const events = await listOwnedEventApiEvents(serviceSupabase, user.id);

    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof EventApiDataError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
