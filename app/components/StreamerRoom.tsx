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
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
  eventId?: string;
  recordingEnabled?: boolean;
};

function StreamerContent({
  eventId,
  recordingEnabled,
}: {
  eventId?: string;
  recordingEnabled: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const recordingStartRequested = useRef(false);
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

  useEffect(() => {
    console.log("[TEMP RECORDING DEBUG] StreamerRoom recording state", {
      eventId,
      recordingEnabled,
      hasLocalCameraTrack: Boolean(localCameraTrack),
    });
  }, [eventId, localCameraTrack, recordingEnabled]);

  useEffect(() => {
    if (
      !eventId ||
      !recordingEnabled ||
      !localCameraTrack ||
      recordingStartRequested.current
    ) {
      return;
    }

    recordingStartRequested.current = true;

    async function startRecording() {
      console.log("[TEMP RECORDING DEBUG] Calling recording/start", {
        eventId,
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log(
          "[TEMP RECORDING DEBUG] recording/start skipped: no session"
        );
        return;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(eventId!)}/recording/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const responseBody = await response.text();

      console.log("[TEMP RECORDING DEBUG] recording/start response", {
        eventId,
        status: response.status,
        body: responseBody,
      });

      if (!response.ok) {
        console.error("Could not initialize recording");
      }
    }

    startRecording();
  }, [eventId, localCameraTrack, recordingEnabled]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="bg-red-600 px-4 py-3 text-center font-bold">
        RECORDING DEBUG BUILD 62274ba
      </div>

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
  recordingEnabled = false,
}: StreamerRoomProps) {
  async function handleDisconnected() {
    if (eventId) {
      if (recordingEnabled) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await fetch(
            `/api/events/id/${encodeURIComponent(eventId)}/recording/stop`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
        }
      }

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
      <StreamerContent
        eventId={eventId}
        recordingEnabled={recordingEnabled}
      />
    </LiveKitRoom>
  );
}
