import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
} from "@/lib/api-auth";
import {
  createRecordedPublicLiveStream,
  MuxConfigurationError,
} from "@/lib/mux";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(request);

    console.info("Creating Mux live stream", { userId: user.id });
    const liveStream = await createRecordedPublicLiveStream();
    console.info("Created Mux live stream", {
      playbackId: liveStream.playbackId,
      streamId: liveStream.streamId,
      userId: user.id,
    });

    return NextResponse.json(liveStream, { status: 201 });
  } catch (error) {
    if (error instanceof ApiAuthenticationError) {
      return NextResponse.json(
        {
          error: {
            code:
              error.status === 401
                ? "AUTHENTICATION_REQUIRED"
                : "AUTHENTICATION_CONFIGURATION_ERROR",
            message:
              error.status === 401
                ? "Authentication required"
                : "Authentication is unavailable",
          },
        },
        { status: error.status }
      );
    }

    if (error instanceof MuxConfigurationError) {
      console.error("Mux live stream configuration error", {
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

    console.error("Could not create Mux live stream", error);
    return NextResponse.json(
      {
        error: {
          code: "MUX_LIVE_STREAM_CREATE_FAILED",
          message: "Could not create live stream",
        },
      },
      { status: 502 }
    );
  }
}
