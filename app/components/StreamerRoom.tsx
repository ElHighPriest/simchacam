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
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
  eventId?: string;
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
  publishedWidth: number | null;
};

function StreamerContent({
  eventId,
  recordingEnabled,
}: {
  eventId?: string;
  recordingEnabled: boolean;
}) {
  const { isMicrophoneEnabled, localParticipant, microphoneTrack } =
    useLocalParticipant();
  const recordingStartRequested = useRef(false);
  const previousVideoStats = useRef<{
    bytesSent: number;
    timestamp: number;
  } | null>(null);
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
    publishedWidth: null,
  });
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
      let publishedWidth: number | null = null;

      const stats = await cameraTrack?.getRTCStatsReport();

      if (stats) {
        let bytesSent = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        let timestamp = 0;

        stats.forEach((stat) => {
          if (
            stat.type === "outbound-rtp" &&
            stat.kind === "video" &&
            !stat.isRemote
          ) {
            bytesSent += stat.bytesSent ?? 0;
            packetsSent += stat.packetsSent ?? 0;
            timestamp = Math.max(timestamp, stat.timestamp ?? 0);

            if (
              (stat.frameWidth ?? 0) * (stat.frameHeight ?? 0) >
              (publishedWidth ?? 0) * (publishedHeight ?? 0)
            ) {
              publishedWidth = stat.frameWidth ?? null;
              publishedHeight = stat.frameHeight ?? null;
              publishedFrameRate = stat.framesPerSecond ?? null;
            }
          }

          if (
            stat.type === "remote-inbound-rtp" &&
            stat.kind === "video"
          ) {
            packetsLost += stat.packetsLost ?? 0;
          }
        });

        const previous = previousVideoStats.current;

        if (
          previous &&
          timestamp > previous.timestamp &&
          bytesSent >= previous.bytesSent
        ) {
          bitrateKbps =
            ((bytesSent - previous.bytesSent) * 8) /
            (timestamp - previous.timestamp);
        }

        previousVideoStats.current = { bytesSent, timestamp };

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
          },
        }
      );

      if (!response.ok) {
        console.error("Could not initialize recording");
      }
    }

    startRecording();
  }, [eventId, localCameraTrack, recordingEnabled]);

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
            Published:{" "}
            {quality.publishedWidth && quality.publishedHeight
              ? `${quality.publishedWidth}×${quality.publishedHeight}`
              : "Unavailable"}
            {quality.publishedFrameRate
              ? ` @ ${Math.round(quality.publishedFrameRate)} fps`
              : ""}
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
