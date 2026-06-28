"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useMediaDeviceSelect,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import {
  getLocaleDirection,
  getLocalizedPath,
  getMessages,
  type Locale,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type StreamerRoomProps = {
  token: string;
  serverUrl: string;
  eventId?: string;
  sessionId?: string;
  hardEndsAt?: string;
  lifecycleMode?: "legacy" | "server-owned";
  locale?: Locale;
  recordingEnabled?: boolean;
};

function StreamerContent({
  eventId,
  hardEndsAt,
  isLandscape,
  lifecycleMode,
  locale,
  onEndStream,
  recordingEnabled,
  sessionId,
}: {
  eventId?: string;
  hardEndsAt?: string;
  isLandscape: boolean;
  lifecycleMode: "legacy" | "server-owned";
  locale: Locale;
  onEndStream: () => Promise<void>;
  recordingEnabled: boolean;
  sessionId?: string;
}) {
  const messages = getMessages(locale);
  const t = messages.streamer;
  const { isCameraEnabled, isMicrophoneEnabled, localParticipant } =
    useLocalParticipant();
  const room = useRoomContext();
  const recordingStartRequested = useRef(false);
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [recordingNotice, setRecordingNotice] = useState("");
  const [recordingWarning, setRecordingWarning] = useState("");
  const participants = useParticipants();
  const viewerCount = participants.filter(
    (participant) => participant.identity !== localParticipant.identity
  ).length;
  const localVideoTrack = Array.from(
    localParticipant.videoTrackPublications.values()
  ).find((publication) => publication.source === Track.Source.Camera)
    ?.videoTrack;
  const {
    activeDeviceId: activeVideoDeviceId,
    devices: videoDevices,
    setActiveMediaDevice,
  } = useMediaDeviceSelect({
    kind: "videoinput",
    requestPermissions: isCameraEnabled,
    room,
  });
  const selectableVideoDevices =
    videoDevices.filter((device) => device.deviceId !== "default") ?? [];
  const switchableVideoDevices =
    selectableVideoDevices.length > 1 ? selectableVideoDevices : videoDevices;
  const canSwitchCamera = switchableVideoDevices.length > 1;

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );

  const localCameraTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === localParticipant.identity
  );

  useEffect(() => {
    if (
      !eventId ||
      !recordingEnabled ||
      !localVideoTrack ||
      recordingStartRequested.current
    ) {
      return;
    }

    recordingStartRequested.current = true;
    const captureSettings = localVideoTrack.mediaStreamTrack.getSettings();
    const orientation =
      captureSettings.height &&
      captureSettings.width &&
      captureSettings.height > captureSettings.width
        ? "portrait"
        : "landscape";

    async function startRecording() {
      setRecordingNotice("");
      setRecordingWarning("");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setRecordingWarning(t.recordingSignInWarning);
        return;
      }

      try {
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
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("Could not initialize recording", data);
          setRecordingWarning(t.recordingResumeWarning);
          return;
        }

        if (data?.recovered) {
          setRecordingNotice(t.recordingResumed);
        }
      } catch (error) {
        console.error("Could not initialize recording", error);
        setRecordingWarning(t.recordingConnectionWarning);
      }
    }

    startRecording();
  }, [
    eventId,
    localCameraTrack,
    localVideoTrack,
    recordingEnabled,
    t.recordingConnectionWarning,
    t.recordingResumeWarning,
    t.recordingResumed,
    t.recordingSignInWarning,
  ]);

  useEffect(() => {
    if (!recordingEnabled || isEndingStream) {
      return;
    }

    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = t.leaveWarning;
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
    };
  }, [isEndingStream, recordingEnabled, t.leaveWarning]);

  async function endStream() {
    if (isEndingStream) {
      return;
    }

    setIsEndingStream(true);

    try {
      await onEndStream();
      await room.disconnect();
      window.location.assign(getLocalizedPath(locale, "/my-events"));
    } catch (error) {
      console.error(error);
      alert(t.endFailed);
      setIsEndingStream(false);
    }
  }

  async function toggleMicrophone() {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (error) {
      console.error(error);
    }
  }

  async function toggleCamera() {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch (error) {
      console.error(error);
    }
  }

  async function switchCamera() {
    if (isSwitchingCamera || !canSwitchCamera) {
      return;
    }

    setIsSwitchingCamera(true);

    try {
      const currentDeviceId =
        localVideoTrack?.mediaStreamTrack.getSettings().deviceId ||
        activeVideoDeviceId;
      const currentIndex = switchableVideoDevices.findIndex(
        (device) => device.deviceId === currentDeviceId
      );
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + 1) % switchableVideoDevices.length
          : 0;
      const nextDevice = switchableVideoDevices[nextIndex];

      if (nextDevice) {
        if (!isCameraEnabled) {
          await localParticipant.setCameraEnabled(true);
        }

        await setActiveMediaDevice(nextDevice.deviceId);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSwitchingCamera(false);
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
              className="h-full max-h-full w-full overflow-hidden rounded-2xl [&_.lk-participant-metadata]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
            />
          ) : (
            <div className="text-center text-gray-400">{t.startingCamera}</div>
          )}
        </section>

        <aside className="flex w-56 shrink-0 flex-col border-l border-white/10 bg-zinc-950/95 p-3">
          <div className="mb-3">
            <LanguageSwitcher />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[#68d391]" />
              {t.cameraActive}
            </div>

            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="mr-1.5 h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>
                {viewerCount}{" "}
                {viewerCount === 1 ? t.viewerSingular : t.viewerPlural}
              </span>
            </div>

            {recordingEnabled && (
              <div className="inline-flex rounded-full bg-recording-red/20 px-3 py-1.5 text-xs font-semibold text-[#ff7774]">
                {t.recordingEnabled}
              </div>
            )}

            {recordingNotice && (
              <div className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                {recordingNotice}
              </div>
            )}

            {recordingWarning && (
              <div className="inline-flex rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200">
                {recordingWarning}
              </div>
            )}
          </div>

          <div className="mt-auto space-y-3 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={toggleMicrophone}
                aria-label={
                  isMicrophoneEnabled ? t.muteMicrophone : t.unmuteMicrophone
                }
                aria-pressed={isMicrophoneEnabled}
                className="flex min-h-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/18"
              >
                {isMicrophoneEnabled ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <path d="M12 19v3" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="m2 2 20 20" />
                    <path d="M9 9v3a3 3 0 0 0 5.1 2.1" />
                    <path d="M15 9.34V6a3 3 0 0 0-5.94-.6" />
                    <path d="M19 10v2a7 7 0 0 1-.64 2.93" />
                    <path d="M5 10v2a7 7 0 0 0 11.9 5" />
                    <path d="M12 19v3" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={switchCamera}
                aria-label={t.switchCamera}
                disabled={!canSwitchCamera || isSwitchingCamera}
                title={t.switchCamera}
                className="flex min-h-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="M4 8h3l2-2h6l2 2h3v10H4Z" />
                  <circle cx="12" cy="13" r="3" />
                  <path d="M8 11a5 5 0 0 1 7.5-2.4" />
                  <path d="M15.5 6.5v2.1h-2.1" />
                  <path d="M16 15a5 5 0 0 1-7.5 2.4" />
                  <path d="M8.5 19.5v-2.1h2.1" />
                </svg>
              </button>

              <button
                type="button"
                onClick={toggleCamera}
                aria-label={isCameraEnabled ? t.turnCameraOff : t.turnCameraOn}
                aria-pressed={isCameraEnabled}
                className="flex min-h-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/18"
              >
                {isCameraEnabled ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="m16 13 5 3V8l-5 3" />
                    <rect x="3" y="6" width="13" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="m2 2 20 20" />
                    <path d="M16 16V8a2 2 0 0 0-2-2H8" />
                    <path d="M3 7.36V16a2 2 0 0 0 2 2h11" />
                    <path d="m16 11 5-3v8l-2.5-1.5" />
                  </svg>
                )}
              </button>
            </div>

            {lifecycleMode === "server-owned" && (
              <button
                type="button"
                onClick={endStream}
                disabled={isEndingStream}
                className="min-h-12 w-full rounded-xl bg-recording-red px-4 py-3 font-semibold text-white transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55"
              >
                {isEndingStream ? t.endingStream : t.endStream}
              </button>
            )}

            {lifecycleMode === "legacy" && (
              <button
                type="button"
                onClick={() => room.disconnect()}
                className="min-h-12 w-full rounded-xl bg-recording-red px-4 py-3 font-semibold text-white transition hover:bg-[#cc302d]"
              >
                {t.leaveStream}
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
      className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-black text-white"
      data-stream-session-id={sessionId}
      data-stream-hard-ends-at={hardEndsAt}
    >
      <section className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {localCameraTrack ? (
          <ParticipantTile
            trackRef={localCameraTrack}
            className="h-full max-h-full w-full overflow-hidden [&_.lk-participant-metadata]:hidden [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
          />
        ) : (
          <div className="text-center text-gray-400">{t.startingCamera}</div>
        )}
      </section>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/65 to-transparent px-3 pb-10 pt-3 sm:px-4 sm:pt-4">
        <div className="min-w-0 rounded-2xl bg-black/35 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-[#68d391]" />
            {t.cameraActive}
          </div>
          <p className="mt-1 text-xs text-white/70">
            {viewerCount}{" "}
            {viewerCount === 1 ? t.viewerSingular : t.viewerPlural}
          </p>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-start gap-2">
          <LanguageSwitcher />
        </div>
      </header>

      {(recordingEnabled || recordingNotice || recordingWarning) && (
        <div className="pointer-events-none absolute inset-x-3 top-20 z-10 flex flex-wrap gap-2 sm:top-24">
          {recordingEnabled && (
            <p className="rounded-full bg-recording-red/20 px-2.5 py-1 text-xs font-semibold text-[#ff7774] backdrop-blur">
              {t.recordingEnabled}
            </p>
          )}
          {recordingNotice && (
            <p className="max-w-52 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
              {recordingNotice}
            </p>
          )}
          {recordingWarning && (
            <p className="max-w-52 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-200 backdrop-blur">
              {recordingWarning}
            </p>
          )}
        </div>
      )}

      <footer className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-12 sm:px-4">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_1fr_1fr_2fr] gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleMicrophone}
            aria-label={
              isMicrophoneEnabled ? t.muteMicrophone : t.unmuteMicrophone
            }
            aria-pressed={isMicrophoneEnabled}
            className="flex min-h-12 items-center justify-center rounded-xl bg-white/14 text-white backdrop-blur transition hover:bg-white/20"
          >
            {isMicrophoneEnabled ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <path d="M12 19v3" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="m2 2 20 20" />
                <path d="M9 9v3a3 3 0 0 0 5.1 2.1" />
                <path d="M15 9.34V6a3 3 0 0 0-5.94-.6" />
                <path d="M19 10v2a7 7 0 0 1-.64 2.93" />
                <path d="M5 10v2a7 7 0 0 0 11.9 5" />
                <path d="M12 19v3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={switchCamera}
            aria-label={t.switchCamera}
            disabled={!canSwitchCamera || isSwitchingCamera}
            title={t.switchCamera}
            className="flex min-h-12 items-center justify-center rounded-xl bg-white/14 text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M4 8h3l2-2h6l2 2h3v10H4Z" />
              <circle cx="12" cy="13" r="3" />
              <path d="M8 11a5 5 0 0 1 7.5-2.4" />
              <path d="M15.5 6.5v2.1h-2.1" />
              <path d="M16 15a5 5 0 0 1-7.5 2.4" />
              <path d="M8.5 19.5v-2.1h2.1" />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleCamera}
            aria-label={isCameraEnabled ? t.turnCameraOff : t.turnCameraOn}
            aria-pressed={isCameraEnabled}
            className="flex min-h-12 items-center justify-center rounded-xl bg-white/14 text-white backdrop-blur transition hover:bg-white/20"
          >
            {isCameraEnabled ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="m16 13 5 3V8l-5 3" />
                <rect x="3" y="6" width="13" height="12" rx="2" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="m2 2 20 20" />
                <path d="M16 16V8a2 2 0 0 0-2-2H8" />
                <path d="M3 7.36V16a2 2 0 0 0 2 2h11" />
                <path d="m16 11 5-3v8l-2.5-1.5" />
              </svg>
            )}
          </button>

          {lifecycleMode === "server-owned" && (
            <button
              type="button"
              onClick={endStream}
              disabled={isEndingStream}
              className="min-h-12 rounded-xl bg-recording-red px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(229,57,53,0.26)] transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55"
            >
              {isEndingStream ? t.endingStream : t.endStream}
            </button>
          )}

          {lifecycleMode === "legacy" && (
            <button
              type="button"
              onClick={() => room.disconnect()}
              className="min-h-12 rounded-xl bg-recording-red px-4 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(229,57,53,0.26)] transition hover:bg-[#cc302d]"
            >
              {t.leaveStream}
            </button>
          )}
        </div>
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
  locale = "en",
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
      throw new Error(getMessages(locale).streamer.missingEventId);
    }

    explicitEndRequested.current = true;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      explicitEndRequested.current = false;
      throw new Error(getMessages(locale).streamer.endLoginRequired);
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
      throw new Error(data?.error || getMessages(locale).streamer.endFailed);
    }
  }

  async function handleDisconnected() {
    if (lifecycleMode === "server-owned") {
      if (explicitEndRequested.current) {
        return;
      }

      window.location.assign(getLocalizedPath(locale, "/my-events"));
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

    window.location.assign(getLocalizedPath(locale, "/my-events"));
  }

  return (
    <LiveKitRoom
      lang={locale}
      dir={getLocaleDirection(locale)}
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
        locale={locale}
        onEndStream={endServerOwnedStream}
        recordingEnabled={recordingEnabled}
      />
    </LiveKitRoom>
  );
}
