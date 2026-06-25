"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import PublicFooter from "@/app/components/PublicFooter";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getLocalizedPath,
  getMessages,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const locale = getLocaleFromPathname(usePathname());
  const messages = getMessages(locale);
  const t = messages.auth;
  const homePath = getLocalizedPath(locale);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");

  function getAuthErrorMessage(error: { code?: string; message: string }) {
    if (error.code === "email_not_confirmed") {
      return t.errors.emailNotConfirmed;
    }

    if (error.code === "invalid_credentials") {
      return t.errors.invalidCredentials;
    }

    if (error.code === "user_already_exists") {
      return t.errors.userAlreadyExists;
    }

    if (error.code === "weak_password") {
      return t.errors.weakPassword;
    }

    return locale === "he" ? t.errors.generic : error.message;
  }

  async function handleSubmit() {
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const emailRedirectTo = `${window.location.origin}${getLocalizedPath(
        locale,
        "/my-events"
      )}`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            first_name: firstName,
            last_name: lastName,
            locale,
          },
        },
      });

      setLoading(false);

      if (error) {
        alert(getAuthErrorMessage(error));
        return;
      }

      await supabase.auth.signOut();
      setMessage(t.signupSuccess);
      setMode("login");
      setPassword("");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage(getAuthErrorMessage(error));
      return;
    }

    router.push(homePath);
  }

  async function continueWithGoogle() {
    setGoogleLoading(true);
    setMessage("");

    const redirectTo = `${window.location.origin}${getLocalizedPath(
      locale,
      "/auth/callback"
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setGoogleLoading(false);
      setMessage(t.oauthFailed);
    }
  }

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

        <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
            {mode === "signup" ? t.signupTitle : t.loginTitle}
          </h1>
          <p className="mt-4 leading-7 text-muted-navy">
            {mode === "signup"
              ? t.signupDescription
              : t.loginDescription}
          </p>
        </div>

        <section className="mt-8 rounded-[1.5rem] border border-gold/30 bg-white/80 p-5 shadow-[0_20px_55px_rgba(11,31,58,0.09)] backdrop-blur sm:p-7">
          <div className="grid grid-cols-2 rounded-xl bg-navy/5 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={
                mode === "login"
                  ? "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-warm-white shadow-sm"
                  : "min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold text-navy/60 transition hover:text-navy"
              }
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className={
                mode === "signup"
                  ? "min-h-11 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-warm-white shadow-sm"
                  : "min-h-11 rounded-lg px-4 py-2.5 text-sm font-semibold text-navy/60 transition hover:text-navy"
              }
            >
              {t.createAccount}
            </button>
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={loading || googleLoading}
            className="mt-6 flex min-h-13 w-full items-center justify-center gap-3 rounded-xl border border-navy/15 bg-warm-white px-5 py-3.5 font-semibold text-navy shadow-sm transition hover:border-gold/55 hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.98-.9 6.64-2.38l-3.24-2.53c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.39 13.92A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"
              />
            </svg>
            <span>
              {googleLoading ? t.googleLoading : t.continueWithGoogle}
            </span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-navy/10" />
            <span className="text-xs font-medium text-muted-navy">
              {t.orContinueWithEmail}
            </span>
            <span className="h-px flex-1 bg-navy/10" />
          </div>

          {message && (
            <div
              role="status"
              className="rounded-xl border border-gold/35 bg-pale-gold/70 px-4 py-3 text-sm leading-6 text-navy"
            >
              {message}
            </div>
          )}

          <div className={`${message ? "mt-6" : ""} space-y-4`}>
            {mode === "signup" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="first-name"
                  >
                    {t.firstName}
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    autoComplete="given-name"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
                    placeholder={t.firstNamePlaceholder}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="last-name"
                  >
                    {t.lastName}
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    autoComplete="family-name"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
                    placeholder={t.lastNamePlaceholder}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold" htmlFor="email">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold" htmlFor="password">
                {t.password}
              </label>
              <input
                id="password"
                type="password"
                dir="ltr"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "login" && (
                <Link
                  href={getLocalizedPath(locale, "/forgot-password")}
                  className="mt-2 inline-flex text-sm font-semibold text-gold transition hover:text-[#a9884f]"
                >
                  {t.forgotPassword}
                </Link>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || googleLoading}
            className="mt-6 min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.16)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
          >
            {loading
              ? t.loading
              : mode === "signup"
                ? t.createAccount
                : t.login}
          </button>

          <p className="mt-5 text-center text-xs leading-5 text-muted-navy">
            {mode === "signup"
              ? t.signupFootnote
              : t.loginFootnote}
          </p>
          </section>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
