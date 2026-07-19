"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import EventPasswordInput from "@/app/components/EventPasswordInput";
import { isEmailVerified } from "@/lib/auth";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getLocalizedPath,
  getMessages,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type EventRecord = {
  entitlement: {
    plan: "free" | "premium";
  } | null;
  eventAt: string | null;
  id: string;
  name: string;
  recording: {
    expiresAt: string | null;
    status: string;
  } | null;
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const locale = getLocaleFromPathname(usePathname());
  const messages = getMessages(locale);
  const t = messages.editEvent;
  const homePath = getLocalizedPath(locale);
  const myEventsPath = getLocalizedPath(locale, "/my-events");
  const id = params.id as string;

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [password, setPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      const { data: userData } = await supabase.auth.getUser();

      if (!isEmailVerified(userData.user)) {
        router.push(getLocalizedPath(locale, "/auth"));
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(getLocalizedPath(locale, "/auth"));
        return;
      }

      const response = await fetch(`/api/events/id/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(data.error);
        alert(t.notFound);
        router.push(myEventsPath);
        return;
      }

      const event = data.event as EventRecord;
      setName(event.name || "");
      setHasRecording(Boolean(event.recording));
      setPlan(event.entitlement?.plan === "premium" ? "premium" : "free");

      if (event.eventAt) {
        const eventDateValue = new Date(event.eventAt);

        if (!Number.isNaN(eventDateValue.getTime())) {
          setEventDate(eventDateValue.toISOString().slice(0, 10));
          setEventTime(eventDateValue.toISOString().slice(11, 16));
        }
      }

      setLoading(false);
    }

    loadEvent();
  }, [id, locale, myEventsPath, router, t.notFound]);

  async function saveEvent() {
    if (!name.trim()) {
      alert(t.nameRequired);
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      router.push(getLocalizedPath(locale, "/auth"));
      return;
    }

    const payload: {
      eventAt?: string | null;
      name: string;
      password?: string;
    } = {
      name,
      ...(passwordChanged ? { password } : {}),
    };

    if (plan === "premium") {
      if (eventDate && eventTime) {
        const eventAt = new Date(`${eventDate}T${eventTime}`);

        if (Number.isNaN(eventAt.getTime())) {
          setSaving(false);
          alert(t.invalidDate);
          return;
        }

        payload.eventAt = eventAt.toISOString();
      } else {
        payload.eventAt = null;
      }
    }

    const response = await fetch(`/api/events/id/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    setSaving(false);

    if (!response.ok) {
      console.error(data.error);
      alert(locale === "he" ? t.saveFailed : data.error || t.saveFailed);
      return;
    }

    router.push(myEventsPath);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            {t.loading}
          </p>
        </div>
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
        <nav className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5 sm:px-8">
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
            className="text-sm font-semibold text-navy/65 transition hover:text-navy"
          >
            {t.cancel}
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link
          href={myEventsPath}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-navy transition hover:text-navy"
        >
          <span aria-hidden="true">←</span>
          {t.backMyEvents}
        </Link>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
          {t.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
          {t.title}
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-navy">
          {t.description}
        </p>

        <div className="mt-10 space-y-6">
          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {t.detailsEyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              {t.eventName}
            </h2>
            <label
              className="mt-6 block text-sm font-semibold"
              htmlFor="edit-event-name"
            >
              {t.nameShown}
            </label>
            <input
              id="edit-event-name"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </section>

          {plan === "premium" ? (
            <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {t.scheduleEyebrow}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold">
                {t.dateTime}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-navy">
                {t.scheduleDescription}
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="edit-event-date"
                  >
                    {t.eventDate}
                  </label>
                  <input
                    id="edit-event-date"
                    type="date"
                    dir="ltr"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="edit-event-time"
                  >
                    {t.eventTime}
                  </label>
                  <input
                    id="edit-event-time"
                    type="time"
                    dir="ltr"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5"
                    value={eventTime}
                    onChange={(event) => setEventTime(event.target.value)}
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
              <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
                {t.premiumFeature}
              </div>
              <h2 className="mt-4 font-display text-3xl font-semibold">
                {t.scheduling}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-navy">
                {t.premiumDescription}
              </p>
              <div className="mt-5 rounded-xl border border-gold/30 bg-white/55 px-4 py-3">
                <p className="text-sm font-semibold text-navy">
                  {t.lockedFree}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-navy">
                  {t.premiumFootnote}
                </p>
              </div>
            </section>
          )}

          <section className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.06)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {t.privacyEyebrow}
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              {t.privateViewing}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              {t.passwordDescription}
            </p>
            <label
              className="mt-6 block text-sm font-semibold"
              htmlFor="edit-event-password"
            >
              {t.newPassword}{" "}
              <span className="font-normal text-muted-navy">
                ({t.optional})
              </span>
            </label>
            <EventPasswordInput
              id="edit-event-password"
              name="simchacam_new_event_access_code"
              placeholder={t.passwordPlaceholder}
              copyFailedLabel={messages.common.copyFailed}
              copiedLabel={messages.common.copied}
              copyLabel={messages.eventPassword.copy}
              hideLabel={messages.eventPassword.hide}
              showLabel={messages.eventPassword.show}
              value={password}
              onChange={(value) => {
                setPassword(value);
                setPasswordChanged(true);
              }}
            />
          </section>

          <section className="rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
            <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
              {t.premiumRecording}
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold">
              {t.recordingTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-navy">
              {hasRecording
                ? t.recordingEnabled
                : t.recordingDisabled}
            </p>
          </section>

          <button
            onClick={saveEvent}
            disabled={saving}
            className="min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </main>
  );
}
