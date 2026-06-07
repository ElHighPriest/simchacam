type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function makeTitleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const eventTitle = makeTitleFromSlug(slug);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="max-w-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-4">
          SimchaCam
        </p>

        <h1 className="text-5xl font-bold mb-6">{eventTitle}</h1>

        <p className="text-xl text-gray-600 mb-8">
          The livestream will begin shortly.
        </p>

        <div className="bg-gray-100 rounded-2xl p-10 text-gray-500">
          Live video will appear here
        </div>
      </div>
    </main>
  );
}