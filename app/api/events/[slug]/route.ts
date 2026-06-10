import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const { slug } = await params;
  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, slug, password, status")
    .eq("slug", slug)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: event.id,
    name: event.name,
    slug: event.slug,
    status: event.status,
    hasPassword: Boolean(event.password),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

  const { slug } = await params;
  const { password } = await request.json();
  const { data: event, error } = await supabase
    .from("events")
    .select("password")
    .eq("slug", slug)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.password && !(await verifyPassword(password || "", event.password))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
