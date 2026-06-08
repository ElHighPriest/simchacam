"use client";

import "@livekit/components-styles";
import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect } from "react";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
};

function StreamerContent() {
  const { localParticipant } = useLocalParticipant();

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === localParticipant.identity
  );

  useEffect(() => {
    async function startRearCamera() {
      try {
        await localParticipant.setCameraEnabled(true, {
          facingMode: "environment",
        });
      } catch (error) {
        console.error("Could not start rear camera", error);
      }
    }

    startRearCamera();
  }, [localParticipant]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4">
        <h1 className="text-2xl font-bold">SimchaCam</h1>
        <p className="text-sm text-gray-400">Rear camera active</p>
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

export default function StreamerRoom({ token, serverUrl }: StreamerRoomProps) {
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
      <StreamerContent />
    </LiveKitRoom>
  );
}