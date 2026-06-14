import "server-only";

import {
  AccessToken,
  RoomServiceClient,
  TwirpError,
} from "livekit-server-sdk";

function getLiveKitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const clientUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const serverUrl = process.env.LIVEKIT_URL || clientUrl;

  if (!apiKey || !apiSecret || !clientUrl || !serverUrl) {
    throw new Error("Missing LiveKit server credentials");
  }

  return {
    apiKey,
    apiSecret,
    clientUrl,
    serverUrl: serverUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:"),
  };
}

function getRoomServiceClient() {
  const config = getLiveKitConfig();

  return new RoomServiceClient(
    config.serverUrl,
    config.apiKey,
    config.apiSecret
  );
}

export async function createStreamRoom(roomName: string) {
  return getRoomServiceClient().createRoom({
    name: roomName,
    emptyTimeout: 300,
    departureTimeout: 120,
  });
}

export async function deleteStreamRoom(roomName: string) {
  try {
    await getRoomServiceClient().deleteRoom(roomName);
  } catch (error) {
    if (
      error instanceof TwirpError &&
      (error.status === 404 || error.code === "not_found")
    ) {
      return;
    }

    throw error;
  }
}

export async function createPublisherToken(roomName: string) {
  const config = getLiveKitConfig();
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: "streamer",
    ttl: "2h",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    token: await token.toJwt(),
    url: config.clientUrl,
  };
}
