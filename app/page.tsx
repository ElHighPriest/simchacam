"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import CreateEventForm from "./components/CreateEventForm";
import LanguageSwitcher from "./components/LanguageSwitcher";
import PreLiveSetup from "./components/PreLiveSetup";
import ProfileMenu from "./components/ProfileMenu";
import PublicFooter from "./components/PublicFooter";
import StreamerRoom from "./components/StreamerRoom";
import { useCurrencyPreference } from "./components/useCurrencyPreference";
import { supabase } from "@/lib/supabase";
import { isEmailVerified } from "@/lib/auth";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getLocalizedPath,
  getMessages,
  getPremiumPriceDisplay,
} from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

function makeSlug(name: string) {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "-");

  const randomCode = Math.random().toString(36).substring(2, 7);

  return `${baseSlug}-${randomCode}`;
}

export default function Home() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const { currency } = useCurrencyPreference(locale);
  const premiumPrice = getPremiumPriceDisplay(currency, locale);
  const homePath = getLocalizedPath(locale);
  const direction = getLocaleDirection(locale);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [password, setPassword] = useState("");
  const [eventCreated, setEventCreated] = useState(false);
  const [eventId, setEventId] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const createSubmissionRef = useRef(false);

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [liveSessionId, setLiveSessionId] = useState("");
  const [liveHardEndsAt, setLiveHardEndsAt] = useState("");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [showPreLiveSetup, setShowPreLiveSetup] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setAuthLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isEmailVerified(user)) {
      return;
    }

    function openCreateEventFromHash() {
      if (window.location.hash === "#create-event") {
        setShowForm(true);
      }
    }

    openCreateEventFromHash();
    window.addEventListener("hashchange", openCreateEventFromHash);

    return () => {
      window.removeEventListener("hashchange", openCreateEventFromHash);
    };
  }, [authLoading, user]);

  const localizedEventPath = eventSlug
    ? getLocalizedPath(locale, `/e/${eventSlug}`)
    : "";
  const eventLink = eventSlug
    ? `https://simcha.cam${localizedEventPath}`
    : "";

  const whatsAppMessage = encodeURIComponent(
    `${messages.eventCreated.shareText.replace("{eventName}", eventName)}: ${eventLink}`
  );

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setShowForm(false);
    setEventCreated(false);
  }

  async function createEventRecord() {
    if (createSubmissionRef.current) {
      return null;
    }

    if (!isEmailVerified(user)) {
      alert(messages.createEvent.alerts.confirmEmail);
      return null;
    }

    if (!eventName.trim()) {
      alert(messages.createEvent.alerts.eventNameRequired);
      return null;
    }

    createSubmissionRef.current = true;
    setIsCreating(true);
    setCheckoutError("");

    const slug = makeSlug(eventName);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsCreating(false);
      createSubmissionRef.current = false;
      alert(messages.createEvent.alerts.loginRequired);
      return null;
    }

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: eventName,
          slug,
          password: password || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error(data.error);
        alert(data.error || messages.createEvent.alerts.createFailed);
        return null;
      }

      return { id: data.id as string, slug };
    } catch (error) {
      console.error(error);
      alert(messages.createEvent.alerts.createFailed);
      return null;
    } finally {
      setIsCreating(false);
      createSubmissionRef.current = false;
    }
  }

  async function createFreeEvent() {
    const created = await createEventRecord();

    if (!created) {
      return;
    }

    setEventId(created.id);
    setEventSlug(created.slug);
    setEventCreated(true);
  }

  async function createAndUpgrade() {
    const created = await createEventRecord();

    if (!created) {
      return;
    }

    setEventId(created.id);
    setEventSlug(created.slug);
    setEventCreated(true);

    await upgradeToPremium(created.id, {
      cancelPath: getLocalizedPath(locale, `/edit-event/${created.id}`),
      showInlineError: true,
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopyMessage(messages.eventCreated.linkCopied);
    } catch {
      setCopyMessage(messages.common.copyFailed);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: messages.eventCreated.shareTitle,
          text: messages.eventCreated.shareText.replace(
            "{eventName}",
            eventName
          ),
          url: eventLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  async function upgradeToPremium(
    targetEventId = eventId,
    options?: { cancelPath?: string; showInlineError?: boolean }
  ) {
    if (!targetEventId) {
      return false;
    }

    setIsStartingCheckout(true);
    setCheckoutError("");

    function handleCheckoutError(message: string) {
      if (options?.showInlineError) {
        setCheckoutError(message);
      } else {
        alert(message);
      }
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        handleCheckoutError(messages.eventCreated.alerts.checkoutLogin);
        return false;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(targetEventId)}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            locale,
            currency,
            cancelPath: options?.cancelPath,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok || !data.url) {
        handleCheckoutError(
          data.error || messages.eventCreated.alerts.checkoutFailed
        );
        return false;
      }

      window.location.assign(data.url);
      return true;
    } catch (error) {
      console.error(error);
      handleCheckoutError(messages.eventCreated.alerts.checkoutFailed);
      return false;
    } finally {
      setIsStartingCheckout(false);
    }
  }

  async function startLivestream() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert(messages.eventCreated.alerts.goLiveLogin);
        return false;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(eventId)}/stream/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || messages.eventCreated.alerts.goLiveFailed);
        return false;
      }

      setEventId(data.eventId);
      setLiveSessionId(data.sessionId);
      setLiveHardEndsAt(data.hardEndsAt);
      setLivekitToken(data.token);
      setLivekitUrl(data.url);
      setRecordingEnabled(Boolean(data.recordingEnabled));
      setIsGoingLive(true);
      setShowPreLiveSetup(false);
      return true;
    } catch (error) {
      console.error(error);
      alert(messages.eventCreated.alerts.goLiveFailed);
      return false;
    }
  }

  if (isGoingLive && livekitToken && livekitUrl) {
    return (
      <StreamerRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        eventId={eventId}
        sessionId={liveSessionId}
        hardEndsAt={liveHardEndsAt}
        recordingEnabled={recordingEnabled}
        lifecycleMode="server-owned"
        locale={locale}
      />
    );
  }

  if (showPreLiveSetup) {
    return (
      <PreLiveSetup
        eventName={eventName}
        locale={locale}
        onCancel={() => setShowPreLiveSetup(false)}
        onStart={startLivestream}
      />
    );
  }

  if (eventCreated) {
    const formattedEventDate =
      eventDate && eventTime
        ? new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(`${eventDate}T${eventTime}`))
        : null;

    return (
      <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-warm-white text-navy">
        <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
          <nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
            <Link
              href={homePath}
              aria-label="SimchaCam home"
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
            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher />
              <Link
                href={getLocalizedPath(locale, "/my-events")}
                className="text-sm font-semibold text-navy/70 transition hover:text-navy"
              >
                {messages.nav.myEvents}
              </Link>
            </div>
          </nav>
        </header>

        <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col px-5 py-10 sm:px-8 sm:py-14">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-pale-gold text-gold">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-gold">
              {messages.eventCreated.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] text-navy sm:text-6xl">
              {messages.eventCreated.title}
            </h1>
            <h2 className="wrap-anywhere mt-6 max-w-full font-display text-3xl font-semibold leading-tight text-navy sm:text-4xl">
              {eventName}
            </h2>
            {formattedEventDate && (
              <p className="mt-3 text-base font-medium text-muted-navy">
                {formattedEventDate}
              </p>
            )}
          </div>

          <section className="mt-10 rounded-[1.5rem] border border-gold/30 bg-white/75 p-5 shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              {messages.eventCreated.privateLink}
            </p>
            <Link
              href={localizedEventPath}
              className="mt-3 block break-all rounded-xl bg-pale-gold/70 px-4 py-4 text-sm font-semibold text-navy transition hover:bg-pale-gold sm:text-base"
            >
              {eventLink}
            </Link>

            {copyMessage && (
              <p
                role="status"
                className="mt-3 text-sm font-medium text-[#56714f]"
              >
                {copyMessage}
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={copyLink}
                className="min-h-12 rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
              >
                {messages.eventCreated.copyLink}
              </button>
              <a
                href={`https://wa.me/?text=${whatsAppMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center rounded-xl bg-[#218c55] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#1b7648]"
              >
                {messages.eventCreated.shareWhatsApp}
              </a>
              <Link
                href={localizedEventPath}
                className="flex min-h-12 items-center justify-center rounded-xl border border-navy/20 px-5 py-3 text-center font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/50"
              >
                {messages.eventCreated.openEventPage}
              </Link>
              <button
                onClick={shareLink}
                className="min-h-12 rounded-xl border border-navy/20 px-5 py-3 font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/50"
              >
                {messages.eventCreated.moreSharing}
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-[1.5rem] border border-gold/40 bg-pale-gold/55 p-5 shadow-[0_16px_44px_rgba(11,31,58,0.05)] sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
                  {messages.eventCreated.premiumEyebrow}
                </div>
                <h2 className="mt-4 font-display text-3xl font-semibold">
                  {messages.eventCreated.premiumTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  {messages.eventCreated.premiumDescription}
                </p>
              </div>

              <button
                type="button"
                onClick={() => upgradeToPremium()}
                disabled={isStartingCheckout}
                className="min-h-12 shrink-0 rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.16)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
              >
                {isStartingCheckout
                  ? messages.eventCreated.checkoutLoading
                  : premiumPrice.upgradeButton}
              </button>
            </div>
            {checkoutError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-recording-red/20 bg-white/65 px-4 py-3 text-sm font-medium text-recording-red"
              >
                {checkoutError} {messages.eventCreated.upgradeAgain}
              </p>
            )}
          </section>

          <section className="mt-8 border-t border-gold/30 pt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
              {messages.eventCreated.readyEyebrow}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-navy">
              {messages.eventCreated.readyDescription}
            </p>
            <button
              onClick={() => setShowPreLiveSetup(true)}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-recording-red px-6 py-4 text-lg font-semibold text-white shadow-[0_12px_28px_rgba(229,57,53,0.2)] transition hover:bg-[#cc302d]"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.18)]" />
              {messages.eventCreated.goLive}
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (showForm) {
    return (
      <CreateEventForm
        eventName={eventName}
        homeHref={homePath}
        isCreating={isCreating}
        isStartingCheckout={isStartingCheckout}
        locale={locale}
        onBack={() => setShowForm(false)}
        onCreate={createFreeEvent}
        onCreateAndUpgrade={createAndUpgrade}
        onEventNameChange={setEventName}
        onPasswordChange={setPassword}
        password={password}
        premiumPriceLabel={premiumPrice.price}
      />
    );
  }

  if (false) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowForm(false)}
            className="text-sm text-gray-500 mb-6"
          >
            ← Back
          </button>

          <h1 className="text-4xl font-bold mb-2">Create Event</h1>

          <p className="text-gray-600 mb-8">
            Set up a private livestream page for your simcha.
          </p>

          <label className="block mb-2 font-medium">Event Name</label>

          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            placeholder="Aryeh & Devorah Wedding"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />

          <label className="block mb-2 font-medium">Event Date</label>

          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />

          <label className="block mb-2 font-medium">Event Time</label>

          <input
            type="time"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
          />

          <label className="block mb-2 font-medium">Password (Optional)</label>

          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
            placeholder="Optional password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <section className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">Recording, Replay & Download</p>
                <p className="text-sm text-gray-600 mt-1">
                  Available for 30 days after the event
                </p>
                <p className="text-sm font-medium text-amber-800 mt-2">
                  {premiumPrice.featurePrice}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Create the event first, then upgrade to Premium.
                </p>
              </div>

              <button
                type="button"
                disabled
                aria-label="Create the event first, then upgrade to Premium"
                className="shrink-0 w-12 h-7 rounded-full bg-gray-300 p-1 cursor-not-allowed"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-gray-500">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="5" y="10" width="14" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
              </button>
            </div>
          </section>

          <button
            onClick={createFreeEvent}
            disabled={isCreating}
            className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg disabled:bg-gray-400"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen overflow-hidden bg-warm-white"
    >
      <header className="relative z-20 border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12"
        >
          <Link
              href={homePath}
            aria-label="SimchaCam home"
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

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center lg:flex">
              <Link
                href={`${homePath}#how-it-works`}
                className="px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy"
              >
                {messages.nav.howItWorks}
              </Link>
              <Link
                href={`${homePath}#pricing`}
                className="px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy"
              >
                {messages.nav.pricing}
              </Link>
            </div>
            <LanguageSwitcher />
            {isEmailVerified(user) ? (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="hidden min-h-11 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:inline-flex sm:px-5"
                >
                  {messages.nav.createEvent}
                </button>
                <ProfileMenu user={user} onSignOut={logout} />
              </>
            ) : (
              <>
                <Link
                  href={getLocalizedPath(locale, "/auth")}
                  className="hidden px-3 py-2 text-sm font-medium text-navy/75 transition hover:text-navy sm:block"
                >
                  {messages.nav.signIn}
                </Link>
                <Link
                  href={getLocalizedPath(locale, "/auth")}
                  className="hidden min-h-11 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:inline-flex sm:px-5"
                >
                  {messages.nav.createEvent}
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <section className="relative">
        <div
          aria-hidden="true"
          className="absolute -left-28 top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-12 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-gold sm:text-sm">
              {messages.hero.eyebrow}
            </p>
            <h1 className="font-display text-[3.25rem] font-semibold leading-[0.96] tracking-[-0.035em] text-navy sm:text-6xl lg:text-7xl">
              {messages.hero.title}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-navy sm:text-xl">
              {messages.hero.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {isEmailVerified(user) ? (
                <>
                  <button
                    onClick={() => setShowForm(true)}
                    className="min-h-13 rounded-xl bg-navy px-7 py-3.5 text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
                  >
                    {messages.hero.primaryCta}
                  </button>
                  <Link
                    href={getLocalizedPath(locale, "/my-events")}
                    className="min-h-13 rounded-xl border border-navy/20 px-7 py-3.5 text-center text-base font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/60"
                  >
                    {messages.hero.secondarySignedIn}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={getLocalizedPath(locale, "/auth")}
                    className="min-h-13 rounded-xl bg-navy px-7 py-3.5 text-center text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
                  >
                    {messages.hero.primaryCta}
                  </Link>
                  <Link
                    href={getLocalizedPath(locale, "/auth")}
                    className="min-h-13 rounded-xl border border-navy/20 px-7 py-3.5 text-center text-base font-semibold text-navy transition hover:border-gold hover:bg-pale-gold/60"
                  >
                    {messages.hero.secondarySignedOut}
                  </Link>
                </>
              )}
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-navy/65">
              {messages.hero.bullets.map((bullet) => (
                <span key={bullet} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                  {bullet}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-3xl lg:mx-0">
            <div
              aria-hidden="true"
              className="absolute -inset-3 rounded-[2rem] border border-gold/30 sm:-inset-4"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-navy shadow-[0_28px_70px_rgba(11,31,58,0.24)] sm:aspect-[16/11] sm:rounded-[1.75rem]">
              <Image
                src="/simchacam-hero.png"
                alt="A wedding chuppah being livestreamed to family through a phone"
                fill
                preload
                sizes="(max-width: 1024px) 100vw, 56vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/20 bg-navy/85 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur sm:bottom-6 sm:left-6">
                <span className="h-2 w-2 rounded-full bg-recording-red shadow-[0_0_0_4px_rgba(229,57,53,0.18)]" />
                LIVE
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-gold/20 bg-white/45 px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              {messages.howItWorks.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-navy sm:text-5xl">
              {messages.howItWorks.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-navy sm:text-lg">
              {messages.howItWorks.description}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {messages.howItWorks.steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[1.35rem] border border-navy/10 bg-warm-white p-5 shadow-[0_14px_36px_rgba(11,31,58,0.05)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pale-gold text-sm font-bold text-[#80652f]">
                  {index + 1}
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold text-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-navy">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="bg-warm-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              {messages.pricing.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-navy sm:text-5xl">
              {messages.pricing.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-navy sm:text-lg">
              {messages.pricing.description}
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.06)] sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-navy">
                {messages.pricing.free.label}
              </p>
              <h3 className="mt-3 font-display text-4xl font-semibold text-navy">
                {messages.pricing.free.title}
              </h3>
              <p className="mt-3 text-muted-navy">
                {messages.pricing.free.description}
              </p>
              <div className="mt-6 rounded-2xl bg-navy/[0.03] p-4">
                <p className="font-semibold text-navy">
                  {messages.pricing.free.included}
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-navy">
                  {messages.pricing.free.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-gold/45 bg-pale-gold/70 p-6 shadow-[0_20px_56px_rgba(200,169,107,0.18)] sm:p-8">
              <div className="inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#80652f]">
                {messages.pricing.premium.label}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="font-display text-4xl font-semibold text-navy">
                  {premiumPrice.price}
                </h3>
                <p className="text-sm font-semibold text-[#80652f]">
                  {messages.pricing.premium.oneOff}
                </p>
              </div>
              <p className="mt-3 text-muted-navy">
                {messages.pricing.premium.description}
              </p>
              <div className="mt-6 grid gap-2 text-sm font-medium text-navy sm:grid-cols-2">
                {messages.pricing.premium.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-2 rounded-xl bg-white/55 px-3 py-2"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-navy px-5 py-16 text-warm-white sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              {messages.why.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-[-0.025em] sm:text-5xl">
              {messages.why.title}
            </h2>
            <p className="mt-4 leading-7 text-warm-white/72">
              {messages.why.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {messages.why.items.map((item) => (
              <div
                key={item}
                className="rounded-[1.25rem] border border-white/10 bg-white/7 p-5"
              >
                <span className="block h-1.5 w-8 rounded-full bg-gold" />
                <p className="mt-5 font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-warm-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              {messages.recording.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-navy sm:text-5xl">
              {messages.recording.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-navy sm:text-lg">
              {messages.recording.description}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-gold/35 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.06)] sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-recording-red">
              <span className="h-2 w-2 rounded-full bg-recording-red" />
              {messages.recording.badge}
            </div>
            <h3 className="mt-5 font-display text-3xl font-semibold text-navy">
              {messages.recording.cardTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-navy">
              {messages.recording.cardBody}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-gold/20 bg-pale-gold/55 px-5 py-16 text-center sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {messages.finalCta.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-[-0.025em] text-navy sm:text-5xl">
            {messages.finalCta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-navy sm:text-lg">
            {messages.finalCta.description}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {isEmailVerified(user) ? (
              <>
                <button
                  onClick={() => setShowForm(true)}
                  className="min-h-13 rounded-xl bg-navy px-7 py-3.5 text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
                >
                  {messages.hero.primaryCta}
                </button>
                <Link
                  href={getLocalizedPath(locale, "/my-events")}
                  className="min-h-13 rounded-xl border border-navy/20 bg-white/40 px-7 py-3.5 text-center text-base font-semibold text-navy transition hover:border-gold hover:bg-white/65"
                >
                  {messages.hero.secondarySignedIn}
                </Link>
              </>
            ) : (
              <Link
                href={getLocalizedPath(locale, "/auth")}
                className="min-h-13 rounded-xl bg-navy px-7 py-3.5 text-center text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
              >
                {messages.hero.primaryCta}
              </Link>
            )}
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
