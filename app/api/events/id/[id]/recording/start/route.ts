import { NextRequest, NextResponse } from "next/server";
import { EgressStatus } from "livekit-server-sdk";
import {
  getCompletedEgressSegmentUpdates,
  getEgressInfo,
  getOwnedRecordingEvent,
  getSafeEgressFailureMessage,
  isEgressConfigured,
  isLiveKitEgressActive,
  recomputeParentRecordingSummary,
  startParticipantRecording,
} from "@/lib/recordings";

export const runtime = "nodejs";

const TEMP_RECORDING_DEBUG = true;

function logRecordingStartDebug(
  stage: string,
  details: Record<string, unknown> = {}
) {
  if (!TEMP_RECORDING_DEBUG) {
    return;
  }

  console.info("[TEMP RECORDING DEBUG] recording/start", {
    stage,
    ...details,
  });
}

function serializeRecordingError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return String(error);
}

function describeEgressStatus(status: EgressStatus | undefined) {
  if (status === undefined) {
    return null;
  }

  return {
    code: status,
    name: EgressStatus[status] ?? String(status),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    logRecordingStartDebug("unauthorized-missing-token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    orientation?: unknown;
  } | null;
  const orientation =
    body?.orientation === "portrait" ? "portrait" : "landscape";

  logRecordingStartDebug("request-received", {
    eventId: id,
    orientation,
    bodyOrientation: body?.orientation,
  });

  const ownedEvent = await getOwnedRecordingEvent(accessToken, id);

  if (!ownedEvent) {
    logRecordingStartDebug("recording-permission-denied-or-config-missing", {
      eventId: id,
    });
    return NextResponse.json(
      { error: "Unauthorized or recording server credentials are missing" },
      { status: 401 }
    );
  }

  if (
    ownedEvent.entitlement?.status !== "active" ||
    !ownedEvent.entitlement.recording_enabled
  ) {
    logRecordingStartDebug("recording-entitlement-disabled", {
      eventId: id,
      entitlementStatus: ownedEvent.entitlement?.status,
      recordingEnabled: ownedEvent.entitlement?.recording_enabled,
    });
    return NextResponse.json(
      { error: "Recording is not enabled for this event" },
      { status: 403 }
    );
  }

  const { error: existingRecordingError } = await ownedEvent.serviceSupabase
    .from("event_recordings")
    .select("status")
    .eq("event_id", id)
    .maybeSingle();

  if (existingRecordingError) {
    console.error(existingRecordingError);
    logRecordingStartDebug("existing-recording-load-error", {
      eventId: id,
      error: existingRecordingError,
    });
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  const { data: activeSegment, error: activeSegmentError } =
    await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .select("id, segment_index, status, livekit_egress_id")
      .eq("event_id", id)
      .in("status", ["pending", "starting", "recording"])
      .order("segment_index", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (activeSegmentError) {
    console.error(activeSegmentError);
    logRecordingStartDebug("active-segment-load-error", {
      eventId: id,
      error: activeSegmentError,
    });
    return NextResponse.json(
      { error: "Could not load recording segment" },
      { status: 500 }
    );
  }

  let recovered = false;

  if (activeSegment) {
    logRecordingStartDebug("active-segment-found", {
      eventId: id,
      segmentId: activeSegment.id,
      segmentIndex: activeSegment.segment_index,
      segmentStatus: activeSegment.status,
      hasEgressId: Boolean(activeSegment.livekit_egress_id),
    });

    if (!activeSegment.livekit_egress_id) {
      recovered = true;
      logRecordingStartDebug("active-segment-missing-egress-id", {
        eventId: id,
        segmentId: activeSegment.id,
      });
      await ownedEvent.serviceSupabase
        .from("event_recording_segments")
        .update({
          status: "failed",
          error_message: "LiveKit Egress ID is missing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeSegment.id);
      await recomputeParentRecordingSummary(ownedEvent.serviceSupabase, id);
    } else {
      let egress;

      try {
        egress = await getEgressInfo(activeSegment.livekit_egress_id);
      } catch (error) {
        logRecordingStartDebug("active-segment-egress-lookup-error", {
          eventId: id,
          segmentId: activeSegment.id,
          egressId: activeSegment.livekit_egress_id,
          error: serializeRecordingError(error),
        });
        throw error;
      }

      logRecordingStartDebug("active-segment-egress-lookup-result", {
        eventId: id,
        segmentId: activeSegment.id,
        egressId: activeSegment.livekit_egress_id,
        found: Boolean(egress),
        egressStatus: describeEgressStatus(egress?.status),
      });

      if (egress && isLiveKitEgressActive(egress.status)) {
        logRecordingStartDebug("active-egress-reused", {
          eventId: id,
          segmentId: activeSegment.id,
          egressId: activeSegment.livekit_egress_id,
          egressStatus: describeEgressStatus(egress.status),
        });
        return NextResponse.json({
          status: "recording",
          egressStarted: true,
          reused: true,
          recovered: false,
        });
      }

      recovered = true;
      const now = new Date().toISOString();
      let segmentUpdates: Record<string, string | number | null>;

      if (!egress) {
        segmentUpdates = {
          status: "failed",
          error_message: "LiveKit Egress is no longer available",
          ended_at: now,
          updated_at: now,
        };
      } else if (egress.status === EgressStatus.EGRESS_COMPLETE) {
        segmentUpdates = {
          ...getCompletedEgressSegmentUpdates(egress),
          ended_at: now,
        };
      } else if (egress.status === EgressStatus.EGRESS_ENDING) {
        segmentUpdates = {
          status: "processing",
          ended_at: now,
          updated_at: now,
        };
      } else {
        segmentUpdates = {
          status: "failed",
          error_message: getSafeEgressFailureMessage(egress.status),
          ended_at: now,
          updated_at: now,
        };
      }

      const { error: staleSegmentError } = await ownedEvent.serviceSupabase
        .from("event_recording_segments")
        .update(segmentUpdates)
        .eq("id", activeSegment.id);

      if (staleSegmentError) {
        console.error(staleSegmentError);
        logRecordingStartDebug("stale-segment-update-error", {
          eventId: id,
          segmentId: activeSegment.id,
          updates: segmentUpdates,
          error: staleSegmentError,
        });
        return NextResponse.json(
          { error: "Could not update stale recording segment" },
          { status: 500 }
        );
      }

      logRecordingStartDebug("stale-segment-updated", {
        eventId: id,
        segmentId: activeSegment.id,
        updates: segmentUpdates,
      });

      await recomputeParentRecordingSummary(ownedEvent.serviceSupabase, id);
    }
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
    logRecordingStartDebug("parent-recording-upsert-error", {
      eventId: id,
      error: pendingError,
    });
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
    logRecordingStartDebug("parent-recording-starting-update-error", {
      eventId: id,
      error: startingError,
    });
    return NextResponse.json(
      { error: "Could not start recording" },
      { status: 500 }
    );
  }

  const { data: latestSegment, error: latestSegmentError } =
    await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .select("segment_index")
      .eq("event_id", id)
      .order("segment_index", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestSegmentError) {
    console.error(latestSegmentError);
    logRecordingStartDebug("latest-segment-load-error", {
      eventId: id,
      error: latestSegmentError,
    });
    return NextResponse.json(
      { error: "Could not load recording segments" },
      { status: 500 }
    );
  }

  const segmentIndex = (latestSegment?.segment_index ?? 0) + 1;
  logRecordingStartDebug("creating-recording-segment", {
    eventId: id,
    segmentIndex,
    recovered,
  });

  const { data: newSegment, error: segmentStartingError } =
    await ownedEvent.serviceSupabase
      .from("event_recording_segments")
      .insert({
        event_recording_id: id,
        event_id: id,
        segment_index: segmentIndex,
        status: "starting",
        updated_at: startingAt,
      })
      .select("id")
      .single();

  if (segmentStartingError) {
    console.error(segmentStartingError);
    logRecordingStartDebug("recording-segment-create-error", {
      eventId: id,
      segmentIndex,
      error: segmentStartingError,
    });
    return NextResponse.json(
      { error: "Could not initialize recording segment" },
      { status: 500 }
    );
  }

  if (!newSegment) {
    logRecordingStartDebug("recording-segment-create-empty-result", {
      eventId: id,
      segmentIndex,
    });
    return NextResponse.json(
      { error: "Could not create recording segment" },
      { status: 500 }
    );
  }

  if (!isEgressConfigured()) {
    logRecordingStartDebug("egress-not-configured", {
      eventId: id,
      segmentId: newSegment.id,
    });
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
      .eq("id", newSegment.id);

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
    logRecordingStartDebug("starting-livekit-egress", {
      eventId: id,
      segmentId: newSegment.id,
      segmentIndex,
      roomName: ownedEvent.event.slug,
      orientation,
    });
    const { egressId, objectKey } = await startParticipantRecording(
      id,
      ownedEvent.event.slug,
      orientation
    );
    logRecordingStartDebug("livekit-egress-started", {
      eventId: id,
      segmentId: newSegment.id,
      egressId,
      objectKey,
    });
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
      .eq("id", newSegment.id);

    if (segmentRecordingError) {
      console.error(segmentRecordingError);
      logRecordingStartDebug("segment-recording-update-error-after-egress", {
        eventId: id,
        segmentId: newSegment.id,
        egressId,
        error: segmentRecordingError,
      });
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
      logRecordingStartDebug("parent-recording-update-error-after-egress", {
        eventId: id,
        segmentId: newSegment.id,
        egressId,
        error: recordingError,
      });
      return NextResponse.json(
        { error: "Egress started but recording status could not be saved" },
        { status: 500 }
      );
    }

    logRecordingStartDebug("recording-start-success", {
      eventId: id,
      segmentId: newSegment.id,
      egressId,
      recovered,
    });

    return NextResponse.json({
      status: "recording",
      egressStarted: true,
      recovered,
    });
  } catch (error) {
    console.error(error);
    logRecordingStartDebug("recording-start-egress-error", {
      eventId: id,
      segmentId: newSegment.id,
      error: serializeRecordingError(error),
    });

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
      .eq("id", newSegment.id);

    return NextResponse.json(
      { error: "Could not start recording Egress" },
      { status: 502 }
    );
  }
}
