"use client";

import { useEffect, useRef, useState } from "react";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import {
  getLocaleDirection,
  getMessages,
  type Locale,
} from "@/lib/i18n";

type PreLiveSetupProps = {
  eventName?: string | null;
  locale: Locale;
  onCancel: () => void;
  onStart: () => Promise<boolean>;
};

export default function PreLiveSetup({
  eventName,
  locale,
  onCancel,
  onStart,
}: PreLiveSetupProps) {
  const messages = getMessages(locale);
  const t = messages.preLiveSetup;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [previewError, setPreviewError] = useState("");

  function stopPreview() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startPreview() {
    stopPreview();
    setPreviewError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Could not start pre-live preview", error);
      setPreviewError(t.previewError);
    }
  }

  useEffect(() => {
    const previewStart = window.setTimeout(() => {
      void startPreview();
    }, 0);

    return () => {
      window.clearTimeout(previewStart);
      stopPreview();
    };
    // startPreview intentionally stays local to this setup component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    if (isStarting) {
      return;
    }

    setIsStarting(true);
    stopPreview();

    const started = await onStart();

    if (!started) {
      setIsStarting(false);
      void startPreview();
    }
  }

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden bg-black text-white"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-navy/70 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            {t.eyebrow}
          </p>
          <h1 className="wrap-anywhere mt-1 max-w-full text-lg font-semibold">
            {eventName || "SimchaCam"}
          </h1>
        </div>
        <LanguageSwitcher />
      </header>

      <section className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-h-[45dvh] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full max-h-full w-full object-contain"
          />
        </div>

        <aside className="flex flex-col rounded-2xl border border-white/10 bg-navy/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            {t.setupLabel}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold">
            {t.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/72">
            {t.description}
          </p>

          {previewError && (
            <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {previewError}
            </p>
          )}

          <ul className="mt-5 space-y-3 text-sm leading-6 text-white/82">
            {t.guidance.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-auto lg:grid-cols-1">
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting}
              className="min-h-13 rounded-xl bg-recording-red px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_28px_rgba(229,57,53,0.25)] transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55"
            >
              {isStarting ? t.starting : t.start}
            </button>
            <button
              type="button"
              onClick={() => {
                stopPreview();
                onCancel();
              }}
              disabled={isStarting}
              className="min-h-12 rounded-xl border border-white/15 bg-white/8 px-6 py-3 font-semibold text-white transition hover:bg-white/12 disabled:cursor-wait disabled:text-white/45"
            >
              {t.cancel}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
