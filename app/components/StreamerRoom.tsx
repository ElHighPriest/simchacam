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
  isLandscape,
  lifecycleMode,
  onEndStream,
  recordingEnabled,
  sessionId,
}: {
  eventId?: string;
  hardEndsAt?: string;
  isLandscape: boolean;
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

  if (isLandscape) {
    return (
      <main
        className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-black text-white"
        data-stream-session-id={sessionId}
        data-stream-hard-ends-at={hardEndsAt}
      >
        <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
          {localCameraTrack ? (
            <ParticipantTile
              trackRef={localCameraTrack}
              className="h-full max-h-full w-full overflow-hidden rounded-2xl [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
            />
          ) : (
            <div className="text-center text-gray-400">Starting camera...</div>
          )}
        </section>

        <aside className="flex w-64 shrink-0 flex-col border-l border-white/10 bg-zinc-950/95 p-3">
          <div className="shrink-0">
            <h1 className="text-lg font-bold leading-tight">SimchaCam</h1>
            <p className="mt-1 text-xs text-gray-400">Camera active</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="rounded-xl bg-white/8 px-3 py-2">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                Viewers
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
              </p>
            </div>

            {recordingEnabled && (
              <div className="rounded-xl bg-recording-red/15 px-3 py-2 text-sm font-semibold text-[#ff7774]">
                Recording enabled
              </div>
            )}
          </div>

          <div className="mt-auto space-y-3 pt-4">
            <div className="overflow-hidden">
              <ControlBar
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: false,
                  chat: false,
                  leave: lifecycleMode === "legacy",
                }}
              />
            </div>

            {lifecycleMode === "server-owned" && (
              <button
                type="button"
                onClick={endStream}
                disabled={isEndingStream}
                className="min-h-12 w-full rounded-xl bg-recording-red px-4 py-3 font-semibold text-white transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55"
              >
                {isEndingStream ? "Ending Stream..." : "End Stream"}
              </button>
            )}
          </div>
        </aside>

        <RoomAudioRenderer />
      </main>
    );
  }

  return (
    <main
      className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-black text-white"
      data-stream-session-id={sessionId}
      data-stream-hard-ends-at={hardEndsAt}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">SimchaCam</h1>
          <p className="text-xs text-gray-400 sm:text-sm">Camera active</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <p className="text-sm text-gray-300">
            {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
          </p>
          {recordingEnabled && (
            <p className="rounded-full bg-recording-red/20 px-2.5 py-1 text-xs font-semibold text-[#ff7774]">
              Recording enabled
            </p>
          )}
        </div>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-1 sm:px-4 sm:py-2">
        {localCameraTrack ? (
          <ParticipantTile
            trackRef={localCameraTrack}
            className="h-full max-h-full w-full max-w-5xl overflow-hidden rounded-xl sm:rounded-2xl [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
          />
        ) : (
          <div className="text-center text-gray-400">Starting camera...</div>
        )}
      </section>

      <footer className="shrink-0 px-3 py-2 sm:px-4 sm:py-3">
        <div className="overflow-hidden">
          <ControlBar
            controls={{
              microphone: true,
              camera: true,
              screenShare: false,
              chat: false,
              leave: lifecycleMode === "legacy",
            }}
          />
        </div>
        {lifecycleMode === "server-owned" && (
          <button
            type="button"
            onClick={endStream}
            disabled={isEndingStream}
            className="mt-2 min-h-11 w-full rounded-xl bg-recording-red px-6 py-2.5 font-semibold text-white transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55 sm:mt-3 sm:min-h-12 sm:py-3"
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
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const orientationQuery = window.matchMedia("(orientation: landscape)");
    const updateOrientation = () => setIsLandscape(orientationQuery.matches);

    updateOrientation();
    orientationQuery.addEventListener("change", updateOrientation);

    return () => {
      orientationQuery.removeEventListener("change", updateOrientation);
    };
  }, []);

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
      style={
        isLandscape
          ? {
              height: "100dvh",
              maxHeight: "100dvh",
              overflow: "hidden",
              width: "100%",
            }
          : {
              height: "100dvh",
              maxHeight: "100dvh",
              overflow: "hidden",
              width: "100%",
            }
      }
      onDisconnected={handleDisconnected}
    >
      <StreamerContent
        eventId={eventId}
        sessionId={sessionId}
        hardEndsAt={hardEndsAt}
        isLandscape={isLandscape}
        lifecycleMode={lifecycleMode}
        onEndStream={endServerOwnedStream}
        recordingEnabled={recordingEnabled}
      />
    </LiveKitRoom>
  );
}
