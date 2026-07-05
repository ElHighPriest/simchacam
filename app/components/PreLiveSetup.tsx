"use client";

import { useEffect, useRef, useState } from "react";
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
  const portraitVideoRef = useRef<HTMLVideoElement | null>(null);
  const landscapeVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [previewError, setPreviewError] = useState("");

  function attachPreviewStream(stream: MediaStream | null) {
    [portraitVideoRef.current, landscapeVideoRef.current].forEach((video) => {
      if (video) {
        video.srcObject = stream;
      }
    });
  }

  function stopPreview() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    attachPreviewStream(null);
  }

  async function startPreview() {
    stopPreview();
    setPreviewError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      streamRef.current = stream;
      attachPreviewStream(stream);
    } catch (error) {
      console.error("Could not start pre-live preview", error);
      setPreviewError(t.previewError);
    }
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const previewStart = window.setTimeout(() => {
      void startPreview();
    }, 0);

    return () => {
      window.clearTimeout(previewStart);
      stopPreview();
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
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
      className="prelive-setup fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-black text-white"
    >
      <section className="prelive-portrait flex h-full w-full items-center justify-center overflow-hidden px-4 py-3 text-center [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-sm rounded-[1.75rem] border border-gold/25 bg-[radial-gradient(circle_at_50%_20%,rgba(200,169,107,0.14),rgba(11,31,58,0.92)_38%,rgba(7,22,42,0.98)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            {t.eyebrow}
          </p>
          <h1 className="wrap-anywhere mt-2 text-lg font-semibold text-white/90">
            {eventName || "SimchaCam"}
          </h1>

          <div className="relative mx-auto mt-5 flex h-32 w-56 max-w-full items-center justify-center">
            <svg
              viewBox="0 0 224 128"
              aria-hidden="true"
              className="prelive-rotate-illustration absolute h-32 w-56 max-w-full text-gold"
              fill="none"
            >
              <defs>
                <filter id="preliveGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect
                x="58"
                y="22"
                width="52"
                height="84"
                rx="11"
                stroke="currentColor"
                strokeWidth="5"
                opacity="0.98"
                filter="url(#preliveGoldGlow)"
              />
              <path
                d="M77 34h14"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.9"
              />
              <rect
                className="prelive-landscape-phone"
                x="111"
                y="55"
                width="78"
                height="42"
                rx="10"
                stroke="currentColor"
                strokeWidth="5"
                opacity="0.55"
              />
              <path
                className="prelive-landscape-phone"
                d="M179 68v15"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                className="prelive-curved-arrow"
                d="M121 38c25-12 58 2 66 31"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.96"
              />
              <path
                className="prelive-curved-arrow"
                d="m177 65 13 10 5-16"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="mt-5 font-display text-4xl font-semibold leading-none">
            {t.rotateTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-white/78">
            {t.rotateDescription}
          </p>

          <ul className="mt-5 grid gap-2 text-start text-sm leading-5 text-white/84">
            {t.guidance.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <span>{t.rotateToContinue}</span>
          </div>

          {previewError && (
            <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              {previewError}
            </p>
          )}
        </div>
      </section>

      <section className="prelive-landscape hidden h-full w-full overflow-hidden p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] [padding-top:max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] gap-3">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-navy/70 px-4 py-2.5 backdrop-blur">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold">
                  {t.eyebrow}
                </p>
                <h1 className="wrap-anywhere mt-0.5 max-w-full text-sm font-semibold">
                  {eventName || "SimchaCam"}
                </h1>
              </div>
              <p className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
                {t.setupLabel}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center">
              <video
                ref={landscapeVideoRef}
                autoPlay
                muted
                playsInline
                className="h-full max-h-full w-full object-contain"
              />
            </div>
          </div>

          <aside className="flex min-h-0 flex-col justify-between gap-3 overflow-hidden rounded-[1.5rem] border border-gold/25 bg-navy/85 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
            <div className="min-h-0">
              <h2 className="font-display text-3xl font-semibold leading-none">
                {t.title}
              </h2>
              <p className="mt-2 text-sm leading-5 text-white/78">
                {t.description}
              </p>

              {previewError && (
                <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                  {previewError}
                </p>
              )}

              <ul className="mt-4 grid gap-2 text-sm leading-5 text-white/82">
                {t.guidance.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid shrink-0 gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={isStarting}
                className="min-h-12 rounded-xl bg-recording-red px-6 py-3 text-base font-semibold text-white shadow-[0_12px_28px_rgba(229,57,53,0.25)] transition hover:bg-[#cc302d] disabled:cursor-wait disabled:bg-recording-red/55"
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
                className="min-h-11 rounded-xl border border-white/15 bg-white/8 px-6 py-2.5 font-semibold text-white transition hover:bg-white/12 disabled:cursor-wait disabled:text-white/45"
              >
                {t.cancel}
              </button>
            </div>
          </aside>
        </div>
      </section>

      <style>{`
        @media (orientation: landscape) {
          .prelive-portrait {
            display: none;
          }

          .prelive-landscape {
            display: block;
          }
        }

        @keyframes prelive-illustration-breathe {
          0% {
            transform: translateY(0) scale(0.985);
            opacity: 0.88;
          }
          42%, 72% {
            transform: translateY(-2px) scale(1.02);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(0.985);
            opacity: 0.88;
          }
        }

        @keyframes prelive-arrow-draw {
          0%, 12% {
            stroke-dashoffset: 92;
            opacity: 0.28;
          }
          44%, 72% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -20;
            opacity: 0.45;
          }
        }

        @keyframes prelive-landscape-appear {
          0%, 18% {
            opacity: 0.28;
            transform: translateX(-7px);
          }
          44%, 74% {
            opacity: 0.72;
            transform: translateX(0);
          }
          100% {
            opacity: 0.38;
            transform: translateX(-3px);
          }
        }

        .prelive-rotate-illustration {
          transform-origin: 50% 50%;
          animation: prelive-illustration-breathe 2.8s ease-in-out infinite;
        }

        .prelive-curved-arrow {
          stroke-dasharray: 92;
          animation: prelive-arrow-draw 2.8s ease-in-out infinite;
        }

        .prelive-landscape-phone {
          animation: prelive-landscape-appear 2.8s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
