import type { Metadata } from "next";
import EditEventPage from "@/app/edit-event/[id]/page";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  const locale: Locale = isLocale(value) ? value : "en";
  const t = getMessages(locale).editEvent;

  return {
    title: t.metadataTitle,
    description: t.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default function LocalizedEditEventPage() {
  return <EditEventPage />;
}
