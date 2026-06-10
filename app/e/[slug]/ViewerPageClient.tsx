"use client";

import { useEffect, useRef, useState } from "react";
import ViewerRoom from "@/app/components/ViewerRoom";
import { supabase } from "@/lib/supabase";

type ViewerPageClientProps = {
  slug: string;
};

type EventRecord = {
  id: string;
  name: string | null;
  slug: string | null;
  password: string | null;
  status: string | null;
};

export default function ViewerPageClient({ slug }: ViewerPageClientProps) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordPassed, setPasswordPassed] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
  const autoJoinStarted = useRef(false);

  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, password, status")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.error(error);
        setEventError("Event not found.");
        setEventLoading(false);
        return;
      }

      setEvent(data);
      setEventLoading(false);
    }

    loadEvent();

    const interval = setInterval(loadEvent, 3000);

    return () => clearInterval(interval);
  }, [slug]);

  const eventHasPassword = Boolean(event?.password);

  useEffect(() => {
    if (
      event?.status !== "live" ||
      (eventHasPassword && !passwordPassed) ||
      autoJoinStarted.current
    ) {
      return;
    }

    autoJoinStarted.current = true;

    async function autoJoinLivestream() {
      try {
        const response = await fetch("/api/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: slug,
            participantName: `viewer-${Math.random()
              .toString(36)
              .substring(2, 8)}`,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        setToken(data.token);
        setServerUrl(data.url);
      } catch (error) {
        autoJoinStarted.current = false;
        console.error(error);
        setEventError("Could not connect to livestream.");
      }
    }

    autoJoinLivestream();
  }, [event?.status, eventHasPassword, passwordPassed, slug]);

  function checkPassword() {
    if (!event?.password) {
      setPasswordPassed(true);
      return;
    }

    if (enteredPassword === event.password) {
      setPasswordPassed(true);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password");
    }
  }

  async function joinLivestream() {
    setStreamLoading(true);

    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: slug,
          participantName: `viewer-${Math.random()
            .toString(36)
            .substring(2, 8)}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setToken(data.token);
      setServerUrl(data.url);
    } catch (error) {
      console.error(error);
      setEventError("Could not connect to livestream.");
    } finally {
      setStreamLoading(false);
    }
  }

  if (eventLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading event...
      </main>
    );
  }

  if (eventError || !event) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-3xl font-bold mb-4">SimchaCam</h1>
          <p className="text-gray-600">{eventError || "Event not found."}</p>
        </div>
      </main>
    );
  }

  if (eventHasPassword && !passwordPassed) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-md">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">
            SimchaCam
          </p>

          <h1 className="text-4xl font-bold mb-4">{event.name}</h1>

          <p className="text-gray-600 mb-6">
            This livestream is password protected.
          </p>

          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-3"
            placeholder="Enter password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
          />

          {passwordError && (
            <p className="text-sm text-red-600 mb-3">{passwordError}</p>
          )}

          <button
            onClick={checkPassword}
            className="w-full bg-black text-white px-6 py-4 rounded-xl text-lg font-semibold"
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  if (token && serverUrl) {
    return <ViewerRoom token={token} serverUrl={serverUrl} eventId={event.id} />;
  }

  if (event.status === "ended") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-md">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">
            SimchaCam
          </p>

          <h1 className="text-4xl font-bold mb-4">{event.name}</h1>

          <p className="text-gray-600">
            This livestream has ended.
          </p>
        </div>
      </main>
    );
  }

  if (event.status !== "live") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-full max-w-md">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">
            SimchaCam
          </p>

          <h1 className="text-4xl font-bold mb-4">{event.name}</h1>

          <p className="text-gray-600">
            The livestream has not started yet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="w-full max-w-md">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">
          SimchaCam
        </p>

        <h1 className="text-4xl font-bold mb-4">{event.name}</h1>

        <p className="text-gray-600 mb-8">
          The livestream is live now.
        </p>

        <button
          onClick={joinLivestream}
          disabled={streamLoading}
          className="w-full bg-black text-white px-6 py-4 rounded-xl text-lg font-semibold disabled:bg-gray-400"
        >
          {streamLoading ? "Connecting..." : "Join Livestream"}
        </button>
      </div>
    </main>
  );
}
