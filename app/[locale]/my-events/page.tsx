import type { Metadata } from "next";
import MyEventsPage from "@/app/my-events/page";
import { isLocale, type Locale } from "@/lib/i18n";

type LocalizedMyEventsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedMyEventsPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return {
    title:
      locale === "he"
        ? "האירועים שלי | SimchaCam"
        : "My Events | SimchaCam",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LocalizedMyEventsPage() {
  return <MyEventsPage />;
}
