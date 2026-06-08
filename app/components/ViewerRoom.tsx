"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

type ViewerRoomProps = {
  token: string;
  serverUrl: string;
};

function ViewerContent() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const streamerTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === "streamer"
  );

  if (!streamerTrack) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white px-6 text-center">
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
    <main className="min-h-screen bg-black text-white flex flex-col">
      <section className="flex-1 flex items-center justify-center p-4">
        <ParticipantTile
          trackRef={streamerTrack}
          className="w-full max-w-5xl rounded-2xl overflow-hidden"
        />
      </section>

      <RoomAudioRenderer />
    </main>
  );
}

export default function ViewerRoom({ token, serverUrl }: ViewerRoomProps) {
  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: "100vh" }}
    >
      <ViewerContent />
    </LiveKitRoom>
  );
}