import { NextRequest, NextResponse } from "next/server";
import {
  getOwnedRecordingEvent,
  isEgressConfigured,
  startParticipantRecording,
} from "@/lib/recordings";

export const runtime = "nodejs";

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
  const body = (await request.json().catch(() => null)) as {
    orientation?: unknown;
  } | null;
  const orientation =
    body?.orientation === "portrait" ? "portrait" : "landscape";
  const ownedEvent = await getOwnedRecordingEvent(accessToken, id);

  if (!ownedEvent) {
    return NextResponse.json(
      { error: "Unauthorized or recording server credentials are missing" },
      { status: 401 }
    );
  }

  if (
    ownedEvent.entitlement?.status !== "active" ||
    !ownedEvent.entitlement.recording_enabled
  ) {
    return NextResponse.json(
      { error: "Recording is not enabled for this event" },
      { status: 403 }
    );
  }

  const { data: existingRecording, error: existingRecordingError } =
    await ownedEvent.serviceSupabase
      .from("event_recordings")
      .select("status")
      .eq("event_id", id)
      .maybeSingle();

  if (existingRecordingError) {
    console.error(existingRecordingError);
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  if (
    existingRecording &&
    ["starting", "recording", "processing", "ready"].includes(
      existingRecording.status
    )
  ) {
    return NextResponse.json({ status: existingRecording.status });
  }

  const now = new Date().toISOString();
  const { error: pendingError } = await ownedEvent.serviceSupabase
    .from("event_recordings")
    .upsert(
      {
        event_id: id,
        status: "pending",
        livekit_egress_id: null,
        object_key: null,
        started_at: null,
        ended_at: null,
        error_message: null,
        updated_at: now,
      },
      { onConflict: "event_id" }
    );

  if (pendingError) {
    console.error(pendingError);
    return NextResponse.json(
      { error: "Could not initialize recording" },
      { status: 500 }
    );
  }

  const startingAt = new Date().toISOString();
  const { error: startingError } = await ownedEvent.serviceSupabase
    .from("event_recordings")
    .update({
      status: "starting",
      updated_at: startingAt,
    })
    .eq("event_id", id);

  if (startingError) {
    console.error(startingError);
    return NextResponse.json(
      { error: "Could not start recording" },
      { status: 500 }
    );
  }

  const { error: segmentStartingError } = await ownedEvent.serviceSupabase
    .from("event_recording_segments")
    .upsert(
      {
        event_recording_id: id,
        event_id: id,
        segment_index: 1,
        status: "starting",
        livekit_egress_id: null,
        object_key: null,
        started_at: null,
        ended_at: null,
        ready_at: null,
        duration_ms: null,
        size_bytes: null,
        error_message: null,
        updated_at: startingAt,
      },
      { onConflict: "event_recording_id,segment_index" }
    );

  if (segmentStartingError) {
    console.error(segmentStartingError);
    return NextResponse.json(
      { error: "Could not initialize recording segment" },
      { status: 500 }
    );
  }

  if (!isEgressConfigured()) {
    const failedAt = new Date().toISOString();
    await ownedEvent.serviceSupabase
      .from("event_recordings")
      .update({
        status: "failed",
        error_message: "LiveKit Egress or R2 is not configured",
        updated_at: failedAt,
      })
      .eq("event_id", id);

    await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .update({
        status: "failed",
        error_message: "LiveKit Egress or R2 is not configured",
        updated_at: failedAt,
      })
      .eq("event_recording_id", id)
      .eq("segment_index", 1);

    return NextResponse.json(
      {
        status: "failed",
        egressStarted: false,
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  try {
    const { egressId, objectKey } = await startParticipantRecording(
      id,
      ownedEvent.event.slug,
      orientation
    );
    const startedAt = new Date().toISOString();
    const { error: segmentRecordingError } = await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .update({
        status: "recording",
        livekit_egress_id: egressId,
        object_key: objectKey,
        started_at: startedAt,
        ended_at: null,
        ready_at: null,
        duration_ms: null,
        size_bytes: null,
        error_message: null,
        updated_at: startedAt,
      })
      .eq("event_recording_id", id)
      .eq("segment_index", 1);

    if (segmentRecordingError) {
      console.error(segmentRecordingError);
      return NextResponse.json(
        { error: "Egress started but recording segment could not be saved" },
        { status: 500 }
      );
    }

    const { error: recordingError } = await ownedEvent.serviceSupabase
      .from("event_recordings")
      .update({
        status: "recording",
        livekit_egress_id: egressId,
        object_key: objectKey,
        started_at: startedAt,
        ended_at: null,
        error_message: null,
        updated_at: startedAt,
      })
      .eq("event_id", id);

    if (recordingError) {
      console.error(recordingError);
      return NextResponse.json(
        { error: "Egress started but recording status could not be saved" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "recording",
      egressStarted: true,
    });
  } catch (error) {
    console.error(error);

    const failedAt = new Date().toISOString();
    const errorMessage =
      error instanceof Error ? error.message : "Could not start Egress";

    await ownedEvent.serviceSupabase
      .from("event_recordings")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: failedAt,
      })
      .eq("event_id", id);

    await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: failedAt,
      })
      .eq("event_recording_id", id)
      .eq("segment_index", 1);

    return NextResponse.json(
      { error: "Could not start recording Egress" },
      { status: 502 }
    );
  }
}
