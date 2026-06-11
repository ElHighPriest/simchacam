import { createClient } from "@supabase/supabase-js";
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
  const { data: recording, error: recordingError } = await supabase
    .from("event_recordings")
    .select("event_id")
    .eq("livekit_egress_id", egress.egressId)
    .maybeSingle();

  if (recordingError) {
    console.error("Could not find recording for LiveKit webhook", recordingError);
    return NextResponse.json(
      { error: "Could not load recording" },
      { status: 500 }
    );
  }

  if (!recording) {
    console.warn("No recording matches LiveKit Egress", {
      egressId: egress.egressId,
    });
    return NextResponse.json({ received: true, matched: false });
  }

  if (egress.status === EgressStatus.EGRESS_COMPLETE) {
    const readyAt = new Date();
    const expiresAt = new Date(readyAt);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 30);
    const fileResult = getFileResult(egress);
    const updates: Record<string, string | number | null> = {
      status: "ready",
      ready_at: readyAt.toISOString(),
      expires_at: expiresAt.toISOString(),
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

    const { error } = await supabase
      .from("event_recordings")
      .update(updates)
      .eq("livekit_egress_id", egress.egressId);

    if (error) {
      console.error("Could not finalize recording", error);
      return NextResponse.json(
        { error: "Could not finalize recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true, status: "ready" });
  }

  if (
    egress.status === EgressStatus.EGRESS_FAILED ||
    egress.status === EgressStatus.EGRESS_ABORTED ||
    egress.status === EgressStatus.EGRESS_LIMIT_REACHED
  ) {
    const { error } = await supabase
      .from("event_recordings")
      .update({
        status: "failed",
        error_message: getSafeFailureMessage(egress.status),
        updated_at: new Date().toISOString(),
      })
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
