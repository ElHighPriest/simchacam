import Image from "next/image";
import Link from "next/link";
import PublicFooter from "./PublicFooter";

type LegalSection = {
  heading: string;
  body: string;
};

type LegalPageProps = {
  eyebrow: string;
  introduction: string;
  sections: LegalSection[];
  title: string;
};

export default function LegalPage({
  eyebrow,
  introduction,
  sections,
  title,
}: LegalPageProps) {
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

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-navy">
          {introduction}
        </p>

        <div className="mt-10 rounded-[1.5rem] border border-gold/30 bg-white/75 p-6 shadow-[0_18px_50px_rgba(11,31,58,0.06)] sm:p-9">
          <p className="rounded-xl bg-pale-gold/70 px-4 py-3 text-sm leading-6 text-navy">
            Launch draft. Contact details and business information shown in
            square brackets must be completed before publication.
          </p>

          <div className="mt-9 space-y-9">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-3xl font-semibold">
                  {section.heading}
                </h2>
                <p className="mt-3 leading-7 text-muted-navy">
                  {section.body}
                </p>
              </section>
            ))}
          </div>
        </div>

        <p className="mt-7 text-sm text-muted-navy">
          Last updated: 14 June 2026
        </p>
      </article>

      <PublicFooter />
    </main>
  );
}
