import "server-only";

import Mux from "@mux/mux-node";

export class MuxConfigurationError extends Error {
  constructor(readonly missingVariables: string[]) {
    super(`Missing Mux configuration: ${missingVariables.join(", ")}`);
    this.name = "MuxConfigurationError";
  }
}

function getMuxConfiguration() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  const missingVariables = [
    !tokenId && "MUX_TOKEN_ID",
    !tokenSecret && "MUX_TOKEN_SECRET",
  ].filter((value): value is string => Boolean(value));

  if (missingVariables.length > 0) {
    throw new MuxConfigurationError(missingVariables);
  }

  return { tokenId, tokenSecret };
}

let muxClient: Mux | undefined;

export function getMuxClient() {
  if (!muxClient) {
    muxClient = new Mux(getMuxConfiguration());
  }

  return muxClient;
}

export const mux = new Proxy({} as Mux, {
  get(_target, property, receiver) {
    return Reflect.get(getMuxClient(), property, receiver);
  },
});

export async function createRecordedPublicLiveStream() {
  const liveStream = await getMuxClient().video.liveStreams.create({
    playback_policies: ["public"],
    new_asset_settings: {
      playback_policies: ["public"],
    },
  });
  const playbackId = liveStream.playback_ids?.find(
    ({ policy }) => policy === "public"
  )?.id;

  if (!liveStream.id || !liveStream.stream_key || !playbackId) {
    throw new Error("Mux returned an incomplete live stream");
  }

  return {
    streamId: liveStream.id,
    streamKey: liveStream.stream_key,
    playbackId,
  };
}

export async function retrieveLiveStreamCredentials(streamId: string) {
  const liveStream = await getMuxClient().video.liveStreams.retrieve(streamId);
  const playbackId = liveStream.playback_ids?.find(
    ({ policy }) => policy === "public"
  )?.id;

  if (!liveStream.stream_key || !playbackId) {
    throw new Error("Mux returned incomplete live stream credentials");
  }

  return {
    streamKey: liveStream.stream_key,
    playbackId,
  };
}

export async function deleteMuxLiveStream(streamId: string) {
  await getMuxClient().video.liveStreams.delete(streamId);
}
