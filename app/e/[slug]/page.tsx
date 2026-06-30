import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/seo";
import ViewerPageClient from "./ViewerPageClient";

type EventPageProps = {
  params: Promise<{ slug: string }>;
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
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const eventName = await getEventName(slug);
  const title = eventName ? `${eventName} | SimchaCam` : fallbackTitle;
  const imageAlt = eventName
    ? `${eventName} on SimchaCam`
    : "SimchaCam private event livestream";

  return {
    title,
    description: eventDescription,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title,
      description: eventDescription,
      url: `${siteUrl}/e/${encodeURIComponent(slug)}`,
      siteName: "SimchaCam",
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
      description: eventDescription,
      images: [eventSocialImageUrl],
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;

  return <ViewerPageClient slug={slug} />;
}
