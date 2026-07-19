import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { createClient, User } from "@supabase/supabase-js";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
} from "@/lib/api-auth";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function user(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

function clientFactory(result: { user: User | null; error: Error | null }) {
  return (() => ({
    auth: {
      getUser: async () => ({
        data: { user: result.user },
        error: result.error,
      }),
    },
  })) as unknown as typeof createClient;
}

describe("authenticateApiRequest", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });

  it("rejects a missing bearer token", async () => {
    const request = new NextRequest("https://simcha.cam/api/events/id/event-1");

    await expect(authenticateApiRequest(request)).rejects.toMatchObject({
      message: "Unauthorized",
      status: 401,
    } satisfies Partial<ApiAuthenticationError>);
  });

  it("rejects an invalid bearer token", async () => {
    const request = new NextRequest("https://simcha.cam/api/events/id/event-1", {
      headers: { authorization: "Bearer invalid" },
    });

    await expect(
      authenticateApiRequest(
        request,
        clientFactory({ user: null, error: new Error("invalid JWT") })
      )
    ).rejects.toMatchObject({ message: "Unauthorized", status: 401 });
  });

  it("rejects an account whose email is not verified", async () => {
    const request = new NextRequest("https://simcha.cam/api/events/id/event-1", {
      headers: { authorization: "Bearer token" },
    });

    await expect(
      authenticateApiRequest(
        request,
        clientFactory({
          user: user({ email_confirmed_at: undefined }),
          error: null,
        })
      )
    ).rejects.toMatchObject({ message: "Unauthorized", status: 401 });
  });
});
