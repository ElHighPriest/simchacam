import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiAuthenticationError,
  authenticateApiRequest,
  createServiceRoleClient,
} from "@/lib/api-auth";

export class EventDeleteError extends Error {
  constructor(
    readonly code:
      | "EVENT_QUERY_FAILED"
      | "ACTIVE_STREAM_QUERY_FAILED"
      | "EVENT_STREAM_ACTIVE"
      | "EVENT_DELETE_CONFLICT"
      | "EVENT_DELETE_FAILED",
    message: string,
    readonly status = 500
  ) {
    super(message);
    this.name = "EventDeleteError";
  }
}

export async function deleteOwnedEvent(
  serviceSupabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<string | null> {
  const { data: event, error: eventError } = await serviceSupabase
    .from("events")
    .select("id, status")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (eventError) {
    console.error("Could not verify event ownership", eventError);
    throw new EventDeleteError(
      "EVENT_QUERY_FAILED",
      "Could not verify event ownership"
    );
  }

  if (!event) {
    return null;
  }

  if (event.status === "live") {
    throw new EventDeleteError(
      "EVENT_STREAM_ACTIVE",
      "An active event cannot be deleted",
      409
    );
  }

  const { data: activeSession, error: sessionError } = await serviceSupabase
    .from("event_stream_sessions")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ["starting", "live"])
    .maybeSingle();

  if (sessionError) {
    console.error("Could not check active stream session", sessionError);
    throw new EventDeleteError(
      "ACTIVE_STREAM_QUERY_FAILED",
      "Could not verify stream status"
    );
  }

  if (activeSession) {
    throw new EventDeleteError(
      "EVENT_STREAM_ACTIVE",
      "An active event cannot be deleted",
      409
    );
  }

  const { data: deletedEvent, error: deleteError } = await serviceSupabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    console.error("Could not delete event", deleteError);

    if (deleteError.code === "23503") {
      throw new EventDeleteError(
        "EVENT_DELETE_CONFLICT",
        "Event cannot be deleted because related records must be retained",
        409
      );
    }

    throw new EventDeleteError("EVENT_DELETE_FAILED", "Could not delete event");
  }

  return deletedEvent?.id ?? null;
}

type EventDeleteDependencies = {
  authenticate: (
    request: NextRequest
  ) => Promise<{ user: { id: string } }>;
  createServiceClient: () => SupabaseClient;
  deleteEvent: typeof deleteOwnedEvent;
};

const defaultDependencies: EventDeleteDependencies = {
  authenticate: authenticateApiRequest,
  createServiceClient: createServiceRoleClient,
  deleteEvent: deleteOwnedEvent,
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function createDeleteEventHandler(
  dependencies: EventDeleteDependencies = defaultDependencies
) {
  return async function deleteEvent(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { user } = await dependencies.authenticate(request);
      const { id } = await params;
      const deletedId = await dependencies.deleteEvent(
        dependencies.createServiceClient(),
        user.id,
        id
      );

      if (!deletedId) {
        return errorResponse("EVENT_NOT_FOUND", "Event not found", 404);
      }

      return NextResponse.json({ id: deletedId });
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

      if (error instanceof EventDeleteError) {
        return errorResponse(error.code, error.message, error.status);
      }

      console.error("Could not delete event", error);
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        "Could not delete event",
        500
      );
    }
  };
}
