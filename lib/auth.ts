import type { User } from "@supabase/supabase-js";

export function isEmailVerified(
  user: User | null
): user is User & { email_confirmed_at: string } {
  return Boolean(user?.email_confirmed_at);
}
