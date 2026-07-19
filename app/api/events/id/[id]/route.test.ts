import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const updateCalls: unknown[] = [];
const equalityCalls: Array<[string, unknown]> = [];

const updateQuery = {
  update(updates: unknown) {
    updateCalls.push(updates);
    return updateQuery;
  },
  eq(column: string, value: unknown) {
    equalityCalls.push([column, value]);
    return updateQuery;
  },
  select() {
    return updateQuery;
  },
  single: async () => ({ data: { id: "event-1" }, error: null }),
};

vi.mock("@/lib/api-auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api-auth")>();
  return {
    ...original,
    authenticateApiRequest: async () => ({
      accessToken: "token",
      user: { id: "owner-1", email_confirmed_at: "2026-01-01" },
      authenticatedSupabase: {
        from: () => updateQuery,
      },
    }),
    createServiceRoleClient: () => ({}),
  };
});

import { PATCH } from "@/app/api/events/id/[id]/route";

describe("event details PATCH regression", () => {
  it("preserves the existing owner-scoped name update response", async () => {
    updateCalls.length = 0;
    equalityCalls.length = 0;
    const request = new NextRequest(
      "https://simcha.cam/api/events/id/event-1",
      {
        method: "PATCH",
        headers: { authorization: "Bearer token" },
        body: JSON.stringify({ name: "Updated wedding" }),
      }
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "event-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "event-1" });
    expect(updateCalls).toEqual([{ name: "Updated wedding" }]);
    expect(equalityCalls).toEqual([
      ["id", "event-1"],
      ["user_id", "owner-1"],
    ]);
  });
});
