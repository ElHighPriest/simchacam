import Image from "next/image";
import Link from "next/link";
import PublicFooter from "@/app/components/PublicFooter";
import {
  getLocaleDirection,
  getLocalizedPath,
  getMessages,
  type Locale,
} from "@/lib/i18n";

export default function SupportPageContent({
  locale = "en",
}: {
  locale?: Locale;
}) {
  const messages = getMessages(locale);
  const t = messages.support;
  const homePath = getLocalizedPath(locale);

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="min-h-screen bg-warm-white text-navy"
    >
      <header className="border-b border-navy/10 bg-warm-white/95 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link
            href={homePath}
            aria-label={t.ariaHome}
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
            href={homePath}
            className="text-sm font-semibold text-navy/65 transition hover:text-navy"
          >
            {t.backHome}
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl items-center px-5 py-14 sm:px-8">
        <div className="w-full rounded-[1.75rem] border border-gold/30 bg-white/75 p-6 text-center shadow-[0_18px_50px_rgba(11,31,58,0.07)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.025em] sm:text-6xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-navy">
            {t.description}
          </p>

          <a
            href="mailto:support@simcha.cam"
            className="mt-7 inline-flex min-h-13 items-center justify-center rounded-xl bg-navy px-6 py-3.5 text-lg font-semibold text-warm-white shadow-[0_12px_28px_rgba(11,31,58,0.18)] transition hover:bg-[#102b4f]"
          >
            support@simcha.cam
          </a>

          <p className="mt-6 text-sm leading-6 text-muted-navy">
            {t.responseTime}
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
