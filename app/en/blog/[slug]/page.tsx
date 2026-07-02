import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuideHeader from "@/app/components/GuideHeader";
import PublicFooter from "@/app/components/PublicFooter";
import { getGuideBySlug, guides } from "@/content/guides";
import { createPublicPageMetadata, siteUrl } from "@/lib/seo";

type GuidePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {};
  }

  const metadata = createPublicPageMetadata({
    title: guide.seoTitle,
    description: guide.seoDescription,
    canonicalPath: `/en/blog/${guide.slug}`,
    imageAlt: guide.featuredImageAlt ?? guide.title,
  });
  const featuredImageUrl = guide.featuredImage
    ? `${siteUrl}${guide.featuredImage}`
    : undefined;
  const featuredImageWidth = guide.featuredImageWidth ?? 1200;
  const featuredImageHeight = guide.featuredImageHeight ?? 630;
  const featuredImageAlt = guide.featuredImageAlt ?? guide.title;

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: guide.publishedDate,
      authors: [guide.author],
      ...(featuredImageUrl
        ? {
            images: [
              {
                url: featuredImageUrl,
                width: featuredImageWidth,
                height: featuredImageHeight,
                alt: featuredImageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      ...metadata.twitter,
      ...(featuredImageUrl
        ? {
            images: [
              {
                url: featuredImageUrl,
                alt: featuredImageAlt,
              },
            ],
          }
        : {}),
    },
  };
}

function formatPublishedDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const articleUrl = `${siteUrl}/en/blog/${guide.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seoDescription,
    datePublished: guide.publishedDate,
    dateModified: guide.publishedDate,
    author: {
      "@type": "Person",
      name: guide.author,
    },
    publisher: {
      "@type": "Organization",
      name: "SimchaCam",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/simchacam-logo.svg`,
      },
    },
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    ...(guide.featuredImage
      ? { image: `${siteUrl}${guide.featuredImage}` }
      : {}),
  };

  return (
    <main lang="en" dir="ltr" className="min-h-screen bg-warm-white text-navy">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <GuideHeader />

      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <Link
          href="/en/blog"
          className="text-sm font-semibold text-navy/60 transition hover:text-navy"
        >
          ← Back to Guides
        </Link>

        <header className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold">
            SimchaCam Guides
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.03em] sm:text-7xl">
            {guide.title}
          </h1>
          <p className="mt-6 text-xl leading-8 text-muted-navy">
            {guide.excerpt}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-gold/25 py-4 text-sm text-muted-navy">
            <span>By {guide.author}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={guide.publishedDate}>
              {formatPublishedDate(guide.publishedDate)}
            </time>
            <span aria-hidden="true">•</span>
            <span>{guide.readingTime}</span>
          </div>
        </header>

        {guide.featuredImage && (
          <div className="mt-10 overflow-hidden rounded-[1.5rem] bg-navy/5 shadow-[0_18px_50px_rgba(11,31,58,0.1)]">
            <Image
              src={guide.featuredImage}
              alt={guide.featuredImageAlt ?? guide.title}
              width={guide.featuredImageWidth ?? 1200}
              height={guide.featuredImageHeight ?? 630}
              sizes="(max-width: 768px) 100vw, 768px"
              className="h-auto w-full"
            />
          </div>
        )}

        <div className="mt-10 space-y-6 text-[1.0625rem] leading-8 text-muted-navy [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-4xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-navy [&_li]:pl-1 [&_p]:max-w-none [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {guide.content}
        </div>

        <aside className="mt-14 rounded-[1.5rem] border border-gold/35 bg-pale-gold/65 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#80652f]">
            Plan with confidence
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-navy">
            Create a free test event before the big day.
          </h2>
          <p className="mt-3 leading-7 text-muted-navy">
            Set up a private SimchaCam event, share the link with someone you
            trust and check the camera, sound and connection before it matters.
          </p>
          <Link
            href="/en/auth"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-navy px-5 py-3 font-semibold text-warm-white transition hover:bg-[#102b4f]"
          >
            Create a Free Event
          </Link>
        </aside>
      </article>

      <PublicFooter />
    </main>
  );
}
