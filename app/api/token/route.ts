import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { roomName, participantName, canPublish } = await request.json();

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: "Missing roomName or participantName" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing LiveKit API credentials" },
        { status: 500 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: "2h",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: Boolean(canPublish),
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