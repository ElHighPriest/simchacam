import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPassword } from "@/lib/password";
import {
  EventPermissionError,
  getStreamEventContextBySlug,
} from "@/lib/event-permissions";
import {
  getActiveViewerCount,
  getStreamTokenTtlSeconds,
} from "@/lib/livekit-rooms";
import {
  cleanupExpiredStreamSessionForRoom,
  loadActiveStreamSessionForRoom,
} from "@/lib/stream-lifecycle";

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName, password } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "Missing roomName or participantName" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !apiKey ||
      !apiSecret
    ) {
      return NextResponse.json(
        { error: "Missing server credentials" },
        { status: 500 }
      );
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    let canPublish = false;
    const streamState = await cleanupExpiredStreamSessionForRoom(roomName);
    const activeSession = await loadActiveStreamSessionForRoom(roomName);

    if (streamState.expired) {
      return NextResponse.json(
        { error: "Livestream has ended", code: "STREAM_ENDED" },
        { status: 410 }
      );
    }

    if (participantName === "streamer") {
      const authorization = request.headers.get("authorization");
      const accessToken = authorization?.replace(/^Bearer\s+/i, "");

      if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        await getStreamEventContextBySlug(accessToken, roomName);
      } catch (error) {
        if (error instanceof EventPermissionError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.status }
          );
        }

        throw error;
      }

      canPublish = true;
    } else {
      const { data: event, error: eventError } = await serviceSupabase
        .from("events")
        .select("password")
        .eq("slug", roomName)
        .single();

      if (eventError || !event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (
        event.password &&
        !(await verifyPassword(password || "", event.password))
      ) {
        return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
      }
      if (activeSession) {
        const viewerCount = await getActiveViewerCount(roomName);

        // The LiveKit room max participant count is the hard guard against
        // simultaneous joins. This pre-check gives viewers a friendlier error.
        if (viewerCount >= activeSession.viewer_limit) {
          return NextResponse.json(
            {
              error: "This livestream is full",
              code: "EVENT_FULL",
            },
            { status: 403 }
          );
        }
      }
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: getStreamTokenTtlSeconds(activeSession?.hard_ends_at),
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}
