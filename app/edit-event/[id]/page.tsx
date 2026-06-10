"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventRecord = {
  id: string;
  name: string;
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/auth");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
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
        alert("Event not found");
        router.push("/my-events");
        return;
      }

      const event = data as EventRecord;

      setName(event.name || "");
      setLoading(false);
    }

    loadEvent();
  }, [id, router]);

  async function saveEvent() {
    if (!name.trim()) {
      alert("Please enter an event name");
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      router.push("/auth");
      return;
    }

    const response = await fetch(`/api/events/id/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name,
        ...(passwordChanged ? { password } : {}),
      }),
    });
    const data = await response.json();

    setSaving(false);

    if (!response.ok) {
      console.error(data.error);
      alert(data.error || "Could not save event");
      return;
    }

    router.push("/my-events");
  }

  if (loading) {
    return <main className="p-8">Loading event...</main>;
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <Link href="/my-events" className="text-sm text-gray-500">
        ← Back to My Events
      </Link>

      <h1 className="text-4xl font-bold mt-4 mb-8">Edit Event</h1>

      <label className="block mb-2 font-medium">Event Name</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-5"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block mb-2 font-medium">Password Optional</label>
      <input
        className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
        type="password"
        placeholder="Leave blank to keep current password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setPasswordChanged(true);
        }}
      />

      <button
        onClick={saveEvent}
        disabled={saving}
        className="w-full bg-black text-white px-6 py-3 rounded-lg text-lg disabled:bg-gray-400"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </main>
  );
}
