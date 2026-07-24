import { NextRequest, NextResponse } from "next/server";
import {
  assertCanPublishStream,
  EventPermissionError,
  getStreamEventContext,
} from "@/lib/event-permissions";
import {
  MuxHostProvisioningError,
  provisionMuxHost,
} from "@/lib/mux-host";
import { MuxConfigurationError } from "@/lib/mux";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const accessToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!accessToken) {
    return NextResponse.json(
      {
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      },
      { status: 401 }
    );
  }

  try {
    const { eventId } = await params;
    const context = await getStreamEventContext(accessToken, eventId);

    await assertCanPublishStream(context);
    const muxHost = await provisionMuxHost(context);

    console.info("Prepared Mux host credentials", {
      eventId,
      playbackId: muxHost.playbackId,
      provisionedFor: context.role,
    });

    return NextResponse.json(muxHost);
  } catch (error) {
    if (error instanceof EventPermissionError) {
      return NextResponse.json(
        {
          error: {
            code: error.code ?? "EVENT_ACCESS_DENIED",
            message: error.message,
          },
        },
        { status: error.status }
      );
    }

    if (error instanceof MuxConfigurationError) {
      console.error("Mux host configuration error", {
        missingVariables: error.missingVariables,
      });
      return NextResponse.json(
        {
          error: {
            code: "MUX_CONFIGURATION_ERROR",
            message: "Live streaming is unavailable",
          },
        },
        { status: 500 }
      );
    }

    if (error instanceof MuxHostProvisioningError) {
      console.error("Could not prepare Mux host", error);
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: "Could not prepare live stream",
          },
        },
        { status: error.status }
      );
    }

    console.error("Could not prepare Mux host", error);
    return NextResponse.json(
      {
        error: {
          code: "MUX_HOST_UNAVAILABLE",
          message: "Could not prepare live stream",
        },
      },
      { status: 502 }
    );
  }
}
