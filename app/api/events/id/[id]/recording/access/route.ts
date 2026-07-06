import { NextRequest, NextResponse } from "next/server";
import {
  EventPermissionError,
  getStreamEventContext,
} from "@/lib/event-permissions";
import { createSignedR2Url } from "@/lib/r2";

export const runtime = "nodejs";

function getRecordingFilename(eventName: string | null | undefined) {
  return `${String(eventName || "SimchaCam recording")
    .replace(/[^a-z0-9 _-]/gi, "")
    .trim() || "SimchaCam recording"}.mp4`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = (await request.json()) as { action?: unknown };

  if (action !== "watch" && action !== "download") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const context = await getStreamEventContext(accessToken, id);

    const { data: entitlement, error: entitlementError } =
      await context.serviceSupabase
        .from("event_entitlements")
        .select("status, replay_retention_days, download_enabled")
        .eq("event_id", id)
        .maybeSingle();

    if (entitlementError) {
      console.error("Could not load recording access entitlement", entitlementError);
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

    const { data: recording, error: recordingError } =
      await context.serviceSupabase
        .from("event_recordings")
        .select("status, object_key, expires_at")
        .eq("event_id", id)
        .maybeSingle();

    if (recordingError) {
      console.error("Could not load recording for host access", recordingError);
      return NextResponse.json(
        { error: "Could not load recording" },
        { status: 500 }
      );
    }

    if (
      !recording ||
      recording.status !== "ready" ||
      !recording.expires_at ||
      new Date(recording.expires_at) <= new Date()
    ) {
      return NextResponse.json(
        { error: "Recording is not available" },
        { status: 404 }
      );
    }

    let objectKey = recording.object_key;
    let downloadFilename = getRecordingFilename(context.event.name);

    if (!objectKey) {
      const { data: segments, error: segmentsError } =
        await context.serviceSupabase
          .from("event_recording_segments")
          .select("object_key, segment_index")
          .eq("event_id", id)
          .eq("status", "ready")
          .not("object_key", "is", null)
          .order("segment_index", { ascending: true });

      if (segmentsError) {
        console.error("Could not load recording segments", segmentsError);
        return NextResponse.json(
          { error: "Could not load recording segments" },
          { status: 500 }
        );
      }

      if (!segments || segments.length === 0 || !segments[0].object_key) {
        return NextResponse.json(
          { error: "Recording is not available" },
          { status: 404 }
        );
      }

      objectKey = segments[0].object_key;

      if (segments.length > 1) {
        downloadFilename = downloadFilename.replace(
          /\.mp4$/i,
          ` - Part ${segments[0].segment_index}.mp4`
        );
      }
    }

    if (!objectKey) {
      return NextResponse.json(
        { error: "Recording is not available" },
        { status: 404 }
      );
    }

    const url = createSignedR2Url(objectKey, {
      downloadFilename: action === "download" ? downloadFilename : undefined,
      expiresInSeconds: 300,
    });

    return NextResponse.json({
      expiresAt: recording.expires_at,
      url,
    });
  } catch (error) {
    if (error instanceof EventPermissionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Could not create host recording URL", error);
    return NextResponse.json(
      { error: "Could not access recording" },
      { status: 500 }
    );
  }
}
