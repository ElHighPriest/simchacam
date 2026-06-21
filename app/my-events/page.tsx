"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileMenu from "@/app/components/ProfileMenu";
import StreamerRoom from "@/app/components/StreamerRoom";
import { isEmailVerified } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Event = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  event_at: string | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
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
        router.push("/auth");
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
              return { ...eventWithPlan, recording: null };
            }

            const metadata = await response.json();
            return {
              ...eventWithPlan,
              recording: metadata.recording ?? null,
            };
          } catch (metadataError) {
            console.error(metadataError);
            return { ...eventWithPlan, recording: null };
          }
        })
      );

      setEvents(eventsWithRecordings);
      setLoading(false);
    }

    loadEvents();
  }, [router]);

  function formatEventDate(eventAt: string | null) {
    if (!eventAt) {
      return "Date not set";
    }

    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(eventAt));
  }

  async function copyLink(slug: string) {
    const link = `https://simcha.cam/e/${slug}`;

    try {
      await navigator.clipboard.writeText(link);
      setCopyMessage("Link copied");
    } catch {
      setCopyMessage("Could not copy link");
    }
  }

  async function shareEvent(event: Event) {
    const link = `https://simcha.cam/e/${event.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Please join the livestream for ${event.name}`,
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
      `Are you sure you want to delete "${name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not delete event");
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== id)
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  async function upgradeToPremium(id: string) {
    setUpgradingEventId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      const response = await fetch(
        `/api/events/id/${encodeURIComponent(id)}/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();

      if (!response.ok || !data.url) {
        alert(data.error || "Could not start Premium checkout");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Could not start Premium checkout");
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
        alert("Please log in before starting a livestream");
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
        alert(data.error || "Could not start livestream");
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
      alert("Could not start livestream");
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
      />
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-warm-white px-6 text-navy">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-gold/35 border-t-gold" />
          <p className="text-sm font-medium text-muted-navy">
            Loading your events...
          </p>
        </div>
      </main>
    );
  }

  const eventGroups: EventGroup[] = [
    {
      title: "Live",
      description: "Events currently broadcasting",
      events: events.filter((event) => event.status === "live"),
    },
    {
      title: "Upcoming",
      description: "Scheduled events ready to share and stream",
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
      title: "Past",
      description: "Ended livestreams and available recordings",
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
    <main className="min-h-screen bg-warm-white text-navy">
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            aria-label="SimchaCam home"
            className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
          >
            <Image
              src="/simchacam-logo.png"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/#create-event"
              className="hidden min-h-11 rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:inline-flex sm:px-5"
            >
              Create Event
            </Link>
            {user && <ProfileMenu user={user} onSignOut={logout} />}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-12">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-navy transition hover:text-navy"
          >
            <span aria-hidden="true">←</span>
            Back to home
          </Link>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            Your celebrations
          </p>
          <h1 className="font-display text-5xl font-semibold leading-none tracking-[-0.025em] text-navy sm:text-6xl">
            My Events
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-navy">
            Manage your upcoming livestreams, share private event links, and
            return to past recordings.
          </p>
          <Link
            href="/#create-event"
            className="mt-7 inline-flex min-h-13 rounded-xl bg-navy px-7 py-3.5 text-base font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:-translate-y-0.5 hover:bg-[#102b4f]"
          >
            Create Your Livestream
          </Link>
        </div>

        {copyMessage && (
          <div
            role="status"
            className="mb-8 rounded-xl border border-gold/30 bg-pale-gold px-4 py-3 text-sm font-medium text-navy"
          >
            {copyMessage}
          </div>
        )}

        {events.length === 0 ? (
          <section className="rounded-[1.5rem] border border-gold/30 bg-white/70 px-6 py-14 text-center shadow-[0_18px_50px_rgba(11,31,58,0.06)]">
            <p className="font-display text-3xl font-semibold text-navy">
              Your first simcha starts here.
            </p>
            <p className="mx-auto mt-3 max-w-md text-muted-navy">
              Create an event, share its private link, and go live when the
              celebration begins.
            </p>
            <Link
              href="/#create-event"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white"
            >
              Create Event
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
                        {group.title === "Live" && (
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
                                        ? "Premium"
                                        : "Free"}
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
                                      ? "Live"
                                      : isEnded
                                        ? "Ended"
                                        : "Scheduled"}
                                  </span>

                                  {recordingReady && (
                                    <span className="rounded-full border border-gold/35 bg-pale-gold/70 px-3 py-1 text-xs font-semibold text-navy">
                                      Recording ready
                                    </span>
                                  )}
                                  {recordingProcessing && (
                                    <span className="rounded-full border border-gold/30 bg-white px-3 py-1 text-xs font-semibold text-[#80652f]">
                                      Recording processing
                                    </span>
                                  )}
                                </div>

                                <h3 className="wrap-anywhere max-w-full font-display text-3xl font-semibold leading-tight text-navy sm:text-4xl">
                                  {event.name}
                                </h3>
                                <p className="mt-3 text-base font-semibold text-navy/80">
                                  {formatEventDate(event.event_at)}
                                </p>
                                <p className="mt-3 max-w-full truncate text-sm text-muted-navy">
                                  simcha.cam/e/{event.slug}
                                </p>
                              </div>

                              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto">
                                {isEndedFreeWithoutRecording ? (
                                  <div className="max-w-xs rounded-xl border border-navy/10 bg-navy/[0.025] px-4 py-3 text-sm leading-6 text-muted-navy">
                                    This free livestream has ended. No
                                    recording is available.
                                  </div>
                                ) : isEnded && recordingReady ? (
                                  <Link
                                    href={`/e/${event.slug}`}
                                    className="flex min-h-12 w-full items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f] sm:w-auto"
                                  >
                                    Watch Recording
                                  </Link>
                                ) : isEnded ? (
                                  <Link
                                    href={`/e/${event.slug}`}
                                    className="flex min-h-12 w-full items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f] sm:w-auto"
                                  >
                                    {recordingProcessing
                                      ? "View Recording Status"
                                      : "View Event"}
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => goLive(event.id)}
                                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-recording-red px-6 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(229,57,53,0.18)] transition hover:bg-[#cc302d] sm:w-auto"
                                  >
                                    <span className="h-2 w-2 rounded-full bg-white" />
                                    {isLive ? "Return to Stream" : "Go Live"}
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
                                      ? "Creating checkout..."
                                      : "Upgrade to Premium — £4.99"}
                                  </button>
                                )}

                                {event.plan === "premium" && (
                                  <div className="flex min-h-12 w-full items-center justify-center rounded-xl border border-gold/35 bg-pale-gold/60 px-6 py-3 text-sm font-semibold text-[#80652f] sm:w-auto">
                                    Premium enabled
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
                                Delete
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-x-1 gap-y-2 border-t border-navy/8 bg-navy/[0.025] px-4 py-3 sm:px-6">
                              <button
                                onClick={() => shareEvent(event)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                              >
                                Share
                              </button>
                              <button
                                onClick={() => copyLink(event.slug)}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                              >
                                Copy Link
                              </button>
                              {!isEndedPremium && (
                                <>
                                  <Link
                                    href={`/edit-event/${event.id}`}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                                  >
                                    Edit
                                  </Link>
                                  <Link
                                    href={`/e/${event.slug}`}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-navy/70 transition hover:bg-white hover:text-navy"
                                  >
                                    View Page
                                  </Link>
                                </>
                              )}
                              <button
                                onClick={() =>
                                  deleteEvent(event.id, event.name)
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-recording-red/80 transition hover:bg-red-50 hover:text-recording-red sm:ml-auto"
                              >
                                Delete
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
