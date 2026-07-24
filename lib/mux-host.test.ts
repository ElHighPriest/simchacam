import { beforeEach, describe, expect, it, vi } from "vitest";
import { provisionMuxHost } from "@/lib/mux-host";

const create = vi.fn();
const deleteStream = vi.fn();
const retrieve = vi.fn();

function createSupabase({
  claim,
  reload,
}: {
  claim?: unknown;
  reload?: unknown;
}) {
  const writes: unknown[] = [];

  return {
    writes,
    client: {
      from: vi.fn(() => ({
        update: vi.fn((value: unknown) => {
          writes.push(value);

          return {
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: claim ?? null,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: reload ?? null,
              error: null,
            })),
          })),
        })),
      })),
    },
  };
}

const dependencies = { create, delete: deleteStream, retrieve };

describe("Mux host provisioning", () => {
  beforeEach(() => {
    create.mockReset();
    deleteStream.mockReset();
    deleteStream.mockResolvedValue(undefined);
    retrieve.mockReset();
  });

  it("provisions and persists a Mux stream on the first host request", async () => {
    const supabase = createSupabase({
      claim: {
        id: "event-id",
        mux_stream_id: "mux-stream-id",
        mux_playback_id: "mux-playback-id",
      },
    });
    create.mockResolvedValue({
      streamId: "mux-stream-id",
      streamKey: "secret-stream-key",
      playbackId: "mux-playback-id",
    });

    await expect(
      provisionMuxHost(
        {
          event: {
            id: "event-id",
            mux_stream_id: null,
            mux_playback_id: null,
          },
          serviceSupabase: supabase.client as never,
        },
        dependencies
      )
    ).resolves.toEqual({
      streamKey: "secret-stream-key",
      playbackId: "mux-playback-id",
      provider: "mux",
    });
    expect(supabase.writes).toEqual([
      {
        mux_stream_id: "mux-stream-id",
        mux_playback_id: "mux-playback-id",
        stream_provider: "mux",
      },
    ]);
    expect(JSON.stringify(supabase.writes)).not.toContain("secret-stream-key");
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("reuses the existing Mux stream and stable playback ID", async () => {
    const supabase = createSupabase({});
    retrieve.mockResolvedValue({
      streamKey: "current-stream-key",
      playbackId: "provider-playback-id",
    });

    await expect(
      provisionMuxHost(
        {
          event: {
            id: "event-id",
            mux_stream_id: "mux-stream-id",
            mux_playback_id: "stable-playback-id",
          },
          serviceSupabase: supabase.client as never,
        },
        dependencies
      )
    ).resolves.toEqual({
      streamKey: "current-stream-key",
      playbackId: "stable-playback-id",
      provider: "mux",
    });
    expect(create).not.toHaveBeenCalled();
    expect(supabase.writes).toEqual([]);
  });

  it("discards a raced stream and returns the persisted winner", async () => {
    const supabase = createSupabase({
      claim: null,
      reload: {
        id: "event-id",
        mux_stream_id: "winning-stream-id",
        mux_playback_id: "winning-playback-id",
      },
    });
    create.mockResolvedValue({
      streamId: "raced-stream-id",
      streamKey: "raced-stream-key",
      playbackId: "raced-playback-id",
    });
    retrieve.mockResolvedValue({
      streamKey: "winning-stream-key",
      playbackId: "winning-playback-id",
    });

    await expect(
      provisionMuxHost(
        {
          event: {
            id: "event-id",
            mux_stream_id: null,
            mux_playback_id: null,
          },
          serviceSupabase: supabase.client as never,
        },
        dependencies
      )
    ).resolves.toEqual({
      streamKey: "winning-stream-key",
      playbackId: "winning-playback-id",
      provider: "mux",
    });
    expect(deleteStream).toHaveBeenCalledWith("raced-stream-id");
    expect(retrieve).toHaveBeenCalledWith("winning-stream-id");
  });
});
