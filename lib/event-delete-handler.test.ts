import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiAuthenticationError } from "@/lib/api-auth";
import {
  createDeleteEventHandler,
  EventDeleteError,
} from "@/lib/event-delete-handler";

const request = new NextRequest(
  "https://simcha.cam/api/events/id/event-1",
  {
    method: "DELETE",
    headers: { authorization: "Bearer token" },
  }
);
const context = { params: Promise.resolve({ id: "event-1" }) };

function dependencies(
  deleteEvent: (
    client: SupabaseClient,
    userId: string,
    eventId: string
  ) => Promise<string | null>
) {
  return {
    authenticate: vi.fn(async () => ({ user: { id: "owner-1" } })),
    createServiceClient: vi.fn(() => ({}) as SupabaseClient),
    deleteEvent,
  };
}

describe("event DELETE handler", () => {
  it("returns the deleted event ID for an owned event", async () => {
    const deleteEvent = vi.fn(async () => "event-1");
    const handler = createDeleteEventHandler(dependencies(deleteEvent));

    const response = await handler(request, context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "event-1" });
    expect(deleteEvent).toHaveBeenCalledWith({}, "owner-1", "event-1");
  });

  it("returns the same 404 for a missing or non-owned event", async () => {
    const handler = createDeleteEventHandler(
      dependencies(vi.fn(async () => null))
    );

    const response = await handler(request, context);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "EVENT_NOT_FOUND", message: "Event not found" },
    });
  });

  it("rejects deletion while a stream is active", async () => {
    const handler = createDeleteEventHandler(
      dependencies(
        vi.fn(async () => {
          throw new EventDeleteError(
            "EVENT_STREAM_ACTIVE",
            "An active event cannot be deleted",
            409
          );
        })
      )
    );

    const response = await handler(request, context);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EVENT_STREAM_ACTIVE",
        message: "An active event cannot be deleted",
      },
    });
  });

  it("uses the shared authentication error contract", async () => {
    const deps = dependencies(vi.fn(async () => "event-1"));
    deps.authenticate = vi.fn(async () => {
      throw new ApiAuthenticationError("Unauthorized", 401);
    });
    const handler = createDeleteEventHandler(deps);

    const response = await handler(request, context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Unauthorized",
      },
    });
  });

  it("does not report database failures as not found", async () => {
    const handler = createDeleteEventHandler(
      dependencies(
        vi.fn(async () => {
          throw new EventDeleteError(
            "EVENT_DELETE_FAILED",
            "Could not delete event"
          );
        })
      )
    );

    const response = await handler(request, context);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "EVENT_DELETE_FAILED",
        message: "Could not delete event",
      },
    });
  });
});
