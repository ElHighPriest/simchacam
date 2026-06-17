"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import PublicFooter from "@/app/components/PublicFooter";
import { supabase } from "@/lib/supabase";

function getResetRedirectUrl() {
  return `${window.location.origin}/reset-password`;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sendResetEmail() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getResetRedirectUrl(),
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "If an account exists for that email address, Supabase will send a password reset link. Please check your inbox and spam or junk folder."
    );
  }

  return (
    <main className="min-h-screen bg-warm-white text-navy">
      <div className="relative flex min-h-[calc(100vh-4.5rem)] items-center justify-center overflow-hidden px-5 py-24">
        <div
          aria-hidden="true"
          className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-navy/5 blur-3xl"
        />

        <Link
          href="/"
          aria-label="SimchaCam home"
          className="absolute left-5 top-5 h-10 w-36 overflow-hidden sm:left-8 sm:top-7 sm:h-12 sm:w-44"
        >
          <Image
            src="/simchacam-logo.png"
            alt="SimchaCam"
            fill
            sizes="(max-width: 640px) 144px, 176px"
            className="object-cover object-center mix-blend-multiply"
          />
        </Link>

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              Account help
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
              Reset your password
            </h1>
            <p className="mt-4 leading-7 text-muted-navy">
              Enter your email address and we&apos;ll send you a secure link to
              choose a new password.
            </p>
          </div>

          <section className="mt-8 rounded-[1.5rem] border border-gold/30 bg-white/80 p-5 shadow-[0_20px_55px_rgba(11,31,58,0.09)] backdrop-blur sm:p-7">
            {message && (
              <div
                role="status"
                className="mb-5 rounded-xl border border-gold/35 bg-pale-gold/70 px-4 py-3 text-sm leading-6 text-navy"
              >
                {message}
              </div>
            )}

            <label className="block text-sm font-semibold" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <button
              onClick={sendResetEmail}
              disabled={loading || !email.trim()}
              className="mt-6 min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.16)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
            >
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>

            <Link
              href="/auth"
              className="mt-5 flex justify-center text-sm font-semibold text-gold transition hover:text-[#a9884f]"
            >
              Back to login
            </Link>
          </section>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
