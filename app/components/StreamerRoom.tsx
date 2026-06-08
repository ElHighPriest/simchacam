"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
};

function StreamerContent() {
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (trackRef) =>
      trackRef.participant.identity === localParticipant.identity
  );

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4">
        <h1 className="text-2xl font-bold">SimchaCam</h1>
        <p className="text-sm text-gray-400">You are live</p>
      </header>

      <section className="flex-1 flex items-center justify-center p-4">
        {localCameraTrack ? (
          <ParticipantTile
            trackRef={localCameraTrack}
            className="w-full max-w-5xl rounded-2xl overflow-hidden"
          />
        ) : (
          <div className="text-center text-gray-400">
            Starting camera...
          </div>
        )}
      </section>

      <footer className="p-4">
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-red-600 text-white py-4 rounded-xl text-lg font-semibold"
        >
          End Stream
        </button>
      </footer>

      <RoomAudioRenderer />
    </main>
  );
}

export default function StreamerRoom({
  token,
  serverUrl,
}: StreamerRoomProps) {
  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: "100vh" }}
    >
      <StreamerContent />
    </LiveKitRoom>
  );
}