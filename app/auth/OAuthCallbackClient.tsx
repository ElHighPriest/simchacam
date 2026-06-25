"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PublicFooter from "@/app/components/PublicFooter";
import {
  getLocaleDirection,
  getLocalizedPath,
  getMessages,
  type Locale,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type OAuthCallbackClientProps = {
  locale: Locale;
};

export default function OAuthCallbackClient({
  locale,
}: OAuthCallbackClientProps) {
  const router = useRouter();
  const t = getMessages(locale).auth;
  const homePath = getLocalizedPath(locale);
  const authPath = getLocalizedPath(locale, "/auth");
  const handledCallback = useRef(false);
  const [message, setMessage] = useState(t.oauthCompleting);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (handledCallback.current) {
      return;
    }

    handledCallback.current = true;
    let cancelled = false;

    async function completeOAuthSignIn() {
      const params = new URLSearchParams(window.location.search);
      const oauthError =
        params.get("error_description") ?? params.get("error");

      if (oauthError) {
        if (!cancelled) {
          setFailed(true);
          setMessage(t.oauthFailed);
        }
        return;
      }

      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          if (!cancelled) {
            setFailed(true);
            setMessage(t.oauthFailed);
          }
          return;
        }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        if (!cancelled) {
          setFailed(true);
          setMessage(t.oauthFailed);
        }
        return;
      }

      if (!cancelled) {
        router.replace(homePath);
      }
    }

    completeOAuthSignIn();

    return () => {
      cancelled = true;
    };
  }, [homePath, router, t.oauthFailed]);

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="min-h-screen bg-warm-white text-navy"
    >
      <div className="relative flex min-h-[calc(100vh-4.5rem)] items-center justify-center overflow-hidden px-5 py-24">
        <div
          aria-hidden="true"
          className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-navy/5 blur-3xl"
        />

        <Link
          href={homePath}
          aria-label={t.ariaHome}
          className="absolute left-5 top-5 h-10 w-36 overflow-hidden sm:left-8 sm:top-7 sm:h-12 sm:w-44"
        >
          <Image
            src="/simchacam-logo.svg"
            alt="SimchaCam"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover object-center mix-blend-multiply"
          />
        </Link>

        <section className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-gold/30 bg-white/80 p-6 text-center shadow-[0_20px_55px_rgba(11,31,58,0.09)] backdrop-blur sm:p-8">
          {!failed && (
            <div
              aria-hidden="true"
              className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gold/25 border-t-gold"
            />
          )}
          <h1 className="mt-5 font-display text-3xl font-semibold">
            {message}
          </h1>
          {failed && (
            <Link
              href={authPath}
              className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
            >
              {t.backToAuth}
            </Link>
          )}
        </section>
      </div>
      <PublicFooter />
    </main>
  );
}
