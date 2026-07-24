import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn());
const verifyPassword = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/password", () => ({ verifyPassword }));

import { POST } from "./route";

function request(password = "") {
  return new NextRequest(
    "http://localhost:3000/api/events/viewer/wedding/mux-playback",
    {
      body: JSON.stringify({ password }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
}

function mockEvent(event: {
  mux_playback_id: string | null;
  password: string | null;
  stream_provider: string | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: event, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  createClient.mockReturnValue({ from });
  return { eq, from, maybeSingle, select };
}

describe("POST /api/events/viewer/[slug]/mux-playback", () => {
  beforeEach(() => {
    createClient.mockReset();
    verifyPassword.mockReset();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.unstubAllGlobals();
  });

  it("returns the playback ID only once Mux HLS is playable", async () => {
    mockEvent({
      mux_playback_id: "playback-id",
      password: null,
      stream_provider: "mux",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("#EXTM3U", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(), {
      params: Promise.resolve({ slug: "wedding" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider: "mux",
      ready: true,
      playbackId: "playback-id",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://stream.mux.com/playback-id.m3u8",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("keeps the viewer waiting while Mux returns precondition failed", async () => {
    mockEvent({
      mux_playback_id: "playback-id",
      password: null,
      stream_provider: "mux",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 412 }))
    );

    const response = await POST(request(), {
      params: Promise.resolve({ slug: "wedding" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      provider: "mux",
      ready: false,
    });
  });

  it("does not expose playback for an incorrect event password", async () => {
    mockEvent({
      mux_playback_id: "playback-id",
      password: "stored-password",
      stream_provider: "mux",
    });
    verifyPassword.mockResolvedValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request("wrong-password"), {
      params: Promise.resolve({ slug: "wedding" }),
    });

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "Incorrect password" });
  });

  it("does not route LiveKit events through Mux playback", async () => {
    mockEvent({
      mux_playback_id: null,
      password: null,
      stream_provider: "livekit",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request(), {
      params: Promise.resolve({ slug: "wedding" }),
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
