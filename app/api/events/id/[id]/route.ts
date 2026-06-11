import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { isEmailVerified } from "@/lib/auth";

async function getAuthenticatedClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!isEmailVerified(user)) {
    return null;
  }

  return {
    user,
    supabase: createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await getAuthenticatedClient(request);

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: event, error } = await authenticated.supabase
    .from("events")
    .select("id, name, user_id")
    .eq("id", id)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.user_id !== authenticated.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const recordingSupabase = serviceRoleKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : authenticated.supabase;

  const { data: recording, error: recordingError } = await recordingSupabase
    .from("event_recordings")
    .select("event_id")
    .eq("event_id", id)
    .maybeSingle();

  if (recordingError) {
    console.error("Could not load recording status:", recordingError);
  }

  const hasRecording = recordingError ? false : Boolean(recording);

  console.log("[TEMP RECORDING DEBUG] Event recording status", {
    eventId: id,
    hasRecording,
  });

  return NextResponse.json({
    id: event.id,
    name: event.name,
    hasRecording,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authenticated = await getAuthenticatedClient(request);

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Missing event name" }, { status: 400 });
  }

  const updates: { name: string; password?: string | null } = { name };

  if (Object.hasOwn(body, "password")) {
    updates.password = body.password ? await hashPassword(body.password) : null;
  }

  const { data, error } = await authenticated.supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .eq("user_id", authenticated.user.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save event" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
