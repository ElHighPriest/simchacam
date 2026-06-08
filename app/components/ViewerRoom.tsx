"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
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
    <main className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      <header className="px-4 py-3 border-b border-white/10">
        <h1 className="text-lg font-semibold">SimchaCam</h1>
        <p className="text-xs text-gray-400">Live now</p>
      </header>

      <section className="flex-1 flex items-center justify-center p-3 overflow-hidden">
        <div className="w-full h-full max-w-6xl flex items-center justify-center">
          <VideoTrack
            trackRef={streamerTrack}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
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