"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";
import ProfileMenu from "@/app/components/ProfileMenu";
import StreamerRoom from "@/app/components/StreamerRoom";
import { useCurrencyPreference } from "@/app/components/useCurrencyPreference";
import { isEmailVerified } from "@/lib/auth";
import {
  getLocaleDirection,
  getLocaleFromPathname,
  getLocalizedPath,
  getMessages,
  getPremiumPriceDisplay,
} from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Event = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  event_at: string | null;
  hasPassword: boolean;
  plan: "free" | "premium" | null;
  recording: {
    status: "ready" | "processing" | "failed";
    expiresAt: string | null;
  } | null;
};

type EventGroup = {
  description: string;
  events: Event[];
  title: string;
};

export default function MyEventsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const messages = getMessages(locale);
  const { currency } = useCurrencyPreference(locale);
  const premiumPrice = getPremiumPriceDisplay(currency);
  const homePath = getLocalizedPath(locale);
  const createEventHref = `${homePath}#create-event`;
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState("");
  const [copyFailedSlug, setCopyFailedSlug] = useState("");
  const [upgradingEventId, setUpgradingEventId] = useState("");

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [liveEventId, setLiveEventId] = useState("");
  const [liveSessionId, setLiveSessionId] = useState("");
  const [liveHardEndsAt, setLiveHardEndsAt] = useState("");
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);

  useEffect(() => {
    async function loadEvents() {
      const { data: userData } = await supabase.auth.getUser();

      if (!isEmailVerified(userData.user)) {
        router.push(getLocalizedPath(locale, "/auth"));
        return;
      }

      setUser(userData.user);

      const { data, error } = await supabase
        .from("events")
        .select("id,name,slug,status,event_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
      }

      const eventIds = (data || []).map((event) => event.id);
      const entitlementPlans = new Map<
        string,
        "free" | "premium"
      >();

      if (eventIds.length > 0) {
        const { data: entitlements, error: entitlementError } = await supabase
          .from("event_entitlements")
          .select("event_id,plan")
          .in("event_id", eventIds);

        if (entitlementError) {
          console.error(entitlementError);
        } else {
          for (const entitlement of entitlements || []) {
            if (
              entitlement.plan === "free" ||
              entitlement.plan === "premium"
            ) {
              entitlementPlans.set(entitlement.event_id, entitlement.plan);
            }
          }
        }
      }

      const eventsWithRecordings = await Promise.all(
        (data || []).map(async (event) => {
          const eventWithPlan = {
            ...event,
            plan: entitlementPlans.get(event.id) ?? null,
          };

          try {
            const response = await fetch(
              `/api/events/${encodeURIComponent(event.slug)}`
            );

            if (!response.ok) {
              return { ...eventWithPlan, hasPassword: false, recording: null };
            }

            const metadata = await response.json();
            return {
              ...eventWithPlan,
              hasPassword: Boolean(metadata.hasPassword),
              recording: metadata.recording ?? null,
            };
          } catch (metadataError) {
            console.error(metadataError);
            return { ...eventWithPlan, hasPassword: false, recording: null };
          }
        })
      );

      setEvents(eventsWithRecordings);
      setLoading(false);
    }

    loadEvents();
  }, [locale, router]);

  function formatEventDate(eventAt: string | null) {
    if (!eventAt) {
      return messages.myEvents.dateMissingPremium;
    }

    return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(eventAt));
  }

  async function copyLink(slug: string) {
    const link = `https://simcha.cam${getLocalizedPath(locale, `/e/${slug}`)}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopyFailedSlug("");
      setCopiedSlug(slug);
      window.setTimeout(() => {
        setCopiedSlug((currentSlug) => (currentSlug === slug ? "" : currentSlug));
      }, 2000);
    } catch {
      setCopiedSlug("");
      setCopyFailedSlug(slug);
      window.setTimeout(() => {
        setCopyFailedSlug((currentSlug) =>
          currentSlug === slug ? "" : currentSlug
        );
      }, 2000);
    }
  }

  async function shareEvent(event: Event) {
    const link = `https://simcha.cam${getLocalizedPath(locale, `/e/${event.slug}`)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: messages.myEvents.messages.shareText.replace(
            "{eventName}",
            event.name
          ),
          url: link,
        });
      } catch {
        // The user cancelled the share sheet.
      }
      return;
    }

    await copyLink(event.slug);
  }

  async function deleteEvent(id: string, name: string) {
    const confirmed = window.confirm(
      messages.myEvents.messages.deleteConfirm.replace("{eventName}", name)
    );

    if (!confirmed) return;

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert(messages.myEvents.messages.deleteFailed);
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== id)
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push(getLocalizedPath(locale, "/auth"));
  }

  async function upgradeToPremium(id: string) {
    setUpgradingEventId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(getLocalizedPath(locale, "/auth"));
        return;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(id)}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ locale, currency }),
        }
      );
      const data = await response.json();

      if (!response.ok || !data.url) {
        alert(data.error || messages.myEvents.messages.checkoutFailed);
        return;
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      alert(messages.myEvents.messages.checkoutFailed);
    } finally {
      setUpgradingEventId("");
    }
  }

  async function goLive(id: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert(messages.myEvents.messages.goLiveLogin);
        return;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(id)}/stream/start`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || messages.myEvents.messages.goLiveFailed);
        return;
      }

      setEvents((currentEvents) =>
        currentEvents.map((event) =>
          event.id === data.eventId ? { ...event, status: "live" } : event
        )
      );
      setLiveEventId(data.eventId);
      setLiveSessionId(data.sessionId);
      setLiveHardEndsAt(data.hardEndsAt);
      setLivekitToken(data.token);
      setLivekitUrl(data.url);
      setRecordingEnabled(Boolean(data.recordingEnabled));
      setIsGoingLive(true);
    } catch (error) {
      console.error(error);
      alert(messages.myEvents.messages.goLiveFailed);
    }
  }

  if (isGoingLive && livekitToken && livekitUrl) {
    return (
      <StreamerRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        eventId={liveEventId}
        sessionId={liveSessionId}
        hardEndsAt={liveHardEndsAt}
        recordingEnabled={recordingEnabled}
        lifecycleMode="server-owned"
        locale={locale}
      />
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            {messages.myEvents.loading}
          </p>
        </div>
      </main>
    );
  }

  const eventGroups: EventGroup[] = [
    {
      title: messages.myEvents.groups.live.title,
      description: messages.myEvents.groups.live.description,
      events: events.filter((event) => event.status === "live"),
    },
    {
      title: messages.myEvents.groups.upcoming.title,
      description: messages.myEvents.groups.upcoming.description,
      events: events
        .filter(
          (event) => event.status !== "live" && event.status !== "ended"
        )
        .sort(
          (left, right) =>
            new Date(left.event_at || 0).getTime() -
            new Date(right.event_at || 0).getTime()
        ),
    },
    {
      title: messages.myEvents.groups.past.title,
      description: messages.myEvents.groups.past.description,
      events: events
        .filter((event) => event.status === "ended")
        .sort(
          (left, right) =>
            new Date(right.event_at || 0).getTime() -
            new Date(left.event_at || 0).getTime()
        ),
    },
  ];

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="min-h-screen bg-warm-white text-navy"
    >
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
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
              href={createEventHref}
              className="hidden min-h-11 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:inline-flex sm:px-5"
            >
              {messages.nav.createEvent}
            </Link>
            {user && <ProfileMenu user={user} onSignOut={logout} />}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-12">
          <Link
            href={homePath}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-navy transition hover:text-navy"
          >
            <span aria-hidden="true">←</span>
            {messages.myEvents.backHome}
          </Link>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {messages.myEvents.eyebrow}
          </p>
          <h1 className="font-display text-5xl font-semibold leading-none tracking-[-0.025em] text-navy sm:text-6xl">
            {messages.myEvents.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-navy">
            {messages.myEvents.description}
          </p>
          <Link
            href={createEventHref}
            className="mt-7 inline-flex min-h-13 rounded-xl bg-navy px-7 py-3.5 text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
          >
            {messages.myEvents.createLivestream}
          </Link>
        </div>

        {events.length === 0 ? (
          <section className="rounded-[1.5rem] border border-gold/30 bg-white/70 px-6 py-14 text-center shadow-[0_18px_50px_rgba(11,31,58,0.06)]">
            <p className="font-display text-3xl font-semibold text-navy">
              {messages.myEvents.emptyTitle}
            </p>
            <p className="mx-auto mt-3 max-w-md text-muted-navy">
              {messages.myEvents.emptyDescription}
            </p>
            <Link
              href={createEventHref}
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white"
            >
              {messages.myEvents.createEvent}
            </Link>
          </section>
        ) : (
          <div className="space-y-12">
            {eventGroups
              .filter((group) => group.events.length > 0)
              .map((group) => (
                <section key={group.title}>
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        {group.title === messages.myEvents.groups.live.title && (
                          <span className="h-2.5 w-2.5 rounded-full bg-recording-red shadow-[0_0_0_5px_rgba(229,57,53,0.12)]" />
                        )}
                        <h2 className="font-display text-3xl font-semibold text-navy">
                          {group.title}
                        </h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-navy">
                        {group.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-semibold text-navy/65">
                      {group.events.length}
                    </span>
                  </div>

                  <div className="grid gap-5">
                    {group.events.map((event) => {
                      const isLive = event.status === "live";
                      const isEnded = event.status === "ended";
                      const recordingReady =
                        event.recording?.status === "ready";
                      const recordingProcessing =
                        event.recording?.status === "processing";
                      const isEndedFreeWithoutRecording =
                        isEnded && event.plan !== "premium" && !event.recording;
                      const isEndedPremium = isEnded && event.plan === "premium";
                      const canUpgrade =
                        event.plan === "free" && event.status !== "ended";
                      const isUpgrading = upgradingEventId === event.id;
                      const showEventDate =
                        Boolean(event.event_at) || event.plan === "premium";
                      const copyButtonText =
                        copiedSlug === event.slug
                          ? messages.common.copied
                          : copyFailedSlug === event.slug
                            ? messages.common.copyFailed
                            : messages.myEvents.actions.copyLink;

                      return (
                        <article
                          key={event.id}
                          className="max-w-full overflow-hidden rounded-[1.5rem] border border-navy/10 bg-white/75 shadow-[0_16px_44px_rgba(11,31,58,0.07)]"
                        >
                          <div className="p-5 sm:p-7">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 max-w-full">
                                <div className="mb-4 flex flex-wrap gap-2">
                                  {event.plan && (
                                    <span
                                      className={
                                        event.plan === "premium"
                                          ? "rounded-full border border-gold/40 bg-pale-gold px-3 py-1 text-xs font-semibold text-[#80652f]"
                                          : "rounded-full border border-navy/10 bg-white px-3 py-1 text-xs font-semibold text-navy/60"
                                      }
                                    >
                                      {event.plan === "premium"
                                        ? messages.myEvents.badges.premium
                                        : messages.myEvents.badges.free}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      isLive
                                        ? "inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-recording-red"
                                        : isEnded
                                          ? "rounded-full bg-navy/7 px-3 py-1 text-xs font-semibold text-navy/65"
                                          : "rounded-full bg-pale-gold px-3 py-1 text-xs font-semibold text-[#80652f]"
                                    }
                                  >
                                    {isLive && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-recording-red" />
                                    )}
                                    {isLive
                                      ? messages.myEvents.badges.live
                                      : isEnded
                                        ? messages.myEvents.badges.ended
                                        : messages.myEvents.badges.scheduled}
                                  </span>

                                  {recordingReady && (
                                    <span className="rounded-full border border-gold/35 bg-pale-gold/70 px-3 py-1 text-xs font-semibold text-navy">
                                      {messages.myEvents.badges.recordingReady}
                                    </span>
                                  )}
                                  {recordingProcessing && (
                                    <span className="rounded-full border border-gold/30 bg-white px-3 py-1 text-xs font-semibold text-[#80652f]">
                                      {messages.myEvents.badges.recordingProcessing}
                                    </span>
                                  )}
                                  {event.hasPassword && (
                                    <span className="rounded-full border border-navy/10 bg-white px-3 py-1 text-xs font-semibold text-navy/65">
                                      {messages.myEvents.badges.passwordProtected}
                                    </span>
                                  )}
                                </div>

                                <h3 className="wrap-anywhere max-w-full font-display text-3xl font-semibold leading-tight text-navy sm:text-4xl">
                                  {event.name}
                                </h3>
                                {showEventDate && (
                                  <p className="mt-3 text-base font-semibold text-navy/80">
                                    {formatEventDate(event.event_at)}
                                  </p>
                                )}
                                <p className="mt-3 max-w-full truncate text-sm text-muted-navy">
                                  {`simcha.cam${getLocalizedPath(
                                    locale,
                                    `/e/${event.slug}`
                                  )}`}
                                </p>
                              </div>

                              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
                                {isEndedFreeWithoutRecording ? (
                                  <div className="max-w-xs rounded-xl border border-navy/10 bg-navy/[0.025] px-4 py-3 text-sm leading-6 text-muted-navy">
                                    {messages.myEvents.messages.endedFree}
                                  </div>
                                ) : isEnded && recordingReady ? (
                                  <Link
                                    href={getLocalizedPath(locale, `/e/${event.slug}`)}
                                    className="flex min-h-12 w-full items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f] sm:w-auto"
                                  >
                                    {messages.myEvents.actions.watchRecording}
                                  </Link>
                                ) : isEnded ? (
                                  <Link
                                    href={getLocalizedPath(locale, `/e/${event.slug}`)}
                                    className="flex min-h-12 w-full items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f] sm:w-auto"
                                  >
                                    {recordingProcessing
                                      ? messages.myEvents.actions.viewRecordingStatus
                                      : messages.myEvents.actions.viewEvent}
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => goLive(event.id)}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-recording-red px-6 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(229,57,53,0.18)] transition hover:bg-[#cc302d] sm:w-auto"
                                  >
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                    {isLive
                                      ? messages.myEvents.actions.returnToStream
                                      : messages.myEvents.actions.goLive}
                                  </button>
                                )}

                                {canUpgrade && (
                                  <button
                                    type="button"
                                    onClick={() => upgradeToPremium(event.id)}
                                    disabled={isUpgrading}
                                    className="flex min-h-12 w-full items-center justify-center rounded-xl border border-gold/45 bg-pale-gold/70 px-6 py-3 font-semibold text-navy transition hover:bg-pale-gold disabled:cursor-wait disabled:text-navy/45 sm:w-auto"
                                  >
                                    {isUpgrading
                                      ? messages.myEvents.actions.creatingCheckout
                                      : premiumPrice.upgradeButton}
                                  </button>
                                )}

                                {event.plan === "premium" && (
                                  <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-gold/35 bg-pale-gold/60 px-6 py-3 text-sm font-semibold text-[#80652f] sm:w-auto">
                                    {messages.myEvents.actions.premiumEnabled}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {isEndedFreeWithoutRecording ? (
                            <div className="flex justify-end border-t border-navy/8 bg-navy/[0.015] px-4 py-3 sm:px-6">
                              <button
                                onClick={() =>
                                  deleteEvent(event.id, event.name)
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-navy/45 transition hover:bg-white hover:text-recording-red"
                              >
                                {messages.common.delete}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-x-1 gap-y-2 border-t border-navy/8 bg-navy/[0.025] px-4 py-3 sm:px-6">
                              <button
                                onClick={() => shareEvent(event)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                              >
                                {messages.myEvents.actions.share}
                              </button>
                              <button
                                onClick={() => copyLink(event.slug)}
                                className={
                                  copiedSlug === event.slug
                                    ? "rounded-lg bg-pale-gold px-3 py-2 text-sm font-semibold text-navy transition hover:bg-pale-gold"
                                    : copyFailedSlug === event.slug
                                      ? "rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-recording-red transition hover:bg-red-50"
                                      : "rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                                }
                              >
                                {copyButtonText}
                              </button>
                              {!isEndedPremium && (
                                <>
                                  <Link
                                    href={`/edit-event/${event.id}`}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                                  >
                                    {messages.myEvents.actions.editEvent}
                                  </Link>
                                  <Link
                                    href={getLocalizedPath(locale, `/e/${event.slug}`)}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                                  >
                                    {messages.myEvents.actions.viewPage}
                                  </Link>
                                </>
                              )}
                              <button
                                onClick={() =>
                                  deleteEvent(event.id, event.name)
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-recording-red/80 transition hover:bg-red-50 hover:text-recording-red sm:ml-auto"
                              >
                                {messages.common.delete}
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
