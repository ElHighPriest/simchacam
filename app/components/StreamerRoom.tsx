"use client";

import "@livekit/components-styles";
import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { supabase } from "@/lib/supabase";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
  eventId?: string;
};

function StreamerContent() {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const viewerCount = participants.filter(
    (participant) => participant.identity !== localParticipant.identity
  ).length;

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === localParticipant.identity
  );

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SimchaCam</h1>
          <p className="text-sm text-gray-400">Camera active</p>
        </div>
        <p className="text-sm text-gray-300">
          {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
        </p>
      </header>

      <section className="flex-1 flex items-center justify-center p-4">
        {localCameraTrack ? (
          <ParticipantTile
            trackRef={localCameraTrack}
            className="w-full max-w-5xl rounded-2xl overflow-hidden"
          />
        ) : (
          <div className="text-center text-gray-400">Starting camera...</div>
        )}
      </section>

      <footer className="p-4">
        <ControlBar
          controls={{
            microphone: true,
            camera: true,
            screenShare: false,
            chat: false,
            leave: true,
          }}
        />
      </footer>

      <RoomAudioRenderer />
    </main>
  );
}

export default function StreamerRoom({
  token,
  serverUrl,
  eventId,
}: StreamerRoomProps) {
  async function handleDisconnected() {
    if (eventId) {
      await supabase
        .from("events")
        .update({
          status: "ended",
        })
        .eq("id", eventId);
    }

    window.location.href = "/my-events";
  }

  return (
    <LiveKitRoom
      video={{
        facingMode: "environment",
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      }}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onDisconnected={handleDisconnected}
    >
      <StreamerContent />
    </LiveKitRoom>
  );
}
