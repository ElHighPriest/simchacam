import { NextRequest, NextResponse } from "next/server";
import {
  createPublisherToken,
  createLimitedStreamRoom,
  deleteStreamRoom,
} from "@/lib/livekit-rooms";
import {
  createOrReuseStreamSession,
  getOwnedStreamContext,
  markCreatedSessionFailed,
  markStreamLive,
  StreamLifecycleError,
} from "@/lib/stream-sessions";
import {
  assertCanPublishStream,
  EventPermissionError,
} from "@/lib/event-permissions";

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

  let createdSession:
    | Awaited<ReturnType<typeof createOrReuseStreamSession>>
    | undefined;
  let context: Awaited<ReturnType<typeof getOwnedStreamContext>> | undefined;

  try {
    const { id } = await params;
    context = await getOwnedStreamContext(accessToken, id);

    if (context.event.status === "ended") {
      throw new StreamLifecycleError("Event has ended", 409);
    }

    await assertCanPublishStream(context);

    createdSession = await createOrReuseStreamSession(context);
    await createLimitedStreamRoom(
      createdSession.session.room_name,
      createdSession.session.viewer_limit
    );
    const publisher = await createPublisherToken(
      createdSession.session.room_name,
      createdSession.session.hard_ends_at
    );
    await markStreamLive(context, createdSession.session.id);

    return NextResponse.json({
      token: publisher.token,
      url: publisher.url,
      eventId: context.event.id,
      sessionId: createdSession.session.id,
      hardEndsAt: createdSession.session.hard_ends_at,
      recordingEnabled: context.entitlement.recording_enabled,
    });
  } catch (error) {
    console.error("Could not start server-owned stream", error);

    if (context && createdSession?.created) {
      await deleteStreamRoom(createdSession.session.room_name).catch(
        (cleanupError) => {
          console.error("Could not clean up LiveKit room", cleanupError);
        }
      );
      await markCreatedSessionFailed(context, createdSession.session.id);
    }

    if (error instanceof StreamLifecycleError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof EventPermissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "Could not start livestream" },
      { status: 502 }
    );
  }
}
