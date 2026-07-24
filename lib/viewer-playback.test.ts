import { describe, expect, it } from "vitest";
import {
  getMuxHlsUrl,
  getStreamProvider,
  isMuxPlaybackReady,
} from "@/lib/viewer-playback";

describe("viewer playback provider selection", () => {
  it("uses Mux only for explicitly Mux-backed events", () => {
    expect(getStreamProvider("mux")).toBe("mux");
  });

  it("keeps existing and null-provider events on LiveKit", () => {
    expect(getStreamProvider("livekit")).toBe("livekit");
    expect(getStreamProvider(null)).toBe("livekit");
    expect(getStreamProvider(undefined)).toBe("livekit");
  });

  it("builds the canonical Mux HLS URL and recognises readiness", () => {
    expect(getMuxHlsUrl("playback/id")).toBe(
      "https://stream.mux.com/playback%2Fid.m3u8"
    );
    expect(isMuxPlaybackReady(200)).toBe(true);
    expect(isMuxPlaybackReady(206)).toBe(true);
    expect(isMuxPlaybackReady(412)).toBe(false);
    expect(isMuxPlaybackReady(404)).toBe(false);
  });
});
