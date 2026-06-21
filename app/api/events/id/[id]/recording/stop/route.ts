import { NextRequest, NextResponse } from "next/server";
import {
  getOwnedRecordingEvent,
  stopParticipantRecording,
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
  const ownedEvent = await getOwnedRecordingEvent(accessToken, id);

  if (!ownedEvent) {
    return NextResponse.json(
      { error: "Unauthorized or recording server credentials are missing" },
      { status: 401 }
    );
  }

  const { data: recording, error: recordingError } =
    await ownedEvent.serviceSupabase
      .from("event_recordings")
      .select("status, livekit_egress_id")
      .eq("event_id", id)
      .maybeSingle();

  if (recordingError) {
    console.error(recordingError);
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  const { data: activeSegment, error: activeSegmentError } =
    await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .select("id, status, livekit_egress_id")
      .eq("event_id", id)
      .in("status", ["starting", "recording"])
      .order("segment_index", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (activeSegmentError) {
    console.error(activeSegmentError);
    return NextResponse.json(
      { error: "Could not load recording segment" },
      { status: 500 }
    );
  }

  if (!recording) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  if (
    !activeSegment &&
    (recording.status === "processing" || recording.status === "ready")
  ) {
    return NextResponse.json({ status: recording.status });
  }

  if (!activeSegment && recording.status !== "recording") {
    return NextResponse.json(
      { error: "Recording is not active", status: recording.status },
      { status: 409 }
    );
  }

  const egressId = activeSegment?.livekit_egress_id ?? recording.livekit_egress_id;

  if (!egressId) {
    return NextResponse.json(
      { error: "Recording Egress ID is missing" },
      { status: 500 }
    );
  }

  try {
    await stopParticipantRecording(egressId);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not stop recording Egress" },
      { status: 502 }
    );
  }

  const endedAt = new Date().toISOString();

  if (activeSegment) {
    const { error: segmentProcessingError } = await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .update({
        status: "processing",
        ended_at: endedAt,
        updated_at: endedAt,
      })
      .eq("id", activeSegment.id);

    if (segmentProcessingError) {
      console.error(segmentProcessingError);
      return NextResponse.json(
        { error: "Could not stop recording segment" },
        { status: 500 }
      );
    }
  }

  const { error: processingError } = await ownedEvent.serviceSupabase
    .from("event_recordings")
    .update({
      status: "processing",
      ended_at: endedAt,
      updated_at: endedAt,
    })
    .eq("event_id", id);

  if (processingError) {
    console.error(processingError);
    return NextResponse.json(
      { error: "Could not stop recording" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "processing",
    egressStopped: true,
  });
}
