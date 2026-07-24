import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getStreamEventContext = vi.hoisted(() => vi.fn());
const assertCanPublishStream = vi.hoisted(() => vi.fn());
const provisionMuxHost = vi.hoisted(() => vi.fn());

vi.mock("@/lib/event-permissions", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/event-permissions")>();

  return {
    ...original,
    assertCanPublishStream,
    getStreamEventContext,
  };
});
vi.mock("@/lib/mux-host", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mux-host")>();

  return { ...original, provisionMuxHost };
});

import { EventPermissionError } from "@/lib/event-permissions";
import { POST } from "./route";

const request = (authenticated = true) =>
  new NextRequest("http://localhost:3000/api/events/event-id/mux-host", {
    method: "POST",
    headers: authenticated
      ? { Authorization: "Bearer access-token" }
      : undefined,
  });

describe("POST /api/events/[eventId]/mux-host", () => {
  beforeEach(() => {
    getStreamEventContext.mockReset();
    assertCanPublishStream.mockReset();
    provisionMuxHost.mockReset();
  });

  it("requires a bearer token", async () => {
    const response = await POST(request(false), {
      params: Promise.resolve({ slug: "event-id" }),
    });

    expect(response.status).toBe(401);
    expect(getStreamEventContext).not.toHaveBeenCalled();
  });

  it("uses the existing publishing authorization and returns Mux credentials", async () => {
    const context = { role: "nominated_streamer" };
    getStreamEventContext.mockResolvedValue(context);
    provisionMuxHost.mockResolvedValue({
      streamKey: "stream-key",
      playbackId: "playback-id",
      provider: "mux",
    });
    const infoLog = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await POST(request(), {
      params: Promise.resolve({ slug: "event-id" }),
    });

    expect(getStreamEventContext).toHaveBeenCalledWith(
      "access-token",
      "event-id"
    );
    expect(assertCanPublishStream).toHaveBeenCalledWith(context);
    expect(provisionMuxHost).toHaveBeenCalledWith(context);
    expect(await response.json()).toEqual({
      streamKey: "stream-key",
      playbackId: "playback-id",
      provider: "mux",
    });
    infoLog.mockRestore();
  });

  it("does not provision when publishing authorization fails", async () => {
    getStreamEventContext.mockResolvedValue({ role: "owner" });
    assertCanPublishStream.mockRejectedValue(
      new EventPermissionError("Forbidden", 403, "FORBIDDEN")
    );

    const response = await POST(request(), {
      params: Promise.resolve({ slug: "event-id" }),
    });

    expect(response.status).toBe(403);
    expect(provisionMuxHost).not.toHaveBeenCalled();
  });
});
