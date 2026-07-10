import { NextRequest, NextResponse } from "next/server";
import {
  getOwnedRecordingEvent,
  stopParticipantRecording,
} from "@/lib/recordings";

export const runtime = "nodejs";

const TEMP_RECORDING_DEBUG = true;

function logRecordingStopDebug(
  stage: string,
  details: Record<string, unknown> = {}
) {
  if (!TEMP_RECORDING_DEBUG) {
    return;
  }

  console.info("[TEMP RECORDING DEBUG] recording/stop", {
    stage,
    ...details,
  });
}

function serializeRecordingStopError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return String(error);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    logRecordingStopDebug("unauthorized-missing-token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  logRecordingStopDebug("request-received", {
    eventId: id,
  });

  const ownedEvent = await getOwnedRecordingEvent(accessToken, id);

  if (!ownedEvent) {
    logRecordingStopDebug("recording-permission-denied-or-config-missing", {
      eventId: id,
    });
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
    logRecordingStopDebug("recording-load-error", {
      eventId: id,
      error: recordingError,
    });
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
    logRecordingStopDebug("active-segment-load-error", {
      eventId: id,
      error: activeSegmentError,
    });
    return NextResponse.json(
      { error: "Could not load recording segment" },
      { status: 500 }
    );
  }

  if (!recording) {
    logRecordingStopDebug("recording-not-found", {
      eventId: id,
    });
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  logRecordingStopDebug("recording-state-loaded", {
    eventId: id,
    recordingStatus: recording.status,
    recordingHasEgressId: Boolean(recording.livekit_egress_id),
    activeSegmentId: activeSegment?.id,
    activeSegmentStatus: activeSegment?.status,
    activeSegmentHasEgressId: Boolean(activeSegment?.livekit_egress_id),
  });

  if (
    !activeSegment &&
    (recording.status === "processing" || recording.status === "ready")
  ) {
    logRecordingStopDebug("recording-already-stopped", {
      eventId: id,
      recordingStatus: recording.status,
    });
    return NextResponse.json({ status: recording.status });
  }

  if (!activeSegment && recording.status !== "recording") {
    logRecordingStopDebug("recording-not-active", {
      eventId: id,
      recordingStatus: recording.status,
    });
    return NextResponse.json(
      { error: "Recording is not active", status: recording.status },
      { status: 409 }
    );
  }

  const egressId = activeSegment?.livekit_egress_id ?? recording.livekit_egress_id;

  if (!egressId) {
    logRecordingStopDebug("egress-id-missing", {
      eventId: id,
      recordingStatus: recording.status,
      activeSegmentId: activeSegment?.id,
    });
    return NextResponse.json(
      { error: "Recording Egress ID is missing" },
      { status: 500 }
    );
  }

  try {
    logRecordingStopDebug("stopping-egress", {
      eventId: id,
      egressId,
      activeSegmentId: activeSegment?.id,
    });
    await stopParticipantRecording(egressId);
  } catch (error) {
    console.error(error);
    logRecordingStopDebug("stop-egress-error", {
      eventId: id,
      egressId,
      error: serializeRecordingStopError(error),
    });
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
      logRecordingStopDebug("segment-processing-update-error", {
        eventId: id,
        segmentId: activeSegment.id,
        error: segmentProcessingError,
      });
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
    logRecordingStopDebug("parent-processing-update-error", {
      eventId: id,
      error: processingError,
    });
    return NextResponse.json(
      { error: "Could not stop recording" },
      { status: 500 }
    );
  }

  logRecordingStopDebug("recording-stop-success", {
    eventId: id,
    egressId,
    activeSegmentId: activeSegment?.id,
  });

  return NextResponse.json({
    status: "processing",
    egressStopped: true,
  });
}
