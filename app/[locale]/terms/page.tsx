import type { Metadata } from "next";
import TermsPage from "@/app/terms/page";
import HebrewTermsOfService from "@/app/components/HebrewTermsOfService";
import { isLocale, type Locale } from "@/lib/i18n";
import { createPublicPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  const locale: Locale = isLocale(value) ? value : "en";

  const title =
    locale === "he"
      ? "תנאי שימוש | SimchaCam"
      : "Terms of Service | SimchaCam";
  const description =
    locale === "he"
      ? "תנאי השימוש של SimchaCam לשידורי אירועים פרטיים, הקלטה, צפייה חוזרת והורדה."
      : "Read the SimchaCam terms for private family-event livestreaming, Premium recording, replay, and download features.";

  return createPublicPageMetadata({
    title,
    description,
    canonicalPath: `/${locale}/terms`,
    locale: locale === "he" ? "he_IL" : "en_GB",
    alternatePath: locale === "he" ? "/en/terms" : "/he/terms",
    alternateLocale: locale === "he" ? "en_GB" : "he_IL",
    imageAlt:
      locale === "he"
        ? "תנאי השימוש של SimchaCam"
        : "SimchaCam terms of service",
  });
}

export default async function LocalizedTermsPage({ params }: Props) {
  const { locale: value } = await params;

  return value === "he" ? <HebrewTermsOfService /> : <TermsPage />;
}
