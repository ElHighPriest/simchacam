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

  if (!recording) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  if (recording.status === "processing" || recording.status === "ready") {
    return NextResponse.json({ status: recording.status });
  }

  if (recording.status !== "recording") {
    return NextResponse.json(
      { error: "Recording is not active", status: recording.status },
      { status: 409 }
    );
  }

  if (!recording.livekit_egress_id) {
    return NextResponse.json(
      { error: "Recording Egress ID is missing" },
      { status: 500 }
    );
  }

  try {
    await stopParticipantRecording(recording.livekit_egress_id);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not stop recording Egress" },
      { status: 502 }
    );
  }

  const { error: processingError } = await ownedEvent.serviceSupabase
    .from("event_recordings")
    .update({
      status: "processing",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
