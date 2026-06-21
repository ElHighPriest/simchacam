import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  EgressStatus,
  type EgressInfo,
  WebhookReceiver,
} from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function getServerConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !apiSecret || !supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
  };
}

function getFileResult(egress: EgressInfo) {
  if (egress.fileResults.length > 0) {
    return egress.fileResults[0];
  }

  return egress.result.case === "file" ? egress.result.value : undefined;
}

function getSafeFailureMessage(status: EgressStatus) {
  if (status === EgressStatus.EGRESS_ABORTED) {
    return "LiveKit Egress was aborted";
  }

  if (status === EgressStatus.EGRESS_LIMIT_REACHED) {
    return "LiveKit Egress limit was reached";
  }

  return "LiveKit Egress failed";
}

type RecordingSegment = {
  status: string;
  livekit_egress_id: string | null;
  object_key: string | null;
  started_at: string | null;
  ended_at: string | null;
  ready_at: string | null;
  duration_ms: number | null;
  size_bytes: number | null;
  error_message: string | null;
  segment_index: number;
};

async function recomputeParentRecordingSummary(
  supabase: SupabaseClient,
  eventId: string
) {
  const { data: segments, error: segmentsError } = await supabase
    .from("event_recording_segments")
    .select(
      "status, livekit_egress_id, object_key, started_at, ended_at, ready_at, duration_ms, size_bytes, error_message, segment_index"
    )
    .eq("event_id", eventId)
    .order("segment_index", { ascending: true });

  if (segmentsError) {
    throw segmentsError;
  }

  if (!segments || segments.length === 0) {
    return;
  }

  const recordingSegments = segments as RecordingSegment[];
  const activeSegment = recordingSegments.find((segment) =>
    ["pending", "starting", "recording"].includes(segment.status)
  );
  const processingSegment = recordingSegments.find(
    (segment) => segment.status === "processing"
  );
  const readySegments = recordingSegments.filter(
    (segment) => segment.status === "ready"
  );
  const failedSegments = recordingSegments.filter(
    (segment) => segment.status === "failed"
  );
  const representativeSegment =
    activeSegment ?? processingSegment ?? readySegments[0] ?? failedSegments[0];
  const now = new Date().toISOString();

  const updates: Record<string, string | number | null> = {
    updated_at: now,
    livekit_egress_id: representativeSegment?.livekit_egress_id ?? null,
    object_key: representativeSegment?.object_key ?? null,
    started_at:
      recordingSegments.find((segment) => segment.started_at)?.started_at ??
      null,
    ended_at:
      activeSegment || processingSegment
        ? representativeSegment?.ended_at ?? null
        : [...recordingSegments]
            .reverse()
            .find((segment) => segment.ended_at)?.ended_at ?? null,
    error_message:
      failedSegments.length > 0 && readySegments.length === 0
        ? failedSegments[0].error_message
        : null,
  };

  if (activeSegment) {
    updates.status = "recording";
  } else if (processingSegment) {
    updates.status = "processing";
  } else if (readySegments.length > 0) {
    const readyAt =
      [...readySegments].reverse().find((segment) => segment.ready_at)
        ?.ready_at ?? now;
    const expiresAt = new Date(readyAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);

    updates.status = "ready";
    updates.ready_at = readyAt;
    updates.expires_at = expiresAt.toISOString();
    updates.duration_ms = readySegments.reduce(
      (total, segment) => total + (segment.duration_ms ?? 0),
      0
    );
    updates.size_bytes = readySegments.reduce(
      (total, segment) => total + (segment.size_bytes ?? 0),
      0
    );
  } else if (failedSegments.length === recordingSegments.length) {
    updates.status = "failed";
    updates.ready_at = null;
    updates.expires_at = null;
    updates.duration_ms = null;
    updates.size_bytes = null;
  } else {
    updates.status = "pending";
  }

  const { error } = await supabase
    .from("event_recordings")
    .update(updates)
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const config = getServerConfig();

  if (!config) {
    console.error("LiveKit webhook server configuration is missing");
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const receiver = new WebhookReceiver(config.apiKey, config.apiSecret);

  let webhookEvent;

  try {
    webhookEvent = await receiver.receive(
      body,
      request.headers.get("authorization") ?? undefined
    );
  } catch (error) {
    console.error("LiveKit webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (
    webhookEvent.event !== "egress_updated" &&
    webhookEvent.event !== "egress_ended"
  ) {
    return NextResponse.json({ received: true });
  }

  const egress = webhookEvent.egressInfo;

  if (!egress?.egressId) {
    return NextResponse.json(
      { error: "Missing Egress information" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const { data: segment, error: segmentError } = await supabase
    .from("event_recording_segments")
    .select("id, event_id")
    .eq("livekit_egress_id", egress.egressId)
    .maybeSingle();

  if (segmentError) {
    console.error(
      "Could not find recording segment for LiveKit webhook",
      segmentError
    );
    return NextResponse.json(
      { error: "Could not load recording segment" },
      { status: 500 }
    );
  }

  const { data: legacyRecording, error: legacyRecordingError } = !segment
    ? await supabase
        .from("event_recordings")
        .select("event_id")
        .eq("livekit_egress_id", egress.egressId)
        .maybeSingle()
    : { data: null, error: null };

  if (legacyRecordingError) {
    console.error(
      "Could not find legacy recording for LiveKit webhook",
      legacyRecordingError
    );
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  if (!segment && !legacyRecording) {
    console.warn("No recording matches LiveKit Egress", {
      egressId: egress.egressId,
    });
    return NextResponse.json({ received: true, matched: false });
  }

  const eventId = segment?.event_id ?? legacyRecording?.event_id;

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing recording event" },
      { status: 500 }
    );
  }

  if (egress.status === EgressStatus.EGRESS_COMPLETE) {
    const readyAt = new Date();
    const fileResult = getFileResult(egress);
    const updates: Record<string, string | number | null> = {
      status: "ready",
      ready_at: readyAt.toISOString(),
      error_message: null,
      updated_at: readyAt.toISOString(),
    };

    const durationNanoseconds = Number(fileResult?.duration ?? 0);
    const sizeBytes = Number(fileResult?.size ?? 0);

    if (durationNanoseconds > 0) {
      updates.duration_ms = Math.floor(durationNanoseconds / 1_000_000);
    }

    if (sizeBytes > 0) {
      updates.size_bytes = sizeBytes;
    }

    if (segment) {
      const { error } = await supabase
        .from("event_recording_segments")
        .update(updates)
        .eq("id", segment.id);

      if (error) {
        console.error("Could not finalize recording segment", error);
        return NextResponse.json(
          { error: "Could not finalize recording segment" },
          { status: 500 }
        );
      }

      try {
        await recomputeParentRecordingSummary(supabase, eventId);
      } catch (error) {
        console.error("Could not recompute recording summary", error);
        return NextResponse.json(
          { error: "Could not update recording summary" },
          { status: 500 }
        );
      }
    } else {
      const expiresAt = new Date(readyAt);
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
      const { error } = await supabase
        .from("event_recordings")
        .update({
          ...updates,
          expires_at: expiresAt.toISOString(),
        })
        .eq("livekit_egress_id", egress.egressId);

      if (error) {
        console.error("Could not finalize recording", error);
        return NextResponse.json(
          { error: "Could not finalize recording" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ received: true, status: "ready" });
  }

  if (
    egress.status === EgressStatus.EGRESS_FAILED ||
    egress.status === EgressStatus.EGRESS_ABORTED ||
    egress.status === EgressStatus.EGRESS_LIMIT_REACHED
  ) {
    const failedUpdates = {
      status: "failed",
      error_message: getSafeFailureMessage(egress.status),
      updated_at: new Date().toISOString(),
    };

    if (segment) {
      const { error } = await supabase
        .from("event_recording_segments")
        .update(failedUpdates)
        .eq("id", segment.id);

      if (error) {
        console.error("Could not mark recording segment as failed", error);
        return NextResponse.json(
          { error: "Could not update recording segment" },
          { status: 500 }
        );
      }

      try {
        await recomputeParentRecordingSummary(supabase, eventId);
      } catch (error) {
        console.error("Could not recompute recording summary", error);
        return NextResponse.json(
          { error: "Could not update recording summary" },
          { status: 500 }
        );
      }

      return NextResponse.json({ received: true, status: "failed" });
    }

    const { error } = await supabase
      .from("event_recordings")
      .update(failedUpdates)
      .eq("livekit_egress_id", egress.egressId);

    if (error) {
      console.error("Could not mark recording as failed", error);
      return NextResponse.json(
        { error: "Could not update recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, status: "failed" });
  }

  return NextResponse.json({ received: true, status: "unchanged" });
}
