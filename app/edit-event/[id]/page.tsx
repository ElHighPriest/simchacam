"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventRecord = {
  id: string;
  name: string;
  password: string | null;
  user_id: string | null;
};

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("id,name,password,user_id")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error(error);
        alert("Event not found");
        router.push("/my-events");
        return;
      }

      const event = data as EventRecord;

      if (event.user_id !== userData.user.id) {
        alert("You do not have permission to edit this event");
        router.push("/my-events");
        return;
      }

      setName(event.name || "");
      setPassword(event.password || "");
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

    const { error } = await supabase
      .from("events")
      .update({
        name,
        password: password || null,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Could not save event");
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
        placeholder="Leave blank for no password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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