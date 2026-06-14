import { NextRequest, NextResponse } from "next/server";
import { deleteStreamRoom } from "@/lib/livekit-rooms";
import {
  endActiveStreamSession,
  getOwnedStreamContext,
  StreamLifecycleError,
} from "@/lib/stream-sessions";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const context = await getOwnedStreamContext(accessToken, id);

    await deleteStreamRoom(context.event.slug);
    const session = await endActiveStreamSession(context);

    return NextResponse.json({
      status: "ended",
      eventId: context.event.id,
      sessionId: session?.id ?? null,
    });
  } catch (error) {
    console.error("Could not stop server-owned stream", error);

    if (error instanceof StreamLifecycleError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Could not stop livestream" },
      { status: 502 }
    );
  }
}
