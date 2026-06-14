import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicFooter from "@/app/components/PublicFooter";

export const metadata: Metadata = {
  title: "Pricing | SimchaCam",
  description: "Simple event pricing for SimchaCam livestreams.",
};

const freeFeatures = [
  "45 minute livestream",
  "Up to 30 viewers",
  "Private event link",
  "Password protection",
];

const premiumFeatures = [
  "Up to 6 hour livestream",
  "Up to 500 viewers",
  "Automatic recording",
  "Up to 1080p where supported",
  "Replay for 30 days",
  "Download recording",
];

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
      />
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-warm-white text-navy">
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="SimchaCam home"
            className="relative block h-10 w-36 shrink-0 overflow-hidden sm:h-12 sm:w-44"
          >
            <Image
              src="/simchacam-logo.png"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-5">
            <Link
              href="/how-it-works"
              className="px-2 py-2 text-sm font-semibold text-navy/70 transition hover:text-navy"
            >
              How It Works
            </Link>
            <Link
              href="/auth"
              className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-[#b9995c] sm:px-5"
            >
              Create Event
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -right-24 top-20 h-80 w-80 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              Clear, simple pricing
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-0.03em] sm:text-7xl">
              Choose what your simcha needs.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-navy">
              Start with a private livestream for free. Premium recording,
              replay and download will be available for special occasions.
            </p>
          </div>

          <div className="mt-12 grid items-stretch gap-6 lg:mt-16 lg:grid-cols-2">
            <article className="flex flex-col rounded-[1.75rem] border border-navy/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.06)] sm:p-9">
              <span className="w-fit rounded-full bg-navy/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-navy/60">
                Free
              </span>
              <h2 className="mt-5 font-display text-4xl font-semibold">
                Bring family closer
              </h2>
              <p className="mt-3 leading-7 text-muted-navy">
                Everything you need for a simple, private family livestream.
              </p>
              <p className="mt-7 font-display text-5xl font-semibold">£0</p>

              <ul className="mt-7 space-y-4 leading-6 text-navy/80">
                {freeFeatures.map((feature) => (
                  <Feature key={feature}>{feature}</Feature>
                ))}
                <li className="flex gap-3 text-muted-navy">
                  <span aria-hidden="true" className="shrink-0">
                    —
                  </span>
                  <span>No recording, replay or download</span>
                </li>
              </ul>

              <Link
                href="/auth"
                className="mt-9 inline-flex min-h-12 items-center justify-center rounded-xl bg-navy px-6 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f] lg:mt-auto lg:translate-y-3"
              >
                Create a Free Event
              </Link>
            </article>

            <article className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-gold/45 bg-navy p-6 text-warm-white shadow-[0_24px_60px_rgba(11,31,58,0.18)] sm:p-9">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-2xl"
              />
              <span className="relative w-fit rounded-full bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-navy">
                Premium
              </span>
              <h2 className="relative mt-5 font-display text-4xl font-semibold">
                Keep the memories
              </h2>
              <p className="relative mt-3 leading-7 text-warm-white/70">
                A longer livestream with automatic recording for everyone who
                could not be there.
              </p>
              <div className="relative mt-7 flex items-end gap-2">
                <p className="font-display text-5xl font-semibold">£4.99</p>
                <p className="pb-1 text-sm text-warm-white/65">per event</p>
              </div>

              <ul className="relative mt-7 space-y-4 leading-6 text-warm-white/85">
                {premiumFeatures.map((feature) => (
                  <Feature key={feature}>{feature}</Feature>
                ))}
              </ul>

              <div className="relative mt-9 rounded-xl border border-gold/30 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-gold lg:mt-auto lg:translate-y-3">
                Premium purchases coming soon
              </div>
            </article>
          </div>

          <p className="mx-auto mt-9 max-w-2xl text-center text-sm leading-6 text-muted-navy">
            Stream quality depends on the host&apos;s device, connection and
            surroundings. Premium recording is up to 1080p where supported.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
