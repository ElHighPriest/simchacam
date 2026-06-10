import ViewerPageClient from "./ViewerPageClient";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;

  return <ViewerPageClient slug={slug} />;
}