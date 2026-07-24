import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createRecordedPublicLiveStream,
  deleteMuxLiveStream,
  retrieveLiveStreamCredentials,
} from "@/lib/mux";

type MuxEvent = {
  id: string;
  mux_playback_id: string | null;
  mux_stream_id: string | null;
};

type MuxHostContext = {
  event: MuxEvent;
  serviceSupabase: SupabaseClient;
};

type MuxHostDependencies = {
  create: typeof createRecordedPublicLiveStream;
  delete: typeof deleteMuxLiveStream;
  retrieve: typeof retrieveLiveStreamCredentials;
};

const defaultDependencies: MuxHostDependencies = {
  create: createRecordedPublicLiveStream,
  delete: deleteMuxLiveStream,
  retrieve: retrieveLiveStreamCredentials,
};

export class MuxHostProvisioningError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code = "MUX_HOST_PROVISIONING_FAILED"
  ) {
    super(message);
    this.name = "MuxHostProvisioningError";
  }
}

async function loadPersistedMuxStream(
  serviceSupabase: SupabaseClient,
  eventId: string
) {
  const { data, error } = await serviceSupabase
    .from("events")
    .select("id, mux_stream_id, mux_playback_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Could not reload persisted Mux stream", {
      eventId,
      error,
    });
    throw new MuxHostProvisioningError("Could not load Mux stream");
  }

  if (!data?.mux_stream_id || !data.mux_playback_id) {
    throw new MuxHostProvisioningError("Could not persist Mux stream");
  }

  return data as MuxEvent;
}

export async function provisionMuxHost(
  context: MuxHostContext,
  dependencies: MuxHostDependencies = defaultDependencies
) {
  if (context.event.mux_stream_id) {
    const credentials = await dependencies.retrieve(
      context.event.mux_stream_id
    );

    return {
      streamKey: credentials.streamKey,
      playbackId: context.event.mux_playback_id ?? credentials.playbackId,
      provider: "mux" as const,
    };
  }

  const created = await dependencies.create();
  const { data: claimed, error } = await context.serviceSupabase
    .from("events")
    .update({
      mux_stream_id: created.streamId,
      mux_playback_id: created.playbackId,
      stream_provider: "mux",
    })
    .eq("id", context.event.id)
    .is("mux_stream_id", null)
    .select("id, mux_stream_id, mux_playback_id")
    .maybeSingle();

  if (error) {
    await dependencies.delete(created.streamId).catch((cleanupError) => {
      console.error("Could not delete unpersisted Mux stream", {
        streamId: created.streamId,
        cleanupError,
      });
    });
    console.error("Could not persist Mux stream", {
      eventId: context.event.id,
      error,
    });
    throw new MuxHostProvisioningError("Could not persist Mux stream");
  }

  if (claimed?.mux_stream_id === created.streamId) {
    return {
      streamKey: created.streamKey,
      playbackId: created.playbackId,
      provider: "mux" as const,
    };
  }

  await dependencies.delete(created.streamId).catch((cleanupError) => {
    console.error("Could not delete raced Mux stream", {
      streamId: created.streamId,
      cleanupError,
    });
  });
  const winner = await loadPersistedMuxStream(
    context.serviceSupabase,
    context.event.id
  );
  const credentials = await dependencies.retrieve(winner.mux_stream_id!);

  return {
    streamKey: credentials.streamKey,
    playbackId: winner.mux_playback_id!,
    provider: "mux" as const,
  };
}
