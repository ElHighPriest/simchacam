import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import {
  getMuxHlsUrl,
  getStreamProvider,
  isMuxPlaybackReady,
} from "@/lib/viewer-playback";

export const runtime = "nodejs";

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const supabase = getServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Playback is unavailable" },
      { status: 500 }
    );
  }

  try {
    const { slug } = await params;
    const { password } = (await request.json().catch(() => ({}))) as {
      password?: string;
    };
    const { data: event, error } = await supabase
      .from("events")
      .select("password, stream_provider, mux_playback_id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("Could not load Mux viewer event", error);
      return NextResponse.json(
        { error: "Playback is unavailable" },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (
      event.password &&
      !(await verifyPassword(password || "", event.password))
    ) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    if (
      getStreamProvider(event.stream_provider) !== "mux" ||
      !event.mux_playback_id
    ) {
      return NextResponse.json(
        { error: "Mux playback is not configured" },
        { status: 404 }
      );
    }

    const playbackResponse = await fetch(
      getMuxHlsUrl(event.mux_playback_id),
      {
        cache: "no-store",
        headers: { Accept: "application/vnd.apple.mpegurl" },
      }
    );

    if (!isMuxPlaybackReady(playbackResponse.status)) {
      return NextResponse.json({ provider: "mux", ready: false });
    }

    return NextResponse.json({
      provider: "mux",
      ready: true,
      playbackId: event.mux_playback_id,
    });
  } catch (error) {
    console.error("Could not check Mux playback", error);
    return NextResponse.json(
      { error: "Playback is unavailable" },
      { status: 502 }
    );
  }
}
