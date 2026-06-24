"use client";

import "@livekit/components-styles";
import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import {
  getLocaleDirection,
  getMessages,
  type Locale,
} from "@/lib/i18n";

type ViewerRoomProps = {
  token: string;
  serverUrl: string;
  eventName: string | null;
  eventAt: string | null;
  locale?: Locale;
  slug: string;
};

function ViewerContent({
  eventName,
  eventAt,
  locale = "en",
  slug,
}: {
  eventName: string | null;
  eventAt: string | null;
  locale?: Locale;
  slug: string;
}) {
  const messages = getMessages(locale);
  const t = messages.viewer;
  const [status, setStatus] = useState<string | null>(null);

  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const streamerTrack = tracks.find(
    (trackRef) => trackRef.participant.identity === "streamer"
  );

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch(`/api/events/${encodeURIComponent(slug)}`);
        const data = await response.json();

        if (response.ok) {
          setStatus(data.status || null);
        }
      } catch {
        // Keep the current state and retry on the next polling interval.
      }
    }

    checkStatus();

    const interval = setInterval(checkStatus, 3000);

    return () => clearInterval(interval);
  }, [slug]);

  if (!streamerTrack && status === "ended") {
    return (
      <main className="relative flex h-screen w-full max-w-full items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="min-w-0 max-w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            SimchaCam
          </p>
          <h1 className="wrap-anywhere mt-4 max-w-full font-display text-4xl font-semibold">
            {eventName}
          </h1>
          <p className="mt-4 text-white/70">{t.streamEnded}</p>
        </div>
      </main>
    );
  }

  if (!streamerTrack) {
    return (
      <main className="relative flex h-screen w-full max-w-full items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
        <div className="absolute right-4 top-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="min-w-0 max-w-full">
          <div className="mx-auto h-8 w-8 animate-pulse rounded-full border-2 border-gold bg-gold/10" />
          <h1 className="wrap-anywhere mt-5 max-w-full font-display text-4xl font-semibold">
            {eventName}
          </h1>
          <p className="mt-3 text-white/70">
            {t.connectingToLivestream}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full max-w-full flex-col overflow-hidden bg-black text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-navy/55 px-4 backdrop-blur">
        <div className="min-w-0 max-w-full flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {eventName}
          </h1>
          {eventAt && (
            <p className="hidden text-xs text-white/45 sm:block">
              {new Date(eventAt).toLocaleString(
                locale === "he" ? "he-IL" : "en-GB"
              )}
            </p>
          )}
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <div className="flex items-center gap-2 rounded-full bg-recording-red/15 px-3 py-1.5 text-xs font-semibold text-[#ff7774]">
            <span className="h-2 w-2 rounded-full bg-recording-red" />
            LIVE
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-1.5 sm:p-3">
        <div className="flex h-full w-full max-w-6xl items-center justify-center overflow-hidden">
          <ParticipantTile
            trackRef={streamerTrack}
            className="h-full max-h-full w-full max-w-full overflow-hidden rounded-lg sm:rounded-xl"
          />
        </div>
      </section>

      <RoomAudioRenderer />
    </main>
  );
}

export default function ViewerRoom({
  token,
  serverUrl,
  eventName,
  eventAt,
  locale = "en",
  slug,
}: ViewerRoomProps) {
  return (
    <LiveKitRoom
      lang={locale}
      dir={getLocaleDirection(locale)}
      video={false}
      audio={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      data-lk-theme="default"
      style={{
        height: "100vh",
        maxWidth: "100vw",
        overflow: "hidden",
        width: "100%",
      }}
      connectOptions={{
        autoSubscribe: true,
      }}
    >
      <ViewerContent
        eventName={eventName}
        eventAt={eventAt}
        locale={locale}
        slug={slug}
      />
    </LiveKitRoom>
  );
}
