import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
  createServiceRoleClient,
} from "@/lib/api-auth";
import {
  EventApiDataError,
  getOwnedEventApiEvent,
  type EventApiEvent,
} from "@/lib/event-api";

type EventDetailsDependencies = {
  authenticate: (
    request: NextRequest
  ) => Promise<{ user: { id: string } }>;
  createServiceClient: () => SupabaseClient;
  getOwnedEvent: (
    client: SupabaseClient,
    userId: string,
    eventId: string
  ) => Promise<EventApiEvent | null>;
};

const defaultDependencies: EventDetailsDependencies = {
  authenticate: authenticateApiRequest,
  createServiceClient: createServiceRoleClient,
  getOwnedEvent: getOwnedEventApiEvent,
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function createGetEventDetailsHandler(
  dependencies: EventDetailsDependencies = defaultDependencies
) {
  return async function getEventDetails(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { user } = await dependencies.authenticate(request);
      const { id } = await params;
      const event = await dependencies.getOwnedEvent(
        dependencies.createServiceClient(),
        user.id,
        id
      );

      if (!event) {
        return errorResponse("EVENT_NOT_FOUND", "Event not found", 404);
      }

      return NextResponse.json({ event });
    } catch (error) {
      if (error instanceof ApiAuthenticationError) {
        return errorResponse(
          error.status === 401
            ? "AUTHENTICATION_REQUIRED"
            : "CONFIGURATION_ERROR",
          error.status === 401 ? "Unauthorized" : "Server configuration error",
          error.status
        );
      }

      if (error instanceof EventApiDataError) {
        return errorResponse(error.code, error.message, 500);
      }

      console.error("Could not load event details", error);
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        "Could not load event",
        500
      );
    }
  };
}
