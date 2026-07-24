export type StreamProvider = "livekit" | "mux";

export function getStreamProvider(
  provider: string | null | undefined
): StreamProvider {
  return provider === "mux" ? "mux" : "livekit";
}

export function isMuxPlaybackReady(status: number) {
  return status >= 200 && status < 300;
}

export function getMuxHlsUrl(playbackId: string) {
  return `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8`;
}
