import type { Metadata } from "next";
import ViewerPageClient from "./ViewerPageClient";

export const metadata: Metadata = {
  title: "Private Event Livestream | SimchaCam",
  description:
    "Watch a private SimchaCam event livestream, replay, or recording with an invited event link.",
  robots: {
    index: false,
    follow: false,
  },
};

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;

  return <ViewerPageClient slug={slug} />;
}
