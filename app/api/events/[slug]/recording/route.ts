import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { createSignedR2Url } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Recording access is not configured" },
      { status: 500 }
    );
  }

  const { slug } = await params;
  const { action, password } = await request.json();

  if (action !== "watch" && action !== "download") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, name, password")
    .eq("slug", slug)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (
    event.password &&
    !(await verifyPassword(password || "", event.password))
  ) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const { data: entitlement, error: entitlementError } = await supabase
    .from("event_entitlements")
    .select("status, replay_retention_days, download_enabled")
    .eq("event_id", event.id)
    .maybeSingle();

  if (entitlementError) {
    console.error(
      "Could not load recording access entitlement",
      entitlementError
    );
    return NextResponse.json(
      { error: "Could not load recording access" },
      { status: 500 }
    );
  }

  if (
    entitlement?.status !== "active" ||
    entitlement.replay_retention_days <= 0
  ) {
    return NextResponse.json(
      { error: "Recording is not available" },
      { status: 404 }
    );
  }

  if (action === "download" && !entitlement.download_enabled) {
    return NextResponse.json(
      { error: "Recording download is not available" },
      { status: 403 }
    );
  }

  const { data: recording, error: recordingError } = await supabase
    .from("event_recordings")
    .select("status, object_key, expires_at")
    .eq("event_id", event.id)
    .maybeSingle();

  if (recordingError) {
    console.error("Could not load recording for viewer access", recordingError);
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  if (
    !recording ||
    recording.status !== "ready" ||
    !recording.object_key ||
    !recording.expires_at ||
    new Date(recording.expires_at) <= new Date()
  ) {
    return NextResponse.json(
      { error: "Recording is not available" },
      { status: 404 }
    );
  }

  const filename =
    `${String(event.name || "SimchaCam recording")
      .replace(/[^a-z0-9 _-]/gi, "")
      .trim() || "SimchaCam recording"}.mp4`;

  try {
    const url = createSignedR2Url(recording.object_key, {
      downloadFilename: action === "download" ? filename : undefined,
      expiresInSeconds: 300,
    });

    return NextResponse.json({
      url,
      expiresAt: recording.expires_at,
    });
  } catch (error) {
    console.error("Could not create signed recording URL", error);
    return NextResponse.json(
      { error: "Could not access recording" },
      { status: 500 }
    );
  }
}
