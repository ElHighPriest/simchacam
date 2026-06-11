import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function getRecordingClient() {
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const { slug } = await params;
  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, slug, password, status, event_at")
    .eq("slug", slug)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const recordingClient = getRecordingClient();
  let recording = null;

  if (recordingClient) {
    const { data, error: recordingError } = await recordingClient
      .from("event_recordings")
      .select("status, expires_at")
      .eq("event_id", event.id)
      .maybeSingle();

    if (recordingError) {
      console.error("Could not load viewer recording metadata", recordingError);
    } else if (
      data?.status === "ready" &&
      data.expires_at &&
      new Date(data.expires_at) > new Date()
    ) {
      recording = {
        status: data.status,
        expiresAt: data.expires_at,
      };
    }
  }

  return NextResponse.json({
    id: event.id,
    name: event.name,
    slug: event.slug,
    status: event.status,
    eventAt: event.event_at,
    hasPassword: Boolean(event.password),
    recording,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const { slug } = await params;
  const { password } = await request.json();
  const { data: event, error } = await supabase
    .from("events")
    .select("password")
    .eq("slug", slug)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.password && !(await verifyPassword(password || "", event.password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
