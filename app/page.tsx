"use client";

import Link from "next/link";
import { useState } from "react";
import StreamerRoom from "./components/StreamerRoom";

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [eventName, setEventName] = useState("");
  const [password, setPassword] = useState("");
  const [eventCreated, setEventCreated] = useState(false);
  const [eventSlug, setEventSlug] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [isGoingLive, setIsGoingLive] = useState(false);

  const eventLink = eventSlug ? `https://simcha.cam/e/${eventSlug}` : "";

  const whatsAppMessage = encodeURIComponent(
    `Please join the livestream for ${eventName}: ${eventLink}`
  );

  function createEvent() {
    const slug = eventName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");

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
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: eventSlug,
          participantName: "streamer",
          canPublish: true,
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

  if (isGoingLive && livekitToken && livekitUrl) {
    return <StreamerRoom token={livekitToken} serverUrl={livekitUrl} />;
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

          <label className="block mb-2 font-medium">Password (Optional)</label>

          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
            placeholder="Optional password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={createEvent}
            className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg"
          >
            Create
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-5xl font-bold mb-4">SimchaCam</h1>

      <p className="text-xl text-gray-600 text-center max-w-xl mb-8">
        Share your simcha live with family anywhere in the world.
      </p>

      <button
        onClick={() => setShowForm(true)}
        className="bg-black text-white px-6 py-3 rounded-lg text-lg"
      >
        Create Event
      </button>
    </main>
  );
}