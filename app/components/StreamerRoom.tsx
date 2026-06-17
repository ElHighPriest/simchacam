"use client";

import "@livekit/components-styles";
import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
  eventId?: string;
  sessionId?: string;
  hardEndsAt?: string;
  lifecycleMode?: "legacy" | "server-owned";
  recordingEnabled?: boolean;
};

function StreamerContent({
  eventId,
  hardEndsAt,
  lifecycleMode,
  onEndStream,
  recordingEnabled,
  sessionId,
}: {
  eventId?: string;
  hardEndsAt?: string;
  lifecycleMode: "legacy" | "server-owned";
  onEndStream: () => Promise<void>;
  recordingEnabled: boolean;
  sessionId?: string;
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const recordingStartRequested = useRef(false);
  const [isEndingStream, setIsEndingStream] = useState(false);
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
    const cameraTrack = Array.from(
      localParticipant.videoTrackPublications.values()
    ).find((publication) => publication.source === Track.Source.Camera)?.videoTrack;

    if (
      !eventId ||
      !recordingEnabled ||
      !cameraTrack ||
      recordingStartRequested.current
    ) {
      return;
    }

    recordingStartRequested.current = true;
    const captureSettings = cameraTrack.mediaStreamTrack.getSettings();
    const orientation =
      captureSettings.height &&
      captureSettings.width &&
      captureSettings.height > captureSettings.width
        ? "portrait"
        : "landscape";

    async function startRecording() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(eventId!)}/recording/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orientation }),
        }
      );

      if (!response.ok) {
        console.error("Could not initialize recording");
      }
    }

    startRecording();
  }, [eventId, localCameraTrack, localParticipant, recordingEnabled]);

  async function endStream() {
    if (isEndingStream) {
      return;
    }

    setIsEndingStream(true);

    try {
      await onEndStream();
      await room.disconnect();
      window.location.href = "/my-events";
    } catch (error) {
      console.error(error);
      alert("Could not end livestream");
      setIsEndingStream(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-black text-white flex flex-col"
      data-stream-session-id={sessionId}
      data-stream-hard-ends-at={hardEndsAt}
    >
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
            leave: lifecycleMode === "legacy",
          }}
        />
        {lifecycleMode === "server-owned" && (
          <button
            type="button"
            onClick={endStream}
            disabled={isEndingStream}
            className="mt-3 min-h-12 w-full rounded-xl bg-recording-red px-6 py-3 font-semibold text-white transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55"
          >
            {isEndingStream ? "Ending Stream..." : "End Stream"}
          </button>
        )}
      </footer>

      <RoomAudioRenderer />
    </main>
  );
}

export default function StreamerRoom({
  token,
  serverUrl,
  eventId,
  sessionId,
  hardEndsAt,
  lifecycleMode = "legacy",
  recordingEnabled = false,
}: StreamerRoomProps) {
  const explicitEndRequested = useRef(false);

  async function endServerOwnedStream() {
    if (!eventId) {
      throw new Error("Missing event ID");
    }

    explicitEndRequested.current = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      explicitEndRequested.current = false;
      throw new Error("Please log in before ending the livestream");
    }

    if (recordingEnabled) {
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

    const response = await fetch(
      `/api/events/id/${encodeURIComponent(eventId)}/stream/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      explicitEndRequested.current = false;
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not end livestream");
    }
  }

  async function handleDisconnected() {
    if (lifecycleMode === "server-owned") {
      if (explicitEndRequested.current) {
        return;
      }

      window.location.href = "/my-events";
      return;
    }

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
          width: 1920,
          height: 1080,
          frameRate: 30,
        },
      }}
      audio={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true,
          videoCodec: "vp8",
          videoEncoding: {
            maxBitrate: 3_000_000,
            maxFramerate: 30,
          },
          videoSimulcastLayers: [
            VideoPresets.h360,
            VideoPresets.h720,
          ],
        },
      }}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{ height: "100vh" }}
      onDisconnected={handleDisconnected}
    >
      <StreamerContent
        eventId={eventId}
        sessionId={sessionId}
        hardEndsAt={hardEndsAt}
        lifecycleMode={lifecycleMode}
        onEndStream={endServerOwnedStream}
        recordingEnabled={recordingEnabled}
      />
    </LiveKitRoom>
  );
}
