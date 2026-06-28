import type { Metadata } from "next";
import ViewerPageClient from "@/app/e/[slug]/ViewerPageClient";
import { isLocale, type Locale } from "@/lib/i18n";

type LocalizedEventPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedEventPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return {
    title:
      locale === "he"
        ? "שידור חי פרטי למשפחה | SimchaCam"
        : "Private Event Livestream | SimchaCam",
    description:
      locale === "he"
        ? "צפו בשידור חי פרטי, בשידור חוזר או בהקלטה של אירוע SimchaCam דרך הקישור שקיבלתם."
        : "Watch a private SimchaCam event livestream, replay, or recording with an invited event link.",
    robots: {
      index: false,
      follow: false,
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
