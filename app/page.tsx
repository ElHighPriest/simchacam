"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [eventName, setEventName] = useState("");
  const [password, setPassword] = useState("");
  const [eventCreated, setEventCreated] = useState(false);
  const [eventSlug, setEventSlug] = useState("");
  const [cameraStarted, setCameraStarted] = useState(false);

  function createEvent() {
    const slug = eventName
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");

    setEventSlug(slug);
    setEventCreated(true);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraStarted(true);
    } catch (error) {
      alert("Camera or microphone access was blocked.");
      console.error(error);
    }
  }

  if (cameraStarted) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-6 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">SimchaCam</h1>
          <p className="text-sm text-gray-300">{eventName}</p>
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
        <h1 className="text-4xl font-bold mb-4">
          Event Created
        </h1>

        <p className="text-lg mb-4">
          Your event link:
        </p>

        <Link
          href={`/e/${eventSlug}`}
          className="bg-gray-100 px-4 py-3 rounded-lg mb-8 hover:bg-gray-200"
        >
          simcha.cam/e/{eventSlug}
        </Link>

        <button
          onClick={startCamera}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Start Streaming
        </button>
      </main>
    );
  }

  if (showForm) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold mb-2">
            Create Event
          </h1>

          <p className="text-gray-600 mb-8">
            Set up a private livestream page for your simcha.
          </p>

          <label className="block mb-2 font-medium">
            Event Name
          </label>

          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
            placeholder="Aryeh & Devorah Wedding"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />

          <label className="block mb-2 font-medium">
            Password (Optional)
          </label>

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
      <h1 className="text-5xl font-bold mb-4">
        SimchaCam
      </h1>

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