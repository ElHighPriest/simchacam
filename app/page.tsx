"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StreamerRoom from "./components/StreamerRoom";
import { supabase } from "@/lib/supabase";
import { isEmailVerified } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export default function Home() {
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

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [isGoingLive, setIsGoingLive] = useState(false);

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

  const firstName = user?.user_metadata?.first_name;
  const displayName = firstName || user?.email || "there";

  const eventLink = eventSlug ? `https://simcha.cam/e/${eventSlug}` : "";

  const whatsAppMessage = encodeURIComponent(
    `Please join the livestream for ${eventName}: ${eventLink}`
  );

  function makeSlug(name: string) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");

    const randomCode = Math.random().toString(36).substring(2, 7);

    return `${baseSlug}-${randomCode}`;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setShowForm(false);
    setEventCreated(false);
  }

  async function createEvent() {
    if (!isEmailVerified(user)) {
      alert("Please confirm your email before creating an event");
      return;
    }

    if (!eventName.trim()) {
      alert("Please enter an event name");
      return;
    }

    if (!eventDate || !eventTime) {
      alert("Please enter an event date and time");
      return;
    }

    setIsCreating(true);

    const slug = makeSlug(eventName);
    const eventAt = new Date(`${eventDate}T${eventTime}`);

    if (Number.isNaN(eventAt.getTime())) {
      setIsCreating(false);
      alert("Please enter a valid event date and time");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsCreating(false);
      alert("Please log in before creating an event");
      return;
    }

    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: eventName,
        slug,
        eventAt: eventAt.toISOString(),
        password: password || null,
      }),
    });
    const data = await response.json();

    setIsCreating(false);

    if (!response.ok) {
      console.error(data.error);
      alert(data.error || "Could not create event");
      return;
    }

    setEventId(data.id);
    setEventSlug(slug);
    setEventCreated(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(eventLink);
      setCopyMessage("Link copied");
    } catch {
      setCopyMessage("Could not copy link");
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SimchaCam Livestream",
          text: `Please join the livestream for ${eventName}`,
          url: eventLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  async function goLive() {
    const { error: statusError } = await supabase
      .from("events")
      .update({
        status: "live",
      })
      .eq("id", eventId);

    if (statusError) {
      console.error(statusError);
      alert("Could not update event status");
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Please log in before starting a livestream");
        return;
      }

      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          roomName: eventSlug,
          participantName: "streamer",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not start livestream");
        return;
      }

      setLivekitToken(data.token);
      setLivekitUrl(data.url);
      setIsGoingLive(true);
    } catch (error) {
      console.error(error);
      alert("Could not start livestream");
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading SimchaCam...
      </main>
    );
  }

  if (isGoingLive && livekitToken && livekitUrl) {
    return (
      <StreamerRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        eventId={eventId}
      />
    );
  }

  if (eventCreated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Event Created</h1>

          <p className="text-gray-600 mb-3">Your event link:</p>

          <Link
            href={`/e/${eventSlug}`}
            className="block bg-gray-100 px-4 py-3 rounded-lg mb-4 break-all hover:bg-gray-200"
          >
            {eventLink}
          </Link>

          {copyMessage && (
            <p className="text-sm text-green-700 mb-4">{copyMessage}</p>
          )}

          <div className="grid gap-3 mb-6">
            <button
              onClick={shareLink}
              className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg"
            >
              Share Link
            </button>

            <a
              href={`https://wa.me/?text=${whatsAppMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg text-lg"
            >
              Share on WhatsApp
            </a>

            <button
              onClick={copyLink}
              className="w-full border border-gray-300 px-6 py-3 rounded-lg text-lg"
            >
              Copy Link
            </button>

            <Link
              href={`/e/${eventSlug}`}
              className="w-full border border-gray-300 px-6 py-3 rounded-lg text-lg"
            >
              Open Event Page
            </Link>
          </div>

          <button
            onClick={goLive}
            className="w-full bg-red-600 text-white px-6 py-4 rounded-xl text-lg font-semibold"
          >
            Go Live
          </button>
        </div>
      </main>
    );
  }

  if (showForm) {
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

          <button
            onClick={createEvent}
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-bold mb-4">SimchaCam</h1>

        <p className="text-xl text-gray-600 mb-8">
          Share your simcha live with family anywhere in the world.
        </p>

        {isEmailVerified(user) ? (
          <>
            <p className="text-gray-600 mb-6">Welcome, {displayName}</p>

            <div className="grid gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg"
              >
                Create Event
              </button>

              <Link
                href="/my-events"
                className="w-full border border-gray-300 px-6 py-3 rounded-lg text-lg block"
              >
                My Events
              </Link>

              <button
                onClick={logout}
                className="w-full text-gray-600 px-6 py-3 rounded-lg text-lg"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            <Link
              href="/auth"
              className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg"
            >
              Login / Create Account
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
