import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicFooter from "@/app/components/PublicFooter";

export const metadata: Metadata = {
  title: "How It Works | SimchaCam",
  description:
    "Create, share and livestream your family celebration with SimchaCam.",
};

const steps = [
  {
    number: "01",
    title: "Create your event",
    description:
      "Add the name, date and time of your simcha. You can also choose a password for private viewing.",
  },
  {
    number: "02",
    title: "Invite family and friends",
    description:
      "Share one private event link with your guests. They can watch in their browser without downloading an app.",
  },
  {
    number: "03",
    title: "Go live when you are ready",
    description:
      "Open SimchaCam on your phone, tap Go Live and bring loved ones closer to the celebration.",
  },
];

export default function HowItWorksPage() {
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
              src="/simchacam-logo.svg"
              alt="SimchaCam"
              fill
              sizes="(max-width: 640px) 144px, 176px"
              className="object-cover object-center mix-blend-multiply"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-5">
            <Link
              href="/#pricing"
              className="px-2 py-2 text-sm font-semibold text-navy/70 transition hover:text-navy"
            >
              Pricing
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
          className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              Simple from start to finish
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-0.03em] sm:text-7xl">
              Share your simcha in three easy steps.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-navy">
              SimchaCam makes it easy for family and friends to be there, even
              when they cannot attend in person.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-[1.5rem] border border-navy/10 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.06)] sm:p-8"
              >
                <span className="font-display text-4xl font-semibold text-gold">
                  {step.number}
                </span>
                <h2 className="mt-5 font-display text-3xl font-semibold">
                  {step.title}
                </h2>
                <p className="mt-3 leading-7 text-muted-navy">
                  {step.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-[1.75rem] bg-navy px-6 py-10 text-center text-warm-white shadow-[0_24px_60px_rgba(11,31,58,0.18)] sm:px-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
              Ready for your celebration?
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
              Create your private event.
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-warm-white/75">
              Set up your page now and share the link whenever you are ready.
            </p>
            <Link
              href="/auth"
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-gold px-6 py-3 font-semibold text-navy transition hover:bg-[#d5ba82]"
            >
              Create Event
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
