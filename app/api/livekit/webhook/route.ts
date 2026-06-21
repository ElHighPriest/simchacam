import { createClient } from "@supabase/supabase-js";
import { EgressStatus, WebhookReceiver } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  getCompletedEgressSegmentUpdates,
  getSafeEgressFailureMessage,
  recomputeParentRecordingSummary,
} from "@/lib/recordings";

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
    const updates = getCompletedEgressSegmentUpdates(egress);

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
      error_message: getSafeEgressFailureMessage(egress.status),
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
