import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());
const Mux = vi.hoisted(() =>
  vi.fn(function MockMux() {
    return {
      video: {
        liveStreams: { create },
      },
    };
  })
);

vi.mock("@mux/mux-node", () => ({ default: Mux }));

import {
  createRecordedPublicLiveStream,
  getMuxClient,
} from "@/lib/mux";

describe("Mux service", () => {
  beforeEach(() => {
    vi.stubEnv("MUX_TOKEN_ID", "mux-token-id");
    vi.stubEnv("MUX_TOKEN_SECRET", "mux-token-secret");
    create.mockReset();
  });

  it("initializes one client using server credentials", () => {
    expect(getMuxClient()).toBe(getMuxClient());
    expect(Mux).toHaveBeenCalledWith({
      tokenId: "mux-token-id",
      tokenSecret: "mux-token-secret",
    });
  });

  it("creates a recorded live stream with public playback", async () => {
    create.mockResolvedValue({
      id: "stream-id",
      stream_key: "stream-key",
      playback_ids: [{ id: "playback-id", policy: "public" }],
    });

    await expect(createRecordedPublicLiveStream()).resolves.toEqual({
      streamId: "stream-id",
      streamKey: "stream-key",
      playbackId: "playback-id",
    });
    expect(create).toHaveBeenCalledWith({
      playback_policies: ["public"],
      new_asset_settings: { playback_policies: ["public"] },
    });
  });

  it("rejects an incomplete Mux response", async () => {
    create.mockResolvedValue({
      id: "stream-id",
      stream_key: "stream-key",
      playback_ids: [],
    });

    await expect(createRecordedPublicLiveStream()).rejects.toThrow(
      "Mux returned an incomplete live stream"
    );
  });

  it("reports missing configuration before creating a client", async () => {
    vi.resetModules();
    vi.stubEnv("MUX_TOKEN_ID", "");
    vi.stubEnv("MUX_TOKEN_SECRET", "");
    const isolatedMux = await import("@/lib/mux");

    expect(() => isolatedMux.getMuxClient()).toThrow(
      "Missing Mux configuration: MUX_TOKEN_ID, MUX_TOKEN_SECRET"
    );
  });
});
