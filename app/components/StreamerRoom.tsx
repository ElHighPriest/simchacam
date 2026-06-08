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
import { useEffect, useState } from "react";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
};

function StreamerContent() {
  const { localParticipant } = useLocalParticipant();
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );

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
          facingMode,
        });
      } catch (error) {
        console.error("Could not start camera", error);
      }
    }

    startRearCamera();
  }, [localParticipant, facingMode]);

  async function flipCamera() {
    const nextFacingMode = facingMode === "environment" ? "user" : "environment";

    try {
      await localParticipant.setCameraEnabled(false);
      setFacingMode(nextFacingMode);
    } catch (error) {
      console.error("Could not flip camera", error);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SimchaCam</h1>
          <p className="text-sm text-gray-400">
            Camera: {facingMode === "environment" ? "Rear" : "Front"}
          </p>
        </div>

        <button
          onClick={flipCamera}
          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Flip Camera
        </button>
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