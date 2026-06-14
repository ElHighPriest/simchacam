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

type QualityDiagnostics = {
  audioActive: boolean;
  bitrateKbps: number | null;
  captureFrameRate: number | null;
  captureHeight: number | null;
  captureWidth: number | null;
  connectionQuality: string;
  packetLossPercent: number | null;
  publishedFrameRate: number | null;
  publishedHeight: number | null;
  publishedLayer: string | null;
  publishedWidth: number | null;
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
  const { isMicrophoneEnabled, localParticipant, microphoneTrack } =
    useLocalParticipant();
  const room = useRoomContext();
  const recordingStartRequested = useRef(false);
  const previousVideoStats = useRef(
    new Map<string, { bytesSent: number; timestamp: number }>()
  );
  const [quality, setQuality] = useState<QualityDiagnostics>({
    audioActive: false,
    bitrateKbps: null,
    captureFrameRate: null,
    captureHeight: null,
    captureWidth: null,
    connectionQuality: "unknown",
    packetLossPercent: null,
    publishedFrameRate: null,
    publishedHeight: null,
    publishedLayer: null,
    publishedWidth: null,
  });
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
    let cancelled = false;

    async function updateQualityDiagnostics() {
      const cameraPublication = Array.from(
        localParticipant.videoTrackPublications.values()
      ).find((publication) => publication.source === Track.Source.Camera);
      const cameraTrack = cameraPublication?.videoTrack;
      const captureSettings = cameraTrack?.mediaStreamTrack.getSettings();
      const microphoneMediaTrack = microphoneTrack?.track?.mediaStreamTrack;
      let bitrateKbps: number | null = null;
      let packetLossPercent: number | null = null;
      let publishedFrameRate: number | null = null;
      let publishedHeight: number | null = null;
      let publishedLayer: string | null = null;
      let publishedWidth: number | null = null;

      const stats = await cameraTrack?.getRTCStatsReport();

      if (stats) {
        let totalBitrateKbps = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        const nextVideoStats = new Map<
          string,
          { bytesSent: number; timestamp: number }
        >();
        const activeLayers: Array<{
          bitrateKbps: number;
          frameRate: number | null;
          height: number;
          rid: string;
          width: number;
        }> = [];

        stats.forEach((stat) => {
          if (
            stat.type === "outbound-rtp" &&
            stat.kind === "video" &&
            !stat.isRemote
          ) {
            const statId = String(stat.id);
            const bytesSent = stat.bytesSent ?? 0;
            const timestamp = stat.timestamp ?? 0;
            const previous = previousVideoStats.current.get(statId);
            let layerBitrateKbps = 0;

            if (
              previous &&
              timestamp > previous.timestamp &&
              bytesSent >= previous.bytesSent
            ) {
              layerBitrateKbps =
                ((bytesSent - previous.bytesSent) * 8) /
                (timestamp - previous.timestamp);
              totalBitrateKbps += layerBitrateKbps;
            }

            nextVideoStats.set(statId, { bytesSent, timestamp });
            packetsSent += stat.packetsSent ?? 0;

            if (
              stat.frameWidth &&
              stat.frameHeight &&
              (layerBitrateKbps > 0 || (stat.framesPerSecond ?? 0) > 0)
            ) {
              activeLayers.push({
                bitrateKbps: layerBitrateKbps,
                frameRate: stat.framesPerSecond ?? null,
                height: stat.frameHeight,
                rid: stat.rid || "single",
                width: stat.frameWidth,
              });
            }
          }

          if (
            stat.type === "remote-inbound-rtp" &&
            stat.kind === "video"
          ) {
            packetsLost += stat.packetsLost ?? 0;
          }
        });

        previousVideoStats.current = nextVideoStats;
        bitrateKbps = totalBitrateKbps > 0 ? totalBitrateKbps : null;

        const highestActiveLayer = activeLayers.sort(
          (left, right) =>
            right.width * right.height - left.width * left.height
        )[0];

        if (highestActiveLayer) {
          publishedWidth = highestActiveLayer.width;
          publishedHeight = highestActiveLayer.height;
          publishedFrameRate = highestActiveLayer.frameRate;
          publishedLayer = highestActiveLayer.rid;
        }

        if (packetsSent + packetsLost > 0) {
          packetLossPercent =
            (packetsLost / (packetsSent + packetsLost)) * 100;
        }
      }

      if (!cancelled) {
        setQuality({
          audioActive: Boolean(
            isMicrophoneEnabled &&
              microphoneMediaTrack &&
              microphoneMediaTrack.enabled &&
              microphoneMediaTrack.readyState === "live" &&
              !microphoneTrack?.isMuted
          ),
          bitrateKbps,
          captureFrameRate: captureSettings?.frameRate ?? null,
          captureHeight: captureSettings?.height ?? null,
          captureWidth: captureSettings?.width ?? null,
          connectionQuality: localParticipant.connectionQuality,
          packetLossPercent,
          publishedFrameRate,
          publishedHeight,
          publishedLayer,
          publishedWidth,
        });
      }
    }

    updateQualityDiagnostics();
    const interval = setInterval(updateQualityDiagnostics, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isMicrophoneEnabled, localParticipant, microphoneTrack]);

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

      <section className="mx-4 rounded-lg border border-white/20 bg-white/10 p-3 text-xs text-gray-200">
        <p className="mb-2 font-semibold text-white">Quality diagnostics</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          <p>
            Capture:{" "}
            {quality.captureWidth && quality.captureHeight
              ? `${quality.captureWidth}×${quality.captureHeight}`
              : "Unavailable"}
            {quality.captureFrameRate
              ? ` @ ${Math.round(quality.captureFrameRate)} fps`
              : ""}
          </p>
          <p>
            Highest active layer:{" "}
            {quality.publishedWidth && quality.publishedHeight
              ? `${quality.publishedWidth}×${quality.publishedHeight}`
              : "Unavailable"}
            {quality.publishedFrameRate
              ? ` @ ${Math.round(quality.publishedFrameRate)} fps`
              : ""}
            {quality.publishedLayer ? ` (${quality.publishedLayer})` : ""}
          </p>
          <p>
            Video bitrate:{" "}
            {quality.bitrateKbps === null
              ? "Unavailable"
              : `${Math.round(quality.bitrateKbps)} kbps`}
          </p>
          <p>Audio: {quality.audioActive ? "Active" : "Inactive"}</p>
          <p>Connection: {quality.connectionQuality}</p>
          <p>
            Packet loss:{" "}
            {quality.packetLossPercent === null
              ? "Unavailable"
              : `${quality.packetLossPercent.toFixed(2)}%`}
          </p>
        </div>
      </section>

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
