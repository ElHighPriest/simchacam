import Image from "next/image";
import Link from "next/link";
import GuideHeader from "@/app/components/GuideHeader";
import PublicFooter from "@/app/components/PublicFooter";
import { guides } from "@/content/guides";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata = createPublicPageMetadata({
  title: "SimchaCam Guides | Private Livestreaming Advice",
  description:
    "Stories and practical guidance for sharing weddings, bar mitzvahs, brit milahs and family simchas through a private livestream.",
  canonicalPath: "/en/blog",
});

function formatPublishedDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function GuidesPage() {
  return (
    <main lang="en" dir="ltr" className="min-h-screen bg-warm-white text-navy">
      <GuideHeader />

      <section className="relative overflow-hidden px-5 py-14 sm:px-8 sm:py-20">
        <div
          aria-hidden="true"
          className="absolute -right-28 top-10 h-72 w-72 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
              SimchaCam Guides
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-0.03em] sm:text-7xl">
              Ideas for sharing every simcha.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-navy">
              Stories and practical guidance for keeping family close, wherever
              they may be.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {guides.map((guide) => (
              <article
                key={guide.slug}
                className="flex flex-col overflow-hidden rounded-[1.5rem] border border-gold/30 bg-white/75 shadow-[0_18px_50px_rgba(11,31,58,0.06)]"
              >
                {guide.featuredImage && (
                  <Link
                    href={`/en/blog/${guide.slug}`}
                    className="relative block aspect-[16/9] overflow-hidden bg-navy/5"
                  >
                    <Image
                      src={guide.featuredImage}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition duration-300 hover:scale-[1.02]"
                    />
                  </Link>
                )}

                <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-gold">
                  <time dateTime={guide.publishedDate}>
                    {formatPublishedDate(guide.publishedDate)}
                  </time>
                  <span aria-hidden="true">•</span>
                  <span>{guide.readingTime}</span>
                </div>

                <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-navy">
                  <Link
                    href={`/en/blog/${guide.slug}`}
                    className="transition hover:text-[#80652f]"
                  >
                    {guide.title}
                  </Link>
                </h2>
                <p className="mt-4 flex-1 text-base leading-7 text-muted-navy">
                  {guide.excerpt}
                </p>
                <Link
                  href={`/en/blog/${guide.slug}`}
                  className="mt-7 inline-flex min-h-12 w-fit items-center rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
                >
                  Read More
                </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
