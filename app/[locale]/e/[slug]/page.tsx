import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import ViewerPageClient from "@/app/e/[slug]/ViewerPageClient";
import { isLocale, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";

type LocalizedEventPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

const fallbackTitle = "Private Event Livestream | SimchaCam";
const eventDescription = "Join this private SimchaCam livestream.";
const eventSocialImageUrl = `${siteUrl}/og/event-logo.png`;
const eventSocialImageSize = {
  width: 1254,
  height: 1254,
};

async function getEventName(slug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data } = await supabase
    .from("events")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return typeof data?.name === "string" && data.name.trim()
    ? data.name.trim()
    : null;
}

export async function generateMetadata({
  params,
}: LocalizedEventPageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const eventName = await getEventName(slug);
  const title = eventName ? `${eventName} | SimchaCam` : fallbackTitle;
  const description = eventDescription;
  const imageAlt = eventName
    ? `${eventName} on SimchaCam`
    : "SimchaCam private event livestream";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/${locale}/e/${encodeURIComponent(slug)}`,
      siteName: "SimchaCam",
      locale: locale === "he" ? "he_IL" : "en_GB",
      type: "website",
      images: [
        {
          url: eventSocialImageUrl,
          width: eventSocialImageSize.width,
          height: eventSocialImageSize.height,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [eventSocialImageUrl],
    },
  };
}

export default async function LocalizedEventPage({
  params,
}: LocalizedEventPageProps) {
  const { locale: localeParam, slug } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return <ViewerPageClient locale={locale} slug={slug} />;
}
