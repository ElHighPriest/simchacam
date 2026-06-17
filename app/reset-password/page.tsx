"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PublicFooter from "@/app/components/PublicFooter";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const exchangedCode = useRef(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState(
    "Checking your password reset link..."
  );

  useEffect(() => {
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "PASSWORD_RECOVERY" || session) && !cancelled) {
          setReady(true);
          setMessage("");
        }
      }
    );

    async function loadRecoverySession() {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code && !exchangedCode.current) {
        exchangedCode.current = true;
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error && !cancelled) {
          setReady(false);
          setMessage(
            "This password reset link is invalid or has expired. Please request a new one."
          );
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setReady(Boolean(session));
        setMessage(
          session
            ? ""
            : "This password reset link is invalid or has expired. Please request a new one."
        );
      }
    }

    loadRecoverySession();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function savePassword() {
    setMessage("");

    if (password.length < 6) {
      setMessage("Please choose a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase.auth.signOut();
    router.push("/auth");
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
              Secure reset
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
              Choose a new password
            </h1>
            <p className="mt-4 leading-7 text-muted-navy">
              Enter a new password for your SimchaCam account.
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

            {ready ? (
              <>
                <div>
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="new-password"
                  >
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="mt-4">
                  <label
                    className="block text-sm font-semibold"
                    htmlFor="confirm-password"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-xl border border-navy/15 bg-warm-white px-4 py-3.5 placeholder:text-muted-navy/55"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                  />
                </div>

                <button
                  onClick={savePassword}
                  disabled={loading}
                  className="mt-6 min-h-14 w-full rounded-xl bg-navy px-6 py-4 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.16)] transition hover:bg-[#102b4f] disabled:cursor-wait disabled:bg-navy/45"
                >
                  {loading ? "Saving password..." : "Save New Password"}
                </button>
              </>
            ) : (
              <Link
                href="/forgot-password"
                className="flex min-h-12 items-center justify-center rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
              >
                Request a New Reset Link
              </Link>
            )}
          </section>
        </div>
      </div>
      <PublicFooter />
    </main>
  );
}
