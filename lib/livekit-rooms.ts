import "server-only";

import {
  AccessToken,
  RoomServiceClient,
  TwirpError,
} from "livekit-server-sdk";

const TOKEN_EXPIRY_BUFFER_SECONDS = 5 * 60;
const MIN_TOKEN_TTL_SECONDS = 5 * 60;
const DEFAULT_TOKEN_TTL_SECONDS = 2 * 60 * 60;

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

export async function createLimitedStreamRoom(
  roomName: string,
  viewerLimit: number
) {
  return getRoomServiceClient().createRoom({
    name: roomName,
    emptyTimeout: 300,
    departureTimeout: 120,
    maxParticipants: viewerLimit + 1,
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

export async function getActiveViewerCount(roomName: string) {
  try {
    const participants = await getRoomServiceClient().listParticipants(roomName);

    return participants.filter(
      (participant) => participant.identity !== "streamer"
    ).length;
  } catch (error) {
    if (
      error instanceof TwirpError &&
      (error.status === 404 || error.code === "not_found")
    ) {
      return 0;
    }

    throw error;
  }
}

export function getStreamTokenTtlSeconds(hardEndsAt?: string | null) {
  if (!hardEndsAt) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }

  const expiresAt = new Date(hardEndsAt).getTime();

  if (Number.isNaN(expiresAt)) {
    return DEFAULT_TOKEN_TTL_SECONDS;
  }

  const secondsUntilHardEnd = Math.ceil((expiresAt - Date.now()) / 1000);

  return Math.max(
    MIN_TOKEN_TTL_SECONDS,
    secondsUntilHardEnd + TOKEN_EXPIRY_BUFFER_SECONDS
  );
}

export async function createPublisherToken(
  roomName: string,
  hardEndsAt?: string | null
) {
  const config = getLiveKitConfig();
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: "streamer",
    ttl: getStreamTokenTtlSeconds(hardEndsAt),
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
