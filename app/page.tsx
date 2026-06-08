"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [eventName, setEventName] = useState("");
  const [password, setPassword] = useState("");
  const [eventCreated, setEventCreated] = useState(false);
  const [eventSlug, setEventSlug] = useState("");
  const [cameraScreen, setCameraScreen] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("Camera not started yet");
  const [copyMessage, setCopyMessage] = useState("");

  const eventLink = eventSlug
    ? `https://simcha.cam/e/${eventSlug}`
    : "";

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
        // User cancelled share sheet
      }
    } else {
      copyLink();
    }
  }

  async function startCamera() {
    setCameraScreen(true);
  }

  useEffect(() => {
    async function openCamera() {
      if (!cameraScreen) return;

      try {
        setCameraMessage("Requesting camera and microphone...");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
          },
          audio: true,
        });

        setCameraMessage("Camera connected");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error(error);
        setCameraMessage("Camera or microphone access failed.");
        alert("Camera or microphone access failed.");
      }
    }

    openCamera();
  }, [cameraScreen]);

  if (cameraScreen) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-6 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">SimchaCam</h1>
          <p className="text-sm text-gray-300">{eventName}</p>
          <p className="text-xs text-gray-400 mt-1">{cameraMessage}</p>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md rounded-2xl bg-zinc-900"
          />
        </div>

        <button className="mt-6 w-full bg-red-600 text-white py-4 rounded-xl text-lg font-semibold">
          Go Live
        </button>
      </main>
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
            onClick={startCamera}
            className="w-full bg-red-600 text-white px-6 py-4 rounded-xl text-lg font-semibold"
          >
            Start Streaming
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