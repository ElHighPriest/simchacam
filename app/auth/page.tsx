"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      setLoading(false);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Account created!");
      router.push("/");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Logged in!");
    router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold mb-6 text-center">
          {mode === "signup" ? "Create Account" : "Login"}
        </h1>

        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="First name"
              className="w-full border rounded-lg px-4 py-3 mb-4"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Last name"
              className="w-full border rounded-lg px-4 py-3 mb-4"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg px-4 py-3 mb-4"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded-lg px-4 py-3 mb-6"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg mb-4 disabled:bg-gray-400"
        >
          {loading
            ? "Please wait..."
            : mode === "signup"
              ? "Create Account"
              : "Login"}
        </button>

        <button
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="w-full text-sm text-gray-600"
        >
          {mode === "signup" ? "Already have an account?" : "Need an account?"}
        </button>
      </div>
    </main>
  );
}