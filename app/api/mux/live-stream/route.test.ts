import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateApiRequest = vi.hoisted(() => vi.fn());
const createRecordedPublicLiveStream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api-auth")>();

  return { ...original, authenticateApiRequest };
});
vi.mock("@/lib/mux", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mux")>();

  return { ...original, createRecordedPublicLiveStream };
});

import { ApiAuthenticationError } from "@/lib/api-auth";
import { POST } from "./route";

const request = () =>
  new NextRequest("http://localhost:3000/api/mux/live-stream", {
    method: "POST",
    headers: { Authorization: "Bearer access-token" },
  });

describe("POST /api/mux/live-stream", () => {
  beforeEach(() => {
    authenticateApiRequest.mockReset();
    createRecordedPublicLiveStream.mockReset();
  });

  it("requires bearer authentication", async () => {
    authenticateApiRequest.mockRejectedValue(
      new ApiAuthenticationError("Unauthorized", 401)
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
      },
    });
    expect(createRecordedPublicLiveStream).not.toHaveBeenCalled();
  });

  it("returns only the public live-stream credentials", async () => {
    authenticateApiRequest.mockResolvedValue({ user: { id: "user-id" } });
    createRecordedPublicLiveStream.mockResolvedValue({
      streamId: "stream-id",
      streamKey: "stream-key",
      playbackId: "playback-id",
    });
    const infoLog = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      streamId: "stream-id",
      streamKey: "stream-key",
      playbackId: "playback-id",
    });
    infoLog.mockRestore();
  });

  it("returns a structured provider error", async () => {
    authenticateApiRequest.mockResolvedValue({ user: { id: "user-id" } });
    createRecordedPublicLiveStream.mockRejectedValue(new Error("Mux failed"));
    const infoLog = vi.spyOn(console, "info").mockImplementation(() => {});
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "MUX_LIVE_STREAM_CREATE_FAILED",
        message: "Could not create live stream",
      },
    });
    infoLog.mockRestore();
    errorLog.mockRestore();
  });
});
