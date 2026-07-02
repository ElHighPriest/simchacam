import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  type EgressInfo,
  S3Upload,
} from "livekit-server-sdk";
import { getStreamEventContext } from "@/lib/event-permissions";
import { getR2Config } from "@/lib/r2";

export type RecordingStatus =
  | "pending"
  | "starting"
  | "recording"
  | "processing"
  | "ready"
  | "failed"
  | "expired";

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

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
}

export async function getOwnedRecordingEvent(
  accessToken: string,
  eventId: string
) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const context = await getStreamEventContext(accessToken, eventId).catch(
    (error) => {
      console.error("Could not verify recording permission", error);
      return null;
    }
  );

  if (!context) {
    return null;
  }

  return {
    entitlement: context.entitlement,
    event: context.event,
    serviceSupabase: context.serviceSupabase,
  };
}

export async function setRecordingStatus(
  eventId: string,
  status: RecordingStatus,
  updates: Record<string, string | number | null> = {}
) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error("Missing recording server credentials");
  }

  const serviceSupabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const { error } = await serviceSupabase
    .from("event_recordings")
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...updates,
    })
    .eq("event_id", eventId);

  if (error) {
    throw error;
  }
}

export function isEgressConfigured() {
  return Boolean(
    (process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL) &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.R2_ENDPOINT &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

function getLiveKitApiUrl() {
  const liveKitUrl =
    process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!liveKitUrl) {
    throw new Error("Missing LiveKit URL");
  }

  return liveKitUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

function getEgressClient() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Missing LiveKit API credentials");
  }

  return new EgressClient(getLiveKitApiUrl(), apiKey, apiSecret);
}

function getFileResult(egress: EgressInfo) {
  if (egress.fileResults.length > 0) {
    return egress.fileResults[0];
  }

  return egress.result.case === "file" ? egress.result.value : undefined;
}

export function isLiveKitEgressActive(status: EgressStatus) {
  return (
    status === EgressStatus.EGRESS_STARTING ||
    status === EgressStatus.EGRESS_ACTIVE
  );
}

export function getSafeEgressFailureMessage(status: EgressStatus) {
  if (status === EgressStatus.EGRESS_ABORTED) {
    return "LiveKit Egress was aborted";
  }

  if (status === EgressStatus.EGRESS_LIMIT_REACHED) {
    return "LiveKit Egress limit was reached";
  }

  return "LiveKit Egress failed";
}

export function getCompletedEgressSegmentUpdates(egress: EgressInfo) {
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

  return updates;
}

export async function getEgressInfo(egressId: string) {
  const egresses = await getEgressClient().listEgress({ egressId });

  return egresses[0] ?? null;
}

export async function recomputeParentRecordingSummary(
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

export async function startParticipantRecording(
  eventId: string,
  roomName: string,
  orientation: "portrait" | "landscape"
) {
  const r2 = getR2Config();
  const objectKey =
    `${r2.prefix}${eventId}/${new Date().toISOString().replace(/[:.]/g, "-")}.mp4`;
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: objectKey,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: r2.accessKeyId,
        secret: r2.secretAccessKey,
        region: r2.region,
        endpoint: r2.endpoint.origin,
        bucket: r2.bucketName,
        forcePathStyle: true,
      }),
    },
  });
  const egress = await getEgressClient().startParticipantEgress(
    roomName,
    "streamer",
    { file: output },
    {
      encodingOptions:
        orientation === "portrait"
          ? EncodingOptionsPreset.PORTRAIT_H264_720P_30
          : EncodingOptionsPreset.H264_720P_30,
    }
  );

  return {
    egressId: egress.egressId,
    objectKey,
  };
}

export async function stopParticipantRecording(egressId: string) {
  return getEgressClient().stopEgress(egressId);
}
