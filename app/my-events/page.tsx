"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import StreamerRoom from "@/app/components/StreamerRoom";

type Event = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
};

export default function MyEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [liveEventId, setLiveEventId] = useState("");
  const [isGoingLive, setIsGoingLive] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("id,name,slug,status")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    }

    setEvents(data || []);
    setLoading(false);
  }

  function statusLabel(status: string | null) {
    if (status === "live") return "🔴 Live";
    if (status === "ended") return "✓ Ended";
    return "⚪ Offline";
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

  async function goLive(id: string, slug: string) {
    const { error: statusError } = await supabase
      .from("events")
      .update({
        status: "live",
      })
      .eq("id", id);

    if (statusError) {
      console.error(statusError);
      alert("Could not update event status");
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === id ? { ...event, status: "live" } : event
      )
    );

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: slug,
          participantName: "streamer",
          canPublish: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Could not start livestream");
        return;
      }

      setLiveEventId(id);
      setLivekitToken(data.token);
      setLivekitUrl(data.url);
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
      />
    );
  }

  if (loading) {
    return <main className="p-8">Loading events...</main>;
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-500">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-bold mt-4">My Events</h1>

        {copyMessage && (
          <p className="text-sm text-green-700 mt-3">{copyMessage}</p>
        )}
      </div>

      {events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-1">
                <h2 className="font-semibold text-lg">{event.name}</h2>
                <span className="text-sm whitespace-nowrap">
                  {statusLabel(event.status)}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4 break-all">
                simcha.cam/e/{event.slug}
              </p>

              <div className="grid gap-2 sm:grid-cols-5">
                <Link
                  href={`/e/${event.slug}`}
                  className="bg-black text-white px-4 py-2 rounded text-center"
                >
                  View
                </Link>

                <button
                  onClick={() => copyLink(event.slug)}
                  className="border border-gray-300 px-4 py-2 rounded"
                >
                  Copy Link
                </button>

                <button
                  onClick={() => goLive(event.id, event.slug)}
                  className="bg-red-600 text-white px-4 py-2 rounded"
                >
                  Go Live
                </button>

                <Link
                  href={`/edit-event/${event.id}`}
                  className="border border-gray-300 px-4 py-2 rounded text-center"
                >
                  Edit
                </Link>

                <button
                  onClick={() => deleteEvent(event.id, event.name)}
                  className="border border-red-300 text-red-600 px-4 py-2 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}