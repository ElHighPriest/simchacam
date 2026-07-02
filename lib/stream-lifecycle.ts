import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { deleteStreamRoom, isParticipantInRoom } from "@/lib/livekit-rooms";
import {
  recomputeParentRecordingSummary,
  stopParticipantRecording,
} from "@/lib/recordings";

const STREAMER_IDENTITY = "streamer";
const HOST_RECONNECT_GRACE_MS = 10 * 60 * 1000;

type ActiveStreamSession = {
  id: string;
  event_id: string;
  room_name: string;
  status: "starting" | "live";
  hard_ends_at: string;
  host_last_connected_at?: string | null;
  host_last_disconnected_at?: string | null;
};

export type ActiveStreamSessionForRoom = ActiveStreamSession & {
  viewer_limit: number;
};

type ActiveRecordingSegment = {
  id: string;
  livekit_egress_id: string | null;
};

type LegacyActiveRecording = {
  status: string | null;
  livekit_egress_id: string | null;
};

export type StreamCleanupResult = {
  sessionId: string;
  eventId: string;
  roomName: string;
  status: "ended" | "skipped" | "failed";
  errors: string[];
};

export type StreamCleanupSummary = {
  processed: number;
  ended: number;
  skipped: number;
  failed: number;
  results: StreamCleanupResult[];
};

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing stream lifecycle server credentials");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function stopActiveRecordingSegments(
  supabase: SupabaseClient,
  eventId: string,
  endedAt: string
) {
  const errors: string[] = [];
  const { data: segments, error } = await supabase
    .from("event_recording_segments")
    .select("id, livekit_egress_id")
    .eq("event_id", eventId)
    .in("status", ["pending", "starting", "recording"]);

  if (error) {
    return [`Could not load active recording segments: ${error.message}`];
  }

  const activeSegments = (segments ?? []) as ActiveRecordingSegment[];

  if (activeSegments.length === 0) {
    const { data: recording, error: recordingError } = await supabase
      .from("event_recordings")
      .select("status, livekit_egress_id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (recordingError) {
      return [`Could not load active recording: ${recordingError.message}`];
    }

    const legacyRecording = recording as LegacyActiveRecording | null;

    if (legacyRecording?.status !== "recording") {
      return errors;
    }

    if (legacyRecording.livekit_egress_id) {
      try {
        await stopParticipantRecording(legacyRecording.livekit_egress_id);
      } catch (error) {
        console.warn("Could not stop legacy recording Egress during cleanup", {
          eventId,
          error,
        });
        errors.push("Could not stop legacy recording Egress");
      }
    }

    const { error: updateError } = await supabase
      .from("event_recordings")
      .update({
        status: legacyRecording.livekit_egress_id ? "processing" : "failed",
        ended_at: endedAt,
        error_message: legacyRecording.livekit_egress_id
          ? null
          : "Recording Egress ID was missing during stream cleanup",
        updated_at: endedAt,
      })
      .eq("event_id", eventId);

    if (updateError) {
      errors.push(`Could not update legacy recording: ${updateError.message}`);
    }

    return errors;
  }

  for (const segment of activeSegments) {
    if (segment.livekit_egress_id) {
      try {
        await stopParticipantRecording(segment.livekit_egress_id);
      } catch (error) {
        console.warn("Could not stop recording Egress during stream cleanup", {
          eventId,
          segmentId: segment.id,
          error,
        });
        errors.push(`Could not stop recording Egress for segment ${segment.id}`);
      }
    }

    const { error: updateError } = await supabase
      .from("event_recording_segments")
      .update({
        status: segment.livekit_egress_id ? "processing" : "failed",
        ended_at: endedAt,
        error_message: segment.livekit_egress_id
          ? null
          : "Recording Egress ID was missing during stream cleanup",
        updated_at: endedAt,
      })
      .eq("id", segment.id);

    if (updateError) {
      errors.push(
        `Could not update recording segment ${segment.id}: ${updateError.message}`
      );
    }
  }

  if ((segments ?? []).length > 0) {
    try {
      await recomputeParentRecordingSummary(supabase, eventId);
    } catch (error) {
      errors.push(
        `Could not recompute recording summary: ${getSafeErrorMessage(error)}`
      );
    }
  }

  return errors;
}

async function endStreamSession(
  supabase: SupabaseClient,
  session: ActiveStreamSession,
  now: Date,
  endedReason: "time_limit" | "room_closed"
): Promise<StreamCleanupResult> {
  const endedAt = now.toISOString();
  const errors: string[] = [];

  const { data: endedSession, error: sessionError } = await supabase
    .from("event_stream_sessions")
    .update({
      status: "ended",
      ended_at: endedAt,
      ended_reason: endedReason,
      host_last_disconnected_at: endedAt,
      updated_at: endedAt,
    })
    .eq("id", session.id)
    .in("status", ["starting", "live"])
    .select("id")
    .maybeSingle();

  if (sessionError) {
    return {
      sessionId: session.id,
      eventId: session.event_id,
      roomName: session.room_name,
      status: "failed",
      errors: [`Could not mark stream session ended: ${sessionError.message}`],
    };
  }

  if (!endedSession) {
    return {
      sessionId: session.id,
      eventId: session.event_id,
      roomName: session.room_name,
      status: "skipped",
      errors: [],
    };
  }

  const { error: eventError } = await supabase
    .from("events")
    .update({ status: "ended" })
    .eq("id", session.event_id);

  if (eventError) {
    errors.push(`Could not mark event ended: ${eventError.message}`);
  }

  try {
    await deleteStreamRoom(session.room_name);
  } catch (error) {
    console.warn("Could not delete LiveKit room during stream cleanup", {
      roomName: session.room_name,
      error,
    });
    errors.push(`Could not delete LiveKit room: ${getSafeErrorMessage(error)}`);
  }

  errors.push(
    ...(await stopActiveRecordingSegments(supabase, session.event_id, endedAt))
  );

  return {
    sessionId: session.id,
    eventId: session.event_id,
    roomName: session.room_name,
    status: errors.length > 0 ? "failed" : "ended",
    errors,
  };
}

export async function endExpiredStreamSession(
  supabase: SupabaseClient,
  session: ActiveStreamSession,
  now = new Date()
): Promise<StreamCleanupResult> {
  if (new Date(session.hard_ends_at) > now) {
    return {
      sessionId: session.id,
      eventId: session.event_id,
      roomName: session.room_name,
      status: "skipped",
      errors: [],
    };
  }

  return endStreamSession(supabase, session, now, "time_limit");
}

export async function cleanupExpiredStreamSessions(
  supabase: SupabaseClient = getServiceSupabase()
): Promise<StreamCleanupSummary> {
  const now = new Date();
  const { data: sessions, error } = await supabase
    .from("event_stream_sessions")
    .select("id, event_id, room_name, status, hard_ends_at")
    .in("status", ["starting", "live"])
    .lte("hard_ends_at", now.toISOString())
    .order("hard_ends_at", { ascending: true });

  if (error) {
    throw error;
  }

  const results: StreamCleanupResult[] = [];

  for (const session of (sessions ?? []) as ActiveStreamSession[]) {
    try {
      results.push(await endExpiredStreamSession(supabase, session, now));
    } catch (error) {
      results.push({
        sessionId: session.id,
        eventId: session.event_id,
        roomName: session.room_name,
        status: "failed",
        errors: [getSafeErrorMessage(error)],
      });
    }
  }

  return {
    processed: results.length,
    ended: results.filter((result) => result.status === "ended").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}

async function markHostConnected(
  supabase: SupabaseClient,
  session: ActiveStreamSession,
  now: Date
) {
  const timestamp = now.toISOString();
  const { error } = await supabase
    .from("event_stream_sessions")
    .update({
      host_last_connected_at: timestamp,
      host_last_disconnected_at: null,
      updated_at: timestamp,
    })
    .eq("id", session.id)
    .in("status", ["starting", "live"]);

  if (error) {
    throw error;
  }
}

async function markHostDisconnected(
  supabase: SupabaseClient,
  session: ActiveStreamSession,
  now: Date
) {
  const timestamp = now.toISOString();
  const { error } = await supabase
    .from("event_stream_sessions")
    .update({
      host_last_disconnected_at: timestamp,
      updated_at: timestamp,
    })
    .eq("id", session.id)
    .in("status", ["starting", "live"]);

  if (error) {
    throw error;
  }
}

export async function cleanupDisconnectedStreamSessions(
  supabase: SupabaseClient = getServiceSupabase()
): Promise<StreamCleanupSummary> {
  const now = new Date();
  const { data: sessions, error } = await supabase
    .from("event_stream_sessions")
    .select(
      "id, event_id, room_name, status, hard_ends_at, host_last_connected_at, host_last_disconnected_at"
    )
    .in("status", ["starting", "live"])
    .order("started_at", { ascending: true });

  if (error) {
    throw error;
  }

  const results: StreamCleanupResult[] = [];

  for (const session of (sessions ?? []) as ActiveStreamSession[]) {
    try {
      if (new Date(session.hard_ends_at) <= now) {
        results.push({
          sessionId: session.id,
          eventId: session.event_id,
          roomName: session.room_name,
          status: "skipped",
          errors: ["Session is handled by hard stream limit cleanup"],
        });
        continue;
      }

      const isStreamerPresent = await isParticipantInRoom(
        session.room_name,
        STREAMER_IDENTITY
      );

      if (isStreamerPresent) {
        if (session.host_last_disconnected_at) {
          console.log("Streamer reconnected within grace period", {
            eventId: session.event_id,
            sessionId: session.id,
            roomName: session.room_name,
          });
        }

        await markHostConnected(supabase, session, now);
        results.push({
          sessionId: session.id,
          eventId: session.event_id,
          roomName: session.room_name,
          status: "skipped",
          errors: [],
        });
        continue;
      }

      const disconnectedAt = session.host_last_disconnected_at
        ? new Date(session.host_last_disconnected_at)
        : null;
      const connectedAt = session.host_last_connected_at
        ? new Date(session.host_last_connected_at)
        : null;
      const needsFreshGraceStart =
        !disconnectedAt ||
        (connectedAt !== null && connectedAt > disconnectedAt);

      if (needsFreshGraceStart) {
        console.log("Streamer absent; starting reconnect grace period", {
          eventId: session.event_id,
          sessionId: session.id,
          roomName: session.room_name,
        });
        await markHostDisconnected(supabase, session, now);
        results.push({
          sessionId: session.id,
          eventId: session.event_id,
          roomName: session.room_name,
          status: "skipped",
          errors: [],
        });
        continue;
      }

      if (now.getTime() - disconnectedAt.getTime() < HOST_RECONNECT_GRACE_MS) {
        results.push({
          sessionId: session.id,
          eventId: session.event_id,
          roomName: session.room_name,
          status: "skipped",
          errors: [],
        });
        continue;
      }

      console.warn("Streamer reconnect grace period expired; ending stream", {
        eventId: session.event_id,
        sessionId: session.id,
        roomName: session.room_name,
        disconnectedAt: disconnectedAt.toISOString(),
      });
      results.push(await endStreamSession(supabase, session, now, "room_closed"));
    } catch (error) {
      results.push({
        sessionId: session.id,
        eventId: session.event_id,
        roomName: session.room_name,
        status: "failed",
        errors: [getSafeErrorMessage(error)],
      });
    }
  }

  return {
    processed: results.length,
    ended: results.filter((result) => result.status === "ended").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}

export async function cleanupStreamLifecycle(
  supabase: SupabaseClient = getServiceSupabase()
): Promise<StreamCleanupSummary> {
  const expired = await cleanupExpiredStreamSessions(supabase);
  const disconnected = await cleanupDisconnectedStreamSessions(supabase);
  const results = [...expired.results, ...disconnected.results];

  return {
    processed: results.length,
    ended: results.filter((result) => result.status === "ended").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}

export async function cleanupExpiredStreamSessionForRoom(roomName: string) {
  const supabase = getServiceSupabase();
  const { data: session, error } = await supabase
    .from("event_stream_sessions")
    .select("id, event_id, room_name, status, hard_ends_at")
    .eq("room_name", roomName)
    .in("status", ["starting", "live"])
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!session) {
    return { expired: false, cleaned: false };
  }

  if (new Date(session.hard_ends_at) > new Date()) {
    return { expired: false, cleaned: false };
  }

  const result = await endExpiredStreamSession(
    supabase,
    session as ActiveStreamSession
  );

  return {
    expired: true,
    cleaned: result.status !== "skipped",
    result,
  };
}

export async function loadActiveStreamSessionForRoom(roomName: string) {
  const supabase = getServiceSupabase();
  const { data: session, error } = await supabase
    .from("event_stream_sessions")
    .select("id, event_id, room_name, status, hard_ends_at, viewer_limit")
    .eq("room_name", roomName)
    .in("status", ["starting", "live"])
    .maybeSingle();

  if (error) {
    throw error;
  }

  return session as ActiveStreamSessionForRoom | null;
}
