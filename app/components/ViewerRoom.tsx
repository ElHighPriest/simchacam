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
};

function ViewerContent({ eventId }: { eventId: string }) {
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
      <main className="h-screen flex items-center justify-center bg-black text-white px-6 text-center overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold mb-4">SimchaCam</h1>
          <p className="text-gray-300">This livestream has ended.</p>
        </div>
      </main>
    );
  }

  if (!streamerTrack) {
    return (
      <main className="h-screen flex items-center justify-center bg-black text-white px-6 text-center overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold mb-4">SimchaCam</h1>
          <p className="text-gray-300">
            Waiting for the livestream to begin...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div>
          <h1 className="text-lg font-semibold">SimchaCam</h1>
          <p className="text-xs text-gray-400">Live now</p>
        </div>
      </header>

      <section className="flex-1 min-h-0 flex items-center justify-center overflow-hidden p-3">
        <div className="w-full h-full max-w-6xl flex items-center justify-center overflow-hidden">
          <ParticipantTile
            trackRef={streamerTrack}
            className="w-full h-full max-h-full max-w-full rounded-xl overflow-hidden"
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
}: ViewerRoomProps) {
  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: "100vh", overflow: "hidden" }}
      connectOptions={{
        autoSubscribe: true,
      }}
    >
      <ViewerContent eventId={eventId} />
    </LiveKitRoom>
  );
}