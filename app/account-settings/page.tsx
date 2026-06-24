"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import PublicFooter from "@/app/components/PublicFooter";
import { isEmailVerified } from "@/lib/auth";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getLocalizedPath,
  getMessages,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

export default function AccountSettingsPage() {
  const router = useRouter();
  const locale = getLocaleFromPathname(usePathname());
  const t = getMessages(locale).accountSettings;
  const homePath = getLocalizedPath(locale);
  const myEventsPath = getLocalizedPath(locale, "/my-events");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!isEmailVerified(data.user)) {
        router.push(getLocalizedPath(locale, "/auth"));
        return;
      }

      setLoading(false);
    }

    loadUser();
  }, [locale, router]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!newPassword) {
      setErrorMessage(t.enterPassword);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(t.minimumLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t.passwordMismatch);
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(locale === "he" ? t.updateFailed : error.message || t.updateFailed);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage(t.updated);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-5 text-navy">
        {t.loading}
      </main>
    );
  }

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="min-h-screen bg-warm-white text-navy"
    >
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            href={homePath}
            aria-label={t.ariaHome}
            className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
          >
            <Image
              src="/simchacam-logo.svg"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>

          <Link
            href={myEventsPath}
            className="text-sm font-semibold text-navy/70 transition hover:text-navy"
          >
            {t.myEvents}
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href={myEventsPath}
          className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-muted-navy transition hover:text-navy"
        >
          <span aria-hidden="true">←</span>
          {t.backMyEvents}
        </Link>

        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-5xl font-semibold leading-none tracking-[-0.025em] text-navy sm:text-6xl">
            {t.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-navy">
            {t.description}
          </p>
        </div>

        <form
          onSubmit={updatePassword}
          className="mt-10 max-w-2xl rounded-[1.5rem] border border-gold/30 bg-white/75 p-5 shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-7"
        >
          <div className="mb-6">
            <h2 className="font-display text-3xl font-semibold text-navy">
              {t.changePassword}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              {t.changeDescription}
            </p>
          </div>

          {successMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-[#8fb985]/40 bg-[#edf7ea] px-4 py-3 text-sm font-medium text-[#42683b]"
            >
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-recording-red/25 bg-recording-red/10 px-4 py-3 text-sm font-medium text-recording-red"
            >
              {errorMessage}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-navy">
              {t.newPassword}
            </span>
            <input
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3 text-base text-navy outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
              required
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-navy">
              {t.confirmPassword}
            </span>
            <input
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3 text-base text-navy outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
              required
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="mt-7 w-full rounded-xl bg-navy px-6 py-3.5 text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f] disabled:cursor-not-allowed disabled:bg-navy/45"
          >
            {saving ? t.updating : t.update}
          </button>
        </form>
      </section>

      <PublicFooter />
    </main>
  );
}
