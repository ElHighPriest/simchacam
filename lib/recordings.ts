import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  S3Upload,
} from "livekit-server-sdk";
import { isEmailVerified } from "@/lib/auth";
import { getR2Config } from "@/lib/r2";

export type RecordingStatus =
  | "pending"
  | "starting"
  | "recording"
  | "processing"
  | "ready"
  | "failed"
  | "expired";

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

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!isEmailVerified(user)) {
    return null;
  }

  const authenticatedSupabase = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
  const { data: event, error } = await authenticatedSupabase
    .from("events")
    .select("id, slug, user_id")
    .eq("id", eventId)
    .single();

  if (error || !event || event.user_id !== user.id) {
    return null;
  }

  return {
    event,
    serviceSupabase: createClient(
      config.supabaseUrl,
      config.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    ),
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
          ? EncodingOptionsPreset.PORTRAIT_H264_1080P_30
          : EncodingOptionsPreset.H264_1080P_30,
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
