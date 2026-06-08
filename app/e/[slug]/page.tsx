import ViewerPageClient from "./ViewerPageClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ViewerPageClient slug={slug} />;
}