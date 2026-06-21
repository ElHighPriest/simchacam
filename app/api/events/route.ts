import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { isEmailVerified } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken);

  if (!isEmailVerified(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, slug, eventAt, password } = await request.json();

  if (!name?.trim() || !slug) {
    return NextResponse.json(
      { error: "Missing event name or slug" },
      { status: 400 }
    );
  }

  const eventDate = eventAt ? new Date(eventAt) : null;

  if (eventDate && Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  }

  const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await authenticatedSupabase
    .from("events")
    .insert({
      name,
      slug,
      event_at: eventDate ? eventDate.toISOString() : null,
      password: password ? await hashPassword(password) : null,
      user_id: user.id,
      status: "offline",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(error);
    return NextResponse.json({ error: "Could not create event" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
