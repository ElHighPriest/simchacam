import { createClient } from "@supabase/supabase-js";
import { EgressStatus, WebhookReceiver } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  getCompletedEgressSegmentUpdates,
  getSafeEgressFailureMessage,
  recomputeParentRecordingSummary,
} from "@/lib/recordings";

export const runtime = "nodejs";

const STREAMER_IDENTITY = "streamer";
const TEMP_RECORDING_DEBUG = true;

function logRecordingWebhookDebug(
  stage: string,
  details: Record<string, unknown> = {}
) {
  if (!TEMP_RECORDING_DEBUG) {
    return;
  }

  console.info("[TEMP RECORDING DEBUG] livekit/webhook", {
    stage,
    ...details,
  });
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

function serializeWebhookError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return String(error);
}

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

function createServiceSupabase(
  config: NonNullable<ReturnType<typeof getServerConfig>>
) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function updateStreamerPresence(
  supabase: ReturnType<typeof createServiceSupabase>,
  roomName: string,
  presence: "connected" | "disconnected"
) {
  const now = new Date().toISOString();
  const updates =
    presence === "connected"
      ? {
          host_last_connected_at: now,
          host_last_disconnected_at: null,
          updated_at: now,
        }
      : {
          host_last_disconnected_at: now,
          updated_at: now,
        };

  const { error } = await supabase
    .from("event_stream_sessions")
    .update(updates)
    .eq("room_name", roomName)
    .in("status", ["starting", "live"]);

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const config = getServerConfig();

  if (!config) {
    console.error("LiveKit webhook server configuration is missing");
    logRecordingWebhookDebug("server-config-missing");
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
    logRecordingWebhookDebug("signature-verification-failed", {
      error: serializeWebhookError(error),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  logRecordingWebhookDebug("event-received", {
    event: webhookEvent.event,
    roomName: webhookEvent.room?.name,
    participantIdentity: webhookEvent.participant?.identity,
    egressId: webhookEvent.egressInfo?.egressId,
    egressStatus: describeEgressStatus(webhookEvent.egressInfo?.status),
  });

  const supabase = createServiceSupabase(config);

  if (
    webhookEvent.event === "participant_joined" ||
    webhookEvent.event === "participant_left" ||
    webhookEvent.event === "participant_connection_aborted"
  ) {
    const participantIdentity = webhookEvent.participant?.identity;
    const roomName = webhookEvent.room?.name;

    if (participantIdentity !== STREAMER_IDENTITY || !roomName) {
      logRecordingWebhookDebug("presence-event-ignored", {
        event: webhookEvent.event,
        roomName,
        participantIdentity,
      });
      return NextResponse.json({ received: true });
    }

    try {
      await updateStreamerPresence(
        supabase,
        roomName,
        webhookEvent.event === "participant_joined"
          ? "connected"
          : "disconnected"
      );
      console.log("Updated streamer presence from LiveKit webhook", {
        event: webhookEvent.event,
        roomName,
      });
      logRecordingWebhookDebug("streamer-presence-updated", {
        event: webhookEvent.event,
        roomName,
      });
    } catch (error) {
      console.error("Could not update streamer presence", {
        event: webhookEvent.event,
        roomName,
        error,
      });
      logRecordingWebhookDebug("streamer-presence-update-error", {
        event: webhookEvent.event,
        roomName,
        error: serializeWebhookError(error),
      });
    }

    return NextResponse.json({ received: true });
  }

  if (
    webhookEvent.event !== "egress_updated" &&
    webhookEvent.event !== "egress_ended"
  ) {
    logRecordingWebhookDebug("non-egress-event-ignored", {
      event: webhookEvent.event,
    });
    return NextResponse.json({ received: true });
  }

  const egress = webhookEvent.egressInfo;

  if (!egress?.egressId) {
    logRecordingWebhookDebug("missing-egress-information", {
      event: webhookEvent.event,
    });
    return NextResponse.json(
      { error: "Missing Egress information" },
      { status: 400 }
    );
  }

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
    logRecordingWebhookDebug("segment-lookup-error", {
      egressId: egress.egressId,
      error: segmentError,
    });
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
    logRecordingWebhookDebug("legacy-recording-lookup-error", {
      egressId: egress.egressId,
      error: legacyRecordingError,
    });
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  if (!segment && !legacyRecording) {
    console.warn("No recording matches LiveKit Egress", {
      egressId: egress.egressId,
    });
    logRecordingWebhookDebug("egress-unmatched", {
      egressId: egress.egressId,
      status: describeEgressStatus(egress.status),
    });
    return NextResponse.json({ received: true, matched: false });
  }

  const eventId = segment?.event_id ?? legacyRecording?.event_id;

  if (!eventId) {
    logRecordingWebhookDebug("missing-event-id-for-egress", {
      egressId: egress.egressId,
      hasSegment: Boolean(segment),
      hasLegacyRecording: Boolean(legacyRecording),
    });
    return NextResponse.json(
      { error: "Missing recording event" },
      { status: 500 }
    );
  }

  if (egress.status === EgressStatus.EGRESS_COMPLETE) {
    const readyAt = new Date();
    const updates = getCompletedEgressSegmentUpdates(egress);
    logRecordingWebhookDebug("egress-complete", {
      eventId,
      egressId: egress.egressId,
      hasSegment: Boolean(segment),
      updates,
    });

    if (segment) {
      const { error } = await supabase
        .from("event_recording_segments")
        .update(updates)
        .eq("id", segment.id);

      if (error) {
        console.error("Could not finalize recording segment", error);
        logRecordingWebhookDebug("segment-finalize-error", {
          eventId,
          egressId: egress.egressId,
          segmentId: segment.id,
          error,
        });
        return NextResponse.json(
          { error: "Could not finalize recording segment" },
          { status: 500 }
        );
      }

      try {
        await recomputeParentRecordingSummary(supabase, eventId);
      } catch (error) {
        console.error("Could not recompute recording summary", error);
        logRecordingWebhookDebug("summary-recompute-error-after-complete", {
          eventId,
          egressId: egress.egressId,
          error: serializeWebhookError(error),
        });
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
        logRecordingWebhookDebug("legacy-recording-finalize-error", {
          eventId,
          egressId: egress.egressId,
          error,
        });
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
      error_message: getSafeEgressFailureMessage(egress.status),
      updated_at: new Date().toISOString(),
    };
    logRecordingWebhookDebug("egress-failed", {
      eventId,
      egressId: egress.egressId,
      egressStatus: describeEgressStatus(egress.status),
      hasSegment: Boolean(segment),
      updates: failedUpdates,
    });

    if (segment) {
      const { error } = await supabase
        .from("event_recording_segments")
        .update(failedUpdates)
        .eq("id", segment.id);

      if (error) {
        console.error("Could not mark recording segment as failed", error);
        logRecordingWebhookDebug("segment-failed-update-error", {
          eventId,
          egressId: egress.egressId,
          segmentId: segment.id,
          error,
        });
        return NextResponse.json(
          { error: "Could not update recording segment" },
          { status: 500 }
        );
      }

      try {
        await recomputeParentRecordingSummary(supabase, eventId);
      } catch (error) {
        console.error("Could not recompute recording summary", error);
        logRecordingWebhookDebug("summary-recompute-error-after-failure", {
          eventId,
          egressId: egress.egressId,
          error: serializeWebhookError(error),
        });
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
      logRecordingWebhookDebug("legacy-recording-failed-update-error", {
        eventId,
        egressId: egress.egressId,
        error,
      });
      return NextResponse.json(
        { error: "Could not update recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, status: "failed" });
  }

  logRecordingWebhookDebug("egress-status-unchanged", {
    eventId,
    egressId: egress.egressId,
    egressStatus: describeEgressStatus(egress.status),
  });

  return NextResponse.json({ received: true, status: "unchanged" });
}
