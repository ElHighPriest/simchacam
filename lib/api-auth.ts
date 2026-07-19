import "server-only";

import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { isEmailVerified } from "@/lib/auth";

export class ApiAuthenticationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 500
  ) {
    super(message);
    this.name = "ApiAuthenticationError";
  }
}

export type AuthenticatedApiContext = {
  accessToken: string;
  authenticatedSupabase: SupabaseClient;
  user: User & { email_confirmed_at: string };
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiAuthenticationError("Missing server credentials", 500);
  }

  return { supabaseAnonKey, supabaseUrl };
}

export function createServiceRoleClient() {
  const { supabaseUrl } = getSupabaseConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new ApiAuthenticationError("Missing server credentials", 500);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function authenticateApiRequest(
  request: NextRequest
): Promise<AuthenticatedApiContext> {
  const { supabaseAnonKey, supabaseUrl } = getSupabaseConfig();
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    throw new ApiAuthenticationError("Unauthorized", 401);
  }

  const authSupabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error,
  } = await authSupabase.auth.getUser(accessToken);

  if (error || !isEmailVerified(user)) {
    throw new ApiAuthenticationError("Unauthorized", 401);
  }

  return {
    accessToken,
    authenticatedSupabase: createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }),
    user,
  };
}
