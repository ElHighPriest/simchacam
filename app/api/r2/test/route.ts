import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { isEmailVerified } from "@/lib/auth";
import { testR2Connection } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Missing server credentials" },
      { status: 500 }
    );
  }

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

  try {
    const result = await testR2Connection();

    return NextResponse.json({
      connected: true,
      ...result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { connected: false, error: "Could not access R2 bucket" },
      { status: 502 }
    );
  }
}
