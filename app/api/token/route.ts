import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPassword } from "@/lib/password";
import { isEmailVerified } from "@/lib/auth";
import { cleanupExpiredStreamSessionForRoom } from "@/lib/stream-lifecycle";

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
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!supabaseUrl || !supabaseAnonKey || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing server credentials" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    let canPublish = false;
    const streamState = await cleanupExpiredStreamSessionForRoom(roomName);

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

      const {
        data: { user },
      } = await supabase.auth.getUser(accessToken);

      if (!isEmailVerified(user)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const { data: event, error: eventError } = await authenticatedSupabase
        .from("events")
        .select("user_id")
        .eq("slug", roomName)
        .single();

      if (eventError || !event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (user.id !== event.user_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      canPublish = true;
    } else {
      const { data: event, error: eventError } = await supabase
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
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: "2h",
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
