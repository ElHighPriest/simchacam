import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicFooter from "@/app/components/PublicFooter";

export const metadata: Metadata = {
  title: "Support | SimchaCam",
  description:
    "Contact SimchaCam support for help, questions, feedback, or livestream issues.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-warm-white text-navy">
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            aria-label="SimchaCam home"
            className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
          >
            <Image
              src="/simchacam-logo.svg"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-navy/65 transition hover:text-navy"
          >
            Back to home
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl items-center px-5 py-14 sm:px-8">
        <div className="w-full rounded-[1.75rem] border border-gold/30 bg-white/75 p-6 text-center shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            Support
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
            Need help?
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-navy">
            For support, questions, feedback, or issues with a livestream,
            please contact us at:
          </p>

          <a
            href="mailto:support@simcha.cam"
            className="mt-7 inline-flex min-h-13 items-center justify-center rounded-xl bg-navy px-6 py-3.5 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f]"
          >
            support@simcha.cam
          </a>

          <p className="mt-6 text-sm leading-6 text-muted-navy">
            We aim to respond within 24 hours.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
