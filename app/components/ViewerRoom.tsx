"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ViewerRoomProps = {
  token: string;
  serverUrl: string;
  eventId: string;
  eventName: string | null;
  eventAt: string | null;
};

function ViewerContent({
  eventId,
  eventName,
  eventAt,
}: {
  eventId: string;
  eventName: string | null;
  eventAt: string | null;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const streamerTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === "streamer"
  );

  useEffect(() => {
    async function checkStatus() {
      const { data } = await supabase
        .from("events")
        .select("status")
        .eq("id", eventId)
        .single();

      setStatus(data?.status || null);
    }

    checkStatus();

    const interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [eventId]);

  if (!streamerTrack && status === "ended") {
    return (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            SimchaCam
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold">
            {eventName}
          </h1>
          <p className="mt-4 text-white/70">This livestream has ended.</p>
        </div>
      </main>
    );
  }

  if (!streamerTrack) {
    return (
      <main className="flex h-screen items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
        <div>
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full border-2 border-gold bg-gold/10" />
          <h1 className="mt-5 font-display text-4xl font-semibold">
            {eventName}
          </h1>
          <p className="mt-3 text-white/70">
            Connecting to the livestream...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-black text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-navy/55 px-4 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {eventName}
          </h1>
          {eventAt && (
            <p className="hidden text-xs text-white/45 sm:block">
              {new Date(eventAt).toLocaleString("en-GB")}
            </p>
          )}
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2 rounded-full bg-recording-red/15 px-3 py-1.5 text-xs font-semibold text-[#ff7774]">
          <span className="h-2 w-2 rounded-full bg-recording-red" />
          LIVE
        </div>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-1.5 sm:p-3">
        <div className="flex h-full w-full max-w-6xl items-center justify-center overflow-hidden">
          <ParticipantTile
            trackRef={streamerTrack}
            className="h-full max-h-full w-full max-w-full overflow-hidden rounded-lg sm:rounded-xl"
          />
        </div>
      </section>

      <RoomAudioRenderer />
    </main>
  );
}

export default function ViewerRoom({
  token,
  serverUrl,
  eventId,
  eventName,
  eventAt,
}: ViewerRoomProps) {
  return (
    <LiveKitRoom
      video={false}
      audio={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: "100vh", overflow: "hidden" }}
      connectOptions={{
        autoSubscribe: true,
      }}
    >
      <ViewerContent
        eventId={eventId}
        eventName={eventName}
        eventAt={eventAt}
      />
    </LiveKitRoom>
  );
}
