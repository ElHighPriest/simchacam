import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";

function getServiceRoleClient() {
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
  const supabase = getServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const { slug } = await params;
  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, slug, password, status, event_at, stream_provider")
    .eq("slug", slug)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let recording = null;

  if (supabase) {
    const { data: entitlement, error: entitlementError } =
      await supabase
        .from("event_entitlements")
        .select("status, replay_retention_days, download_enabled")
        .eq("event_id", event.id)
        .maybeSingle();

    if (entitlementError) {
      console.error(
        "Could not load viewer recording entitlement",
        entitlementError
      );
    } else if (
      entitlement?.status === "active" &&
      entitlement.replay_retention_days > 0
    ) {
      const { data, error: recordingError } = await supabase
        .from("event_recordings")
        .select("status, object_key, expires_at")
        .eq("event_id", event.id)
        .maybeSingle();

      if (recordingError) {
        console.error(
          "Could not load viewer recording metadata",
          recordingError
        );
      } else if (data?.status === "processing" || data?.status === "failed") {
        recording = {
          status: data.status,
          expiresAt: null,
          downloadEnabled: entitlement.download_enabled,
        };
      } else if (data?.status === "ready") {
        if (data.expires_at && new Date(data.expires_at) > new Date()) {
          const { data: segments, error: segmentsError } =
            await supabase
              .from("event_recording_segments")
              .select("id, segment_index, ready_at, duration_ms, size_bytes")
              .eq("event_id", event.id)
              .eq("status", "ready")
              .not("object_key", "is", null)
              .order("segment_index", { ascending: true });

          if (segmentsError) {
            console.error(
              "Could not load viewer recording segments",
              segmentsError
            );
          }

          const readySegments =
            segments && segments.length > 0
              ? segments.map((segment) => ({
                  id: segment.id,
                  segmentIndex: segment.segment_index,
                  readyAt: segment.ready_at,
                  durationMs: segment.duration_ms,
                  sizeBytes: segment.size_bytes,
                }))
              : data.object_key
                ? [
                    {
                      id: null,
                      segmentIndex: 1,
                      readyAt: null,
                      durationMs: null,
                      sizeBytes: null,
                    },
                  ]
                : [];

          recording = {
            status: data.status,
            expiresAt: data.expires_at,
            downloadEnabled: entitlement.download_enabled,
            segments: readySegments,
          };
        }
      }
    }
  }

  return NextResponse.json({
    id: event.id,
    name: event.name,
    slug: event.slug,
    status: event.status,
    streamProvider: event.stream_provider ?? "livekit",
    eventAt: event.event_at,
    hasPassword: Boolean(event.password),
    recording,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = getServiceRoleClient();

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
