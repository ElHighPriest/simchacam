import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { AuthenticatedApiContext } from "@/lib/api-auth";
import { ApiAuthenticationError } from "@/lib/api-auth";
import { EventApiDataError } from "@/lib/event-api";
import { createGetEventDetailsHandler } from "@/lib/event-details-handler";

const canonicalEvent = {
  id: "event-1",
  name: "Wedding",
  slug: "wedding",
  status: "offline",
  eventAt: null,
  createdAt: "2026-07-01T12:00:00.000Z",
  hasPassword: false,
  entitlement: null,
  nominatedStreamer: null,
  recording: null,
};

const request = new NextRequest("https://simcha.cam/api/events/id/event-1", {
  headers: { authorization: "Bearer token" },
});

function handlerFor(event: typeof canonicalEvent | null) {
  return createGetEventDetailsHandler({
    authenticate: async () =>
      ({ user: { id: "owner-1" } }) as AuthenticatedApiContext,
    createServiceClient: () => ({}) as never,
    getOwnedEvent: async () => event,
  });
}

describe("event details GET handler", () => {
  it("returns the canonical event response envelope", async () => {
    const response = await handlerFor(canonicalEvent)(request, {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ event: canonicalEvent });
  });

  it("returns the same 404 for a missing or unauthorized event", async () => {
    const response = await handlerFor(null)(request, {
      params: Promise.resolve({ id: "event-owned-by-someone-else" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "EVENT_NOT_FOUND", message: "Event not found" },
    });
  });

  it("returns a structured authentication error", async () => {
    const handler = createGetEventDetailsHandler({
      authenticate: async () => {
        throw new ApiAuthenticationError("Unauthorized", 401);
      },
      createServiceClient: () => ({}) as never,
      getOwnedEvent: async () => canonicalEvent,
    });

    const response = await handler(request, {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTHENTICATION_REQUIRED", message: "Unauthorized" },
    });
  });

  it("returns a structured configuration failure", async () => {
    const handler = createGetEventDetailsHandler({
      authenticate: async () => {
        throw new ApiAuthenticationError("Missing server credentials", 500);
      },
      createServiceClient: () => ({}) as never,
      getOwnedEvent: async () => canonicalEvent,
    });

    const response = await handler(request, {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "CONFIGURATION_ERROR",
        message: "Server configuration error",
      },
    });
  });

  it("returns a structured database failure instead of a 404", async () => {
    const handler = createGetEventDetailsHandler({
      authenticate: async () =>
        ({ user: { id: "owner-1" } }) as AuthenticatedApiContext,
      createServiceClient: () => ({}) as never,
      getOwnedEvent: async () => {
        throw new EventApiDataError(
          "RECORDING_QUERY_FAILED",
          "Could not load event recordings"
        );
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "RECORDING_QUERY_FAILED",
        message: "Could not load event recordings",
      },
    });
  });
});
