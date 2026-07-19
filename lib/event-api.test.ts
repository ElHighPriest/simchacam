import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EventApiDataError,
  getOwnedEventApiEvent,
  listOwnedEventApiEvents,
} from "@/lib/event-api";

type Result = { data: unknown; error: unknown };

const eventRow = {
  id: "event-1",
  name: "Wedding",
  slug: "wedding",
  status: "offline",
  event_at: null,
  created_at: "2026-07-01T12:00:00.000Z",
  password: "$2b$12$never-serialize-me",
};

function fakeSupabase(
  results: Record<string, Result>,
  equalityCalls: Array<[string, unknown]> = []
) {
  return {
    from(table: string) {
      const result = results[table] ?? { data: [], error: null };
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: unknown) {
          equalityCalls.push([column, value]);
          return query;
        },
        in() {
          return query;
        },
        is() {
          return query;
        },
        maybeSingle() {
          return Promise.resolve(result);
        },
        then<TResult1 = Result, TResult2 = never>(
          onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) {
          return Promise.resolve(result).then(onfulfilled, onrejected);
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

function associatedResults(overrides: Record<string, Result> = {}) {
  return {
    events: { data: eventRow, error: null },
    event_entitlements: { data: [], error: null },
    event_streamer_nominations: { data: [], error: null },
    event_recordings: { data: [], error: null },
    ...overrides,
  };
}

describe("event API service", () => {
  it("loads an owned event with an owner-scoped query and canonical nulls", async () => {
    const equalityCalls: Array<[string, unknown]> = [];
    const event = await getOwnedEventApiEvent(
      fakeSupabase(associatedResults(), equalityCalls),
      "owner-1",
      "event-1"
    );

    expect(equalityCalls).toEqual([
      ["id", "event-1"],
      ["user_id", "owner-1"],
    ]);
    expect(event).toMatchObject({
      id: "event-1",
      eventAt: null,
      entitlement: null,
      nominatedStreamer: null,
      recording: null,
      hasPassword: true,
    });
    expect(JSON.stringify(event)).not.toContain("never-serialize-me");
    expect(event).not.toHaveProperty("password");
  });

  it("returns null for a missing event", async () => {
    const client = fakeSupabase(
      associatedResults({ events: { data: null, error: null } })
    );

    await expect(
      getOwnedEventApiEvent(client, "owner-1", "missing")
    ).resolves.toBeNull();
  });

  it("returns null when the owner-scoped query cannot see another user's event", async () => {
    const equalityCalls: Array<[string, unknown]> = [];
    const client = fakeSupabase(
      associatedResults({ events: { data: null, error: null } }),
      equalityCalls
    );

    await expect(
      getOwnedEventApiEvent(client, "owner-1", "other-users-event")
    ).resolves.toBeNull();
    expect(equalityCalls).toContainEqual(["user_id", "owner-1"]);
  });

  it("uses the same mapper for list results and includes a nomination", async () => {
    const results = associatedResults({
      events: { data: [eventRow], error: null },
      event_streamer_nominations: {
        data: [
          {
            id: "nomination-1",
            event_id: "event-1",
            nominated_email: "host@example.com",
            accepted_at: "2026-07-02T12:00:00.000Z",
            created_at: "2026-07-01T12:00:00.000Z",
          },
        ],
        error: null,
      },
      event_recordings: {
        data: [
          {
            event_id: "event-1",
            status: "ready",
            expires_at: "2026-08-01T12:00:00.000Z",
            storage_path: "must-not-be-selected-or-serialized",
          },
        ],
        error: null,
      },
    });

    const [event] = await listOwnedEventApiEvents(
      fakeSupabase(results),
      "owner-1"
    );

    expect(event.nominatedStreamer).toEqual({
      id: "nomination-1",
      email: "host@example.com",
      status: "accepted",
      acceptedAt: "2026-07-02T12:00:00.000Z",
      createdAt: "2026-07-01T12:00:00.000Z",
    });
    expect(event.recording).toEqual({
      status: "ready",
      expiresAt: "2026-08-01T12:00:00.000Z",
    });
    expect(JSON.stringify(event)).not.toContain("storage_path");
  });

  it("distinguishes no entitlement from an entitlement query failure", async () => {
    await expect(
      getOwnedEventApiEvent(
        fakeSupabase(
          associatedResults({
            event_entitlements: {
              data: null,
              error: new Error("database unavailable"),
            },
          })
        ),
        "owner-1",
        "event-1"
      )
    ).rejects.toMatchObject({
      code: "ENTITLEMENT_QUERY_FAILED",
    } satisfies Partial<EventApiDataError>);
  });

  it("does not silently hide a recording query failure", async () => {
    await expect(
      getOwnedEventApiEvent(
        fakeSupabase(
          associatedResults({
            event_recordings: {
              data: null,
              error: new Error("database unavailable"),
            },
          })
        ),
        "owner-1",
        "event-1"
      )
    ).rejects.toMatchObject({ code: "RECORDING_QUERY_FAILED" });
  });
});
